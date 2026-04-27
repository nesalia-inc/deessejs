# Capabilities: What Each Side Can Access

This document details exactly what each plugin type can and cannot access.

---

## Server Plugin Capabilities

### Full AuthContext Access

```typescript
init: async (ctx) => {
  // ctx.context contains:

  // Database adapter (drizzle, postgres, etc.)
  ctx.context.adapter;       // → Standard adapter operations

  // Internal adapter (admin operations)
  ctx.context.internalAdapter; // → listUsers, listSessions, etc.

  // Secret configuration
  ctx.context.secretConfig;  // → AUTH_SECRET and other secrets

  // Database schema
  ctx.context.schema;       // → Database tables structure

  // Cookie configuration
  ctx.context.cookies;       // → Cookie settings
}
```

### Available Operations

| Capability | Server Access | Description |
|------------|---------------|-------------|
| Database | Full | Read/write via adapter |
| Sessions | Full | Create, modify, delete |
| Users | Full | List, ban, update |
| Cookies | Full | Set, read, clear |
| Secrets | Full | Access AUTH_SECRET |
| Rate Limiting | Yes | Configure per-path |
| Middleware | Yes | Intercept any request |
| Hooks | Yes | Before/after lifecycle |

### Example: Session Creation

```typescript
endpoints: {
  createSession: {
    handler: async (ctx, args) => {
      // Full access to session management
      const session = await ctx.context.internalAdapter.createSession(
        args.userId,
        args.deviceInfo
      );
      return { sessionId: session.id };
    }
  }
}
```

---

## Client Plugin Capabilities

### Limited Surface Area

```typescript
// Available in client plugins:

// $fetch - HTTP client only
const $fetch: BetterFetch;

// $store - Notify/listen state store
const $store: {
  notify(event: string): void;
  listen(event: string, callback: () => void): () => void;
};

// Options from createAuthClient
const options: BetterAuthClientOptions | undefined;
```

### Available Operations

| Capability | Client Access | Description |
|------------|---------------|-------------|
| HTTP Calls | Full | Via $fetch |
| State Atoms | Full | Nanostores |
| Type Inference | Full | Via $InferServerPlugin |
| Client-side Actions | Full | getActions() |
| Fetch Plugins | Full | HTTP lifecycle |
| Database | **None** | Cannot access |
| Sessions | **None** | Cannot manipulate |
| Cookies | **None** | Server-side only |
| Secrets | **None** | Never on client |

### Example: HTTP Call

```typescript
getAtoms: ($fetch) => ({
  // All calls go through $fetch - standard HTTP
  organizations: useAuthQuery(
    [],
    "/organization/list",
    $fetch,
    () => ({ method: "GET" })
  ),
})
```

---

## Capability Comparison

```
Server Plugin                              Client Plugin
────────────────────────────────────────   ────────────────────────────────
✓ ctx.context.adapter                     ✗ No database access
✓ ctx.context.internalAdapter              ✗ No internal operations
✓ ctx.context.secretConfig                 ✗ No secrets
✓ Session create/modify/delete              ✗ No session manipulation
✓ Cookie management                        ✗ No cookie access
✓ Rate limiting configuration              ✗ No rate limiting
✓ Custom middleware                        ✗ No middleware
✓ Schema migrations                        ✗ No schema access

✓ endpoints: { ... }                       ✓ pathMethods: { ... }
✓ schema: { ... }                          ✓ getAtoms: () => ({})
✓ hooks: { before, after }                 ✓ fetchPlugins: [...]
✓ adapter: { customOps }                   ✓ getActions: () => ({})
✓ onRequest/onResponse                     ✓ atomListeners: [...]
✓ init: (ctx) => ({})                      ✓ $InferServerPlugin: {}
```

---

## Why This Matters

### Security-Critical Operations

Operations that **must** be server-only:

```typescript
// These should NEVER be callable from client

// User banning
ctx.context.internalAdapter.banUser(userId);  // ✓ Server only

// Session deletion
ctx.context.internalAdapter.deleteSession(sessionId);  // ✓ Server only

// Password change (without old password)
ctx.context.internalAdapter.setPassword(userId, newPassword);  // ✓ Server only
```

If client plugins had access to these, anyone could ban users or delete sessions.

### Client-Safe Operations

Operations that **can** be client-accessible:

```typescript
// Fetching public data
$fetch("/organization/list");  // ✓ OK

// Triggering atom updates
$store.notify("refresh_orgs");  // ✓ OK

// Type-safe autocomplete
client.organization.list({});  // ✓ OK (via $InferServerPlugin)
```

---

## See Also

- [Client Plugins](./02-client-plugins.md)
- [Server Plugins](./03-server-plugins.md)
- [Security](./10-security.md)