# Awareness Between Client and Server Plugins

There is a **one-way awareness** between client and server plugins, operating **only at the TypeScript level**, not at runtime.

---

## The Asymmetric Nature

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT PLUGIN                                 │
│                                                                  │
│  $InferServerPlugin: {}  ──────► references server plugin        │
│                                                                  │
│  Knows:                                                          │
│  - Endpoint paths from server                                   │
│  - Request/response types                                        │
│  - HTTP methods (GET/POST)                                       │
│  - Error codes                                                   │
│                                                                  │
│  Does NOT know:                                                  │
│  - Server implementation details                                 │
│  - Database schema                                               │
│  - Server-side middleware logic                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Type-level marker ($InferServerPlugin)
                              │ HTTP calls at runtime
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER PLUGIN                                 │
│                                                                  │
│  No awareness of client plugins at all                           │
│                                                                  │
│  Only defines:                                                   │
│  - endpoints: { ... }                                            │
│  - schema: { ... }                                               │
│  - hooks: { ... }                                               │
│                                                                  │
│  Completely oblivious to client existence                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Asymmetric?

| Side | Awareness | Rationale |
|------|-----------|-----------|
| **Client → Server** | YES, via `$InferServerPlugin` | Client needs type safety for API calls |
| **Server → Client** | NO | Server doesn't need to know about clients - it just exposes HTTP endpoints |

### The Server Doesn't Care

The server **doesn't care** who calls its endpoints:

```typescript
// SERVER - completely oblivious
function organization(options) {
  return {
    id: "organization",
    // No $InferClientPlugin or similar
    // No awareness of any client
    endpoints: {
      list: { handler: async (ctx, args) => { ... } }
    },
  };
}

// Server just processes requests:
// - Validates session cookie
// - Checks authorization
// - Executes handler
// - Returns response
```

### The Client Needs to Know

The client is the one that needs to know:

- What endpoints exist
- What arguments to pass
- What to expect as response
- What error codes exist

---

## The $InferServerPlugin Marker

```typescript
// CLIENT PLUGIN
const organizationClient = (options) => {
  return {
    id: "organization",
    $InferServerPlugin: {},  // ← Empty object! Just a type-level marker
    pathMethods: { "/organization/list": "GET" },
    // ...
  };
};
```

```typescript
// SERVER PLUGIN - NO awareness of client
function organization(options) {
  return {
    id: "organization",
    // No $InferClientPlugin or similar
    endpoints: {
      list: { handler: async (ctx, args) => { ... } }
    },
    // ...
  };
}
```

The `$InferServerPlugin: {}` is an **empty object** at runtime. It carries zero information at runtime—it exists solely for TypeScript to infer types.

---

## What the Client Infers from $InferServerPlugin

```typescript
// Thanks to $InferServerPlugin, TypeScript knows:

client.organization.list({})                    // ✓ Valid - endpoint exists
client.organization.delete({ id: "123" })       // ✓ Valid - endpoint exists
client.organization.adminSecret()               // ✗ Type error - not exposed
client.organization.list({ limit: "10" })      // ✗ Type error - should be number
```

Without `$InferServerPlugin`, you would need to manually maintain types or use `as any` casts.

---

## Runtime Reality

At runtime, there is **no connection** between client and server plugins:

```
Client                              Server
─────────────────────────────────────────────────
organizationClient  ───HTTP──►  organization (server)
       │                              │
       │ $InferServerPlugin: {}       │ (nothing)
       │ (type marker only)           │
       ▼                              ▼
   No runtime link              No awareness of client
```

### What Actually Happens at Runtime

```typescript
// 1. Client calls
const data = await $fetch("/organization/list", { method: "GET" });

// 2. HTTP Request sent (no plugin info)
//    GET /organization/list
//    Cookie: session=abc123

// 3. Server receives request
//    - Validates session
//    - Calls handler
//    - Returns JSON

// 4. Client receives response
//    - $InferServerPlugin is never sent
//    - It doesn't exist at runtime
```

The client uses `$fetch` (a standard HTTP client) to call server endpoints. The server responds with JSON. There is **no plugin-to-plugin communication**—just HTTP requests and responses.

---

## Type-Level Safety Without Runtime Overhead

Because `$InferServerPlugin` is just an empty object at runtime:

| Property | Value |
|----------|-------|
| **Serialization cost** | Zero - not sent anywhere |
| **Runtime checks** | Zero - TypeScript erases it |
| **Bundle size impact** | Zero - compiled away |
| **Value** | Compile-time only |

---

## Awareness Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AWARENESS MATRIX                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Server Plugin:                                                               │
│  ├── Knows about: Nothing (server is oblivious)                               │
│  ├── Links to: Nothing                                                        │
│  └── Awareness direction: NONE                                                │
│                                                                              │
│  Client Plugin:                                                               │
│  ├── Knows about: Server via $InferServerPlugin                              │
│  ├── Links to: Server endpoint paths, types, error codes                     │
│  └── Awareness direction: CLIENT → SERVER                                     │
│                                                                              │
│  Communication:                                                               │
│  ├── Runtime: HTTP via $fetch (no plugin-to-plugin)                          │
│  └── Compile-time: TypeScript via $InferServerPlugin (empty object)            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Practical Implications

### For Plugin Authors

If you're creating a plugin with both client and server parts:

1. **Server plugin** - Define endpoints, schema, hooks. No awareness of client needed.
2. **Client plugin** - Use `$InferServerPlugin: {}` to link to server. No implementation details needed.

### For Users

You register them separately:

```typescript
// Server
export const auth = betterAuth({
  plugins: [organization]  // Server plugin only
});

// Client
export const client = createAuthClient({
  plugin: organizationClient  // Client plugin only
});
```

The `$InferServerPlugin` marker connects them at compile-time.

---

## See Also

- [Type Inference](./07-type-inference.md) - How the marker enables inference
- [Client Plugins](./02-client-plugins.md) - $InferServerPlugin property
- [Server Plugins](./03-server-plugins.md) - Server has no awareness
- [Plugin Pairs](./09-plugin-pairs.md) - Official examples of the pattern