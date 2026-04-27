---
name: deesse-rpc
description: Documentation for @deessejs/server RPC protocol. Use when explaining, implementing, or debugging deesse RPC features.
---

# @deessejs/server Documentation

A modern functional-first RPC protocol for building type-safe APIs, designed for Next.js applications.

## Table of Contents

### Getting Started
- [Defining Context](features/defining-context.md) - Entry point for API setup
- [Creating API](features/creating-api.md) - Create API instance with router
- [Security Model](features/security-model.md) - Public vs internal operations

### Core Features
- [Queries](features/queries.md) - Public read operations (`t.query()`)
- [Mutations](features/mutations.md) - Public write operations (`t.mutation()`)
- [Internal Operations](features/internal-operations.md) - Server-only operations
- [Router](features/router.md) - Hierarchical route organization
- [Middleware](features/middleware.md) - Request interception

### Advanced Features
- [Lifecycle Hooks](features/lifecycle-hooks.md) - Hooks on procedures
- [Plugin System](features/plugin-system.md) - Extend context with plugins
- [Event System](features/event-system.md) - Publish-subscribe communication
- [Cache System](features/cache-system.md) - Cache keys and invalidation
- [Validation](features/validation.md) - Multi-engine validation (Zod, Valibot, ArkType)
- [Serialization](features/serialization.md) - Complex type handling

### Error & Type Safety
- [Error Handling](features/error-handling.md) - Error types and HTTP status mapping
- [Metadata](features/metadata.md) - Route reflection and OpenAPI generation

### Integrations
- [React Hooks](features/react-hooks.md) - Client-side hooks integration

### Architecture
- [Async Context](features/async-context.md) - AsyncLocalStorage for context access
- [Batching](features/batching.md) - Request batching for performance

## Examples

- [plugin-example (Hono)](../../examples/plugin-example/) - HTTP server with plugins
- [plugin-example-server](../../examples/plugin-example-server/) - Pure server-side with plugins

## Quick Example

```typescript
import { defineContext, createAPI } from "@deessejs/server"
import { z } from "zod"

const { t, createAPI } = defineContext({
  context: { db: myDatabase }
})

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    if (!user) return err({ code: "NOT_FOUND", message: "User not found" })
    return ok(user)
  }
})

const api = createAPI({
  router: t.router({
    users: { get: getUser }
  })
})
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| `t.query()` | Public read operations exposed via HTTP |
| `t.mutation()` | Public write operations exposed via HTTP |
| `t.internalQuery()` | Server-only read operations (NOT exposed) |
| `t.internalMutation()` | Server-only write operations (NOT exposed) |
| `defineContext()` | Entry point creating the query builder |
| `createAPI()` | Creates the API instance with router |
| `createPublicAPI()` | Client-safe API (excludes internal ops) |