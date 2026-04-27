# Why Separate Client and Server Plugins?

The separation serves four critical purposes: **security**, **bundle size**, **capability**, and **type safety**.

---

## Security

| Concern | Server Plugin | Client Plugin |
|---------|--------------|---------------|
| **Database Access** | Full read/write via adapter | None |
| **Session Manipulation** | Create, modify, delete sessions | None |
| **Secret Access** | Has access to AUTH_SECRET | None |
| **Authorization Bypass** | Can enforce custom rules | Cannot—only calls predefined endpoints |

Server plugins can perform **privileged operations**:
- Ban users
- Modify sessions
- Change passwords
- Access internal adapters

Client plugins **cannot bypass authorization**. Every call goes through the server endpoint which validates the session cookie.

---

## Bundle Size

Server-only code must **never ship to the client**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Server Plugin Bundle                         │
│                                                                  │
│  adapters/database.ts   ──X──►  NEVER goes to client            │
│  crypto/session.ts      ──X──►  NEVER goes to client            │
│  middleware/auth.ts     ──X──►  NEVER goes to client            │
│  config/secrets.ts      ──X──►  NEVER goes to client            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Client Plugin Bundle                         │
│                                                                  │
│  types.ts             ✓  Small - just types                    │
│  atoms.ts             ✓  Small - state management                │
│  fetch-config.ts      ✓  Small - HTTP config                    │
│  $InferServerPlugin   ✓  Tiny - empty object {}                 │
└─────────────────────────────────────────────────────────────────┘
```

### Bundle Size Impact

| Plugin Feature | Server Impact | Client Impact |
|---------------|---------------|---------------|
| Database adapter | +50KB | +0KB |
| TOTP crypto | +30KB | +0KB |
| HTTP fetch config | +5KB | +5KB |
| State atoms | +3KB | +3KB |
| Type markers | +0KB | +0KB |

---

## Capability

### Server Plugin Capabilities

Full access to `AuthContext`:

```typescript
init: async (ctx) => {
  // ctx.context.adapter - database operations
  // ctx.context.internalAdapter - internal admin operations
  // ctx.context.secretConfig - secrets
  // ctx.options - auth configuration

  return {
    context: {
      customAdapter: await createCustomAdapter(ctx.context.adapter),
    }
  };
}
```

### Client Plugin Capabilities

Limited to:

```typescript
// $fetch - HTTP client
const data = await $fetch("/organization/list", { method: "GET" });

// $store - State store
$store.notify("organization_updated");

// atoms - Reactive state
const $activeOrg = atom(null);
```

---

## Type Safety

The separation enables **compile-time safety**:

```typescript
// TypeScript knows this exists (from $InferServerPlugin)
client.organization.list({ limit: 10 });  // ✓ Valid

// TypeScript errors - not exposed
client.organization.deleteAll();  // ✗ Error - doesn't exist on server
```

Without the separation, you'd need to manually maintain type consistency between client and server.

---

## Summary

| Reason | How It Works |
|--------|--------------|
| **Security** | Privileged operations only on server; client can't bypass auth |
| **Bundle Size** | Server code (adapters, crypto, middleware) never ships |
| **Capability** | Server has full AuthContext; client has only $fetch and atoms |
| **Type Safety** | $InferServerPlugin enables compile-time endpoint inference |

---

## See Also

- [Capabilities](./05-capabilities.md) - Detailed breakdown of what each side can access
- [Security](./10-security.md) - Detailed security rationale
- [Awareness](./08-awareness.md) - The type-level connection