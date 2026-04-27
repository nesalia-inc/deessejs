# Defining Context

`defineContext()` is the entry point for setting up your API. It creates the query builder (`t`) and the `createAPI` factory function.

## Overview

```typescript
import { defineContext } from "@deessejs/server"

const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  plugins?: [],
  events?: defineEvents({ ... })
})
```

## Signature

```typescript
function defineContext<Ctx, Plugins extends Plugin<Ctx>[]>(
  config: {
    context: Ctx
    plugins?: Plugins
    events?: EventRegistry
    errorMapping?: ErrorMapping
    serialization?: SerializationConfig
  }
): {
  t: QueryBuilder<Ctx>
  createAPI: (config: { router: Router; middleware?: Middleware<Ctx>[] }) => APIInstance<Ctx>
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `context` | `Ctx` | Yes | The base context object (database, logger, etc.) |
| `plugins` | `Plugin[]` | No | Plugins to extend context and add routes |
| `events` | `EventRegistry` | No | Typed event definitions for decoupled communication |
| `errorMapping` | `ErrorMapping` | No | Custom error code to HTTP status mapping |
| `serialization` | `SerializationConfig` | No | Custom serialization options |

## Returns

| Return | Type | Description |
|--------|------|-------------|
| `t` | `QueryBuilder<Ctx>` | Query builder for defining procedures |
| `createAPI` | `function` | Factory function to create an API instance |

## Basic Usage

```typescript
import { defineContext } from "@deessejs/server"

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
    logger: console,
  },
})
```

## Complete Example

```typescript
import { defineContext, createAPI, defineEvents } from "@deessejs/server"
import { authPlugin } from "./plugins/auth"
import { cachePlugin } from "./plugins/cache"

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
    logger: console,
    userId: null,
  },
  plugins: [authPlugin, cachePlugin],
  events: defineEvents({
    "user.created": { data: { id: "number", email: "string" } },
    "user.deleted": { data: { id: "number" } },
    "post.published": { data: { id: "number", title: "string" } },
  }),
})
```

## Context Typing

The context is fully typed, providing autocomplete and type safety:

```typescript
type Context = {
  db: Database
  logger: Logger
  userId: string | null
}

const { t, createAPI } = defineContext<Context>({
  context: {
    db: myDatabase,
    logger: console,
    userId: null,
  },
})

// Handler has typed access to context
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    // ctx.db is typed as Database
    // ctx.logger is typed as Logger
    // ctx.userId is typed as string | null
    const user = await ctx.db.users.find(args.id)
    return ok(user)
  },
})
```

## With Plugins

Plugins extend the context with additional properties:

```typescript
import { defineContext, plugin } from "@deessejs/server"

const authPlugin = plugin({
  name: "auth",
  extend: (ctx) => ({
    userId: null,
    isAuthenticated: false,
    getUserId: () => ctx.userId,
    setUserId: (userId: string) => { ctx.userId = userId },
  }),
})

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
  },
  plugins: [authPlugin],
})

// Context now includes plugin properties
const createPost = t.mutation({
  args: z.object({ title: z.string(), content: z.string() }),
  handler: async (ctx, args) => {
    // ctx has userId, isAuthenticated, getUserId, setUserId
    if (!ctx.isAuthenticated) {
      return err({ code: "UNAUTHORIZED", message: "Must be logged in" })
    }
    const post = await ctx.db.posts.create({
      ...args,
      authorId: ctx.userId,
    })
    return ok(post)
  },
})
```

## With Events

Define typed events for decoupled communication:

```typescript
import { defineContext, defineEvents } from "@deessejs/server"

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
  },
  events: defineEvents({
    "user.created": {
      data: { id: "number", email: "string" },
    },
    "post.published": {
      data: { id: "number", title: "string" },
    },
  }),
})

// Emit events from handlers
const createUser = t.mutation({
  args: z.object({ name: z.string(), email: z.string().email() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    ctx.send("user.created", { id: user.id, email: user.email })
    return ok(user)
  },
})

// Listen to events globally
t.on("user.created", async (ctx, args, event) => {
  await ctx.db.notifications.create({
    type: "welcome",
    userId: event.data.id,
  })
})
```

## Creating the API

After defining procedures, create the API instance:

```typescript
const api = createAPI({
  router: t.router({
    users: {
      get: t.query({ ... }),
      create: t.mutation({ ... }),
    },
    posts: {
      list: t.query({ ... }),
      get: t.query({ ... }),
      create: t.mutation({ ... }),
    },
  }),
})

export { api }
```

## Context in Handlers

The context is available as the first parameter in all handlers:

```typescript
// Query handler
t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    // ctx = { db, logger, userId, ... }
    return ok(await ctx.db.users.find(args.id))
  },
})

// Mutation handler
t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    // ctx = { db, logger, userId, ... }
    const user = await ctx.db.users.create(args)
    return ok(user)
  },
})

// Internal query handler
t.internalQuery({
  handler: async (ctx) => {
    // ctx = { db, logger, userId, ... }
    return ok({ total: await ctx.db.users.count() })
  },
})
```

## See Also

- [Creating API](features/creating-api.md) - API creation functions
- [Router](features/router.md) - Organizing procedures
- [Plugin System](features/plugin-system.md) - Extending context
- [Event System](features/event-system.md) - Decoupled communication
- [@deesse-fp skill](../deesse-fp/SKILL.md) - Result type with ok/err