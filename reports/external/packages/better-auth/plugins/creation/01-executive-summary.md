# Executive Summary

Better-auth makes a **strict architectural separation between client plugins and server plugins** for fundamental security, capability, and bundle-size reasons. Server plugins run exclusively on the backend with access to database adapters, session management, and sensitive operations. Client plugins run in the browser (or mobile/native contexts) and provide type-safe API inference, state management via atoms, and fetch hooks.

---

## The Core Distinction

```
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER SIDE                              │
│                                                                  │
│  Server Plugin                                                   │
│  ├── endpoints: { list, create, delete, ... }                   │
│  ├── schema: { tables, indexes, ... }                          │
│  ├── hooks: { before, after, ... }                             │
│  └── init: (ctx) => { context, options }                       │
│                                                                  │
│  Access: Database, secrets, sessions, cookies                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                              │
│                                                                  │
│  Client Plugin                                                   │
│  ├── $InferServerPlugin: {}  ──────► links to server             │
│  ├── pathMethods: { "/org/list": "GET" }                        │
│  ├── getAtoms: () => ({ $activeOrg: atom(...) })               │
│  └── fetchPlugins: [...]                                        │
│                                                                  │
│  Access: $fetch, atoms, client-side validation                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Principles

### 1. Security Through Separation

Server plugins can perform privileged operations (ban users, modify sessions, access secrets). Client plugins **cannot** bypass authorization—they can only call pre-defined endpoints that the server validates.

### 2. Bundle Size Optimization

Server-only code (database adapters, crypto operations, middleware logic) **never ships to the client**. Client plugins are minimal: just type markers, state atoms, and HTTP configuration.

### 3. Type-Safe Communication

The `$InferServerPlugin: {}` marker enables TypeScript to infer:
- All available endpoint paths
- Request/response types
- Error codes
- Extended User/Session types

This happens **at compile-time only**—at runtime, it's just an empty object.

---

## Quick Example

### Server

```typescript
// organization.mjs
function organization(options) {
  return {
    id: "organization",
    endpoints: {
      createOrganization: createOrganization(opts),
      listOrganizations: listOrganizations(opts),
    },
    schema: organizationSchema,
  };
}
```

### Client

```typescript
// organization/client.mjs
const organizationClient = (options) => {
  return {
    id: "organization",
    $InferServerPlugin: {},  // Links to server plugin
    pathMethods: {
      "/organization/list": "GET",
      "/organization/create": "POST",
    },
    getAtoms: ($fetch) => ({
      $activeOrg: useAuthQuery([...], "/organization/list", $fetch),
    }),
  };
};
```

---

## See Also

- [Client Plugins](./02-client-plugins.md) - Detailed client plugin interface
- [Server Plugins](./03-server-plugins.md) - Detailed server plugin interface
- [Why Separate](./04-why-separate.md) - Detailed rationale
- [Awareness](./08-awareness.md) - The asymmetric plugin awareness