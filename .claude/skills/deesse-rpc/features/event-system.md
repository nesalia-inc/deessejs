# Event System

The event system provides a publish-subscribe mechanism for decoupled communication between modules.

## Overview

Use `ctx.send()` to emit events from anywhere (handlers, hooks, plugins), and `t.on()` to listen for events globally.

## API Reference

### Emitting Events: `ctx.send(event, data)`

```typescript
type Context = {
  send: (event: string, data?: unknown) => Promise<void>
}
```

### Listening for Events: `t.on(event, handler)`

```typescript
// Global event listener
t.on(
  event: string, // Event name or pattern with wildcards (*)
  handler: (ctx: Ctx, args: unknown, event: EventPayload) => void | Promise<void>
): void
```

### Event Payload

```typescript
type EventPayload<T = unknown> = {
  name: string      // Event name
  data: T          // Event data
  timestamp: number // Event timestamp
  source?: string   // Source of the event (e.g., procedure name)
}
```

## Basic Usage

### Emitting Events from Handlers

```typescript
import { z } from "zod"

const createUser = t.mutation({
  args: z.object({
    name: z.string(),
    email: z.string().email()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)

    // Emit event when user is created
    await ctx.send("user.created", {
      userId: user.id,
      email: user.email,
      name: user.name
    })

    return ok(user)
  }
})
```

### Listening for Events

```typescript
// Global event listener - runs whenever user.created is emitted
t.on("user.created", async (ctx, args, event) => {
  // Send welcome email
  await ctx.emailService.send({
    to: event.data.email,
    template: "welcome",
    data: { name: event.data.name }
  })

  // Create notification
  await ctx.db.notifications.create({
    userId: event.data.userId,
    message: "Welcome to our platform!"
  })

  // Log analytics
  ctx.analytics.track("user_signup", {
    userId: event.data.userId,
    timestamp: event.timestamp
  })
})
```

## Typed Events

Use `defineEvents()` to define typed events:

```typescript
import { defineContext, defineEvents } from "@deessejs/server"

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
    emailService,
  },
  events: defineEvents({
    "user.created": {
      data: {
        userId: "number",
        email: "string",
        name: "string"
      }
    },
    "user.deleted": {
      data: {
        userId: "number",
        reason: "string?"
      }
    },
    "order.completed": {
      data: {
        orderId: "number",
        total: "number",
        userId: "number"
      }
    }
  })
})

// In handler - fully typed event data
const createUser = t.mutation({
  args: z.object({ ... }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)

    // Event data is fully typed
    await ctx.send("user.created", {
      userId: user.id,
      email: user.email,
      name: user.name
    })

    return ok(user)
  }
})

// In listener - TypeScript knows the exact shape
t.on("user.created", async (ctx, args, event) => {
  // event.data is typed as { userId: number; email: string; name: string }
  console.log(event.data.userId)
  console.log(event.data.email)
})
```

## Event Patterns (Wildcards)

Listen to multiple events using wildcard patterns:

```typescript
// Listen to all user-related events
t.on("user.*", async (ctx, args, event) => {
  console.log(`User event: ${event.name}`, event.data)
})

// Listen to all events
t.on("*", async (ctx, args, event) => {
  console.log("Any event:", event.name)
})

// Listen to nested events
t.on("order.*", async (ctx, args, event) => {
  // Matches: order.created, order.completed, order.cancelled, etc.
})
```

## Multiple Listeners

Multiple listeners can be registered for the same event:

```typescript
// First listener
t.on("user.created", async (ctx, args, event) => {
  await ctx.emailService.sendWelcome(event.data.email)
})

// Second listener - also runs
t.on("user.created", async (ctx, args, event) => {
  await ctx.db.auditLog.create({
    action: "USER_CREATED",
    data: event.data
  })
})

// Third listener
t.on("user.created", async (ctx, args, event) => {
  ctx.analytics.track("signup", { userId: event.data.userId })
})
```

## Listener Execution Order

Listeners execute in the order they are registered:

```typescript
t.on("user.created", async (ctx, args, event) => {
  console.log("1") // Runs first
})

t.on("user.created", async (ctx, args, event) => {
  console.log("2") // Runs second
})

t.on("user.created", async (ctx, args, event) => {
  console.log("3") // Runs third
})

// Output when event fires: 1, 2, 3
```

## Async Listeners

Listeners can be async:

```typescript
t.on("user.created", async (ctx, args, event) => {
  // This is awaited
  await ctx.emailService.send({
    to: event.data.email,
    template: "welcome"
  })
})

t.on("user.created", async (ctx, args, event) => {
  // This runs in parallel with other async listeners
  await ctx.db.notifications.create({
    userId: event.data.userId,
    message: "Welcome!"
  })
})
```

## Events in Plugins

Plugins can also emit events:

```typescript
const analyticsPlugin = plugin<Ctx>({
  name: "analytics",
  extend: (ctx) => ({ analytics: analyticsService }),
  router: (t) => ({
    trackEvent: t.mutation({
      args: z.object({
        event: z.string(),
        properties: z.record(z.unknown())
      }),
      handler: async (ctx, args) => {
        // Emit event for analytics
        await ctx.send(args.event, args.properties)
        return ok({ success: true })
      }
    })
  })
})
```

## Use Cases

### 1. Decoupled Notifications

```typescript
// Handler doesn't need to know about emails, push notifications, etc.
const createOrder = t.mutation({
  args: z.object({ items: z.array(z.object({ ... })) }),
  handler: async (ctx, args) => {
    const order = await ctx.db.orders.create(args)

    // Just emit event - other systems handle notifications
    await ctx.send("order.created", {
      orderId: order.id,
      total: order.total,
      userId: ctx.userId
    })

    return ok(order)
  }
})

// Separate listener for emails
t.on("order.created", async (ctx, args, event) => {
  const user = await ctx.db.users.find(event.data.userId)
  await ctx.emailService.send({
    to: user.email,
    template: "order_confirmation",
    data: { orderId: event.data.orderId }
  })
})

// Separate listener for push notifications
t.on("order.created", async (ctx, args, event) => {
  await ctx.pushService.send({
    userId: event.data.userId,
    title: "Order Confirmed",
    body: `Your order #${event.data.orderId} is confirmed`
  })
})
```

### 2. Audit Trails

```typescript
// Every mutation emits relevant events
t.on("user.*", async (ctx, args, event) => {
  await ctx.db.auditLog.create({
    action: event.name,
    userId: ctx.userId,
    timestamp: event.timestamp,
    data: event.data
  })
})

t.on("order.*", async (ctx, args, event) => {
  await ctx.db.auditLog.create({
    action: event.name,
    userId: ctx.userId,
    timestamp: event.timestamp,
    data: event.data
  })
})
```

### 3. Cache Invalidation

```typescript
// Emit cache invalidation events
t.on("user.updated", async (ctx, args, event) => {
  ctx.cache.invalidate(`user:${event.data.userId}`)
  ctx.cache.invalidate("users:list")
})

t.on("post.*", async (ctx, args, event) => {
  ctx.cache.invalidate(`post:${event.data.postId}`)
  ctx.cache.invalidate("posts:list")
})
```

### 4. Analytics

```typescript
// Track all significant events
t.on("*", async (ctx, args, event) => {
  ctx.analytics.track(event.name, {
    ...event.data,
    timestamp: event.timestamp,
    userId: ctx.userId
  })
})
```

## Error Handling

Listeners should handle errors gracefully. Errors in listeners don't affect the main operation:

```typescript
t.on("user.created", async (ctx, args, event) => {
  try {
    await ctx.emailService.send({ to: event.data.email })
  } catch (error) {
    // Log but don't fail the user creation
    ctx.logger.error("Failed to send welcome email", error)
  }
})
```

## Best Practices

1. **Use descriptive event names** - `user.created` not `uc`
2. **Emit events for significant state changes** - User created, order completed, etc.
3. **Keep event data minimal** - Include IDs, not full objects (query separately if needed)
4. **Use wildcards for related events** - Listen to `user.*` for all user events
5. **Don't emit too many events** - Only significant state changes deserve events

```typescript
// Good: Significant state change
await ctx.send("order.completed", { orderId: order.id, total: order.total })

// Avoid: Minor state changes
await ctx.send("field.updated", { field: "name", old: "John", new: "Jane" })
```

## See Also

- [Plugin System](features/plugin-system.md) - Plugins can emit events
- [Lifecycle Hooks](features/lifecycle-hooks.md) - Alternative for synchronous reactions