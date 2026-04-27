# Queries

Public read operations (`t.query()`) are exposed via HTTP and can be called from both client and server-side code.

## Overview

Public queries are the standard way to define read operations that need to be accessible from web clients, mobile apps, or any external consumers. They are automatically routed via HTTP and can be called using the client SDK or direct HTTP requests.

## Basic Definition

```typescript
import { defineContext } from "@deessejs/server"
import { ok, err } from "@deessejs/fp"
import { z } from "zod"

const { t } = defineContext({
  context: { db: myDatabase }
})

const getUser = t.query({
  args: z.object({
    id: z.number()
  }),

  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)

    if (!user) {
      return err({ code: "NOT_FOUND", message: "User not found" })
    }

    return ok(user)
  }
})
```

## Security Model

Public queries are exposed to the internet. Always consider:

- **Authentication**: Verify the user is logged in
- **Authorization**: Check if the user has permission to access the data
- **Input Validation**: Always validate and sanitize input
- **Rate Limiting**: Consider implementing rate limits for expensive operations

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

    const user = await ctx.db.users.find(args.id)

    // Check authorization - users can only view their own profile
    if (user.id !== ctx.userId && ctx.role !== "admin") {
      return err({ code: "FORBIDDEN", message: "Access denied" })
    }

    return ok(user)
  }
})
```

## API Reference

### `t.query(options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `args` | Standard Schema | No | Validation schema for arguments |
| `handler` | Function | Yes | Async function receiving `(ctx, args)` |

### Args Validation

Args are validated using your preferred validator (Zod, Valibot, ArkType, etc.):

```typescript
// Simple args
const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => { /* ... */ }
})

// Multiple args
const listUsers = t.query({
  args: z.object({
    search: z.string().optional(),
    limit: z.number().default(10),
    offset: z.number().default(0)
  }),
  handler: async (ctx, args) => { /* ... */ }
})

// No args - can be omitted entirely
const getStats = t.query({
  handler: async (ctx) => { /* ... */ }
})
```

### Handler

The handler receives:

- **`ctx`** - The context object with all your services
- **`args`** - The validated arguments (inferred from your schema)

```typescript
handler: async (ctx, args) => {
  // ctx.db - database access
  // ctx.userId - authenticated user ID
  // ctx.role - user role

  const user = await ctx.db.users.find(args.id)
  return ok(user)
}
```

### Return Types

Handlers can return values directly or use the Result pattern:

```typescript
// Direct return
handler: async (ctx, args) => {
  return await ctx.db.users.find(args.id)
}

// With explicit error handling (recommended)
handler: async (ctx, args) => {
  const user = await ctx.db.users.find(args.id)
  if (!user) {
    return err({ code: "NOT_FOUND", message: "User not found" })
  }
  return ok(user)
}

// By throwing errors
handler: async (ctx, args) => {
  const user = await ctx.db.users.find(args.id)
  if (!user) {
    throw new Error("User not found")
  }
  return user
}
```

## Lifecycle Hooks

Public queries support middleware hooks for logging, metrics, and more:

```typescript
const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => {
    return await ctx.db.users.find(args.id)
  }
})
  // Run before the handler
  .beforeInvoke((ctx, args) => {
    ctx.logger.info(`Fetching user ${args.id}`)
  })
  // Run after successful execution
  .onSuccess((ctx, args, data) => {
    ctx.logger.info(`User fetched: ${data.id}`)
  })
  // Run on error
  .onError((ctx, args, error) => {
    ctx.logger.error(`Failed to fetch user: ${error.message}`)
  })
```

### Available Hooks

| Hook | Parameters | Description |
|------|------------|-------------|
| `beforeInvoke` | `(ctx, args)` | Called before the handler runs |
| `onSuccess` | `(ctx, args, data)` | Called after successful execution |
| `onError` | `(ctx, args, error)` | Called when handler throws or returns error |

## Cache Metadata

Return cache keys to enable automatic cache invalidation:

```typescript
import { withMetadata } from "@deessejs/server"

handler: async (ctx, args) => {
  const user = await ctx.db.users.find(args.id)

  return withMetadata(user, {
    keys: [
      ["users", "list"],                    // Invalidate all user lists
      ["users", { id: args.id }],          // Invalidate specific user
      ["users", { id: args.id, "details" }] // Invalidate user details
    ]
  })
}
```

### With TTL

```typescript
handler: async (ctx, args) => {
  const settings = await ctx.db.settings.find()

  return withMetadata(settings, {
    keys: ["settings"],
    ttl: 60000 // 1 minute cache
  })
}
```

## Usage Examples

### From Server Components

```typescript
// app/users/page.tsx
import { api } from "@/server/api"

export default async function UsersPage() {
  const result = await api.users.get({ id: 1 })

  if (result.ok) {
    return <div>{result.value.name}</div>
  }

  return <div>User not found</div>
}
```

### From Server Actions

```typescript
// app/actions.ts
"use server"

import { api } from "@/server/api"

export async function getUser(id: number) {
  const result = await api.users.get({ id })

  if (result.ok) {
    return result.value
  } else {
    return null
  }
}
```

### From Client Components

```typescript
// app/components/UserProfile.tsx
"use client"

import { client } from "@/server/api"

export function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    client.users.get({ id: userId }).then(result => {
      if (result.ok) setUser(result.value)
    })
  }, [userId])

  if (!user) return <Loading />

  return <div>{user.name}</div>
}
```

### Via HTTP

```typescript
// Call from any HTTP client
const response = await fetch("/api/users.get", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    args: { id: 1 }
  })
})

const result = await response.json()
```

## Advanced Patterns

### Paginated Results

```typescript
import { z } from "zod"

const listUsers = t.query({
  args: z.object({
    page: z.number().default(1),
    limit: z.number().default(10)
  }),

  handler: async (ctx, args) => {
    const [users, total] = await Promise.all([
      ctx.db.users.findMany({
        take: args.limit,
        skip: (args.page - 1) * args.limit,
        orderBy: { createdAt: "desc" }
      }),
      ctx.db.users.count()
    ])

    return withMetadata({
      items: users,
      page: args.page,
      limit: args.limit,
      total,
      hasMore: args.page * args.limit < total
    }, {
      keys: ["users", "list", { page: args.page }]
    })
  }
})
```

### Filtering & Sorting

```typescript
import { z } from "zod"

const searchUsers = t.query({
  args: z.object({
    query: z.string().optional(),
    role: z.enum(["admin", "user", "guest"]).optional(),
    sortBy: z.enum(["name", "createdAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc")
  }),

  handler: async (ctx, args) => {
    const where = {
      ...(args.query && {
        OR: [
          { name: { contains: args.query } },
          { email: { contains: args.query } }
        ]
      }),
      ...(args.role && { role: args.role })
    }

    const users = await ctx.db.users.findMany({
      where,
      orderBy: { [args.sortBy]: args.sortOrder }
    })

    return ok(users)
  }
})
```

## Best Practices

1. **Always validate input** - Use Zod or another Standard Schema compatible library
2. **Return Result for explicit errors** - Makes error handling explicit and type-safe
3. **Use cache keys** - Enables automatic cache invalidation when data changes
4. **Keep handlers focused** - Each query should do one thing
5. **Add TTL for rarely changing data** - Reduces database load
6. **Use pagination** - Always limit results for list queries
7. **Implement proper auth checks** - Verify user identity and permissions

```typescript
// Good example
const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    if (!user) {
      return err({ code: "NOT_FOUND", message: "User not found" })
    }
    return withMetadata(user, { keys: ["users", { id: args.id }] })
  }
})
```

## See Also

- [Mutations](features/mutations.md) - Write operations (public)
- [Internal Operations](features/internal-operations.md) - Internal queries and mutations (server-only)
- [Cache System](features/cache-system.md) - Cache system with keys and invalidation