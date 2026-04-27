# Type Inference Mechanism

The `$InferServerPlugin` marker enables TypeScript to automatically infer types for client plugins, connecting them to server-defined endpoints.

---

## The InferServerPlugin Function

```javascript
const InferServerPlugin = () => {
  return {
    id: "infer-server-plugin",
    version: PACKAGE_VERSION,
    $InferServerPlugin: {}
  };
};
```

This creates the marker that client plugins reference.

---

## How It Works

### 1. Server Defines Types

```typescript
// Server plugin defines endpoints with types
const endpoints = {
  listOrganizations: {
    path: "/organization/list",
    method: "GET",
    args: z.object({ limit: z.number().optional() }),
    response: z.array(organizationSchema),
  },
  createOrganization: {
    path: "/organization/create",
    method: "POST",
    args: z.object({ name: z.string() }),
    response: organizationSchema,
  },
};
```

### 2. Client Links via $InferServerPlugin

```typescript
// Client plugin uses empty marker
const organizationClient = () => ({
  id: "organization",
  $InferServerPlugin: {},  // ← Links to server
  pathMethods: {
    "/organization/list": "GET",
    "/organization/create": "POST",
  },
});
```

### 3. TypeScript Infers

```typescript
// TypeScript automatically knows:

// Endpoints exist
client.organization.list();  // ✓
client.organization.create({ name: "Acme" });  // ✓

// Arguments are typed
client.organization.list({ limit: "10" });  // ✗ Error: number expected
client.organization.create({ name: 123 });  // ✗ Error: string expected

// Responses are typed
const orgs = await client.organization.list();
//    ^? Organization[]

// Non-existent endpoints error
client.organization.deleteAll();  // ✗ Error: doesn't exist
```

---

## What TypeScript Infers

| Type Info | Source | Example |
|-----------|--------|---------|
| Endpoint paths | `pathMethods` | `/organization/list` |
| HTTP methods | `pathMethods` | `GET`, `POST` |
| Request args | Server endpoint schema | `{ limit?: number }` |
| Response types | Server endpoint schema | `Organization[]` |
| Error codes | `$ERROR_CODES` | `{ code: "NOT_FOUND" }` |
| User/Session extensions | Server schema | `session.organizationId` |

---

## Example: Full Type Inference

### Server

```typescript
const organization = {
  id: "organization",
  endpoints: {
    list: {
      path: "/organization/list",
      method: "GET",
      handler: async (ctx, args) => {
        return ctx.context.adapter.listOrganizations(args.limit);
      }
    }
  },
  schema: {
    user: {
      organizationId: { type: "string" }
    }
  },
  $ERROR_CODES: {
    ORG_NOT_FOUND: { code: "ORG_NOT_FOUND", message: "Organization not found" }
  }
};
```

### Client

```typescript
const organizationClient = () => ({
  id: "organization",
  $InferServerPlugin: {},  // Links everything
  pathMethods: { "/organization/list": "GET" },
  $ERROR_CODES: {
    ORG_NOT_FOUND: { code: "ORG_NOT_FOUND", message: "Organization not found" }
  }
});

// TypeScript now knows:
// - client.organization.list() exists
// - Returns Promise<Organization[]>
// - Error codes: ORG_NOT_FOUND
// - User has organizationId property
```

### Usage with Full Types

```typescript
// Type-safe call
const orgs = await client.organization.list({ limit: 10 });
//    ^? Organization[]

// Type-safe error handling
try {
  await client.organization.list();
} catch (e) {
  if (e.code === "ORG_NOT_FOUND") {
    //    ^? "ORG_NOT_FOUND" - TypeScript knows this exists
  }
}

// Session extended with organizationId
const session = client.auth.getSession();
// session.user.organizationId  ← TypeScript knows this exists
//    ^? string
```

---

## Zero Runtime Cost

The `$InferServerPlugin: {}` is **completely erased at runtime**:

```typescript
// What you write:
const client = {
  $InferServerPlugin: {},
  pathMethods: { "/org/list": "GET" }
};

// What exists at runtime:
const client = {
  // $InferServerPlugin is gone
  pathMethods: { "/org/list": "GET" }
};
```

### No Serialization

```typescript
// $InferServerPlugin is not sent to server
// It's not included in any HTTP request
// It doesn't appear in JSON payloads

// This:
client.$InferServerPlugin  // undefined at runtime

// TypeScript-only construct
```

### Only Compile-Time Value

```typescript
// Compile time: TypeScript uses it for inference
// Runtime: It doesn't exist
// Bundle: Zero bytes added
```

---

## See Also

- [Awareness](./08-awareness.md) - The asymmetric relationship
- [Client Plugins](./02-client-plugins.md) - $InferServerPlugin usage
- [Security](./10-security.md) - Why type safety matters