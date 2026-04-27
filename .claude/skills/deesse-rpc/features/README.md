# Features Overview

This folder contains detailed documentation for each feature of the @deessejs/server RPC protocol.

## Quick Reference

| Feature | When to Use |
|---------|-------------|
| [Queries](queries.md) | Read operations exposed via HTTP |
| [Mutations](mutations.md) | Write operations exposed via HTTP |
| [Internal Operations](internal-operations.md) | Server-only operations (admin, sensitive) |
| [Router](router.md) | Organize procedures into namespaces |
| [Middleware](middleware.md) | Intercept requests (auth, rate-limit, caching) |
| [Lifecycle Hooks](lifecycle-hooks.md) | React to execution (logging, metrics) |
| [Plugin System](plugin-system.md) | Extend context and add global routes |
| [Event System](event-system.md) | Decoupled communication between modules |
| [Cache System](cache-system.md) | Cache invalidation and keys |
| [Validation](validation.md) | Multi-engine validation (Zod, Valibot, ArkType) |
| [Error Handling](error-handling.md) | Error codes and HTTP status mapping |
| [Serialization](serialization.md) | Date, BigInt, Map, Set handling |
| [React Hooks](react-hooks.md) | Client-side useQuery/useMutation |
| [Security Model](security-model.md) | Public vs internal operations |
| [Metadata](metadata.md) | OpenAPI generation and route reflection |
| [Async Context](async-context.md) | AsyncLocalStorage for context access |
| [Batching](batching.md) | Request batching for performance |
| [Defining Context](defining-context.md) | Entry point for API setup |
| [Creating API](creating-api.md) | createAPI, createPublicAPI |

---

## Decision Guide

### What type of operation?

```
Need to READ data?
├── Public (HTTP) → t.query()
│   └── [Queries](queries.md)
└── Server-only → t.internalQuery()
    └── [Internal Operations](internal-operations.md)

Need to WRITE data?
├── Public (HTTP) → t.mutation()
│   └── [Mutations](mutations.md)
└── Server-only → t.internalMutation()
    └── [Internal Operations](internal-operations.md)
```

### Need to modify or intercept requests?

```
Control execution (short-circuit, modify args) → [Middleware](middleware.md)
Observe execution (logging, metrics) → [Lifecycle Hooks](lifecycle-hooks.md)
Extend context with properties → [Plugin System](plugin-system.md)
```

### Need to handle cross-cutting concerns?

```
Authentication/Authorization → [Middleware](middleware.md)
Logging → [Lifecycle Hooks](lifecycle-hooks.md) or [Middleware](middleware.md)
Rate limiting → [Middleware](middleware.md)
Cache invalidation → [Cache System](cache-system.md)
Decoupled communication → [Event System](event-system.md)
```

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     @deessejs/server                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  defineContext() ──► t.query() / t.mutation()                 │
│       │                 │                                      │
│       │                 ▼                                      │
│       │           t.router() ──► createAPI()                   │
│       │                 │                                      │
│       │                 ▼                                      │
│       │         ┌───────────────┐                              │
│       │         │ API Instance  │                              │
│       │         └───────────────┘                              │
│       │                 │                                      │
│       ▼                 ▼                                      │
│  plugins/           createPublicAPI() ──► HTTP Handler          │
│  middleware         (client-safe)         (Next.js, Hono)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Model

```
HTTP Exposed              Server-Only
─────────────            ─────────────
t.query()                t.internalQuery()
t.mutation()             t.internalMutation()
```

[Security Model](security-model.md) - Understand what is exposed via HTTP

---

## Getting Started

1. **[Defining Context](defining-context.md)** - Start here to understand the entry point
2. **[Queries](queries.md)** - Learn public read operations
3. **[Mutations](mutations.md)** - Learn public write operations
4. **[Creating API](creating-api.md)** - Create your API instance
5. **[Validation](validation.md)** - Add input validation with your preferred library

---

## Feature Categories

### Core (Essential)
- [Queries](queries.md) - Public read operations
- [Mutations](mutations.md) - Public write operations
- [Router](router.md) - Hierarchical route organization
- [Creating API](creating-api.md) - API creation

### Security
- [Internal Operations](internal-operations.md) - Server-only procedures
- [Security Model](security-model.md) - Public vs internal separation

### Extensibility
- [Middleware](middleware.md) - Request interception
- [Lifecycle Hooks](lifecycle-hooks.md) - Execution hooks
- [Plugin System](plugin-system.md) - Context extension
- [Event System](event-system.md) - Pub/sub communication

### Data Management
- [Cache System](cache-system.md) - Cache keys and invalidation
- [Validation](validation.md) - Multi-engine input validation
- [Serialization](serialization.md) - Complex type handling

### Integration
- [React Hooks](react-hooks.md) - Client-side integration

### Advanced
- [Metadata](metadata.md) - Route reflection and OpenAPI
- [Async Context](async-context.md) - AsyncLocalStorage
- [Batching](batching.md) - Request batching
- [Error Handling](error-handling.md) - Error codes and HTTP status

---

## Related Documentation

- [../deesse-fp/SKILL.md](../../deesse-fp/SKILL.md) - Result type with ok/err patterns
- [../../docs/SPEC.md](../../docs/SPEC.md) - Full API specification