# Cache System

The cache system allows queries to return cached results and mutations to trigger cache invalidation.

## Overview

Query results carry **cache keys** that identify what data was fetched. Mutations return **invalidation keys** to trigger automatic cache invalidation. This enables zero-config cache synchronization between server and client.

## Core Concepts

### Cache Keys

Cache keys identify data for caching and invalidation:

```typescript
// String key
"users"

// Nested key with ID
["users", { id: 1 }]

// Nested key with multiple params
["users", "list", { page: 1, limit: 10 }]

// Hierarchical key
["users", { id: 1 }, "posts"]
```

### Query Returns Keys

Queries return cache keys that clients can use:

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    return withMetadata(user, {
      keys: [["users", { id: args.id }]]
    })
  }
})
```

### Mutations Return Invalidation

Mutations return keys to invalidate:

```typescript
const updateUser = t.mutation({
  args: z.object({ id: z.number(), name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.update(args.id, { name: args.name })
    return withMetadata(user, {
      invalidate: [["users", { id: args.id }], "users:list"]
    })
  }
})
```

## WithMetadata

Attaches cache metadata to results:

```typescript
import { withMetadata } from "@deessejs/server"

handler: async (ctx, args) => {
  const user = await ctx.db.users.find(args.id)
  return withMetadata(user, {
    keys: [["users", { id: args.id }]],
    ttl: 60000 // Optional: cache TTL in milliseconds
  })
}
```

### WithMetadata Options

| Option | Type | Description |
|--------|------|-------------|
| `keys` | `CacheKey[]` | Cache keys for the data returned |
| `invalidate` | `CacheKey[]` | Keys to invalidate after mutation |
| `ttl` | `number` | Time-to-live in milliseconds |

### CacheKey Type

```typescript
type CacheKey = string | (string | Record<string, unknown>)[]
```

## Typed Key Registry

Define a registry for type-safe cache keys:

```typescript
import { defineCacheKeys } from "@deessejs/server"

const keys = defineCacheKeys({
  users: {
    _root: "users",
    list: (params?: { page?: number; limit?: number }) =>
      ["users", "list", params],
    count: () => ["users", "count"],
    byId: (id: number) => ["users", { id }],
    search: (query: string) => ["users", "search", { q: query }],
  },
  posts: {
    _root: "posts",
    list: () => ["posts", "list"],
    byId: (id: number) => ["posts", { id }],
    byAuthor: (authorId: number) => ["posts", "byAuthor", { authorId }],
  },
})

export { keys }
```

### Benefits

```typescript
// Autocomplete works!
keys.users. // shows: list, count, byId, search

// Type checking catches typos
keys.users.byId(1)   // ✅ Valid
keys.user.byId(1)    // ❌ TypeScript error

// Refactoring is safe
// Rename in registry → all usages update
```

## Usage in Queries

### Basic Query with Cache Keys

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    return withMetadata(user, {
      keys: [keys.users.byId(args.id)]
    })
  }
})
```

### Query with Multiple Cache Keys

```typescript
const listUsers = t.query({
  args: z.object({ page: z.number().default(1), limit: z.number().default(10) }),
  handler: async (ctx, args) => {
    const users = await ctx.db.users.findMany({
      take: args.limit,
      skip: (args.page - 1) * args.limit,
    })
    return withMetadata(users, {
      keys: [
        keys.users.list({ page: args.page, limit: args.limit }),
        keys.users.count(),
      ]
    })
  }
})
```

### Query with TTL

```typescript
const getConfig = t.query({
  handler: async (ctx) => {
    const config = await ctx.db.config.findUnique()
    return withMetadata(config, {
      keys: ["config"],
      ttl: 60000 // 1 minute cache
    })
  }
})
```

## Usage in Mutations

### Basic Invalidation

```typescript
const createUser = t.mutation({
  args: z.object({ name: z.string(), email: z.string().email() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return withMetadata(user, {
      invalidate: [keys.users.list(), keys.users.count()]
    })
  }
})
```

### Invalidation with Updated Item

```typescript
const updateUser = t.mutation({
  args: z.object({ id: z.number(), name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.update(args.id, { name: args.name })
    return withMetadata(user, {
      invalidate: [
        keys.users.byId(args.id),
        keys.users.list(),
      ]
    })
  }
})
```

### Delete with Invalidation

```typescript
const deleteUser = t.mutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    await ctx.db.users.delete(args.id)
    return withMetadata({ id: args.id }, {
      invalidate: [
        keys.users.byId(args.id),
        keys.users.list(),
        keys.users.count(),
      ]
    })
  }
})
```

## Cache Key Patterns

| Pattern | Key Format | Example |
|---------|-----------|---------|
| Single item | `["resource", { id }]` | `["users", { id: 1 }]` |
| List | `["resource", "list"]` | `["users", "list"]` |
| Paginated | `["resource", "list", { page }]` | `["users", "list", { page: 1 }]` |
| Count | `["resource", "count"]` | `["users", "count"]` |
| Search | `["resource", "search", { q }]` | `["users", "search", { q: "john" }]` |

## Stable Serialization

Cache keys are serialized deterministically:

```typescript
// These produce the same serialized key regardless of property order
["users", { id: 1, name: "John" }]
["users", { name: "John", id: 1 }]

// Alphabetical sorting ensures consistency
// Object keys are sorted: id, then name
```

## Client-Side Sync

When using `@deessejs/client-react`, mutations automatically invalidate affected queries:

```typescript
// Client component
const { data: user } = useQuery(client.users.get, { args: { id: 1 } })

// Mutation on server returns invalidate: [["users", { id: 1 }]]
// Client SDK automatically refetches affected queries
```

## Next.js Integration

Cache keys work with Next.js Data Cache:

```typescript
const updateUser = t.mutation({
  handler: async (ctx, args) => {
    const user = await ctx.db.users.update(args)
    return withMetadata(user, {
      invalidate: [keys.users.list()]  // Also calls revalidateTag()
    })
  }
})
```

## Best Practices

1. **Use consistent key patterns** - Define a convention and stick to it
2. **Invalidate related keys** - When updating user, invalidate list keys too
3. **Use TTL for rarely changing data** - Config, settings, etc.
4. **Don't over-cache** - Cache expensive operations, not everything
5. **Clear specific keys** - Use exact keys for targeted invalidation

```typescript
// Good: Invalidate both specific and list
return withMetadata(user, {
  invalidate: [
    keys.users.byId(args.id),
    keys.users.list()
  ]
})

// Good: Use TTL for config
return withMetadata(config, {
  keys: ["config"],
  ttl: 300000 // 5 minutes
})
```

## See Also

- [Queries](features/queries.md) - Query procedure definition
- [Mutations](features/mutations.md) - Mutation procedure definition
- [React Hooks](features/react-hooks.md) - Client-side cache sync