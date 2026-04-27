# Security Model

The security model separates public operations from internal ones, ensuring sensitive operations remain server-only.

## Overview

A key insight addressed by `@deessejs/server` is that **Next.js Server Actions are not secure** - they can be called by anyone via HTTP. This package solves this by separating operations.

## Operation Types

| Operation | HTTP Exposed | Server-Only | Use Case |
|-----------|-------------|-------------|----------|
| `query()` | Yes | Yes | Public read operations |
| `mutation()` | Yes | Yes | Public write operations |
| `internalQuery()` | **No** | Yes | Admin operations, sensitive data |
| `internalMutation()` | **No** | Yes | Admin mutations, critical actions |

## Security Model Table

```
┌────────────────────┬────────────┬─────────────┐
│ Operation          │ HTTP/API   │ Server Only │
├────────────────────┼────────────┼─────────────┤
│ t.query()          │ ✅ Yes     │ ✅ Yes      │
│ t.mutation()       │ ✅ Yes     │ ✅ Yes      │
│ t.internalQuery()  │ ❌ No      │ ✅ Yes      │
│ t.internalMutation │ ❌ No      │ ✅ Yes      │
└────────────────────┴────────────┴─────────────┘
```

## When to Use Each

### Public Operations (`query`, `mutation`)

Use for operations that should be accessible from:
- Client components
- External applications
- Third-party integrations

```typescript
// Public - can be called from client via HTTP
const getPublicData = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => { ... }
})

const createPost = t.mutation({
  args: z.object({ title: z.string(), content: z.string() }),
  handler: async (ctx, args) => { ... }
})
```

### Internal Operations (`internalQuery`, `internalMutation`)

Use for operations that should **never** be exposed to the internet:
- Admin-only functionality
- Sensitive data access (audit logs, payment info)
- Server-only operations (cron jobs, webhooks)
- Operations requiring server credentials

```typescript
// Internal - only server code can call this
const getAdminStats = t.internalQuery({
  handler: async (ctx) => {
    return ok({
      totalRevenue: await ctx.db.orders.sum(),
      activeUsers: await ctx.db.users.count()
    })
  }
})

// Internal - only server code can call this
const deleteUser = t.internalMutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    await ctx.db.users.delete(args.id)
    return ok({ success: true })
  }
})
```

## HTTP Exposure

### Route Handler

When you expose via Next.js route handler, only **public** operations are exposed:

```typescript
// app/api/[...slug]/route.ts
import { createRouteHandler } from "@deessejs/server-next"
import { client } from "@/server/api"

export const POST = createRouteHandler(client)
```

### What Gets Exposed

| Operation | Exposed via HTTP | Callable from Server |
|-----------|-----------------|---------------------|
| `query()` | ✅ Yes | ✅ Yes |
| `mutation()` | ✅ Yes | ✅ Yes |
| `internalQuery()` | ❌ No | ✅ Yes |
| `internalMutation()` | ❌ No | ✅ Yes |

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

## Client-Safe API

Create a separate client-safe API that only exposes public operations:

```typescript
import { createPublicAPI } from "@deessejs/server"

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

### TypeScript Safety

Internal operations are **not available** on the client API:

```typescript
// client.users.get - ✅ Available (public query)
client.users.get({ id: 1 })

// client.users.delete - ❌ TypeScript error (internal mutation)
client.users.delete({ id: 1 }) // Error!

// client.users.getAdminStats - ❌ TypeScript error (internal query)
client.users.getAdminStats() // Error!
```

## Server-Side Usage

Internal operations work from any server-side code:

```typescript
// Server Component
import { api } from "@/server/api"

export default async function AdminPage() {
  // Internal operations work
  const stats = await api.users.getAdminStats({})
  return <Dashboard stats={stats} />
}

// Server Action
"use server"
import { api } from "@/server/api"

export async function deleteUserAction(id: number) {
  // Internal mutation works
  await api.users.delete({ id })
}

// Other internal operations
await api.users.get({ id: 1 }) // ✅ Works
```

## Authentication & Authorization

Even public operations should verify permissions:

```typescript
const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => {
    // Check authentication
    if (!ctx.userId) {
      return err({ code: "UNAUTHORIZED", message: "Please log in" })
    }

    // Check authorization
    if (ctx.userId !== args.id && ctx.role !== "admin") {
      return err({ code: "FORBIDDEN", message: "Cannot view this user" })
    }

    return ok(await ctx.db.users.find(args.id))
  }
})
```

## Plugins (Server-Only Context)

Plugins extend the server-side context only. Plugin properties are **never exposed** to clients.

### What Plugins Add

- Server-side context properties (e.g., `userId`, `requireAuth()`)
- Helper functions available in handlers
- Lifecycle hooks (onInvoke, onSuccess, onError)

### Security Boundaries

| Feature | Client Access | Server Access |
|---------|---------------|---------------|
| Base context | Yes (via query/mutation args) | Yes |
| Plugin properties | **No** | Yes |
| `internalQuery` | **No** | Yes |
| `internalMutation` | **No** | Yes |

```typescript
// Plugin - server-only properties
const authPlugin = plugin("auth", (ctx) => ({
  userId: null as string | null,    // Never sent to client
  requireAuth: () => { ... }         // Never sent to client
}))

// Public query - plugin props available in handler, not in response
const getUser = t.query({
  handler: async (ctx, args) => {
    ctx.requireAuth()  // Works! Server-side only
    return ok(await ctx.db.users.find(args.id))
  }
})
```

**Key insight**: Even when a handler uses plugin properties, only the handler's return value is sent to the client. Plugin properties remain server-side.

## Best Practices

### 1. Use Internal for Sensitive Operations

```typescript
// Good: Admin stats are internal
const getAdminStats = t.internalQuery({
  handler: async (ctx) => {
    return ok({
      totalRevenue: await ctx.db.orders.sum(),
      userCount: await ctx.db.users.count()
    })
  }
})
```

### 2. Always Authenticate Public Operations

```typescript
// Good: Auth check on public mutation
const createPost = t.mutation({
  args: z.object({ title: z.string(), content: z.string() }),
  handler: async (ctx, args) => {
    if (!ctx.userId) {
      return err({ code: "UNAUTHORIZED", message: "Must be logged in" })
    }
    return ok(await ctx.db.posts.create({ ...args, authorId: ctx.userId }))
  }
})
```

### 3. Use Descriptive Names for Internal Operations

```typescript
// Good: Clear naming
t.internalQuery({ name: "admin.getSystemStats", ... })
t.internalMutation({ name: "admin.deleteUser", ... })

// Avoid: Generic names
t.internalQuery({ name: "query1", ... })
t.internalMutation({ name: "mutation1", ... })
```

## See Also

- [Queries](features/queries.md) - Public read operations
- [Mutations](features/mutations.md) - Public write operations
- [Internal Operations](features/internal-operations.md) - Server-only operations
- [Creating API](features/creating-api.md) - createPublicAPI for client-safe API