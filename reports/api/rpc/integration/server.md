# Deesse API - First-Class Integration

Deesse includes a first-class API layer built on `@deessejs/server`. From the developer's perspective, they simply extend the deesse instance with custom procedures - they don't need to know or think about "RPC". The underlying protocol is an implementation detail.

## Desired Developer Experience

### 1. Server Setup

```typescript
// src/server/index.ts
import { defineContext, createAPI, createPublicAPI, t } from "@deessejs/server";
import { getDeesse } from "deesse";
import { config } from "@deesse-config";
import { z } from "zod";
import { ok, err } from "@deessejs/fp";

// Get singleton deesse instance (auth + db) using user's config
const deesse = await getDeesse(config);

// Define context with deesse's auth and db
const { createAPI: mkAPI } = defineContext({
  context: {
    db: deesse.database,
    auth: deesse.auth,
  },
});

// Extend deesse with custom procedures
const appRouter = t.router({
  admin: t.router({
    users: t.router({
      list: t.query({
        args: z.object({ limit: z.number().default(10) }),
        handler: async (ctx, args) => {
          const users = await ctx.db.query.users.findMany({ limit: args.limit });
          return ok(users);
        },
      }),
      get: t.internalQuery({
        args: z.object({ id: z.string() }),
        handler: async (ctx, args) => {
          const user = await ctx.auth.$context.internalAdapter.listUsers(100);
          const found = user.find((u: any) => u.id === args.id);
          return found ? ok(found) : err({ code: "NOT_FOUND" });
        },
      }),
      delete: t.internalMutation({
        args: z.object({ id: z.string() }),
        handler: async (ctx, args) => {
          await ctx.auth.api.admin.deleteUser({ userId: args.id });
          return ok({ success: true });
        },
      }),
    }),
  }),
});

// Create API instances
export const api = mkAPI({ router: appRouter });
export const publicAPI = createPublicAPI(api);

// Export type for client use
export type AppRouter = typeof appRouter;
```

### 2. Server-Side Usage

```typescript
// In any server component or API route
import { api } from "@/server";

// Full API access (internal operations available)
const users = await api.admin.users.get({ id: "123" });
const allUsers = await api.admin.users.list({ limit: 10 });
await api.admin.users.delete({ id: "123" }); // internal mutation
```

### Key Principle

- **`api`** (server-only) → Full access including internal operations
- **`publicAPI`** → Client-safe API (excludes internal ops)
- The API is seamlessly integrated into deesse - developers just extend it with `t.query()`, `t.mutation()`, etc.

The `Deesse` type (from `getDeesse()`) is:

```typescript
type Deesse = {
  auth: Auth;                    // BetterAuth instance
  database: PostgresJsDatabase;   // Drizzle database
};
```

The API layer (`api`, `publicAPI`) is created by extending deesse via `defineContext()` and `createAPI()`.

---

## Context

The goal is to integrate the API layer as a first-class feature in deesse. Developers should not need to think about RPC - they simply extend their deesse instance with custom procedures. The underlying `@deessejs/server` protocol is an implementation detail.

---

## Current State Analysis

### Package Ecosystem

```
deesse/             (v0.2.12) - Core auth + DB abstraction, wraps better-auth
@deessejs/next/     (v0.1.4) - Next.js admin UI, depends on deesse
@deessejs/admin/    (v0.1.0) - React-agnostic admin logic (pages, sidebar, navigation)
@deessejs/ui/       (v0.3.2) - UI components (shadcn-based)
@deessejs/server/   (RPC)    - RPC protocol (separate package, skill only for now)
@deessejs/server-next (RPC)  - Next.js adapter wrapping server-hono
@deessejs/server-hono (RPC)  - Hono-based HTTP handler
```

### Existing RPC Infrastructure

The `@deessejs/server` ecosystem already provides Next.js integration:

```
Next.js Route Handler
    ↓
createNextHandler(client)     @deessejs/server-next
    ↓
createHonoHandler()           @deessejs/server-hono (internal)
    ↓
Procedure execution           @deessejs/server
```

**Key exports from `@deessejs/server-next`:**
```typescript
export function createNextHandler(client: HTTPClient): NextHandler

export interface NextHandler {
  GET: (request: Request | NextRequest) => Promise<Response>;
  POST: (request: Request | NextRequest) => Promise<Response>;
  PUT: (request: Request | NextRequest) => Promise<Response>;
  PATCH: (request: Request | NextRequest) => Promise<Response>;
  DELETE: (request: Request | NextRequest) => Promise<Response>;
  OPTIONS: (request: Request | NextRequest) => Promise<Response>;
}
```

### Current RPC Layer in @deessejs/next

The current REST API structure (`src/api/rest/`) is **minimal and tightly coupled to better-auth**:

```
src/api/rest/
├── index.ts          # exports REST_GET, REST_POST, handleFirstAdmin
└── admin/
    └── first-admin.ts  # POST /api/first-admin handler
```

**Current state:**
- `REST_GET` / `REST_POST` wrap `toNextJsHandler(config.auth)` from `better-auth/next-js`
- First-admin interception is done via URL string matching (`pathname === "/api/first-admin"`)
- No use of `defineContext`, `t.query()`, `t.mutation()`, or hierarchical routing
- No `createAPI()`, `createPublicAPI()`, or `createLocalExecutor()`

### API Protocol (from @deessejs/server)

**Core abstractions:**
- `defineContext()` - entry point creating the query builder `t` and `createAPI` factory
- `t.query()` / `t.mutation()` - public HTTP-exposed operations
- `t.internalQuery()` / `t.internalMutation()` - server-only operations
- `t.router()` - hierarchical route organization
- `createAPI()` - full API with all operations
- `createPublicAPI()` / `createClient()` - client-safe API (excludes internal ops)
- `ok()` / `err()` - Result pattern for explicit error handling
- Multi-engine validation (Zod, Valibot, ArkType, Typia) via Standard Schema

**Security model:**
| Operation | HTTP Exposed | Callable from Server |
|-----------|-------------|---------------------|
| `t.query()` | Yes | Yes |
| `t.mutation()` | Yes | Yes |
| `t.internalQuery()` | **No** | Yes |
| `t.internalMutation()` | **No** | Yes |

---

## Proposed Integration Architecture

### Package Boundaries (Separate but Integrated)

```
┌─────────────────────────────────────────────────────────────────┐
│                        @deessejs/next                            │
│                                                                  │
│  ┌──────────────┐   ┌─────────────────────────────────────────┐ │
│  │ better-auth  │   │          API Layer                           │ │
│  │  (session,   │   │  defineContext() → t.query/mutation()   │ │
│  │   login)     │   │  + createNextHandler()                  │ │
│  └──────────────┘   └─────────────────────────────────────────┘ │
│                                                                  │
│  Built-in route: app/(deesse)/api/[...slug]/route.ts            │
└─────────────────────────────────────────────────────────────────┘
```

### Built-in Route Structure in @deessejs/next

```
app/(deesse)/
├── api/
│   ├── auth/[...path]/route.ts    ← better-auth endpoints
│   └── [...slug]/route.ts        ← custom procedure endpoints (built-in)
├── admin/                          ← admin pages
├── (auth)/login/                   ← auth pages
└── layout.tsx                      ← RootPage handling
```

### Key Design Decisions

#### 1. No Plugin - Direct Context via `getDeesse()`

The `deessePlugin` described in `plugin.md` is **not needed**. Instead, use `defineContext()` directly with the singleton from `getDeesse()`:

```typescript
// src/server/index.ts
import { defineContext, createAPI, createPublicAPI, t } from "@deessejs/server";
import { getDeesse } from "deesse";
import { config } from "@deesse-config"; // user's deesse config
import { z } from "zod";
import { ok, err } from "@deessejs/fp";

// Get singleton deesse instance (auth + db) using user's config
const deesse = await getDeesse(config);

// Define context with deesse's auth and db
const { createAPI: mkAPI } = defineContext({
  context: {
    db: deesse.database,
    auth: deesse.auth,
  },
});

// Extend deesse with custom procedures
const appRouter = t.router({
  admin: t.router({
    users: t.router({
      list: t.query({
        args: z.object({ limit: z.number().default(10) }),
        handler: async (ctx, args) => {
          const users = await ctx.db.query.users.findMany({ limit: args.limit });
          return ok(users);
        },
      }),
      get: t.internalQuery({
        args: z.object({ id: z.string() }),
        handler: async (ctx, args) => {
          const user = await ctx.auth.$context.internalAdapter.listUsers(100);
          const found = user.find((u: any) => u.id === args.id);
          return found ? ok(found) : err({ code: "NOT_FOUND" });
        },
      }),
      delete: t.internalMutation({
        args: z.object({ id: z.string() }),
        handler: async (ctx, args) => {
          await ctx.auth.api.admin.deleteUser({ userId: args.id });
          return ok({ success: true });
        },
      }),
    }),
  }),
});

// Create API instances
export const api = mkAPI({ router: appRouter });
export const publicAPI = createPublicAPI(api);

// Export type for client use
export type AppRouter = typeof appRouter;
```

Then in Next.js route handler - the unified handler handles **all routes** (better-auth at `/api/auth/*` and custom procedures for everything else):

```typescript
// app/api/[...slug]/route.ts
import { createDeesseHandler } from "@deessejs/next";
import { publicAPI } from "@/server";
import { config } from "@deesse-config";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = createDeesseHandler(publicAPI, { config });
```

**Note:** `createDeesseHandler` replaces the old `REST_GET`/`REST_POST` pattern. It routes:
- `/api/auth/*` → better-auth handlers
- All other routes → custom procedures (no prefix required)

#### 2. `packages/next` modification

The `packages/next` package should be modified to:

1. Export `createNextHandler` from `@deessejs/server-next`
2. Update `REST_GET`/`REST_POST` to be deprecated in favor of the new pattern
3. Provide a unified handler that routes all API requests

Example of what `packages/next` could export:

```typescript
// packages/next/src/api/handler.ts (new file)
import { createNextHandler as serverCreateNextHandler } from "@deessejs/server-next";
import type { InternalConfig } from "deesse";

export function createDeesseHandler(publicAPI: any, config: InternalConfig) {
  return serverCreateNextHandler(publicAPI, { config });
}

// In packages/next/src/index.ts, add:
export { createDeesseHandler } from "./api/handler";
```

This allows users to replace their current `REST_GET`/`REST_POST` pattern:

**Old pattern (deprecated):**
```typescript
// app/api/[...path]/route.ts
import { deesseAuth } from "@/lib/deesse";
import { REST_GET, REST_POST } from "@deessejs/next/routes";

export const GET = REST_GET({ auth: deesseAuth });
export const POST = REST_POST({ auth: deesseAuth });
```

**New pattern:**
```typescript
// app/api/[...slug]/route.ts
import { createDeesseHandler } from "@deessejs/next";
import { publicAPI } from "@/server";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = createDeesseHandler(publicAPI, { config });
```

The `createDeesseHandler` handles **all** routes:
- `/api/auth/*` → better-auth handlers
- All other routes → custom procedures (no prefix)

#### 3. First-admin flow as internal mutation

```typescript
const createFirstAdmin = t.internalMutation({
  args: z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(8),
  }),
  handler: async (ctx, args) => {
    // Check no admin exists
    const hasAdmin = await ctx.auth.$context.internalAdapter.listUsers(100).then(u => u.length > 0);
    if (hasAdmin) {
      return err({ code: "ADMIN_EXISTS", message: "Admin already exists" })
    }
    // Create via better-auth
    const result = await ctx.auth.api.createUser({
      email: args.email,
      password: args.password,
      name: args.name,
    })
    return ok({ userId: result.user.id })
  }
})
```

---

## Summary: Simpler Architecture

**Old approach (complex):**
- `deessePlugin` to bridge config → RPC context
- Plugin system adds complexity
- Still need to create auth separately via better-auth

**New approach (simple):**
1. User's `src/server/index.ts` uses `getDeesse(config)` directly
2. Passes `deesse.auth` and `deesse.database` to `defineContext()`
3. Exports `publicAPI` from their server
4. In Next.js route: `createDeesseHandler(publicAPI, config)` from `@deessejs/next`
5. `createDeesseHandler` routes ALL requests: better-auth, RPC, first-admin

**Benefits:**
- No plugin needed
- Singleton reused (HMR handled by `getDeesse()`)
- Single handler for all routes (better-auth + RPC + first-admin)
- User has full control over their API shape

---

## Open Questions

1. **`createDeesseHandler` signature:** Should it take `config` as second arg, or read from global `defineConfig()` context?

2. **Deprecation timeline:** Should `REST_GET`/`REST_POST` be removed immediately or kept for backward compatibility during migration?

3. **`createNextHandler` vs `createDeesseHandler` naming:** Is `createDeesseHandler` the right name, or should it be `createHandler` / `createAPIGateway` / something else?

4. **Route conflict:** If user defines a procedure at the same path as a better-auth route, which takes precedence?

---

## See Also

- [Client Integration](./client.md) - Client-side setup and usage
- `../deesse-rpc/SKILL.md` - Full RPC protocol documentation
- `../deesse-rpc/features/defining-context.md` - defineContext() reference
