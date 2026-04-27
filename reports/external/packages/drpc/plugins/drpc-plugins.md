# drpc Plugin Architecture Analysis

## Executive Summary

drpc's current plugin system (`Plugin<Ctx>`) is **insufficient** for better-auth integration. It only supports context extension via `extend()`, but does **not** support:
- Adding routes/endpoints from plugins
- Client/server awareness (no `$InferServerPlugin` equivalent)
- Nested context structures (`ctx.auth.api`)

**Key finding:** To make better-auth a drpc plugin with `ctx.auth.api` and `ctx.auth.client`, drpc would need significant plugin system enhancements.

---

## 1. Current drpc Plugin Architecture

### Plugin Interface

```typescript
// packages/server/src/types.ts
export interface Plugin<Ctx> {
  readonly name: string;
  readonly extend: (ctx: Ctx) => Partial<Ctx>;
}
```

**Characteristics:**
- Simple: only `name` and `extend()` function
- Server-only: plugins never exposed to clients
- Flat merge: extends context by merging returned object

### How Plugins Work

```typescript
// 1. Define via plugin() factory
const authPlugin = plugin("auth", (ctx) => ({
  userId: ctx.userId,
  isAuthenticated: ctx.userId !== null,
}));

// 2. Register in defineContext()
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  plugins: [authPlugin]
});

// 3. Applied per-request in createHandlerContext()
function applyPlugins<Ctx>(ctx: Ctx, plugins: readonly Plugin<Ctx>[]): Ctx {
  let extendedCtx = ctx;
  for (const plugin of plugins) {
    extendedCtx = { ...extendedCtx, ...plugin.extend(extendedCtx) } as Ctx;
  }
  return extendedCtx;
}
```

### Plugin Limitations

| Feature | drpc Plugin | better-auth Plugin |
|---------|-------------|-------------------|
| Add routes/endpoints | **No** | **Yes** (`endpoints`) |
| Database schema | **No** | **Yes** (`schema`) |
| Lifecycle hooks | **No** | **Yes** (`hooks`) |
| Client awareness | **No** | **Yes** (`$InferServerPlugin`) |
| Nested context | **Flat only** | **Nested** (`ctx.auth.api`) |

---

## 2. drpc vs better-auth Plugin Comparison

### drpc Plugin

```typescript
interface Plugin<Ctx> {
  name: string;
  extend: (ctx: Ctx) => Partial<Ctx>;
  // NO: endpoints, hooks, schema, adapter, $InferClientPlugin
}
```

### better-auth Server Plugin

```typescript
interface BetterAuthPlugin {
  id: LiteralString;
  init?: (ctx: AuthContext) => Awaitable<{ context?, options? }>;
  endpoints?: { [key: string]: Endpoint };  // <-- exposes HTTP endpoints!
  middlewares?: { path: string; middleware: Middleware }[];
  hooks?: { before?, after? };
  schema?: BetterAuthPluginDBSchema;         // <-- database schema
  migrations?: Record<string, Migration>;
  rateLimit?: { window, max, pathMatcher }[];
  adapter?: { [key: string]: (...args) => Awaitable<any> };
}
```

### better-auth Client Plugin

```typescript
interface BetterAuthClientPlugin {
  id: LiteralString;
  $InferServerPlugin?: BetterAuthPlugin | undefined;  // <-- type marker only!
  getActions?: ($fetch, $store, options) => Record<string, any>;
  getAtoms?: ($fetch) => Record<string, Atom<any>>;
  pathMethods?: Record<string, "POST" | "GET">;
  fetchPlugins?: BetterFetchPlugin[];
  atomListeners?: ClientAtomListener[];
  $ERROR_CODES?: Record<string, { code, message }>;
}
```

### Key Insight: $InferServerPlugin

`$InferServerPlugin: {}` is an **empty object at runtime** - completely erased. It only exists for TypeScript to infer types. This is the mechanism that links client plugins to server plugins.

---

## 3. Client vs Server Awareness in drpc

### Current drpc Architecture

**No client/server awareness exists:**

```
Server:
  defineContext() -> creates t (QueryBuilder) and createAPI
  createAPI() -> returns APIInstance with procedures
  createPublicAPI() -> filters internal operations

HTTP Request (GET/POST)

Client:
  createClient({ transport }) -> Proxy that calls transport.request(path, args)
  createTypedClient() -> React hooks
```

### Context Flow

```
Server Context                          Client
─────────────────────────────           ──────
defineContext({
  context: { db, userId },
  plugins: [authPlugin]
})
        │
        ▼
createContext(request) ──── per-request ───┐
        │                                   │
        ▼                                   │
applyPlugins(ctx, plugins)                   │
        │                                   │
        ▼                                   │
Handler receives extended ctx                │
                                          HTTP Request
                                              │
                                              ▼
                                         Client Proxy
                                         calls transport.request()
```

### Missing: Client Awareness Mechanism

drpc does **not** have:
- No `$InferServerPlugin` equivalent
- No client plugin concept
- No type inference from server to client
- No `pathMethods` for HTTP method mapping

Client just has a flat proxy that calls procedure paths. No structured awareness of server's plugin system.

---

## 4. What Would Better-Auth as drpc Plugin Need?

### User's Goal

```
ctx.auth.api          // better-auth operations
ctx.auth.client       // better-auth client (session, signIn, signOut)
```

### Current drpc Context Structure

```typescript
// Flat structure
type AppContext = {
  db: Database;
  userId: string | null;
  isAuthenticated: boolean;
  // ... flat
};
```

### Desired Structure for better-auth

```typescript
// Nested structure
type AppContext = {
  db: Database;
  auth: {
    api: BetterAuthInstance;    // Server-side auth operations
    client: BetterAuthClient;   // Client-side auth (for type inference)
    session: Session | null;
  };
};
```

### Gap Analysis

| Requirement | drpc Current | Changes Needed |
|-------------|--------------|----------------|
| Nested context (`ctx.auth`) | Flat merge only | Plugin `extend()` must return nested objects |
| Add procedures from plugins | Not supported | Need `router` property on plugins |
| Client awareness | None | Need `$InferServerPlugin` equivalent |
| Type inference for client | Manual `AppRouter` | Need auto-inference from plugins |

---

## 5. Proposed Enhanced Plugin Interface

To support better-auth as a drpc plugin, the interface would need:

```typescript
// Extended Plugin interface
interface DrpcPlugin<Ctx, Plugins extends DrpcPlugin<Ctx>[] = []> {
  readonly name: string;

  // Context extension - supports nested objects
  extend: (ctx: Ctx) => Partial<Ctx>;

  // Optional: Add procedures to the router
  router?: (t: QueryBuilder<Ctx>) => ProcedureRouter<Ctx>;

  // Optional: Client-side awareness
  client?: DrpcClientPlugin;

  // Optional: Schema for migrations
  schema?: DrpcPluginSchema;
}

interface DrpcClientPlugin {
  // Procedure paths for type inference
  procedures: Record<string, { path: string; method: "GET" | "POST" }>;

  // Atoms for reactive state
  atoms?: Record<string, Atom<any>>;

  // Custom client-side actions
  getActions?: ($fetch: Fetch) => Record<string, AnyFunction>;
}
```

### Example: better-auth as drpc Plugin

```typescript
// betterAuthPlugin.ts
const betterAuthPlugin: DrpcPlugin<AppContext> = {
  name: "better-auth",

  // Extend context with nested auth object
  extend: (ctx) => ({
    auth: {
      api: ctx.auth.api,           // BetterAuthInstance
      client: ctx.auth.client,     // For type inference
      session: ctx.auth.session,   // Current session
    }
  }),

  // Add auth procedures to router
  router: (t) => ({
    auth: {
      getSession: t.query({
        handler: async (ctx, args) => {
          return ctx.auth.api.getSession({ ... });
        }
      }),
      signIn: t.mutation({
        handler: async (ctx, args) => {
          return ctx.auth.api.signIn({ ... });
        }
      }),
    }
  }),

  // Client plugin for type inference
  client: {
    procedures: {
      getSession: { path: "/auth/session", method: "GET" },
      signIn: { path: "/auth/sign-in", method: "POST" },
    },
    atoms: {
      $session: atom(null),
    },
  }
};
```

---

## 6. Implementation Path

### Step 1: Support Nested Context

Modify `applyPlugins()` to deeply merge nested objects:

```typescript
// Current: flat merge
extendedCtx = { ...extendedCtx, ...plugin.extend(extendedCtx) };

// Needed: deep merge for nested structures
extendedCtx = deepMerge(extendedCtx, plugin.extend(extendedCtx));
```

### Step 2: Add Plugin Router Support

In `defineContext()`, collect and merge routers from plugins:

```typescript
const { t, createAPI } = defineContext({
  context: initialContext,
  plugins: [betterAuthPlugin, otherPlugins],
});

// In createAPI():
const pluginRouters = plugins
  .filter(p => p.router)
  .map(p => p.router!(t));
const mergedRouter = mergeRouters(baseRouter, ...pluginRouters);
```

### Step 3: Add Client Awareness

Create a type-level marker system similar to `$InferServerPlugin`:

```typescript
// Type-level only marker
const $InferServerPlugin: {};

type InferClientFromPlugins<Plugins> =
  Plugins extends [infer P, ...infer Rest]
    ? P extends { client: infer C }
      ? C & InferClientFromPlugins<Rest>
      : InferClientFromPlugins<Rest>
    : {};
```

---

## 7. Key Files Analyzed

| File | Purpose |
|------|---------|
| `/packages/server/src/types.ts` | `Plugin<Ctx>` interface |
| `/packages/server/src/context/builder.ts` | `defineContext()` |
| `/packages/server/src/api/factory.ts` | `createAPI()`, `applyPlugins()` |
| `/packages/server/src/router/types.ts` | `Router`, `Procedure` types |
| `/packages/client/src/createClient.ts` | Client proxy implementation |
| `/packages/client-react/src/createTypedClient.ts` | React hooks |
| `/examples/plugin-example/src/api/index.ts` | Plugin example |

---

## 8. Conclusion

**drpc's plugin system is insufficient** for better-auth integration because:

1. **Cannot add routes from plugins** - `Plugin<Ctx>` only extends context, doesn't add procedures
2. **No client/server awareness** - no `$InferServerPlugin` equivalent for type inference
3. **Flat context only** - cannot achieve `ctx.auth.api` nested structure

**Recommendation:** Extend drpc's plugin system to support:
1. `router` property on plugins for adding procedures
2. Deep merge for nested context structures
3. Client awareness type marker (`$InferPluginProcedures`)

---

## See Also

- [deesse-rpc Integration](./server.md) - How deesse integrates with drpc
- [better-auth Plugin Creation](../external/packages/better-auth/plugins/creation/README.md) - Client/server plugin architecture
- [deessePlugin Design](./plugin.md) - Bridging better-auth to drpc