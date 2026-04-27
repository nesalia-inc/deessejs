# Creating API

Functions for creating and configuring your API instance.

## Overview

The API instance is created from procedures defined with `t.query()`, `t.mutation()`, `t.internalQuery()`, and `t.internalMutation()`. Use `createAPI()` for the full server API and `createPublicAPI()` for the client-safe API.

## createAPI

Creates a full API instance with router and middleware:

```typescript
function createAPI<Ctx, TRoutes extends Router>(
  config: {
    router: TRoutes
    middleware?: Middleware<Ctx>[]
  }
): APIInstance<Ctx, TRoutes>
```

### Example

```typescript
const api = createAPI({
  router: t.router({
    users: {
      get: t.query({ ... }),
      create: t.mutation({ ... }),
    },
    posts: {
      list: t.query({ ... }),
      get: t.query({ ... }),
      create: t.mutation({ ... }),
    },
  }),
})
```

## createPublicAPI

Creates a client-safe API that only exposes public operations (`query` and `mutation`). Internal operations are filtered out:

```typescript
function createPublicAPI<Ctx, TRoutes extends Router>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, TRoutes>
```

### Example

```typescript
import { createPublicAPI } from "@deessejs/server"

// Full API for server usage (all operations)
const api = createAPI({
  router: t.router({
    users: {
      get: t.query({ ... }),
      create: t.mutation({ ... }),
      delete: t.internalMutation({ ... }), // internal
      getAdminStats: t.internalQuery({ ... }), // internal
    },
  }),
})

// Client-safe API (only public operations)
const client = createPublicAPI(api)

export { api, client }
```

### Usage

**Server code** uses `api` (full access):
```typescript
// app/admin/page.tsx
import { api } from "@/server/api"

const stats = await api.users.getAdminStats({})  // ✅ Works
await api.users.delete({ id: 1 })                  // ✅ Works
```

**Client code** uses `client` (public only):
```typescript
// app/components/UserList.tsx
"use client"
import { client } from "@/server/api"

const users = await client.users.get({})       // ✅ Works
await client.users.create({ name: "John" })    // ✅ Works

// TypeScript error - not available on client!
const stats = await client.users.getAdminStats({})  // ❌ TS Error
await client.users.delete({ id: 1 })                // ❌ TS Error
```

## createClient

Alias for `createPublicAPI`. Creates a client-safe API for HTTP exposure:

```typescript
function createClient<Ctx, TRoutes extends Router>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, TRoutes>
```

### Example

```typescript
import { createClient } from "@deessejs/server"

const client = createClient(api)

// Same as createPublicAPI(api)
```

## createLocalExecutor

Creates a local executor for testing purposes:

```typescript
function createLocalExecutor<Ctx, TRoutes extends Router>(
  api: APIInstance<Ctx, TRoutes>
): {
  execute(route: string, args: unknown): Promise<Result<any>>
  getEvents(): EventPayload[]
}
```

### Example

```typescript
import { createLocalExecutor } from "@deessejs/server"

const executor = createLocalExecutor(api)

// Execute public operations
const result = await executor.execute("users.get", { id: 1 })

// Internal operations can also be executed locally
const stats = await executor.execute("users.getAdminStats", {})
```

## APIInstance

The API instance returned by `createAPI` and `createPublicAPI`:

```typescript
interface APIInstance<Ctx, TRoutes extends Router = Router> {
  router: TRoutes
  ctx: Ctx
  plugins: Array<Plugin<Ctx>>
  globalMiddleware: Middleware<Ctx>[]
  execute<TRoute extends keyof TRoutes>(
    route: TRoute,
    args: any
  ): Promise<Result<any>>
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `router` | `TRoutes` | The router containing all procedures |
| `ctx` | `Ctx` | The context object |
| `plugins` | `Plugin<Ctx>[]` | Array of plugins |
| `globalMiddleware` | `Middleware<Ctx>[]` | Array of global middleware |

### Methods

| Method | Description |
|--------|-------------|
| `execute(route, args)` | Execute a procedure by name |

### Example

```typescript
const api = createAPI({
  router: t.router({
    users: { get: t.query({ ... }) },
  }),
})

// Execute directly
const result = await api.execute("users.get", { id: 1 })

// Or via the router
const result = await api.users.get({ id: 1 })
```

## Complete Setup Example

```typescript
// server/drpc.ts
import { defineContext, createAPI, createPublicAPI } from "@deessejs/server"
import { z } from "zod"

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
    logger: console,
  },
  plugins: [authPlugin],
})

// Define procedures
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => { ... },
})

const createUser = t.mutation({
  args: z.object({ name: z.string(), email: z.string().email() }),
  handler: async (ctx, args) => { ... },
})

const deleteUser = t.internalMutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => { ... },
})

// Create APIs
const api = createAPI({
  router: t.router({
    users: {
      get: getUser,
      create: createUser,
      delete: deleteUser,
    },
  }),
})

// Client-safe API for HTTP
const client = createPublicAPI(api)

export { api, client }
```

## Next.js Integration

For HTTP exposure in Next.js, use `@deessejs/server-next`:

```typescript
// app/api/[...slug]/route.ts
import { client } from "@/server/drpc"
import { toNextJsHandler } from "@deessejs/server-next"

export const { POST, GET } = toNextJsHandler(client)
```

### Request Format

```bash
POST /api/users.get
Content-Type: application/json

{ "args": { "id": 123 } }
```

### Response Format

```json
{ "ok": true, "value": { ... } }
// or
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

## See Also

- [Defining Context](features/defining-context.md) - Entry point for defineContext
- [Router](features/router.md) - Organizing procedures
- [Security Model](features/security-model.md) - Public vs internal operations
- [@deesse-fp skill](../deesse-fp/SKILL.md) - Result type with ok/err patterns