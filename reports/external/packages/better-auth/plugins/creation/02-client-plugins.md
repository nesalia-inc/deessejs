# Client Plugins

Client plugins run in the browser (or mobile/native contexts) and provide type-safe API inference, state management via atoms, and fetch hooks.

## Interface

```typescript
interface BetterAuthClientPlugin {
  id: LiteralString;
  version?: string | undefined;
  /** Marker for type inference - references the server plugin */
  $InferServerPlugin?: BetterAuthPlugin | undefined;
  /** Custom actions available on the client */
  getActions?: ($fetch: BetterFetch, $store: ClientStore, options: BetterAuthClientOptions | undefined) => Record<string, any>;
  /** State atoms for reactive state management */
  getAtoms?: (($fetch: BetterFetch) => Record<string, Atom<any>>) | undefined;
  /** HTTP methods for inferred endpoints */
  pathMethods?: Record<string, "POST" | "GET"> | undefined;
  /** Better-fetch plugins for HTTP lifecycle */
  fetchPlugins?: BetterFetchPlugin[] | undefined;
  /** Signal-based recaller system */
  atomListeners?: ClientAtomListener[] | undefined;
  /** Error codes for type inference */
  $ERROR_CODES?: Record<string, { code: string; message: string }>;
}
```

---

## Properties Explained

### `$InferServerPlugin`

```typescript
$InferServerPlugin?: BetterAuthPlugin | undefined;
```

**The most important property.** This is an empty object `{}` that serves as a **type-level marker** linking this client plugin to its server counterpart. It carries no runtime value—only TypeScript uses it to infer types.

```typescript
const organizationClient = (options) => {
  return {
    id: "organization",
    $InferServerPlugin: {},  // ← Empty object, type marker only
    // ...
  };
};
```

### `pathMethods`

```typescript
pathMethods?: Record<string, "POST" | "GET"> | undefined;
```

Maps endpoint paths to HTTP methods. This tells TypeScript which endpoints exist and how to call them.

```typescript
pathMethods: {
  "/organization/get-full-organization": "GET",
  "/organization/list-user-teams": "GET",
  "/organization/create": "POST",
}
```

### `getAtoms`

```typescript
getAtoms?: (($fetch: BetterFetch) => Record<string, Atom<any>>) | undefined;
```

Returns a dictionary of [nanostores](https://github.com/nanostores/nanostores) for reactive state management. These atoms trigger re-fetches when specific paths are accessed.

```typescript
getAtoms: ($fetch) => ({
  $listOrg: atom(false),
  $activeOrgSignal: atom(false),
  activeOrganization: useAuthQuery(
    [$activeOrgSignal],
    "/organization/get-full-organization",
    $fetch,
    () => ({ method: "GET" })
  ),
})
```

### `getActions`

```typescript
getActions?: ($fetch: BetterFetch, $store: ClientStore, options: BetterAuthClientOptions | undefined) => Record<string, any>;
```

Custom client-side actions that don't require server calls (e.g., permission checks, local validation).

```typescript
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
})
```

### `fetchPlugins`

```typescript
fetchPlugins?: BetterFetchPlugin[] | undefined;
```

Better-fetch plugins for HTTP lifecycle management (request/response transforms, error handling, etc.).

### `atomListeners`

```typescript
atomListeners?: ClientAtomListener[] | undefined;
```

Signal-based recaller system that triggers atom updates when specific paths are called.

```typescript
atomListeners: [
  { matcher: (path) => path.startsWith("/organization"), signal: "$activeOrgSignal" },
]
```

---

## Complete Example: Organization Client Plugin

```javascript
const organizationClient = (options) => {
  const $listOrg = atom(false);
  const $activeOrgSignal = atom(false);
  const $activeMemberSignal = atom(false);
  const $activeMemberRoleSignal = atom(false);

  return {
    id: "organization",
    version: PACKAGE_VERSION,
    $InferServerPlugin: {},
    getActions: ($fetch, _$store, co) => ({
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
      $listOrg,
      $activeOrgSignal,
      activeOrganization: useAuthQuery([$activeOrgSignal], "/organization/get-full-organization", $fetch, () => ({ method: "GET" })),
    }),
    pathMethods: {
      "/organization/get-full-organization": "GET",
      "/organization/list-user-teams": "GET"
    },
    atomListeners: [
      { matcher: (path) => path.startsWith("/organization"), signal: "$activeOrgSignal" },
    ],
    $ERROR_CODES: ORGANIZATION_ERROR_CODES
  };
};
```

---

## What Client Plugins Cannot Do

Client plugins have **no direct access** to:
- Database adapters
- Session management (server-side)
- Cookie manipulation (server-side)
- Secret configuration
- Internal adapter operations

All privileged operations must go through HTTP calls to server endpoints.

---

## See Also

- [Server Plugins](./03-server-plugins.md)
- [Awareness](./08-awareness.md) - How client knows about server
- [Security](./10-security.md)