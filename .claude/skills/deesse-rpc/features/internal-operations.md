# Internal Operations

Internal queries (`t.internalQuery()`) and mutations (`t.internalMutation()`) are server-only operations that are **not exposed via HTTP**. They can only be called from server-side code.

## Overview

Internal operations provide an extra layer of security for sensitive operations that should never be accessible from the outside. They are ideal for:

- Admin-only operations
- Sensitive data access
- Operations requiring server-side credentials
- Complex transactions that should not be exposed

## Internal Queries

### Basic Definition

```typescript
// Internal query - not exposed via HTTP
const getAdminStats = t.internalQuery({
  // No args needed - omit entirely
  handler: async (ctx) => {
    // This runs only on server - safe from HTTP attacks
    return ok({
      totalUsers: await ctx.db.users.count(),
      revenue: await ctx.db.orders.sum(),
      pendingTasks: await ctx.db.tasks.count({ status: "pending" })
    })
  }
})
```

### With Args

```typescript
const getUserDetails = t.internalQuery({
  args: z.object({
    id: z.number()
  }),

  handler: async (ctx, args) => {
    // Internal operation - safe to access sensitive data
    const user = await ctx.db.users.findUnique({
      where: { id: args.id },
      include: {
        apiKeys: true,        // Sensitive - not exposed via public API
        paymentMethods: true, // Sensitive
        auditLogs: true       // Internal data
      }
    })

    if (!user) {
      return err({ code: "NOT_FOUND", message: "User not found" })
    }

    return ok(user)
  }
})
```

### Security Model

Internal queries are **never** exposed via HTTP. This means:

- Cannot be called from client components
- Cannot be called via HTTP requests
- Only accessible from server-side code (server components, server actions, other internal queries/mutations)
- Immune to HTTP-based attacks (CSRF, injection, etc.)

```typescript
// This is perfectly safe for sensitive operations
const getSystemConfig = t.internalQuery({
  handler: async (ctx) => {
    // Access to internal APIs, secret keys, etc.
    return ok({
      internalApiKey: ctx.internalService.getKey(),
      databasePassword: ctx.db.getAdminPassword(),
      adminEmails: ctx.config.adminEmails
    })
  }
})
```

## Internal Mutations

### Basic Definition

```typescript
const processRefund = t.internalMutation({
  args: z.object({
    orderId: z.number(),
    amount: z.number(),
    reason: z.string()
  }),

  handler: async (ctx, args) => {
    // Perform sensitive financial operations
    const order = await ctx.db.orders.find(args.orderId)

    if (!order) {
      return err({ code: "NOT_FOUND", message: "Order not found" })
    }

    if (order.status === "refunded") {
      return err({ code: "ALREADY_REFUNDED", message: "Order already refunded" })
    }

    // Process refund through internal payment gateway
    const result = await ctx.paymentGateway.refund({
      transactionId: order.transactionId,
      amount: args.amount
    })

    if (!result.success) {
      return err({ code: "REFUND_FAILED", message: result.error })
    }

    // Update order status
    await ctx.db.orders.update({
      where: { id: args.orderId },
      data: { status: "refunded", refundedAt: new Date() }
    })

    return ok({ refundId: result.refundId })
  }
})
```

### Use Cases for Internal Mutations

1. **Scheduled Tasks**: Cron jobs that process data
2. **Webhook Handlers**: Backend-only operations triggered by external services
3. **Admin Operations**: Actions that require elevated privileges
4. **Cross-Service Communication**: Operations that span multiple services

```typescript
// Scheduled task - processes pending orders
const processPendingOrders = t.internalMutation({
  handler: async (ctx) => {
    const pendingOrders = await ctx.db.orders.findMany({
      where: { status: "pending", createdAt: { lt: new Date(Date.now() - 3600000) } }
    })

    const results = []
    for (const order of pendingOrders) {
      const paymentResult = await ctx.paymentGateway.charge(order)
      if (paymentResult.success) {
        await ctx.db.orders.update({
          where: { id: order.id },
          data: { status: "paid" }
        })
        results.push({ orderId: order.id, status: "success" })
      } else {
        results.push({ orderId: order.id, status: "failed", error: paymentResult.error })
      }
    }

    return ok({ processed: results.length, results })
  }
})
```

## API Reference

### `t.internalQuery(options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `args` | Standard Schema | No | Validation schema for arguments |
| `handler` | Function | Yes | Async function receiving `(ctx, args)` |

### `t.internalMutation(options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `args` | Standard Schema | No | Validation schema for arguments |
| `handler` | Function | Yes | Async function receiving `(ctx, args)` |

## Lifecycle Hooks

Both internal queries and mutations support lifecycle hooks:

```typescript
const getAdminData = t.internalQuery({
  handler: async (ctx) => {
    return ok(await ctx.db.adminData.find())
  }
})
  .beforeInvoke((ctx) => {
    // Log access - this is sensitive data
    ctx.logger.info(`Admin data accessed from ${ctx.requestId}`)
  })
  .onSuccess((ctx, _, data) => {
    ctx.logger.info(`Admin data returned: ${data.length} records`)
  })
  .onError((ctx, _, error) => {
    ctx.logger.error(`Admin query failed: ${error.message}`)
  })
```

### Available Hooks

| Hook | Parameters | Description |
|------|------------|-------------|
| `beforeInvoke` | `(ctx, args)` | Called before the handler runs |
| `onSuccess` | `(ctx, args, data)` | Called after successful execution |
| `onError` | `(ctx, args, error)` | Called when handler throws or returns error |

## Cache Metadata

Internal operations can also return cache keys:

```typescript
const getInternalMetrics = t.internalQuery({
  handler: async (ctx) => {
    const metrics = await ctx.db.metrics.getLatest()

    return withMetadata(metrics, {
      keys: ["internal", "metrics"],
      ttl: 30000 // 30 seconds
    })
  }
})
```

## Error Handling

Same error handling patterns as public operations:

```typescript
handler: async (ctx, args) => {
  const resource = await ctx.internalService.get(args.id)

  if (!resource) {
    return err({
      code: "NOT_FOUND",
      message: "Resource not found",
      resourceType: "internal"
    })
  }

  if (!ctx.hasPermission("admin:read")) {
    return err({
      code: "PERMISSION_DENIED",
      message: "Admin permission required"
    })
  }

  return ok(resource)
}
```

## Best Practices

1. **Use internal for sensitive operations** - Admin panels, system config, audit logs
2. **Keep internal operations focused** - Single responsibility like any other operation
3. **Add proper logging** - Track who accesses internal operations and when
4. **Use transactions for complex operations** - Ensure data consistency
5. **Validate all inputs** - Even server-side code needs input validation

```typescript
// Good: Internal query for sensitive data
const getAuditLog = t.internalQuery({
  args: z.object({
    userId: z.number().optional(),
    action: z.enum(["create", "update", "delete"]).optional(),
    limit: z.number().default(100)
  }),

  handler: async (ctx, args) => {
    const logs = await ctx.db.auditLogs.findMany({
      where: {
        ...(args.userId && { userId: args.userId }),
        ...(args.action && { action: args.action })
      },
      take: args.limit,
      orderBy: { createdAt: "desc" }
    })

    return ok(logs)
  }
})

// Good: Internal mutation for admin action
const cleanupExpiredSessions = t.internalMutation({
  handler: async (ctx) => {
    const result = await ctx.db.sessions.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    })

    return ok({ deleted: result.count })
  }
})
```

## Security Model Summary

| Operation Type | Callable via HTTP | Callable from Server |
|---------------|-------------------|---------------------|
| `query()` | Yes | Yes |
| `mutation()` | Yes | Yes |
| `internalQuery()` | **No** | Yes |
| `internalMutation()` | **No** | Yes |

This ensures sensitive operations remain protected:

```typescript
// Public - can be called from client via HTTP
const getPublicData = t.query({ ... })

// Public - can be called from client via HTTP
const createPost = t.mutation({ ... })

// Internal - only server code can call this
const deleteUser = t.internalMutation({ ... })

// Internal - only server code can call this
const getAdminStats = t.internalQuery({ ... })
```

## See Also

- [Queries](features/queries.md) - Public queries exposed via HTTP
- [Mutations](features/mutations.md) - Public mutations
- [Security Model](features/security-model.md) - Security concepts overview