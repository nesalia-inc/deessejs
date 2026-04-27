# Plugin System

Plugins extend the server-side context with additional properties, and can expose API routes. They are **server-only** - plugin properties are never exposed to clients.

## The `plugin()` Wrapper - NOW MANDATORY

Use the `plugin()` factory function to create plugins:

```typescript
import { plugin } from "@deessejs/server"

const authPlugin = plugin("auth", (ctx) => ({
  userId: ctx.userId,
  isAuthenticated: ctx.userId !== null,
  requireAuth: () => {
    if (!ctx.userId) throw new UnauthorizedException("Not authenticated")
  }
}))
```

The `plugin()` factory:
1. Takes a unique name as the first argument
2. Takes an `extend` function that returns properties to merge into context

## How Plugins Work

Plugins are passed to `defineContext()`:

```typescript
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  plugins: [authPlugin, loggerPlugin]
})
```

Each plugin's `extend(ctx)` is called **per-request** in `createHandlerContext`. The returned properties are merged into the context available in all handlers.

```
Request Flow:
┌─────────────────────────────────────────────────────────────┐
│  createHandlerContext()                                    │
│      │                                                     │
│      ├── extend() -> plugin 1                              │
│      ├── extend() -> plugin 2                              │
│      └── extend() -> plugin 3                             │
│              │                                             │
│              ▼                                             │
│  ┌─────────────────────┐                                   │
│  │  Handler (ctx)      │  <- ctx includes plugin props     │
│  └─────────────────────┘                                   │
│              │                                             │
│              ▼                                             │
│  Response with result (plugin props NOT exposed)           │
└─────────────────────────────────────────────────────────────┘
```

## Plugins Are Server-Only

**Critical**: Plugin properties are **never** sent to clients.

- Plugin `extend()` runs only in `createHandlerContext` (server-side)
- Plugin properties exist only in `ctx` during handler execution
- Clients cannot access plugin properties via HTTP
- To expose data to clients, use public queries/mutations

```typescript
// Plugin adds server-only property
const authPlugin = plugin("auth", (ctx) => ({
  // This is server-only - never exposed to client
  requireAuth: () => { ... }
}))

// Handler can use the plugin property
const getUser = t.query({
  handler: async (ctx, args) => {
    ctx.requireAuth() // Works! Server-side only
    return await ctx.db.users.find(args.id)
  }
})
```

## Real Examples in the Repo

See working implementations:

- [`examples/plugin-example/`](../../examples/plugin-example/) - HTTP server with plugins (Hono)
- [`examples/plugin-example-server/`](../../examples/plugin-example-server/) - Pure server-side with plugins

## Plugin Definition

```typescript
import { plugin } from "@deessejs/server"

type Ctx = {
  db: Database
  // ... other base context properties
}

const myPlugin = plugin<Ctx>("myPlugin", (ctx) => ({
  // Return properties to merge into context
  myProperty: "value",
  myHelper: () => { ... }
}))
```

### Plugin Properties

| Property | Type | Description |
|----------|------|-------------|
| First arg | `string` | Unique plugin name (used for namespacing routes) |
| `extend` | `(ctx: Ctx) => Partial<Ctx>` | Function returning properties to merge into context |

### Optional: Router and Hooks

```typescript
const notificationPlugin = plugin<Ctx, NotificationRouter>("notifications", (ctx) => ({
  sendNotification: async (to: string, msg: string) => {
    await ctx.db.notifications.create({ to, msg })
  }
}), {
  router: (t) => ({
    list: t.query({ handler: async (ctx) => ok(await ctx.db.notifications.findMany()) }),
    send: t.mutation({ args: z.object({ to: z.string(), msg: z.string() }), handler: async (ctx, a) => ok(ctx.sendNotification(a.to, a.msg)) })
  }),
  hooks: {
    onInvoke: (ctx, args) => { ctx.logger.info("notification op", args) },
    onSuccess: (ctx, args, result) => { ctx.logger.info("notification success") }
  }
})
```

### Lifecycle Hooks

| Hook | Parameters | Description |
|------|------------|-------------|
| `onInvoke` | `(ctx, args)` | Called before handler runs (can throw to block) |
| `onSuccess` | `(ctx, args, result)` | Called after successful execution |
| `onError` | `(ctx, args, error)` | Called when handler throws |

## Factory Pattern for Authenticated Contexts

Create plugins that integrate with specific user contexts:

```typescript
// Auth plugin with helper
const authPlugin = plugin("auth", (ctx) => ({
  userId: null as string | null,
  isAuthenticated: false,
  requireAuth: () => {
    if (!ctx.userId) throw new Error("UNAUTHORIZED")
  }
}))

// Factory to create API with specific user context
function createUserAPI(userId: string) {
  return createAPI({
    context: { db: myDatabase, userId },
    plugins: [
      plugin("auth", () => ({
        userId,
        isAuthenticated: true,
        requireAuth: () => { /* no-op - already authenticated */ }
      }))
    ],
    router: t.router({ users: { create: t.mutation({ ... }) } })
  })
}

// Usage
const userApi = createUserAPI("user-123")
const result = await userApi.users.create({ name: "Test", email: "test@test.com" })
```

## Using Multiple Plugins

```typescript
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  plugins: [
    authPlugin,    // Adds userId, isAuthenticated
    loggerPlugin,  // Adds logger (can use ctx.userId from authPlugin)
    cachePlugin    // Adds cache
  ]
})
```

**Plugin order matters**: Plugins that other plugins depend on should be listed first.

## Type Safety

```typescript
import { plugin } from "@deessejs/server"

type MyContext = {
  db: Database
  userId: string | null
  logger: Logger
}

export const authPlugin = plugin<MyContext>("auth", () => ({
  userId: null,
  logger: {} as Logger  // or actual implementation
}))

const getUser = t.query({
  handler: async (ctx: MyContext, args) => {
    ctx.db        // Database
    ctx.userId    // string | null
    ctx.logger    // Logger
  }
})
```

## See Also

- [Defining Context](features/defining-context.md) - Entry point with plugin support
- [Creating API](features/creating-api.md) - Creating the API instance
- [Security Model](features/security-model.md) - Plugins and security