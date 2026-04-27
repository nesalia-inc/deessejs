# Mutations

Mutations are write operations in `@deessejs/server`. They are used to modify data on your server. Mutations can be either:

- **Public** (`t.mutation()`) - Exposed via HTTP, callable from client and server
- **Internal** (`t.internalMutation()`) - Only callable from server-side code

## Overview

Mutations follow the same patterns as queries but are used for creating, updating, or deleting data. They support the same features including args validation, lifecycle hooks, and cache invalidation.

## Basic Mutation Definition

```typescript
import { defineContext } from "@deessejs/server"
import { ok, err } from "@deessejs/fp"
import { z } from "zod"

const { t } = defineContext({
  context: { db: myDatabase }
})

const createUser = t.mutation({
  args: z.object({
    name: z.string(),
    email: z.string().email(),
    role: z.enum(["user", "admin"]).default("user")
  }),

  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db.users.findByEmail(args.email)
    if (existing) {
      return err({ code: "EMAIL_EXISTS", message: "Email already registered" })
    }

    // Create the user
    const user = await ctx.db.users.create({
      name: args.name,
      email: args.email,
      role: args.role
    })

    return ok(user)
  }
})
```

## API Reference

### `t.mutation(options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `args` | Standard Schema | No | Validation schema for arguments |
| `handler` | Function | Yes | Async function receiving `(ctx, args)` |

### Args Validation

Args are validated using your preferred validator:

```typescript
// Create user mutation
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().optional()
  }),
  handler: async (ctx, args) => { /* ... */ }
})

// Update user mutation
const updateUser = t.mutation({
  args: z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().email().optional()
  }),
  handler: async (ctx, args) => { /* ... */ }
})

// Delete mutation
const deleteUser = t.mutation({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => { /* ... */ }
})
```

## Security Model

Public mutations are exposed to the internet. Always consider:

- **Authentication**: Verify the user is logged in
- **Authorization**: Check if the user has permission to perform the action
- **Input Validation**: Validate all input thoroughly
- **Idempotency**: Consider making mutations safe to retry

```typescript
const updateUser = t.mutation({
  args: z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().email().optional()
  }),

  handler: async (ctx, args) => {
    // Check authentication
    if (!ctx.userId) {
      return err({ code: "UNAUTHORIZED", message: "Please log in" })
    }

    // Check authorization - users can only update their own profile
    if (args.id !== ctx.userId && ctx.role !== "admin") {
      return err({ code: "FORBIDDEN", message: "Cannot update another user's profile" })
    }

    const user = await ctx.db.users.update({
      where: { id: args.id },
      data: args
    })

    return ok(user)
  }
})
```

## Lifecycle Hooks

Mutations support lifecycle hooks:

```typescript
const createPost = t.mutation({
  args: z.object({
    title: z.string(),
    content: z.string()
  }),
  handler: async (ctx, args) => {
    return await ctx.db.posts.create(args)
  }
})
  // Run before the handler
  .beforeInvoke((ctx, args) => {
    ctx.logger.info(`Creating post: ${args.title}`)
  })
  // Run after successful execution
  .onSuccess((ctx, args, data) => {
    ctx.logger.info(`Post created: ${data.id}`)
    // Invalidate related caches
    ctx.cache.invalidate(["posts", "list"])
  })
  // Run on error
  .onError((ctx, args, error) => {
    ctx.logger.error(`Failed to create post: ${error.message}`)
  })
```

### Available Hooks

| Hook | Parameters | Description |
|------|------------|-------------|
| `beforeInvoke` | `(ctx, args)` | Called before the handler runs |
| `onSuccess` | `(ctx, args, data)` | Called after successful execution |
| `onError` | `(ctx, args, error)` | Called when handler throws or returns error |

## Cache Invalidation

Mutations can invalidate cached data using cache keys returned from queries:

```typescript
const updateUser = t.mutation({
  args: z.object({
    id: z.number(),
    name: z.string()
  }),

  handler: async (ctx, args) => {
    const user = await ctx.db.users.update({
      where: { id: args.id },
      data: { name: args.name }
    })

    // Cache keys from queries will be automatically invalidated
    // keys: ["users", { id: args.id }] - user's own cache
    // keys: ["users", "list"] - user list cache

    return ok(user)
  }
})
```

## Creating Data

```typescript
const registerUser = t.mutation({
  args: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string()
  }),

  handler: async (ctx, args) => {
    // Hash password
    const hashedPassword = await ctx.crypto.hash(args.password)

    const user = await ctx.db.users.create({
      email: args.email,
      password: hashedPassword,
      name: args.name
    })

    return ok(user)
  }
})
```

## Updating Data

```typescript
const updateProfile = t.mutation({
  args: z.object({
    userId: z.number(),
    name: z.string().optional(),
    bio: z.string().optional(),
    avatarUrl: z.string().url().optional()
  }),

  handler: async (ctx, args) => {
    const { userId, ...data } = args

    // Verify ownership
    if (ctx.userId !== userId) {
      return err({ code: "FORBIDDEN", message: "Cannot update another user's profile" })
    }

    const updated = await ctx.db.users.update({
      where: { id: userId },
      data
    })

    return ok(updated)
  }
})
```

## Deleting Data

```typescript
const deleteAccount = t.mutation({
  args: z.object({
    userId: z.number(),
    confirmEmail: z.string().email()
  }),

  handler: async (ctx, args) => {
    // Verify ownership
    if (ctx.userId !== args.userId && ctx.role !== "admin") {
      return err({ code: "FORBIDDEN", message: "Cannot delete this account" })
    }

    const user = await ctx.db.users.find(args.userId)

    // Verify email confirmation
    if (user.email !== args.confirmEmail) {
      return err({ code: "EMAIL_MISMATCH", message: "Email does not match" })
    }

    await ctx.db.users.delete({ id: args.userId })

    return ok({ deleted: true })
  }
})
```

## Batch Operations

```typescript
const bulkUpdatePosts = t.mutation({
  args: z.object({
    postIds: z.array(z.number()),
    published: z.boolean()
  }),

  handler: async (ctx, args) => {
    const results = []

    for (const postId of args.postIds) {
      const post = await ctx.db.posts.update({
        where: { id: postId },
        data: { published: args.published }
      })
      results.push(post)
    }

    return ok({
      updated: results.length,
      posts: results
    })
  }
})
```

## Error Handling

```typescript
handler: async (ctx, args) => {
  // Validation errors
  if (!args.email) {
    return err({ code: "VALIDATION_ERROR", message: "Email is required" })
  }

  // Not found errors
  const user = await ctx.db.users.find(args.id)
  if (!user) {
    return err({ code: "NOT_FOUND", message: "User not found" })
  }

  // Conflict errors
  const existing = await ctx.db.users.findByEmail(args.email)
  if (existing && existing.id !== args.id) {
    return err({ code: "CONFLICT", message: "Email already in use" })
  }

  // Permission errors
  if (!ctx.hasPermission("users:write")) {
    return err({ code: "PERMISSION_DENIED", message: "Insufficient permissions" })
  }

  // Success
  return ok(await ctx.db.users.update({ where: { id: args.id }, data: args }))
}
```

## Usage Examples

### From Server Actions

```typescript
// app/actions.ts
"use server"

import { api } from "@/server/api"

export async function createPost(title: string, content: string) {
  const result = await api.posts.create({ title, content })

  if (result.ok) {
    return { success: true, post: result.value }
  } else {
    return { success: false, error: result.error.message }
  }
}
```

### From Client Components

```typescript
// app/components/CreatePost.tsx
"use client"

import { client } from "@/server/api"
import { useState } from "react"

export function CreatePost() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await client.posts.create({ title, content })

    if (result.ok) {
      setTitle("")
      setContent("")
      // Refresh posts list
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Post"}
      </button>
    </form>
  )
}
```

## Best Practices

1. **Always validate input** - Use Zod schemas for thorough validation
2. **Return Result for explicit errors** - Makes error handling explicit
3. **Check permissions** - Verify user is authorized to perform the action
4. **Use transactions** - For operations that modify multiple records
5. **Make mutations idempotent** - Safe to retry on failure
6. **Invalidate caches** - Return cache keys to trigger automatic invalidation

```typescript
// Good example
const createOrder = t.mutation({
  args: z.object({
    items: z.array(z.object({
      productId: z.number(),
      quantity: z.number().min(1)
    })).min(1)
  }),

  handler: async (ctx, args) => {
    // Validate all items exist
    const products = await ctx.db.products.findMany({
      where: { id: { in: args.items.map(i => i.productId) } }
    })

    if (products.length !== args.items.length) {
      return err({ code: "INVALID_PRODUCTS", message: "Some products not found" })
    }

    // Create order in transaction
    const order = await ctx.db.$transaction(async (tx) => {
      const order = await tx.orders.create({
        userId: ctx.userId,
        status: "pending"
      })

      for (const item of args.items) {
        await tx.orderItems.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity
        })
      }

      return order
    })

    return ok(order)
  }
})
```

## See Also

- [Queries](features/queries.md) - Public queries (read operations)
- [Internal Operations](features/internal-operations.md) - Internal queries and mutations (server-only)
- [Cache System](features/cache-system.md) - Cache system with keys and invalidation