# Plugin Pairs in better-auth

Many official better-auth plugins come as **server + client pairs**, where the client plugin links to the server via `$InferServerPlugin`.

---

## Official Plugin Pairs

| Plugin | Server File | Client File | Purpose |
|--------|------------|-------------|---------|
| Admin | `plugins/admin/admin.mjs` | `plugins/admin/client.mjs` | Admin user management |
| Organization | `plugins/organization/organization.mjs` | `plugins/organization/client.mjs` | Multi-tenant orgs |
| Two-Factor | `plugins/two-factor/index.mjs` | `plugins/two-factor/client.mjs` | TOTP + backup codes |
| Username | `plugins/username/index.mjs` | `plugins/username/client.mjs` | Username authentication |
| Email & Password | `plugins/index.ts` (built-in) | `plugins/adapters/email-and-password/client.mjs` | Email/password auth |
| OAuth | `plugins/oauth/index.mjs` | `plugins/oauth/client.mjs` | Social login |

---

## Example: Two-Factor Plugin Pair

### Server Plugin (two-factor/index.mjs)

```typescript
function twoFactor(options) {
  return {
    id: "two-factor",
    endpoints: {
      enableTwoFactor: {
        path: "/two-factor/enable",
        method: "POST",
        handler: async (ctx, args) => {
          // Generate TOTP secret
          const secret = await ctx.context.internalAdapter.generateTOTPSecret();
          // ... encryption and storage
          return { secret, qrCode: generateQRCode(secret) };
        }
      },
      verifyTwoFactor: { ... },
      disableTwoFactor: { ... },
    },
    schema: {
      // Database tables for 2FA
    },
    hooks: {
      before: [{ matcher: is2FAProtected, handler: verify2FA }]
    }
  };
}
```

### Client Plugin (two-factor/client.mjs)

```typescript
const twoFactorClient = (options) => {
  return {
    id: "two-factor",
    $InferServerPlugin: {},  // Links to twoFactor server plugin
    pathMethods: {
      "/two-factor/enable": "POST",
      "/two-factor/verify": "POST",
      "/two-factor/disable": "POST",
    },
    getAtoms: ($fetch) => ({
      $twoFactorEnabled: atom(false),
      $pendingTwoFactor: atom(false),
    }),
    fetchPlugins: [twoFactorFetchPlugin],
  };
};
```

---

## Example: Organization Plugin Pair

### Server Plugin (organization/organization.mjs)

```typescript
function organization(options) {
  const endpoints = {
    createOrganization: createOrganization(opts),
    updateOrganization: updateOrganization(opts),
    deleteOrganization: deleteOrganization(opts),
    setActiveOrganization: setActiveOrganization(opts),
    getFullOrganization: getFullOrganization(opts),
    listOrganizations: listOrganizations(opts),
    createInvitation: createInvitation(opts),
    listUserTeams: listUserTeams(opts),
  };

  return {
    id: "organization",
    version: PACKAGE_VERSION,
    endpoints,
    schema: mergeSchema(schema, opts.schema),
    options,
    hooks: {
      before: [{
        matcher: (ctx) => ctx.path.startsWith("/organization"),
        handler: organizationMiddleware
      }]
    },
    rateLimit: [{
      window: 60000,
      max: 100,
      pathMatcher: (p) => p.startsWith("/organization")
    }],
    $ERROR_CODES: ORGANIZATION_ERROR_CODES
  };
}
```

### Client Plugin (organization/client.mjs)

```typescript
const organizationClient = (options) => {
  return {
    id: "organization",
    version: PACKAGE_VERSION,
    $InferServerPlugin: {},  // Links to server
    getActions: ($fetch, $store, options) => ({
      organization: {
        checkRolePermission: (data) => {
          return clientSideHasPermission({
            role: data.role,
            options: { ac: options?.ac, roles },
            permissions: data.permissions
          });
        }
      }
    }),
    getAtoms: ($fetch) => ({
      $listOrg: atom(false),
      $activeOrgSignal: atom(false),
      $activeMemberSignal: atom(false),
      $activeMemberRoleSignal: atom(false),
      activeOrganization: useAuthQuery(
        [$activeOrgSignal],
        "/organization/get-full-organization",
        $fetch,
        () => ({ method: "GET" })
      ),
    }),
    pathMethods: {
      "/organization/get-full-organization": "GET",
      "/organization/list-user-teams": "GET",
    },
    atomListeners: [
      { matcher: (path) => path.startsWith("/organization"), signal: "$activeOrgSignal" },
    ],
    $ERROR_CODES: ORGANIZATION_ERROR_CODES
  };
};
```

---

## How Pairs Are Registered

### Server Registration

```typescript
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  plugins: [
    organization({ /* options */ })
  ]
});
```

### Client Registration

```typescript
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export const client = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  plugin: organizationClient({ /* options */ })
});
```

### The Connection

```
Server: organization()                    Server Plugin
    │                                         │
    └── endpoints, schema, hooks ─────────────┘
                                                  │
                                                  │ $InferServerPlugin: {}
                                                  ▼
Client: organizationClient()    ◄─────────────── Client Plugin
    │
    └── pathMethods, getAtoms, fetchPlugins
```

---

## Why Pair Files Exist Separately

The separation allows **selective imports**:

```typescript
// Import only server (Node.js, API routes)
import { organization } from "better-auth/plugins";

// Import only client (React, mobile)
import { organizationClient } from "better-auth/client/plugins";

// Import both (full-stack apps)
import { organization } from "better-auth/plugins";
import { organizationClient } from "better-auth/client/plugins";
```

This also enables **tree-shaking** - if you only import the client plugin, the server-only code (adapters, crypto) is not included.

---

## See Also

- [Client Plugins](./02-client-plugins.md)
- [Server Plugins](./03-server-plugins.md)
- [Awareness](./08-awareness.md) - How they connect