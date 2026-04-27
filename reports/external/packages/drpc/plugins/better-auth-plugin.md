# better-auth Plugin for drpc: Desired Developer Experience

## Overview

This document describes how better-auth could work as a plugin for drpc (or any RPC framework), enabling seamless auth in procedure handlers via `ctx.auth`.

**Focus:** better-auth standalone - its client/server plugin architecture and how it could integrate with an RPC framework.

---

## better-auth Plugin Architecture Recap

### Server Plugin

```typescript
interface BetterAuthPlugin {
  id: "better-auth";
  endpoints?: { [key: string]: Endpoint };
  schema?: BetterAuthPluginDBSchema;
  init?: (ctx: AuthContext) => void;
  hooks?: { before?, after? };
  // Server is completely unaware of client
}
```

### Client Plugin

```typescript
interface BetterAuthClientPlugin {
  id: "better-auth";
  $InferServerPlugin?: BetterAuthPlugin;  // Links to server
  pathMethods?: Record<string, "POST" | "GET">;
  getAtoms?: ($fetch) => Record<string, Atom<any>>;
  getActions?: ($fetch, $store) => Record<string, any>;
}
```

### The Key Pattern

```typescript
// Server plugin defines endpoints
const serverPlugin = {
  id: "better-auth",
  endpoints: {
    getSession: { handler: async (ctx) => ctx.adapter.getSession() },
    signIn: { handler: async (ctx, args) => { ... } },
  }
};

// Client plugin uses $InferServerPlugin for type inference
const clientPlugin = {
  id: "better-auth",
  $InferServerPlugin: {},  // Empty object - type marker only
  pathMethods: {
    "/auth/get-session": "GET",
    "/auth/sign-in": "POST",
  }
};
```

---

## Desired DX: Full Setup

### Step 1: Create better-auth Server Instance

```typescript
// Create better-auth instance ONCE (server-side)
const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  // ... other better-auth options
});
```

### Step 2: Create better-auth Client Instance

```typescript
// Create better-auth client (client-side, uses env vars)
const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
  plugin: betterAuthClient()
});
```

### Step 3: Register Both as Plugin

```typescript
// With an RPC framework that supports plugins
const { t, createAPI } = defineContext({
  plugins: [
    // Pass BOTH instances
    betterAuthPlugin({
      instance: auth,        // Server instance → ctx.auth.instance
      client: authClient    // Client instance → client.auth
    })
  ],
});
```

### Step 4: Use in Handlers

```typescript
const appRouter = t.router({
  users: t.router({
    // PUBLIC - can only access ctx.auth.session
    list: t.query({
      args: z.object({ limit: z.number().default(10) }),
      handler: async (ctx, args) => {
        // ✓ ctx.auth.session available
        const currentUser = ctx.auth.session?.user.id;

        // ✗ ctx.auth.instance NOT available - TypeScript error
        const users = await ctx.db.query.users.findMany({ limit: args.limit });
        return ok(users);
      },
    }),

    // INTERNAL - can access ctx.auth.session AND ctx.auth.instance
    listAll: t.internalQuery({
      handler: async (ctx, args) => {
        // ✓ Both available
        const currentUser = ctx.auth.session?.user.id;
        const users = await ctx.auth.instance.api.admin.listUsers({ limit: 100 });
        return ok(users);
      },
    }),
  }),
});
```

### Why Pass Both Instances?

| Aspect | Only Server | Both Instances |
|--------|-------------|----------------|
| **Server handlers** | ✓ `ctx.auth.instance` | ✓ `ctx.auth.instance` |
| **Client auth** | ✗ Not connected | ✓ `client.auth` |
| **Type safety** | Partial | Full |
| **User controls lifecycle** | ✓ | ✓ |

### Why User Creates the Client?

The user (developer) creates the `authClient` because:

1. **Environment variables** - `NEXT_PUBLIC_BASE_URL` is only available in client code
2. **Plugin configuration** - `betterAuthClient()` needs to match server plugins
3. **Lifecycle** - User controls when/where the client is instantiated

The plugin is a **thin bridge** that connects the two instances, not the creator of them.

### Context Access: Security by Design

The plugin provides **two tiers** of auth context:

#### Public Procedures (`t.query`, `t.mutation`)

```typescript
// Available in ALL procedures
handler: async (ctx, args) => {
  ctx.auth.session  // ✓ Available - validated session
  ctx.auth.instance // ✗ TypeScript error - not available in public

  // Safe - can only access session
  const userId = ctx.auth.session?.user.id;
}
```

#### Internal Procedures (`t.internalQuery`, `t.internalMutation`)

```typescript
// Available ONLY in internal procedures
handler: async (ctx, args) => {
  ctx.auth.session   // ✓ Available
  ctx.auth.instance  // ✓ Available - full better-auth access

  // Privileged operations are safe here
  await ctx.auth.instance.api.admin.listUsers({ limit: 100 });
  await ctx.auth.instance.api.admin.deleteUser({ userId: args.id });
}
```

**Security Guarantee:** It's impossible to use `ctx.auth.instance` in a public procedure - TypeScript will error at compile time.

---

## Desired DX: Client Setup

### Unified Client

```typescript
// Client setup - authClient is already configured (passed to plugin)
// Just add the RPC transport
export const client = createUnifiedClient({
  auth: authClient,  // Already has baseURL + betterAuthClient plugin
  api: {
    transport: fetchTransport("/api/rpc"),
  },
});
```

### Auth + RPC Combined

The `client` object provides **both**:

```typescript
// Authentication (from better-auth via authClient)
const { data: session } = client.auth.useSession();
await client.auth.signIn({ email: "...", password: "..." });
await client.auth.signOut();

// RPC procedures (from drpc router)
const { data: users } = client.api.users.list.useQuery({ limit: 10 });
await client.api.users.delete.useMutation({ id: "123" });
```

---

## Desired Context Structure

### Two-Tier TypeScript Types

```typescript
// For PUBLIC procedures (t.query, t.mutation)
type PublicContext = BaseContext & {
  auth: {
    session: Session | null;  // Only session
  };
};

// For INTERNAL procedures (t.internalQuery, t.internalMutation)
type InternalContext = BaseContext & {
  auth: {
    session: Session | null;
    instance: BetterAuthInstance;  // Full access
  };
};

type UnifiedClient = {
  auth: BetterAuthClient;    // Session, signIn, signOut, useSession
  api: RPCClient;            // RPC procedures from AppRouter
};
```

### Unified Client Types

```typescript
// The unified client exposed to consumers
type UnifiedClient = {
  auth: BetterAuthClient;    // Session, signIn, signOut, useSession
  api: RPCClient;            // RPC procedures from AppRouter
};
```

---

## Desired Plugin Interface (for RPC frameworks)

### Two-Tier Context Extension

The plugin uses **two separate context extensions** for security:

```typescript
// For an RPC framework to support better-auth as a plugin

interface RPCPlugin<Ctx> {
  name: string;

  // Context available in ALL procedures (public & internal)
  extend?: (ctx: Ctx) => Partial<Ctx>;

  // Context available ONLY in internal procedures
  extendInternal?: (ctx: Ctx) => Partial<Ctx>;

  router?: (t: QueryBuilder) => Router;
}

interface BetterAuthRPCPluginOptions {
  instance: BetterAuthInstance;
  client: BetterAuthClientInstance;
}

interface BetterAuthRPCPlugin extends RPCPlugin<BaseContext> {
  name: "better-auth";

  new (options: BetterAuthRPCPluginOptions): BetterAuthRPCPlugin;

  // Available in ALL procedures - safe subset
  extend: (ctx: BaseContext) => {
    auth: {
      session: Session | null;  // Only session, not full instance
    };
  };

  // Available ONLY in internalQuery/internalMutation
  extendInternal: (ctx: BaseContext) => {
    auth: {
      instance: BetterAuthInstance;  // Full access - privileged
    };
  };

  router?: (t: QueryBuilder) => {
    "auth/get-session": t.query({ ... });
    "auth/sign-in": t.mutation({ ... });
    "auth/sign-out": t.mutation({ ... });
  };
}
```

### Why Two Extensions?

| Extension | Available in | Usage |
|-----------|--------------|-------|
| `extend` | `t.query()`, `t.mutation()` | `ctx.auth.session` only |
| `extendInternal` | `t.internalQuery()`, `t.internalMutation()` | `ctx.auth.session` + `ctx.auth.instance` |

This prevents accidentally using privileged operations in public procedures. See [Two-Tier Context System](../context/README.md) for details.

---

## Usage in Components

### Full-Featured Client

```typescript
// React component
export function UserBadge() {
  // better-auth session
  const { data: session } = client.auth.useSession();

  // RPC query
  const { data: users } = client.api.users.list.useQuery({ limit: 5 });

  if (!session) {
    return <SignInButton />;
  }

  return (
    <div>
      <span>{session.user.name}</span>
      <span>{users?.length} users</span>
      <SignOutButton />
    </div>
  );
}
```

---

## Context in Procedures: Security by Architecture

### Public Procedures

```typescript
// t.query() and t.mutation() - PUBLIC
// Has access to: ctx.auth.session only

t.query({
  handler: async (ctx, args) => {
    // ✓ CAN access session
    const userId = ctx.auth.session?.user.id;

    // ✗ CANNOT access instance - TypeScript error
    ctx.auth.instance.api.admin.listUsers(); // Error!

    return ok({ userId });
  }
});
```

### Internal Procedures

```typescript
// t.internalQuery() and t.internalMutation() - INTERNAL
// Has access to: ctx.auth.session + ctx.auth.instance

t.internalQuery({
  handler: async (ctx, args) => {
    // ✓ CAN access session
    const userId = ctx.auth.session?.user.id;

    // ✓ CAN access instance - full privileges
    await ctx.auth.instance.api.admin.listUsers({ limit: 100 });

    return ok({ userId });
  }
});
```

### Client-Side: Public Procedures Only

On the client, only **public procedures** are exposed:

```typescript
// Available on client.auth (better-auth built-in)
client.auth.useSession()     // GET /auth/session
client.auth.signIn(...)      // POST /auth/sign-in
client.auth.signOut()        // POST /auth/sign-out

// Available on client.api (user-defined public procedures)
client.api.users.list.useQuery({ limit: 10 });
client.api.users.delete.useMutation({ id: "123" });

// INTERNAL procedures are NOT callable from client
// They are server-only
```

---

## Comparison: better-auth Standalone vs as RPC Plugin

### Standalone (Current)

```typescript
// Server
export const auth = betterAuth({ ... });

// Client - TWO separate clients
export const authClient = createAuthClient({
  baseURL: "...",
  plugin: betterAuthClient()
});

export const apiClient = createRPCClient({
  transport: fetchTransport("/api")
});

// Two separate clients, two import paths
authClient.useSession();
apiClient.users.list();
```

### As RPC Plugin (Desired)

```typescript
// Server
// 1. Create better-auth server instance ONCE
const auth = betterAuth({
  database: drizzleAdapter(db),
  emailAndPassword: { enabled: true },
});

// 2. Create better-auth client instance
const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
  plugin: betterAuthClient()
});

// 3. Pass BOTH instances to plugin
defineContext({
  plugins: [betterAuthPlugin({
    instance: auth,      // Server
    client: authClient  // Client
  })]
});

// 4. Unified client - SINGLE import
export const client = createUnifiedClient({
  auth: authClient,                    // Already configured
  api: { transport: fetchTransport("/api/rpc") }
});

// Single client with both
client.auth.useSession();      // better-auth
client.api.users.list();       // drpc RPC
```

---

## DX Benefits

| Aspect | Standalone | As RPC Plugin |
|--------|-----------|---------------|
| **Two import paths** | `authClient` + `apiClient` | Single `client` object |
| **Instance management** | Manual both | Pass instances to plugin |
| **Server context** | N/A | `ctx.auth.session` + `ctx.auth.instance` (internal only) |
| **Client auth** | Separate | `client.auth` unified |
| **Security** | Convention | TypeScript enforced |
| **Type inference** | Via `$InferServerPlugin` | Via shared `AppRouter` |

---

## Key Architecture Points

### 1. Two-Tier Context Security

The plugin defines **two separate context extensions**:

```typescript
extend: (ctx) => ({
  auth: { session: ctx.session }  // Available in ALL procedures
});

extendInternal: (ctx) => ({
  auth: { instance: ctx.instance }  // Available in INTERNAL only
});
```

This ensures `ctx.auth.instance` (privileged) is **never available** in public procedures.

### 2. $InferServerPlugin is Type-Only

```typescript
// Client plugin
{
  $InferServerPlugin: {},  // Empty object at runtime
  pathMethods: { ... }
}

// At runtime, this is just:
{
  pathMethods: { ... }
}

// TypeScript erases $InferServerPlugin but uses it for inference
```

### 2. Server Has No Client Awareness

```typescript
// Server plugin - completely unaware of client
{
  id: "better-auth",
  endpoints: { ... },
  // No $InferClientPlugin or similar
}

// Server just processes HTTP requests
// It doesn't know or care about the client plugin
```

### 3. Communication is HTTP Only

```
Client Plugin ──── HTTP ────► Server Endpoint
     │                           │
     │ $InferServerPlugin        │ endpoints
     │ (type marker only)        │
     ▼                           ▼
  No runtime link           Just HTTP handler
```

---

## Open Questions

1. **Atoms vs TanStack Query?**
   - better-auth uses atoms (nanostores)
   - Many RPC frameworks use TanStack Query
   - Should we bridge them or pick one?

2. **Plugin router vs procedure merging?**
   - Plugin adds routes via `router: (t) => ({...})`
   - Or procedures defined separately and merged?

---

## See Also

- [Two-Tier Context System](../context/README.md) - Detailed explanation of `extend` vs `extendInternal`
- [better-auth Plugin Creation](../../better-auth/plugins/creation/README.md) - Client/server plugin pattern
- [drpc Plugin Architecture](../../../../api/rpc/integration/drpc-plugins.md) - Current drpc plugin limitations
- [better-auth Official Docs](https://www.better-auth.com)