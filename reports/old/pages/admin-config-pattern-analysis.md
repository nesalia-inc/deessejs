# DeesseJS Admin Config Pattern Analysis

## Document Overview

This document analyzes the current deessejs architecture and provides a step-by-step approach to implement a Payload-like pattern where config is sent to the admin dashboard that manages its own objects.

---

## 1. Current Architecture Overview

### 1.1 Package Structure

```
packages/
  deesse/           # Core package
    src/
      config/       # Config types and helpers (define.ts, page.ts, plugin.ts)
      lib/          # Admin utilities (admin.ts, validation.ts)
      server.ts     # createDeesse() function
      index.ts      # getDeesse() singleton, exports
      client.ts     # Client-side auth client

  next/             # Next.js integration package
    src/
      root-page.tsx              # Main RootPage server component
      routes.ts                  # REST handler exports
      api/rest/                  # API handlers
      components/
        pages/                   # Admin page components
        layouts/                 # Admin shell/layout
        ui/                      # UI components
      lib/
        find-page.ts             # Page lookup
        to-sidebar-items.ts     # Sidebar transformation
        sidebar-items-context.tsx # Sidebar context provider

  ui/               # UI component library (shadcn-based)
```

### 1.2 Config Flow (Current)

**Entry Point** (`examples/base/src/app/(deesse)/admin/[[...slug]]/page.tsx`):
```typescript
export default async function AdminPage({ params, searchParams }) {
  return (
    <RootPage
      config={config}        // Imported from @deesse-config
      auth={auth}            // Imported from @/lib/deesse
      params={resolvedParams}
      searchParams={resolvedSearchParams}
    />
  );
}
```

**Config Definition** (`examples/base/src/deesse.config.ts`):
```typescript
export const config = defineConfig({
  name: "DeesseJS App",
  database: drizzle({...}),
  pages: deessePages,
  secret: process.env.DEESSE_SECRET!,
  auth: { baseURL: ... },
});
```

**InternalConfig Type** (`packages/deesse/src/config/define.ts`):
```typescript
export type InternalConfig = Config & {
  auth: {
    baseURL: string;
    plugins: BetterAuthPlugin[];  // Always includes admin()
  };
};
```

### 1.3 How Config Reaches Admin

1. User's `deesse.config.ts` is imported as `@deesse-config` in the admin page
2. Admin page (`[[...slug]]/page.tsx`) passes `config` directly to `RootPage`
3. `RootPage` (Server Component) receives the full `InternalConfig`
4. Pages are rendered directly as React content

### 1.4 Current Server/Client Boundary

```
RootPage (Server Component)
  |
  +-- Checks session via auth.api.getSession()
  +-- findPage() locates page from config.pages
  +-- SidebarItemsProvider wraps children
  +-- Renders: result.page.content
        |
        +-- DashboardPage (Client Component, "use client")
        |     +-- AdminDashboardLayout
        |           +-- AppSidebar
        |
        +-- LoginPage (Client Component, "use client")
        |     +-- Form with fetch() to /api/auth/*
        |
        +-- FirstAdminSetup (Client Component, "use client")
              +-- Form with fetch() to /api/first-admin
```

### 1.5 How Admin Accesses Deesse API

**Direct Instance Passing**:
- `auth` (Better-Auth instance) is passed as a prop to `RootPage`
- Server components access it directly via `auth.api.getSession()`
- Client components make HTTP fetch calls to `/api/*` routes

**Admin API Functions** (`packages/deesse/src/lib/admin.ts`):
```typescript
export async function hasAdminUsers(auth: Auth): Promise<boolean> {
  const context = await auth.$context;
  const users = await context.internalAdapter.listUsers(100);
  return users.some((u: any) => u.role === "admin") ?? false;
}
```

### 1.6 Current Provider System

Only one provider exists:
- `SidebarItemsContext` / `SidebarItemsProvider` - provides navigation items

No equivalent to:
- `ConfigProvider` (client-safe config)
- `AuthProvider` (user/permissions)
- `ServerFunctionsProvider` (server function client)

---

## 2. Payload's Pattern (Target Architecture)

### 2.1 Key Payload Concepts

From `reports/payload/admin-config/README.md`:

1. **Two Config Versions**:
   - Server gets `SanitizedConfig` (full config with db, hooks, plugins, secret)
   - Client gets `ClientConfig` (serialized, safe subset - strips sensitive data)

2. **Request Initialization** (`initReq()`):
   - Creates/retrieves Payload instance via `getPayload({ config })`
   - Creates `PayloadRequest` with `req.payload` attached
   - Computes permissions via `getAccessResults()`

3. **Provider Hierarchy**:
   ```
   RootProvider
   ├── ConfigProvider (ClientConfig)
   ├── ServerFunctionsProvider (server function client)
   ├── AuthProvider (permissions + user)
   └── ... more providers
   ```

4. **Server/Client Split**:
   - Server components receive `req.payload` directly
   - Client components use **Server Functions Pattern** (`'use server'`) to call back

5. **No Separate Admin Instance**:
   - Same singleton, isolated via DataLoader (per-request caching with user.id in key)
   - Access control + route separation provide isolation

### 2.2 Payload Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│         app/(payload)/admin/[[...segments]]/page.tsx           │
│                   (Entry - generated)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RootPage                                      │
│  config (SanitizedConfig) + importMap passed                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      initReq()                                   │
│  1. getPayload({ config, importMap }) → Payload instance          │
│  2. createLocalReq() → PayloadRequest with req.payload           │
│  3. getAccessResults() → permissions                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Provider Hierarchy                             │
│  RootProvider → ConfigProvider, AuthProvider,                   │
│  ServerFunctionsProvider, etc.                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌─────────────────┐  ┌─────────────────────┐
          │ Server Components│  │ Client Components    │
          │ (receive req)   │  │ (use server fns)    │
          └─────────────────┘  └─────────────────────┘
```

---

## 3. Gap Analysis: Current vs Target

| Aspect | Current (Deesse) | Target (Payload-like) |
|--------|------------------|----------------------|
| Config Passing | Direct `config` prop (full InternalConfig) | Server: SanitizedConfig, Client: ClientConfig |
| API Access | Direct `auth` prop | `req.payload` via request context |
| Client->Server | HTTP fetch to `/api/*` | Server Functions (`'use server'`) |
| Providers | Only SidebarItemsProvider | Full hierarchy (Config, Auth, ServerFunctions, etc.) |
| Request Init | No equivalent | `initReq()` creates request context |
| Instance Management | Singleton via `getDeesse()` | Singleton via `getPayload()` with DataLoader |
| Page Rendering | Server component finds page, renders content | RootPage orchestrates everything |
| Auth in Client | Use better-auth client | Use ServerFunctionsProvider |

### 3.1 What Deesse Has Already

1. **Singleton Pattern**: `getDeesse()` in `packages/deesse/src/index.ts` manages instance caching
2. **Config Definition**: `defineConfig()` in `packages/deesse/src/config/define.ts`
3. **Page Tree System**: `page()` and `section()` helpers in `packages/deesse/src/config/page.ts`
4. **Auth Integration**: Better-Auth already integrated
5. **REST API Handlers**: `REST_GET()` and `REST_POST()` wrappers

### 3.2 What Needs to Be Added

1. **ClientConfig Type**: Safe subset of config for client
2. **initDeesse() Function**: Request initialization (like `initReq()`)
3. **Provider Hierarchy**: ConfigProvider, AuthProvider, DeesseFunctionsProvider
4. **Server Functions Pattern**: `'use server'` functions that call back to server
5. **DeesseRequest Type**: Request context with `deesse`, `user`, `permissions`

---

## 4. Step-by-Step Implementation Approach

### Phase 1: Config Separation (Server vs Client)

**Step 1.1: Create ClientConfig Type**

New file: `packages/deesse/src/config/client.ts`

```typescript
import type { Config } from "./define";

export type ClientConfig = {
  name: string;
  pages: PageTreeClient;  // Icons stripped (not serializable)
  // No database, secret, plugins - these are server-only
};

export function createClientConfig(serverConfig: InternalConfig): ClientConfig {
  return {
    name: serverConfig.name,
    pages: serializePageTree(serverConfig.pages),
    // Explicitly exclude:
    // - database
    // - secret
    // - plugins
    // - auth (contains sensitive data)
  };
}
```

**Step 1.2: Update RootPage to Pass ClientConfig**

Modify: `packages/next/src/root-page.tsx`

```typescript
export async function RootPage({ config, ... }) {
  // Server-side: use full InternalConfig
  const serverConfig = config;  // Full access

  // Create client-safe version
  const clientConfig = createClientConfig(config);

  return (
    <ConfigProvider config={clientConfig}>
      <ServerContent />  // Pass server data down
    </ConfigProvider>
  );
}
```

### Phase 2: Request Initialization

**Step 2.1: Create initDeesse Function**

New file: `packages/deesse/src/lib/initDeesse.ts`

```typescript
export type InitDeesseResult = {
  deesse: Deesse;           // The Deesse instance
  user: User | null;         // Authenticated user
  permissions: Permissions;  // Computed access results
  session: Session | null;  // Current session
};

export async function initDeesse(config: InternalConfig): Promise<InitDeesseResult> {
  // 1. Get/create Deesse instance
  const deesse = await getDeesse(config);

  // 2. Get session from cookies/headers
  const session = await deesse.auth.api.getSession({ headers });

  // 3. Get user if session exists
  const user = session?.user ?? null;

  // 4. Compute permissions based on user
  const permissions = computePermissions(deesse, user);

  return { deesse, user, permissions, session };
}
```

**Step 2.2: Create DeesseRequest Type**

```typescript
export type DeesseRequest = {
  deesse: Deesse;
  user: User | null;
  permissions: Permissions;
  locale: string;
  i18n: I18n;
};
```

### Phase 3: Provider Hierarchy

**Step 3.1: Create ConfigProvider**

New file: `packages/next/src/providers/config.tsx`

```typescript
export const ConfigContext = createContext<ClientConfig | null>(null);

export function ConfigProvider({
  config,
  children
}: {
  config: ClientConfig;
  children: React.ReactNode;
}) {
  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const config = useContext(ConfigContext);
  if (!config) throw new Error("useConfig must be used within ConfigProvider");
  return config;
}
```

**Step 3.2: Create AuthProvider**

New file: `packages/next/src/providers/auth.tsx`

```typescript
export type AuthContextValue = {
  user: User | null;
  permissions: Permissions;
  session: Session | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user,
  permissions,
  session,
  children
}: AuthContextValue & { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user, permissions, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used within AuthProvider");
  return auth;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function usePermissions() {
  const { permissions } = useAuth();
  return permissions;
}
```

**Step 3.3: Create DeesseFunctionsProvider**

New file: `packages/next/src/providers/server-functions.tsx`

```typescript
// Server function type
type ServerFunction = (...args: any[]) => Promise<any>;

// Client that wraps server functions
export type DeesseFunctionsClient = {
  [key: string]: ServerFunction;
};

export const DeesseFunctionsContext = createContext<DeesseFunctionsClient | null>(null);

export function DeesseFunctionsProvider({
  children
}: {
  children: React.ReactNode
}) {
  // Create server function client
  const client: DeesseFunctionsClient = {
    listUsers: async (options) => {
      'use server';
      return handleServerFunction('listUsers', options);
    },
    createUser: async (data) => {
      'use server';
      return handleServerFunction('createUser', data);
    },
    // ... more functions
  };

  return (
    <DeesseFunctionsContext.Provider value={client}>
      {children}
    </DeesseFunctionsContext.Provider>
  );
}

export function useDeesseFunctions() {
  const functions = useContext(DeesseFunctionsContext);
  if (!functions) throw new Error("...");
  return functions;
}
```

**Step 3.4: Create Combined RootProvider**

```typescript
export function RootProvider({
  config,
  deesse,
  user,
  permissions,
  session,
  children,
}: {
  config: ClientConfig;
  deesse: Deesse;
  user: User | null;
  permissions: Permissions;
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider config={config}>
      <AuthProvider user={user} permissions={permissions} session={session}>
        <DeesseFunctionsProvider deesse={deesse}>
          {children}
        </DeesseFunctionsProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
```

### Phase 4: Server Functions Implementation

**Step 4.1: Create handleServerFunction**

New file: `packages/next/src/lib/handle-server-function.ts`

```typescript
import { initDeesse } from "deesse";

export async function handleServerFunction(
  name: string,
  args: any,
  config: InternalConfig
) {
  // Initialize request context
  const { deesse, user, permissions } = await initDeesse(config);

  // Route to handler
  switch (name) {
    case 'listUsers':
      return deesse.auth.api.listUsers(args);
    case 'createUser':
      return deesse.auth.api.createUser(args);
    // ... more cases
    default:
      throw new Error(`Unknown server function: ${name}`);
  }
}
```

**Step 4.2: Update RootPage**

```typescript
export async function RootPage({ config, auth, params }) {
  // Initialize request context
  const { deesse, user, permissions, session } = await initDeesse(config);

  // Create client config
  const clientConfig = createClientConfig(config);

  return (
    <RootProvider
      config={clientConfig}
      deesse={deesse}
      user={user}
      permissions={permissions}
      session={session}
    >
      <ServerContent ... />
    </RootProvider>
  );
}
```

### Phase 5: Client Component Updates

**Step 5.1: Update Client Components to Use Server Functions**

Instead of:
```typescript
// Old pattern - direct fetch
const response = await fetch("/api/first-admin", {
  method: "POST",
  body: JSON.stringify({ name, email, password }),
});
```

Use:
```typescript
// New pattern - server functions
const deesseFunctions = useDeesseFunctions();
const result = await deesseFunctions.createUser({ name, email, password });
```

---

## 5. File Structure Recommendations

```
packages/deesse/src/
  config/
    define.ts           # Config types, defineConfig()
    client.ts           # ClientConfig type, createClientConfig()
    page.ts             # page(), section()
    plugin.ts           # Plugin types

  lib/
    admin.ts            # hasAdminUsers(), etc.
    init-deesse.ts      # Request initialization
    permissions.ts      # Permission computation

packages/next/src/
  providers/
    index.ts            # Re-export all providers
    config.tsx           # ConfigProvider, useConfig()
    auth.tsx             # AuthProvider, useAuth(), useUser()
    server-functions.tsx  # DeesseFunctionsProvider

  lib/
    handle-server-function.ts
    request-context.ts   # DeesseRequest type

  root-page.tsx          # Updated with initDeesse + providers
  components/
    pages/
      dashboard-page.tsx  # Updated to use providers
      login-page.tsx      # Updated to use server functions
      first-admin-setup.tsx
```

---

## 6. Potential Challenges and Solutions

### 6.1 Challenge: Config Serialization

**Problem**: Config contains functions, React components, and database connections that cannot be serialized to the client.

**Solution**:
- Create `ClientConfig` that strips server-only data
- Store page content as references (slugs) rather than inline components
- Provide hooks to retrieve page content dynamically

### 6.2 Challenge: Auth State Synchronization

**Problem**: Auth state lives on the server; client needs to react to changes.

**Solution**:
- `AuthProvider` receives user/session from server via props
- Use React's `use()` hook for async context if needed
- Server Components re-render on auth state change

### 6.3 Challenge: Breaking Change to Client Components

**Problem**: Existing client components use `fetch('/api/*')` pattern; changing to server functions is a breaking change.

**Solution**:
- Maintain both patterns during transition
- Deprecate `/api/*` routes gradually
- Provide migration guide

### 6.4 Challenge: Icon Serialization

**Problem**: Lucide icons (React components) cannot be passed to client.

**Solution**:
- Convert icons to string names in `ClientConfig`
- Client-side icon lookup: `import { [iconName] } from 'lucide-react'`

### 6.5 Challenge: Type Safety Across Server/Client

**Problem**: Losing type safety when calling server functions from client.

**Solution**:
- Generate TypeScript types for server function signatures
- Use `ServerFunction` type to ensure type safety
- Consider tRPC-like patterns for end-to-end types

---

## 7. Migration Path

### 7.1 Phase 1: Non-Breaking Additions
1. Add `ClientConfig` type and `createClientConfig()` function
2. Add `initDeesse()` function
3. Add provider components (ConfigProvider, AuthProvider)
4. **No changes to existing code** - add new APIs alongside old

### 7.2 Phase 2: RootPage Enhancement
1. Update `RootPage` to call `initDeesse()` and pass context
2. Add providers but maintain backward compatibility
3. Client components continue to work via `/api/*`

### 7.3 Phase 3: Server Functions (Opt-in)
1. Add `DeesseFunctionsProvider` and `handleServerFunction`
2. Create new server function-based components alongside existing ones
3. Allow users to opt-in per-component

### 7.4 Phase 4: Deprecation
1. Deprecate direct `auth` prop on `RootPage`
2. Deprecate `/api/*` routes in favor of server functions
3. Update examples to use new patterns

---

## 8. Summary

The current deessejs architecture passes the full `config` and `auth` objects directly to the admin dashboard. To achieve a Payload-like pattern:

1. **Create two config versions**: Server gets full `InternalConfig`, client gets `ClientConfig`
2. **Add request initialization**: `initDeesse()` creates request context with user/permissions
3. **Build provider hierarchy**: ConfigProvider, AuthProvider, DeesseFunctionsProvider
4. **Implement server functions**: `'use server'` pattern for client->server communication
5. **Update client components**: Use hooks instead of direct fetch calls

This pattern provides:
- Better security (sensitive data never reaches client)
- Clearer server/client boundaries
- Type-safe server->client communication
- Better separation of concerns