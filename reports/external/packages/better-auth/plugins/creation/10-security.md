# Security Rationale

The client/server plugin separation in better-auth is fundamentally a **security architecture** that prevents privilege escalation attacks.

---

## The Threat Model

Without separation, a client plugin could potentially:

1. **Access internal adapters** - Bypass authorization
2. **Manipulate sessions** - Impersonate users
3. **Access secrets** - Expose AUTH_SECRET
4. **Modify database directly** - Bypass business logic

```
┌─────────────────────────────────────────────────────────────────┐
│          Without Separation (HYPOTHETICAL BAD DESIGN)           │
│                                                                  │
│  Client Plugin                                                    │
│  ├── $fetch("/admin/ban-user", { userId: "123" })  ✗ Called     │
│  ├── ctx.context.adapter.deleteUser(id)           ✗ Bypass      │
│  └── ctx.context.secretConfig                    ✗ Exposed      │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Security Model

### Principle of Least Privilege

| Component | Gets | Cannot Do |
|-----------|------|-----------|
| **Server plugin** | Full AuthContext, adapter, secrets | Ship to client |
| **Client plugin** | $fetch, atoms | Access database, secrets, sessions |

### Server as Gatekeeper

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT                                      │
│                                                                  │
│  Client Plugin                                                    │
│  └── $fetch("/admin/ban-user", { userId: "123" })               │
│           │                                                     │
│           ▼                                                     │
│  HTTP Request to /admin/ban-user                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Session cookie validated
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER                                      │
│                                                                  │
│  Server Plugin                                                   │
│  ├── Validates session                                           │
│  ├── Checks authorization (is admin?)                           │
│  ├── Executes ban operation                                     │
│  └── Returns success/error                                      │
│                                                                  │
│  User can only be banned if:                                    │
│  - Valid session exists                                         │
│  - Session belongs to admin                                      │
│  - Admin has permission to ban                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Critical Operations That Must Be Server-Only

### Session Manipulation

```typescript
// MUST BE SERVER-ONLY
ctx.context.internalAdapter.createSession(userId, deviceInfo);
ctx.context.internalAdapter.deleteSession(sessionId);
ctx.context.internalAdapter.refreshSession(sessionId);
ctx.context.internalAdapter.listSessions(userId);
```

### User Management

```typescript
// MUST BE SERVER-ONLY
ctx.context.internalAdapter.listUsers(100);
ctx.context.internalAdapter.banUser(userId);
ctx.context.internalAdapter.unbanUser(userId);
ctx.context.internalAdapter.deleteUser(userId);
```

### Password Operations

```typescript
// MUST BE SERVER-ONLY
ctx.context.internalAdapter.setPassword(userId, newPassword);
ctx.context.internalAdapter.verifyPassword(userId, password);
ctx.context.internalAdapter.generateTOTPSecret();
```

---

## Why Client Plugins Cannot Bypass

### 1. No Direct Adapter Access

```typescript
// Client plugin - this doesn't exist
const client = {
  getAtoms: ($fetch) => ({
    // No ctx.context.adapter here
    // No ctx.context.internalAdapter here
  })
};
```

### 2. All Calls Go Through HTTP

```typescript
// Client can only do this:
$fetch("/admin/ban-user", { method: "POST", body: { userId } });

// Cannot do this (doesn't exist on client):
ctx.context.internalAdapter.banUser(userId);  // ✗ Undefined
```

### 3. Server Validates Everything

```typescript
// Server endpoint always validates
endpoints: {
  banUser: {
    handler: async (ctx, args) => {
      // 1. Check session exists
      if (!ctx.context.session) {
        throw new Error("UNAUTHORIZED");
      }
      // 2. Check is admin
      if (!ctx.context.session.user.isAdmin) {
        throw new Error("FORBIDDEN");
      }
      // 3. Execute
      await ctx.context.internalAdapter.banUser(args.userId);
      return { success: true };
    }
  }
}
```

---

## Real-World Example: Two-Factor

### Why TOTP Secret Generation Must Be Server-Only

```
┌─────────────────────────────────────────────────────────────────┐
│                     TWO-FACTOR ENROLLMENT                        │
│                                                                  │
│  Client Request: /two-factor/enable                             │
│                                                                  │
│  Server handles:                                                │
│  1. Generate TOTP secret using crypto (secure random)            │
│  2. Encrypt secret for storage                                  │
│  3. Store encrypted secret in database                          │
│  4. Generate QR code for authenticator app                      │
│  5. Return secret/QR to user                                    │
│                                                                  │
│  Client receives:                                                │
│  - QR code image                                                 │
│  - No access to raw TOTP secret                                 │
└─────────────────────────────────────────────────────────────────┘
```

If the client had access to `ctx.context.internalAdapter.generateTOTPSecret()`, a malicious client could:
1. Generate any TOTP secret
2. Bypass the enrollment flow
3. Associate arbitrary secrets with user accounts

---

## Compile-Time Safety

Better-auth provides **compile-time errors** for wrong plugin usage:

```typescript
// Using server plugin on client - TypeScript error
import { admin } from "better-auth/plugins";  // Server plugin

createAuthClient({
  plugin: admin  // ✗ TypeScript error: BetterAuthPlugin is not BetterAuthClientPlugin
});

// Using client plugin on server - TypeScript error
import { adminClient } from "better-auth/client/plugins";  // Client plugin

betterAuth({
  plugins: [adminClient]  // ✗ TypeScript error: BetterAuthClientPlugin is not BetterAuthPlugin
});
```

---

## Summary

| Security Property | How It's Enforced |
|------------------|-------------------|
| **No direct DB access from client** | Client has no adapter reference |
| **No session manipulation from client** | Client has no internalAdapter reference |
| **No secrets exposure** | Client has no secretConfig reference |
| **Authorization always checked** | Server middleware + endpoint handlers validate |
| **Type-level enforcement** | TypeScript prevents wrong plugin usage |

---

## See Also

- [Capabilities](./05-capabilities.md) - What each side can access
- [Why Separate](./04-why-separate.md) - Security rationale
- [Client Plugins](./02-client-plugins.md)