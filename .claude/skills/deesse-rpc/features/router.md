# Router

`t.router()` creates a hierarchical router for organizing procedures into namespaces.

## Signature

```typescript
t.router<TRoutes extends Router>(routes: TRoutes): TRoutes
```

## Overview

The router organizes your procedures into a hierarchical structure, enabling clean URLs like `api.users.get()` or `api.posts.create()`.

## Basic Usage

```typescript
const api = createAPI({
  router: t.router({
    users: t.router({
      get: t.query({ ... }),
      create: t.mutation({ ... }),
      list: t.query({ ... }),
    }),
    posts: t.router({
      get: t.query({ ... }),
      create: t.mutation({ ... }),
      list: t.query({ ... }),
    }),
  }),
})

// Access via hierarchical paths
await api.users.get({ id: 1 })
await api.posts.list({ limit: 10 })
```

## Nested Routers

You can nest routers arbitrarily deep:

```typescript
t.router({
  admin: t.router({
    users: t.router({
      list: t.query({ ... }),
      delete: t.internalMutation({ ... }),
      stats: t.internalQuery({ ... }),
    }),
    settings: t.router({
      get: t.query({ ... }),
      update: t.mutation({ ... }),
    }),
  }),
  public: t.router({
    posts: t.router({
      list: t.query({ ... }),
      get: t.query({ ... }),
    }),
  }),
})

// Access via nested paths
api.admin.users.list()
api.admin.users.delete({ id: 1 })
api.admin.settings.update({ theme: "dark" })
api.public.posts.list()
```

## Flat vs Nested

### Flat Structure

```typescript
t.router({
  usersGet: t.query({ ... }),
  usersCreate: t.mutation({ ... }),
  usersList: t.query({ ... }),
  postsGet: t.query({ ... }),
  postsCreate: t.mutation({ ... }),
})
```

### Hierarchical Structure (Recommended)

```typescript
t.router({
  users: t.router({
    get: t.query({ ... }),
    create: t.mutation({ ... }),
    list: t.query({ ... }),
  }),
  posts: t.router({
    get: t.query({ ... }),
    create: t.mutation({ ... }),
    list: t.query({ ... }),
  }),
})
```

**Benefits of hierarchical structure:**
- Cleaner API surface (`api.users.get()` vs `apiUsersGet()`)
- Logical grouping of related procedures
- Better IDE autocomplete
- Scalable to many procedures

## Router with Procedures

### Complete Example

```typescript
import { defineContext, createAPI } from "@deessejs/server"
import { z } from "zod"

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
  },
})

// Define procedures
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    if (!user) return err({ code: "NOT_FOUND", message: "User not found" })
    return ok(user)
  },
})

const createUser = t.mutation({
  args: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user)
  },
})

const listUsers = t.query({
  args: z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
  }),
  handler: async (ctx, args) => {
    const users = await ctx.db.users.findMany({
      limit: args.limit ?? 10,
      offset: args.offset ?? 0,
    })
    return ok(users)
  },
})

// Internal procedure (not exposed via HTTP)
const deleteUser = t.internalMutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    await ctx.db.users.delete(args.id)
    return ok({ success: true })
  },
})

// Create API with router
const api = createAPI({
  router: t.router({
    users: t.router({
      get: getUser,
      create: createUser,
      list: listUsers,
      delete: deleteUser, // Internal - not exposed via HTTP
    }),
  }),
})

export { api }
```

## Type Safety

The router maintains full type safety:

```typescript
// TypeScript knows the exact shape
const result = await api.users.get({ id: 1 })
//    ^? Result<User>

// Wrong arguments are caught
api.users.get({ name: "John" })
//    ^? TypeScript error: 'name' does not exist in type
```

## Internal Operations

Internal operations (`t.internalQuery`, `t.internalMutation`) can be added to the router but are **not exposed via HTTP**:

```typescript
t.router({
  users: t.router({
    get: t.query({ ... }),           // Exposed via HTTP ✅
    create: t.mutation({ ... }),     // Exposed via HTTP ✅
    delete: t.internalMutation({ ... }), // NOT exposed via HTTP ❌
    stats: t.internalQuery({ ... }),    // NOT exposed via HTTP ❌
  }),
})
```

When you create a client with `createPublicAPI()` or `createClient()`, internal operations are automatically filtered out:

```typescript
import { createClient } from "@deessejs/server"

const client = createClient(api)

// Only public operations available
client.users.get({ id: 1 })     // ✅ Works
client.users.create({ name: "John" }) // ✅ Works
client.users.delete({ id: 1 })  // ❌ TypeScript error - not available
client.users.stats()             // ❌ TypeScript error - not available
```

## Dynamic Router Keys

You can use dynamic keys for dynamic routing:

```typescript
t.router({
  [resourceName]: t.query({ ... }) // Dynamic key
})
```

## Best Practices

1. **Group by domain** - Group procedures by feature or domain (users, posts, comments)
2. **Use consistent naming** - Keep names consistent (get, list, create, update, delete)
3. **Limit nesting depth** - 2-3 levels deep is usually sufficient
4. **Separate public and internal** - Use internalQuery/internalMutation for sensitive operations

## See Also

- [Defining Context](features/defining-context.md) - Entry point for creating procedures
- [Creating API](features/creating-api.md) - Creating the API instance
- [Queries](features/queries.md) - Query procedure definitions
- [Mutations](features/mutations.md) - Mutation procedure definitions