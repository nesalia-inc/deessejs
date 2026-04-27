# Middleware

The middleware system allows intercepting and modifying requests before they reach handlers. Middleware is applied **globally** via `createAPI()`, enabling cross-cutting concerns like authentication, authorization, logging, and rate limiting.

## Overview

Middleware is a function that wraps handler execution. It receives the context, arguments, and a `next` function that continues execution to the next middleware or the handler itself.

## API Reference

### Creating Middleware: `t.middleware()`

```typescript
type Middleware<Ctx, Args = unknown> = {
  name: string
  args?: Validator<Args>  // Uses Zod, Valibot, ArkType, etc.
  handler: (ctx: Ctx, opts: {
    next: (overrides?: { ctx?: Partial<Ctx> }) => Promise<Result<unknown>>;
    args: Args;
    meta: Record<string, unknown>;
  }) => Promise<Result<unknown>>
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique identifier for the middleware |
| `args` | `Validator` | Optional validator for middleware-specific args |
| `handler` | `(ctx, { next, args, meta }) => Promise<Result>` | Middleware function that calls `next()` to proceed |

### Middleware Context

Middleware receives the context and an options object with:

- `ctx` - The full context object
- `next` - Function to proceed to the next middleware/handler. Accepts optional `ctx` overrides.
- `args` - The operation arguments (from the validated input)
- `meta` - Metadata about the request (e.g., `meta.userId` for auth, `meta.procedureName` for logging)

## Basic Global Middleware

```typescript
const { t, createAPI } = defineContext({
  context: { db: myDatabase }
})

// Define middleware
const authMiddleware = t.middleware({
  name: "auth",
  handler: async (ctx, { next, meta }) => {
    // User ID is passed via meta (typically set by auth handler)
    const userId = meta?.userId as number | undefined;

    if (!userId) {
      return err(error({
        name: "UnauthorizedError",
        message: () => "Not authenticated",
      })({}));
    }

    // Extend context with user
    return next({ ctx: { ...ctx, user: { id: userId } } as typeof ctx });
  }
})

// Apply globally via createAPI
const api = createAPI({
  router: t.router({
    users: {
      get: t.query({ ... }),
      create: t.mutation({ ... }),
    },
  }),
  middleware: [authMiddleware]
})
```

## Logging Middleware

```typescript
const loggingMiddleware = t.middleware({
  name: "logger",
  handler: async (ctx, { next, args, meta }) => {
    const procedureName = meta?.procedureName as string || "unknown";
    ctx.logger.log(`[LOGGER] Before ${procedureName} with args:`, args);

    const result = await next({ ctx });

    if (result.ok) {
      ctx.logger.log(`[LOGGER] ${procedureName} succeeded`);
    } else {
      ctx.logger.log(`[LOGGER] ${procedureName} failed:`, result.error);
    }

    return result;
  }
})

const api = createAPI({
  router: t.router({ ... }),
  middleware: [loggingMiddleware]
})
```

## Error Handling Middleware

```typescript
import { error, err } from "@deessejs/fp"

const errorHandlerMiddleware = t.middleware({
  name: "errorHandler",
  handler: async (ctx, { next }) => {
    try {
      return await next({ ctx })
    } catch (err) {
      return err(error({
        name: "InternalError",
        message: () => err instanceof Error ? err.message : "Unknown error",
      })({}));
    }
  }
})

const api = createAPI({
  router: t.router({ ... }),
  middleware: [errorHandlerMiddleware]
})
```

## Multiple Global Middleware

Apply multiple middleware to all operations:

```typescript
const api = createAPI({
  router: t.router({
    users: {
      get: t.query({ ... }),
      create: t.mutation({ ... }),
    },
  }),
  middleware: [
    // Logging middleware (runs first - outermost)
    loggingMiddleware,
    // Error handling middleware (runs second)
    errorHandlerMiddleware,
    // Auth middleware (runs third - innermost, closest to handler)
    authMiddleware,
  ]
})
```

## Middleware with Options

Create configurable middleware with args:

```typescript
import { z } from "zod"
import { error, err } from "@deessejs/fp"

const rateLimitMiddleware = t.middleware({
  name: "rateLimit",
  args: z.object({
    maxRequests: z.number().default(100),
    windowMs: z.number().default(60000),
  }),
  handler: async (ctx, { next, args, meta }) => {
    const clientId = meta?.clientId as string || "unknown";
    const now = Date.now()
    const { maxRequests, windowMs } = args

    let record = rateLimitStore.get(clientId)

    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + windowMs }
      rateLimitStore.set(clientId, record)
    }

    record.count++

    if (record.count > maxRequests) {
      return err(error({
        name: "RateLimitError",
        message: () => `Rate limit exceeded. Try again in ${Math.ceil((record.resetAt - now) / 1000)} seconds`,
      })({}));
    }

    return next({ ctx });
  }
})
```

## Short-circuiting

Middleware can return early to prevent handler execution:

```typescript
const cacheMiddleware = t.middleware({
  name: "cache",
  handler: async (ctx, { next, args, meta }) => {
    const procedureName = meta?.procedureName as string || "unknown";

    // Generate cache key from procedure name and args
    const cacheKey = `${procedureName}:${JSON.stringify(args)}`

    // Check cache
    const cached = await ctx.cache.get(cacheKey)
    if (cached) {
      // Return cached result without calling next()
      return ok(cached)
    }

    // Execute handler
    const result = await next({ ctx })

    // Cache successful results
    if (result.ok) {
      await ctx.cache.set(cacheKey, result.value, 300000)
    }

    return result
  }
})
```

## Per-Procedure Middleware with `.use()`

Middleware can be applied to individual procedures using `.use()`:

```typescript
import { error, err } from "@deessejs/fp"

// Define middleware
const authMiddleware = t.middleware({
  name: "auth",
  handler: async (ctx, { next, meta }) => {
    const userId = meta?.userId as number | undefined;
    if (!userId) {
      return err(error({
        name: "UnauthorizedError",
        message: () => "Not authenticated",
      })({}));
    }
    return next({ ctx: { ...ctx, user: { id: userId } } as typeof ctx });
  },
});

const adminMiddleware = t.middleware({
  name: "admin",
  handler: async (ctx, { next }) => {
    const user = (ctx as any).user;
    if (!user?.isAdmin) {
      return err(error({
        name: "ForbiddenError",
        message: () => "Admin access required",
      })({}));
    }
    return next({ ctx });
  },
});

const loggingMiddleware = t.middleware({
  name: "logger",
  handler: async (ctx, { next, args, meta }) => {
    const procedureName = meta?.procedureName as string || "unknown";
    ctx.logger.log(`[LOGGER] Before ${procedureName}`);
    const result = await next({ ctx });
    ctx.logger.log(`[LOGGER] ${procedureName} completed`);
    return result;
  },
});

// Apply middleware to a specific query
const getUser = t.query({
  handler: async (ctx) => { ... },
}).use(authMiddleware);

// Chain multiple middleware with .use()
const adminListUsers = t.query({
  handler: async (ctx) => { ... },
})
  .use(loggingMiddleware)
  .use(authMiddleware)
  .use(adminMiddleware);
```

### Execution Order with `.use()`

Middleware chained with `.use()` executes in order from left to right:

```typescript
const procedure = t.query({ handler: async (ctx) => { ... } })
  .use(firstMiddleware)  // 1. Runs first
  .use(secondMiddleware) // 2. Runs second
  .use(thirdMiddleware)   // 3. Runs third
// Handler executes last
```

## Reusable Protected Procedures with `withQuery` and `withMutation`

The `withQuery` and `withMutation` helpers create reusable procedure creators that wrap procedures with middleware:

```typescript
import { withQuery, withMutation } from "@deessejs/server"

// Create a protected query by wrapping with authMiddleware
const authQuery = withQuery((q) => q.use(authMiddleware));

// Create a protected mutation
const authMutation = withMutation((m) => m.use(authMiddleware));

// Apply to procedures
const getCurrentUser = authQuery(
  t.query({
    handler: async (ctx) => { ... },
  })
);

const updateProfile = authMutation(
  t.mutation({
    handler: async (ctx, args) => { ... },
  })
);
```

### Chaining Multiple Middleware

```typescript
// Admin mutation with auth + admin middleware
const adminMutation = withMutation((m) =>
  m.use(adminMiddleware).use(authMiddleware)
);

// Apply to procedure
const deleteUser = adminMutation(
  t.mutation({
    handler: async (ctx, args) => { ... },
  })
);
```

## Middleware vs Lifecycle Hooks

| Aspect | Middleware | Lifecycle Hooks (`.on`) |
|--------|-----------|------------------------|
| **Control Flow** | **Active** - Decides IF and HOW the handler runs | **Passive** - Observes and reacts |
| **Short-circuit** | Yes - Can return early | No - Cannot stop execution |
| **Modify Args** | Yes | No |
| **Modify Result** | Yes | Yes (only `afterInvoke`) |
| **Use Case** | Auth, Rate Limit, Caching | Logging, Metrics, Analytics |

### When to Use Middleware

- **Authentication/Authorization** - Block requests
- **Rate Limiting** - Control request frequency
- **Caching** - Return cached data without calling handler
- **Feature Flags** - Enable/disable features
- **Request Modification** - Transform args before handler

### When to Use Hooks

- **Logging** - Record what happened
- **Metrics** - Track usage
- **Audit Trails** - Record actions
- **Response Transformation** - Modify output
- **Notifications** - Send events (via `ctx.send`)

### Key Principle

> **Middleware decides, Hooks observe.** If you need to control whether the handler runs, use Middleware. If you just need to react to what happened, use Hooks.

## Type Safety

### Middleware with Typed Context

```typescript
type AuthContext = {
  user: { id: number; isAdmin?: boolean } | null
  logger: { log: (...args: unknown[]) => void }
}

const authMiddleware = t.middleware({
  name: "auth",
  handler: async (ctx: AuthContext, { next, meta }) => {
    // Full type safety for context
    const userId = meta?.userId as number | undefined;
    if (!userId) {
      return err(error({ name: "UnauthorizedError", message: () => "Not authenticated" })({}));
    }
    ctx.user = { id: userId }; // Type-safe assignment

    return next({ ctx });
  }
})
```

### Middleware with Typed Args

```typescript
import { z } from "zod"

const rateLimitMiddleware = t.middleware({
  name: "rateLimit",
  args: z.object({
    maxRequests: z.number().min(1).max(1000),
    windowMs: z.number().min(1000).max(3600000)
  }),
  handler: async (ctx, { next, args }) => {
    // args is typed with Zod
    args.maxRequests // number
    args.windowMs // number

    return next({ ctx });
  }
})
```

## Best Practices

### 1. Keep Middleware Focused

Each middleware should do one thing well:

```typescript
// Good: Single responsibility
const authMiddleware = t.middleware({
  name: "auth",
  handler: async (ctx, { next, meta }) => { ... }
})

const loggingMiddleware = t.middleware({
  name: "logging",
  handler: async (ctx, { next }) => { ... }
})

// Avoid: Multiple responsibilities
const authAndLoggingMiddleware = t.middleware({
  name: "authAndLogging",
  handler: async (ctx, { next, meta }) => {
    // Auth logic...
    // Logging logic...
  }
})
```

### 2. Use Descriptive Names

```typescript
// Good
const requireAdminRole = t.middleware({ name: "requireAdmin", ... })
const rateLimitByIp = t.middleware({ name: "rateLimitByIp", ... })

// Avoid
const m1 = t.middleware({ name: "m1", ... })
const mw = t.middleware({ name: "mw", ... })
```

### 3. Always Call Next or Return

```typescript
// Good: Explicitly call next or return
handler: async (ctx, { next, meta }) => {
  if (meta?.skip) {
    return next({ ctx }) // Explicitly proceed
  }
  return next({ ctx })
}

// Good: Short-circuit when needed
handler: async (ctx, { next, args }) => {
  const cached = await ctx.cache.get(key)
  if (cached) return ok(cached) // Short-circuit

  return next({ ctx }) // Proceed to handler
}

// Bad: Forgetting to return next
handler: async (ctx, { next }) => {
  ctx.userId = 123
  next() // Missing return - can cause issues
}
```

### 4. Order Matters

Put global middleware in logical order:

```typescript
// Good: Logical order
middleware: [
  loggingMiddleware,        // 1. Log first (outermost)
  errorHandlerMiddleware,   // 2. Handle errors
  rateLimitMiddleware,       // 3. Rate limit
  authMiddleware,           // 4. Authenticate last (innermost)
]
```

## See Also

- [Lifecycle Hooks](features/lifecycle-hooks.md) - Passive hooks on procedures
- [Creating API](features/creating-api.md) - API creation with middleware