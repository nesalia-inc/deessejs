# Migration Pattern: Converting a Monolithic Plugin

If you have a plugin that currently handles both client and server concerns, you can split it into separate client and server plugins.

---

## The Pattern

### Before: Monolithic Plugin

```typescript
// BEFORE: Single plugin with mixed concerns
const myPlugin = {
  id: "my-plugin",
  endpoints: { ... },       // Server-side
  schema: { ... },          // Server-side
  getAtoms: () => ({})      // Client-side
  pathMethods: { ... }      // Client-side
};
```

### After: Separate Plugins

```typescript
// Server plugin
const myPluginServer = {
  id: "my-plugin",
  endpoints: { ... },        // Server-side
  schema: { ... },           // Server-side
  hooks: { ... }             // Server-side
};

// Client plugin
const myPluginClient = {
  id: "my-plugin",
  $InferServerPlugin: {},     // Links to server
  getAtoms: () => ({}),       // Client-side
  pathMethods: { ... }        // Client-side
};
```

---

## Step-by-Step Migration

### Step 1: Identify Server-Side Code

Move to server plugin:
- `endpoints`
- `schema`
- `hooks`
- `init`
- `migrations`
- `rateLimit`
- `adapter`
- `onRequest` / `onResponse`
- `middlewares`

### Step 2: Identify Client-Side Code

Move to client plugin:
- `$InferServerPlugin`
- `pathMethods`
- `getAtoms`
- `fetchPlugins`
- `atomListeners`
- `getActions`
- `$ERROR_CODES`

### Step 3: Create Empty Marker

Add `$InferServerPlugin: {}` to client plugin:

```typescript
const myPluginClient = () => ({
  id: "my-plugin",
  $InferServerPlugin: {},  // Add this
  pathMethods: { ... },
  getAtoms: () => ({}),
});
```

### Step 4: Match IDs

Ensure both plugins have the same `id`:

```typescript
// Server
const myPluginServer = {
  id: "my-plugin",  // Same ID
  endpoints: { ... }
};

// Client
const myPluginClient = () => ({
  id: "my-plugin",  // Same ID
  $InferServerPlugin: {},
});
```

### Step 5: Match Error Codes

Copy `$ERROR_CODES` to client for type inference:

```typescript
const myPluginServer = {
  id: "my-plugin",
  $ERROR_CODES: {
    NOT_FOUND: { code: "NOT_FOUND", message: "Not found" }
  }
};

const myPluginClient = () => ({
  id: "my-plugin",
  $InferServerPlugin: {},
  $ERROR_CODES: {
    NOT_FOUND: { code: "NOT_FOUND", message: "Not found" }  // Same codes
  }
});
```

---

## Example: Organization Plugin Migration

### Before: Single File

```javascript
// my-organization.mjs
export const organization = (options) => {
  return {
    id: "organization",
    // Server
    endpoints: {
      createOrganization: { handler: async (ctx, args) => { ... } },
      listOrganizations: { handler: async (ctx, args) => { ... } },
    },
    schema: { tables: [...] },
    // Client
    getAtoms: ($fetch) => ({
      $activeOrg: atom(null)
    }),
    pathMethods: {
      "/organization/create": "POST",
      "/organization/list": "GET"
    }
  };
};
```

### After: Two Files

```javascript
// server/my-organization.mjs
export const organization = (options) => {
  return {
    id: "organization",
    endpoints: {
      createOrganization: { handler: async (ctx, args) => { ... } },
      listOrganizations: { handler: async (ctx, args) => { ... } },
    },
    schema: { tables: [...] },
  };
};
```

```javascript
// client/my-organization.mjs
export const organizationClient = (options) => {
  return {
    id: "organization",
    $InferServerPlugin: {},
    getAtoms: ($fetch) => ({
      $activeOrg: atom(null)
    }),
    pathMethods: {
      "/organization/create": "POST",
      "/organization/list": "GET"
    }
  };
};
```

---

## Usage After Migration

### Server Registration

```typescript
import { betterAuth } from "better-auth";
import { organization } from "./server/my-organization";

export const auth = betterAuth({
  database: drizzleAdapter(db),
  plugins: [
    organization({ /* server options */ })
  ]
});
```

### Client Registration

```typescript
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "./client/my-organization";

export const client = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  plugin: organizationClient({ /* client options */ })
});
```

---

## Verification Checklist

After migration, verify:

- [ ] Server plugin has `endpoints`, `schema`, `hooks`
- [ ] Client plugin has `$InferServerPlugin: {}`
- [ ] Both have same `id`
- [ ] `$ERROR_CODES` match
- [ ] Server registers `organization(...)` in plugins array
- [ ] Client passes `organizationClient(...)` as plugin
- [ ] TypeScript errors if using wrong plugin on wrong side
- [ ] Client can call server endpoints
- [ ] Server validates all requests

---

## Common Pitfalls

### Forgetting $InferServerPlugin

```typescript
// ✗ Wrong - no type inference
const organizationClient = () => ({
  id: "organization",
  pathMethods: { ... }
});

// ✓ Correct
const organizationClient = () => ({
  id: "organization",
  $InferServerPlugin: {},  // Required!
  pathMethods: { ... }
});
```

### Mismatched IDs

```typescript
// Server
id: "organization"

// Client
id: "org"  // ✗ Different ID - no link!
```

IDs must match for the type inference to work correctly.

### Missing Error Codes

```typescript
// Server defines error
$ERROR_CODES: {
  ORG_NOT_FOUND: { code: "ORG_NOT_FOUND", message: "..." }
}

// Client must also define
$ERROR_CODES: {
  ORG_NOT_FOUND: { code: "ORG_NOT_FOUND", message: "..." }  // For type inference
}
```

---

## See Also

- [Plugin Pairs](./09-plugin-pairs.md) - Examples of official pairs
- [Client Plugins](./02-client-plugins.md) - Client plugin interface
- [Server Plugins](./03-server-plugins.md) - Server plugin interface
- [Awareness](./08-awareness.md) - How they connect