# Server Plugins

Server plugins run exclusively on the backend with access to database adapters, session management, and sensitive operations.

## Interface

```typescript
type BetterAuthPlugin = BetterAuthPluginErrorCodePart & {
  id: LiteralString;
  version?: string | undefined;
  /** Called on plugin initialization - can add context or modify options */
  init?: ((ctx: AuthContext) => Awaitable<{
    context?: DeepPartial<Omit<AuthContext, "options">> & Record<string, unknown>;
    options?: Partial<BetterAuthOptions>;
  }> | void | Promise<void>) | undefined;
  /** API endpoints exposed to clients */
  endpoints?: { [key: string]: Endpoint } | undefined;
  /** Middlewares for specific paths */
  middlewares?: { path: string; middleware: Middleware }[] | undefined;
  /** Request/response hooks */
  onRequest?: ((request: Request, ctx: AuthContext) => Promise<{ response: Response } | { request: Request } | void>) | undefined;
  onResponse?: ((response: Response, ctx: AuthContext) => Promise<{ response: Response } | void>) | undefined;
  /** Lifecycle hooks (before/after) */
  hooks?: { before?: { matcher: (context: HookEndpointContext) => boolean; handler: AuthMiddleware }[]; after?: { ... }[] } | undefined;
  /** Database schema for migrations */
  schema?: BetterAuthPluginDBSchema | undefined;
  /** Manual migrations (alternative to schema) */
  migrations?: Record<string, Migration> | undefined;
  /** Rate limiting */
  rateLimit?: { window: number; max: number; pathMatcher: (path: string) => boolean }[] | undefined;
  /** Custom database adapter operations */
  adapter?: { [key: string]: (...args: any[]) => Awaitable<any> };
};
```

---

## Properties Explained

### `endpoints`

```typescript
endpoints?: { [key: string]: Endpoint } | undefined;
```

The core of a server plugin—defines all API endpoints that clients can call.

```typescript
const endpoints = {
  createOrganization: createOrganization(opts),
  updateOrganization: updateOrganization(opts),
  deleteOrganization: deleteOrganization(opts),
  getFullOrganization: getFullOrganization(opts),
  listOrganizations: listOrganizations(opts),
  createInvitation: createInvitation(opts),
};
```

### `init`

```typescript
init?: ((ctx: AuthContext) => Awaitable<{
  context?: DeepPartial<Omit<AuthContext, "options">> & Record<string, unknown>;
  options?: Partial<BetterAuthOptions>;
}>) | undefined;
```

Called when the plugin is initialized. Can add properties to context or modify options.

```typescript
init: async (ctx) => {
  return {
    context: {
      myCustomProp: await setupCustomAdapter(ctx.context.adapter),
    },
    options: {
      rateLimit: { window: 60000, max: 100 },
    }
  };
}
```

### `schema`

```typescript
schema?: BetterAuthPluginDBSchema | undefined;
```

Database schema additions for the plugin (tables, indexes, relationships).

```typescript
schema: {
  tables: [
    {
      name: "organization",
      columns: {
        id: { type: "string", primaryKey: true },
        name: { type: "string" },
        createdAt: { type: "string" },
      }
    }
  ]
}
```

### `hooks`

```typescript
hooks?: {
  before?: { matcher: (context: HookEndpointContext) => boolean; handler: AuthMiddleware }[];
  after?: { matcher: (context: HookEndpointContext) => boolean; handler: AuthMiddleware }[];
} | undefined;
```

Lifecycle hooks for intercepting requests before/after endpoint execution.

### `migrations`

```typescript
migrations?: Record<string, Migration> | undefined;
```

Manual migration definitions (alternative to schema-based migrations).

### `rateLimit`

```typescript
rateLimit?: { window: number; max: number; pathMatcher: (path: string) => boolean }[] | undefined;
```

Rate limiting rules for specific paths.

### `adapter`

```typescript
adapter?: { [key: string]: (...args: any[]) => Awaitable<any> };
```

Custom operations added to the database adapter.

### `middlewares`

```typescript
middlewares?: { path: string; middleware: Middleware }[] | undefined;
```

Middleware for specific paths (authentication, authorization, etc.).

### `onRequest` / `onResponse`

```typescript
onRequest?: ((request: Request, ctx: AuthContext) => Promise<{ response: Response } | { request: Request } | void>) | undefined;
onResponse?: ((response: Response, ctx: AuthContext) => Promise<{ response: Response } | void>) | undefined;
```

Request/response interceptors for all plugin endpoints.

---

## Complete Example: Organization Server Plugin

```javascript
function organization(options) {
  const endpoints = {
    createOrganization: createOrganization(opts),
    updateOrganization: updateOrganization(opts),
    deleteOrganization: deleteOrganization(opts),
    setActiveOrganization: setActiveOrganization(opts),
    getFullOrganization: getFullOrganization(opts),
    listOrganizations: listOrganizations(opts),
    createInvitation: createInvitation(opts),
  };

  return {
    id: "organization",
    version: PACKAGE_VERSION,
    endpoints,
    schema: mergeSchema(schema, opts.schema),
    options,
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path.startsWith("/organization"),
          handler: authMiddleware,
        }
      ]
    },
    rateLimit: [
      { window: 60000, max: 100, pathMatcher: (p) => p.startsWith("/organization") }
    ],
    $ERROR_CODES: ORGANIZATION_ERROR_CODES
  };
}
```

---

## Server Plugin → No Awareness of Client

A server plugin has **no knowledge** of its client counterpart:

```typescript
// SERVER PLUGIN - completely oblivious to client
function organization(options) {
  return {
    id: "organization",
    // No $InferClientPlugin or similar property
    endpoints: { ... },
    schema: { ... },
    hooks: { ... },
  };
}
```

The server simply exposes HTTP endpoints. It doesn't know or care if a client plugin exists.

---

## See Also

- [Client Plugins](./02-client-plugins.md)
- [Awareness](./08-awareness.md) - The one-way client→server awareness
- [Plugin Pairs](./09-plugin-pairs.md)