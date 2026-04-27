# Lifecycle Hooks

Lifecycle hooks are methods on queries and mutations that allow running code at specific points during execution. They provide a declarative way to handle cross-cutting concerns like logging, metrics, audit trails, and cache invalidation.

## Overview

### Available Hooks

| Hook | When it runs | Arguments |
|------|--------------|-----------|
| `beforeInvoke` | Before the handler executes | `(ctx, args)` |
| `afterInvoke` | After the handler executes (always) | `(ctx, args, result)` |
| `onSuccess` | After successful handler execution | `(ctx, args, data)` |
| `onError` | After handler throws or returns error | `(ctx, args, error)` |

### Execution Order

```
beforeInvoke → [handler] → onSuccess/onError → afterInvoke
```

```
┌─────────────────────────────────────────────────────────────────┐
│                     Lifecycle Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   beforeInvoke(ctx, args)                                      │
│           │                                                     │
│           ▼                                                     │
│   ┌───────────────┐                                             │
│   │    Handler    │                                             │
│   └───────────────┘                                             │
│           │                                                     │
│           ├──► onSuccess(ctx, args, data)  ──► afterInvoke()   │
│           │                                                     │
│           └──► onError(ctx, args, error)  ──► afterInvoke()     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### Query Hooks

```typescript
type Query<Ctx, Args, Output> = {
  beforeInvoke(handler: (ctx: Ctx, args: Args) => void | Promise<void>): Query<Ctx, Args, Output>
  afterInvoke(handler: (ctx: Ctx, args: Args, result: Result<Output>) => void | Promise<void>): Query<Ctx, Args, Output>
  onSuccess(handler: (ctx: Ctx, args: Args, data: Output) => void | Promise<void>): Query<Ctx, Args, Output>
  onError(handler: (ctx: Ctx, args: args: Args, error: unknown) => void | Promise<void>): Query<Ctx, Args, Output>
}
```

### Mutation Hooks

```typescript
type Mutation<Ctx, Args, Output> = {
  beforeInvoke(handler: (ctx: Ctx, args: Args) => void | Promise<void>): Mutation<Ctx, Args, Output>
  afterInvoke(handler: (ctx: Ctx, args: Args, result: Result<Output>) => void | Promise<void>): Mutation<Ctx, Args, Output>
  onSuccess(handler: (ctx: Ctx, args: Args, data: Output) => void | Promise<void>): Mutation<Ctx, Args, Output>
  onError(handler: (ctx: Ctx, args: Args, error: unknown) => void | Promise<void>): Mutation<Ctx, Args, Output>
}
```

### Hook Return Values

All hooks return:
- `void` - No return value (observers only)
- `Promise<void>` - For async operations

> **Important:** Hooks are **passive observers**. They cannot short-circuit or modify the flow. If you need to control execution, use **Middleware** instead. This keeps hooks simple and predictable.

## Usage Examples

### Basic Hooks

```typescript
import { z } from "zod"

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
  .beforeInvoke((ctx, args) => {
    console.log("Fetching user", args.id)
  })
  .afterInvoke((ctx, args, result) => {
    console.log("Query completed", { id: args.id, ok: result.ok })
  })
  .onSuccess((ctx, args, user) => {
    console.log("User fetched successfully:", user.id)
  })
  .onError((ctx, args, error) => {
    console.error("Failed to fetch user:", args.id, error)
  })
```

### Logging

```typescript
import { z } from "zod"

const createUser = t.mutation({
  args: z.object({
    name: z.string(),
    email: z.string().email()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user)
  }
})
  .beforeInvoke((ctx, args) => {
    console.log(`[CREATE_USER] Starting creation for: ${args.email}`)
  })
  .onSuccess((ctx, args, user) => {
    console.log(`[CREATE_USER] Success: ${user.id}`)
  })
  .onError((ctx, args, error) => {
    console.error(`[CREATE_USER] Failed: ${args.email}`, error)
  })
```

### Audit Logging

```typescript
// Track all user modifications
import { z } from "zod"

const updateUser = t.mutation({
  args: z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().email().optional()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.update(args.id, {
      ...(args.name && { name: args.name }),
      ...(args.email && { email: args.email }),
    })
    return ok(user)
  }
})
  .onSuccess((ctx, args, user) => {
    // Log successful modification directly to database
    ctx.db.auditLogs.create({
      action: "USER_UPDATED",
      userId: user.id,
      modifiedBy: ctx.userId,
      changes: {
        name: args.name,
        email: args.email,
      },
      timestamp: new Date().toISOString(),
    })
  })
  .onError((ctx, args, error) => {
    // Log failed modification attempt directly to database
    ctx.db.auditLogs.create({
      action: "USER_UPDATE_FAILED",
      targetUserId: args.id,
      modifiedBy: ctx.userId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  })

// Track data access
const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => { ... }
})
  .onSuccess((ctx, args, user) => {
    ctx.db.auditLogs.create({
      action: "USER_ACCESSED",
      userId: user.id,
      accessedBy: ctx.userId,
      timestamp: new Date().toISOString(),
    })
  })
```

### Cache Invalidation

```typescript
// Invalidate cache after mutations
import { z } from "zod"

const updateUser = t.mutation({
  args: z.object({
    id: z.number(),
    name: z.string()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.update(args.id, { name: args.name })
    return ok(user)
  }
})
  .onSuccess((ctx, args, user) => {
    // Invalidate related cache entries
    ctx.cache.invalidate(`user:${args.id}`)
    ctx.cache.invalidate("users:list")
    ctx.cache.invalidate("users:count")
  })

// Refresh cache after mutations
const createTask = t.mutation({
  args: z.object({
    title: z.string(),
    userId: z.number()
  }),
  handler: async (ctx, args) => {
    const task = await ctx.db.tasks.create(args)
    return ok(task)
  }
})
  .onSuccess((ctx, args, task) => {
    // Invalidate user's task list
    ctx.cache.invalidate(`tasks:user:${args.userId}`)
    ctx.cache.invalidate("tasks:all")
  })
```

### Response Transformation

```typescript
import { z } from "zod"

const createUser = t.mutation({
  args: z.object({
    name: z.string(),
    email: z.string().email()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user)
  }
})
  .afterInvoke((ctx, args, result) => {
    // Transform response before returning
    if (result.ok) {
      // Add computed fields
      result.value.displayName = result.value.name.toUpperCase()
      result.value.createdAt = new Date(result.value.createdAt).toISOString()
    }
  })
```

> **Note:** Hooks execute **serially** (one after another). Each hook receives the result modified by the previous hook. This is essential for transformation pipelines.

### Events vs Lifecycle Hooks

Use the right tool for the right job:

| Aspect | Lifecycle Hooks (`.onSuccess`) | External Services |
|--------|-------------------------------|---------------------|
| **Coupling** | Tightly coupled to the query/mutation | Loosely coupled, decoupled |
| **Use Case** | Format response, metrics for this specific query | Notify external systems (email, analytics) |
| **Knowledge** | Knows exactly which query emitted it | Doesn't know the source |
| **Execution** | Synchronous, within request | Asynchronous, fire-and-forget |

```typescript
// Hook: Format response for THIS query only
const getUser = t.query({ ... })
  .onSuccess((ctx, args, user) => {
    // I know this is getUser - format specifically
    user.displayName = user.name.toUpperCase()
  })

// External Service: Notify external systems - doesn't know who listens
const createUser = t.mutation({ ... })
  .onSuccess((ctx, args, user) => {
    // I don't know who's listening - just call the external service
    ctx.email.sendWelcome(user.id)
  })
```

### Conditional Execution

```typescript
import { z } from "zod"

const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => { ... }
})
  .beforeInvoke((ctx, args) => {
    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.log("Fetching user:", args.id)
    }
  })
  .onSuccess((ctx, args, user) => {
    // Only track metrics in production
    if (process.env.NODE_ENV === "production") {
      ctx.metrics.increment("query.getUser.success")
    }
  })
```

### Multiple Hooks

Multiple hooks of the same type can be chained:

```typescript
import { z } from "zod"

const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => { ... }
})
  // Multiple beforeInvoke - all run in order
  .beforeInvoke((ctx, args) => {
    console.log("Hook 1: Starting")
  })
  .beforeInvoke((ctx, args) => {
    console.log("Hook 2: Continuing")
  })
  // Multiple onSuccess - all run in order
  .onSuccess((ctx, args, user) => {
    ctx.logger.info("User fetched", { userId: user.id })
  })
  .onSuccess((ctx, args, user) => {
    ctx.analytics.track("user_viewed", { userId: user.id })
  })
```

## Error Handling in Hooks

Hooks should not break the main flow. The framework wraps hook execution in try/catch:

```typescript
import { z } from "zod"

const createUser = t.mutation({
  args: z.object({
    name: z.string()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user)
  }
})
  .onSuccess((ctx, args, user) => {
    // Even if this fails, the user is still created
    // The error is logged but doesn't break the response
    ctx.metrics.increment("user.created") // If metrics is down, this is logged but doesn't fail
  })
```

### Hook Error Behavior

| Hook | Handler Success | Handler Error | Hook Fails |
|------|-----------------|---------------|------------|
| `beforeInvoke` | Runs | Skipped | Skips handler, returns error |
| `onSuccess` | Runs | Skipped | Logged, doesn't affect result |
| `onError` | Skipped | Runs | Logged, doesn't affect result |
| `afterInvoke` | Runs | Runs | Logged, doesn't affect result |

> **Principle:** If the handler succeeds, the response should always return success. Hook failures are logged but don't override the handler's result.

## Comparison with Middleware

| Feature | Lifecycle Hooks | Middleware |
|---------|-----------------|------------|
| **Declaration** | Method chaining on query/mutation | Separate definition, applied to operations |
| **Use case** | Single operation concerns | Cross-cutting concerns |
| **Access to result** | Yes (in onSuccess/onError/afterInvoke) | Yes (after calling next()) |
| **Can modify args** | No | Yes |
| **Can short-circuit** | No | Yes |
| **Simplicity** | Simpler | More flexible |

### When to Use Hooks

- Logging
- Metrics/analytics
- Audit trails
- Cache invalidation (after mutations)
- Response transformation

### When to Use Middleware

- Authentication/authorization
- Rate limiting
- Request validation
- Context modification
- Caching (before handler)
- Short-circuiting requests

## Best Practices

### 1. Keep Hooks Focused

Each hook should do one thing:

```typescript
// Good: Single responsibility
.onSuccess((ctx, args, user) => {
  ctx.metrics.increment("user.fetch.success")
})
.onSuccess((ctx, args, user) => {
  ctx.analytics.track("user_viewed", { userId: user.id })
})

// Avoid: Multiple responsibilities
.onSuccess((ctx, args, user) => {
  ctx.metrics.increment("user.fetch.success")
  ctx.analytics.track("user_viewed", { userId: user.id })
  ctx.cache.set(...)
  ctx.logger.info(...)
})
```

### 2. Use Appropriate Hooks

Choose the right hook for the job:

- **`beforeInvoke`**: Pre-processing, validation, logging start
- **`onSuccess`**: Positive outcomes, metrics, cache updates
- **`onError`**: Error logging, alerting, cleanup
- **`afterInvoke`**: Always-run tasks, final metrics, cleanup

### 3. Don't Throw in Hooks

```typescript
// Good: Handle errors gracefully
.onError((ctx, args, error) => {
  console.error("Error:", error)  // Log but don't throw
})

// Bad: Throwing can break the flow
.onError((ctx, args, error) => {
  throw new Error("Hook error")  // Don't do this
})
```

### 4. Order Matters for Multiple Hooks

```typescript
// Good: Logical order
.beforeInvoke((ctx, args) => { console.log("1") })
.beforeInvoke((ctx, args) => { console.log("2") })
// Handler runs here
.onSuccess((ctx, args, data) => { console.log("3") })
.onSuccess((ctx, args, data) => { console.log("4") })
.afterInvoke((ctx, args, result) => { console.log("5") })
```

### 5. Use Hooks Instead of Middleware When Possible

```typescript
// Simple logging - hooks are cleaner
const getUser = t.query({ ... })
  .onSuccess((ctx, args, user) => {
    ctx.logger.info("User fetched", { userId: user.id })
  })

// Custom logic that modifies flow - use middleware
const authMiddleware = t.middleware({ ... })
```

## See Also

- [Middleware](features/middleware.md) - Active control flow interception
- [Queries](features/queries.md) - Query procedure definition
- [Mutations](features/mutations.md) - Mutation procedure definition