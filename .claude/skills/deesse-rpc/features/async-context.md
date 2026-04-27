# Async Context

The async context system uses `AsyncLocalStorage` to make the context (`ctx`) available anywhere in the call stack without explicit prop drilling.

## Overview

Async context is essential for logging, tracing, and accessing context in utility functions that are called from handlers.

## The Problem

Without async context, you need to pass `ctx` everywhere:

```typescript
// Handler
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    // Must pass ctx to every function
    const user = await getUserFromDb(ctx, args.id)
    await logAccess(ctx, user)
    await sendAnalytics(ctx, user)
    return ok(user)
  }
})

// Utility functions need ctx as first parameter
async function getUserFromDb(ctx: Ctx, id: number) { ... }
async function logAccess(ctx: Ctx, user: User) { ... }
async function sendAnalytics(ctx: Ctx, user: User) { ... }
```

## The Solution

With async context, you access ctx anywhere:

```typescript
// Handler
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    // No need to pass ctx!
    const user = await getUserFromDb(args.id)
    await logAccess(user)
    await sendAnalytics(user)
    return ok(user)
  }
})

// Utility functions access ctx automatically
async function getUserFromDb(id: number) {
  const ctx = getContext()  // Get ctx from async local storage
  return ctx.db.users.find(id)
}

async function logAccess(user: User) {
  const ctx = getContext()
  ctx.logger.info("User accessed", { userId: user.id })
}
```

## API Reference

### getContext

```typescript
function getContext<Ctx>(): Ctx

// Usage
const ctx = getContext<MyContext>()
```

### setContext

```typescript
function setContext<Ctx>(ctx: Ctx): void

// Usage - extend context temporarily
const ctx = getContext<MyContext>()
setContext({ ...ctx, customValue: "test" })
```

### runWithContext

```typescript
function runWithContext<Ctx, Result>(
  ctx: Ctx,
  fn: () => Result
): Result

// Usage - for testing or manual execution
const result = runWithContext(mockCtx, () => {
  return getContext().db.users.find(1)
})
```

### getCurrentOperation

```typescript
function getCurrentOperation(): {
  name: string
  type: "query" | "mutation" | "internalQuery" | "internalMutation"
  path: string
}

// Usage
const operation = getCurrentOperation()
console.log(`Executing ${operation.type}: ${operation.name}`)
```

## Usage

### Basic Access

```typescript
import { getContext } from "@deessejs/server"

// In any function called from a handler
async function someUtility() {
  const ctx = getContext()

  // Access db, logger, etc.
  const users = await ctx.db.users.findMany()
  ctx.logger.info("Query executed")
}
```

### In Middleware

```typescript
const authMiddleware = t.middleware({
  name: "auth",
  handler: async (ctx, next) => {
    // ctx is available in middleware
    const userId = ctx.headers.get("x-user-id")

    // Store in context for later use
    setContext({ ...ctx, userId })

    return next()
  }
})
```

### In Lifecycle Hooks

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => { ... }
})
  .beforeInvoke(() => {
    const ctx = getContext()
    console.log("Before invoke", ctx.operation)
  })
  .onSuccess((ctx, args, data) => {
    const ctx = getContext()
    ctx.logger.info("Success", { userId: args.id })
  })
```

### In Event Handlers

```typescript
t.on("user.created", async (event) => {
  const ctx = getContext()
  ctx.logger.info("User created event", event.data)
})
```

## Use Cases

### Logging with Request ID

```typescript
// Generate request ID at entry point
const loggingMiddleware = t.middleware({
  name: "logging",
  handler: async (ctx, next) => {
    const requestId = crypto.randomUUID()

    // Store in context
    setContext({ ...ctx, requestId })

    const start = Date.now()
    const result = await next()
    const duration = Date.now() - start

    console.log({
      requestId,
      operation: ctx.operation,
      duration,
      success: result.ok
    })

    return result
  }
})

// Access anywhere
async function someUtility() {
  const ctx = getContext()
  console.log("Request ID:", ctx.requestId)
}
```

### Distributed Tracing

```typescript
const tracingMiddleware = t.middleware({
  name: "tracing",
  handler: async (ctx, next) => {
    const traceId = ctx.headers.get("x-trace-id") || crypto.randomUUID()
    const spanId = crypto.randomUUID()

    setContext({ ...ctx, traceId, spanId })

    // Add to response headers
    ctx.headers.set("x-trace-id", traceId)
    ctx.headers.set("x-span-id", spanId)

    return next()
  }
})

// Access in any function
async function dbQuery(sql: string) {
  const ctx = getContext()
  return tracingClient.query(sql, {
    traceId: ctx.traceId,
    spanId: ctx.spanId
  })
}
```

### Authentication Helper

```typescript
// In any function, get current user
async function getCurrentUser() {
  const ctx = getContext()
  return ctx.user
}

// In middleware
const authMiddleware = t.middleware({
  name: "auth",
  handler: async (ctx, next) => {
    const user = await verifyToken(ctx.headers.get("authorization"))
    setContext({ ...ctx, user })
    return next()
  }
})
```

### Database Transaction

```typescript
async function withTransaction(fn: () => Promise<void>) {
  const ctx = getContext()
  const trx = await ctx.db.transaction()

  try {
    setContext({ ...ctx, db: trx })
    await fn()
    await trx.commit()
  } catch (error) {
    await trx.rollback()
    throw error
  } finally {
    setContext({ ...ctx, db: ctx.db })
  }
}
```

## Testing

### Unit Testing

```typescript
import { runWithContext, getContext } from "@deessejs/server"

describe("Utility Functions", () => {
  it("can access context", async () => {
    const mockCtx = {
      db: mockDb,
      logger: mockLogger
    }

    const result = await runWithContext(mockCtx, () => {
      const ctx = getContext()
      return ctx.db.users.find(1)
    })

    expect(result).toEqual({ id: 1 })
  })
})
```

### Mocking Context

```typescript
import { setContext, getContext } from "@deessejs/server"

describe("Handlers", () => {
  beforeEach(() => {
    setContext({
      db: mockDb,
      logger: mockLogger,
      user: { id: 1, name: "Test User" }
    })
  })

  afterEach(() => {
    setContext(null as any)
  })

  it("accesses user from context", () => {
    const ctx = getContext()
    expect(ctx.user.id).toBe(1)
  })
})
```

## Performance

### Overhead

| Operation | Overhead |
|-----------|----------|
| `getContext()` | ~0.001ms |
| `runWithContext()` | ~0.01ms |

### Recommendations

1. **Don't overuse** - Only use when passing ctx is impractical
2. **Don't store mutable data** - Context should be immutable
3. **Clear context** - Ensure context is cleared between requests

## Caveats

### Async Context in Callbacks

```typescript
// This works
await Promise.all([
  getContext().db.users.find(1),
  getContext().db.users.find(2)
])

// Be careful with callbacks
const results = []
for (const id of ids) {
  results.push(getContext().db.users.find(id))
}
await Promise.all(results)
```

### Node.js Version

Requires Node.js 16+ or equivalent (Deno, Bun, Cloudflare Workers).

### Edge Runtime

Works in Edge runtimes that support `AsyncLocalStorage` (Cloudflare Workers, Vercel Edge).

## Plugin-Extended Context

`getContext()` returns the full context including plugin-extended properties:

```typescript
// Plugin adds server-only properties
const authPlugin = plugin("auth", (ctx) => ({
  userId: null as string | null,
  requireAuth: () => { if (!ctx.userId) throw new Error("Not authenticated") }
}))

// In any utility function called from handler
async function someUtility() {
  const ctx = getContext()
  ctx.requireAuth()  // Works! Plugin property available
  return ctx.db.users.find(1)
}
```

## See Also

- [Middleware](features/middleware.md) - Request interception
- [Lifecycle Hooks](features/lifecycle-hooks.md) - Hooks on procedures