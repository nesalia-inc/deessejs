# How Client and Server Plugins Communicate

The communication between client and server plugins is **exclusively HTTP-based** at runtime, with **TypeScript-only** type-level linking.

---

## Runtime: HTTP Communication

### The $fetch Client

On the client side, better-auth uses `createFetch` to create an HTTP client:

```javascript
const $fetch = createFetch({
  baseURL,
  credentials: "include",
  jsonParser(text) {
    return parseJSON(text, { strict: false });
  },
  customFetchImpl: fetch,
  plugins: [lifeCyclePlugin, ...pluginsFetchPlugins]
});
```

### How Calls Flow

```
Client Component
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  client.organization.list({ limit: 10 })                        │
│           │                                                     │
│           ▼                                                     │
│  $fetch("/organization/list", { method: "GET" })                │
│           │                                                     │
│           ▼                                                     │
│  HTTP Request ─────────────────────────────────────────────────►│
│  Headers: Cookie: session=abc123                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Server Endpoint: /organization/list                             │
│           │                                                     │
│           ▼                                                     │
│  BetterAuth validates session                                   │
│           │                                                     │
│           ▼                                                     │
│  Handler executes with ctx.context                              │
│           │                                                     │
│           ▼                                                     │
│  HTTP Response ◄─────────────────────────────────────────────────
│  { organizations: [...] }
└─────────────────────────────────────────────────────────────────┘
```

### No Plugin-to-Plugin Communication

At runtime, there is **no direct plugin communication**:

```
❌ Client Plugin ──────► Server Plugin (NO direct link)

✓ Client Plugin ──────► HTTP Endpoint ──────► Server Plugin
```

The client calls HTTP endpoints. The server plugin handles the HTTP request. They're connected only through HTTP, not through any shared state or direct invocation.

---

## Type-Level: $InferServerPlugin Marker

### The Marker Pattern

```typescript
// CLIENT PLUGIN
const organizationClient = (options) => {
  return {
    id: "organization",
    $InferServerPlugin: {},  // ← Empty object at runtime
    pathMethods: { "/organization/list": "GET" },
  };
};
```

```typescript
// SERVER PLUGIN
function organization(options) {
  return {
    id: "organization",
    endpoints: {
      list: { handler: async (ctx, args) => { ... } }
    },
    // No awareness of client
  };
}
```

### What $InferServerPlugin Contains

At **runtime**, `$InferServerPlugin: {}` is an empty object. It carries:
- **Zero runtime information**
- **Zero serialization cost**
- **Zero runtime checks**

At **compile-time**, TypeScript uses it to:
1. Know all available endpoint paths
2. Infer request/response types
3. Provide autocomplete for error codes
4. Extend User/Session types

### TypeScript Inference Chain

```typescript
// 1. Server defines endpoint
endpoints: {
  list: {
    path: "/organization/list",
    method: "GET",
    response: Organization[],
  }
}

// 2. $InferServerPlugin: {} links client to server

// 3. TypeScript infers for client
client.organization.list()  // → Organization[]
```

---

## The Complete Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RUNTIME                                 │
│                                                                  │
│  Client                                  Server                   │
│  ──────                                  ──────                  │
│  $fetch("/org/list")    HTTP Request    endpoints.list.handler  │
│       │                                      │                  │
│       │          HTTP Response              ▼                  │
│       ◄───────────────────────────────────────                  │
│                                                                  │
│  NO direct plugin-to-plugin communication                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       COMPILE-TIME                              │
│                                                                  │
│  Client                                  Server                 │
│  ──────                                  ──────                  │
│  $InferServerPlugin: {}  ──── TypeScript inference ────►        │
│                         endpoints definition                    │
│                                                                  │
│  TypeScript knows:                                              │
│  - All paths                                                    │
│  - All types                                                    │
│  - All error codes                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Communication Summary

| Aspect | Mechanism | Description |
|--------|-----------|-------------|
| **Runtime** | HTTP | Client calls server endpoints via $fetch |
| **Type Link** | $InferServerPlugin | Empty object {} for TypeScript inference |
| **Session** | Cookie | Session cookie sent automatically with credentials |
| **Validation** | Server | All requests validated on server side |

---

## See Also

- [Type Inference](./07-type-inference.md) - How TypeScript uses the marker
- [Awareness](./08-awareness.md) - The asymmetric relationship
- [Client Plugins](./02-client-plugins.md)