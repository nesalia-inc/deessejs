# Singleton Server-Side Analysis for Database Page

## Context

The goal is to allow `DatabasePage` (a Server Component) to access `deesse.database` without:
1. Creating API routes
2. Passing non-serializable props through the `"use client"` boundary
3. Complex refactoring of the layout architecture

The singleton server-side approach proposes that `DatabasePage` calls `getDeesse(config)` directly, leveraging the existing global cache in `deesse`.

---

## How `getDeesse` Works Today

```typescript
// packages/deesse/src/index.ts
const DEESSE_GLOBAL_KEY = Symbol.for("@deessejs/core.instance");

interface GlobalDeesseCache {
  instance: Deesse | undefined;
  config: InternalConfig | undefined;
  pool: unknown | undefined;
}

export const getDeesse = async (config: InternalConfig): Promise<Deesse> => {
  const cache = getGlobalCache();

  // Case 1: Instance exists and config is semantically equal
  if (cache.instance && cache.config && isConfigEqual(cache.config, config)) {
    return cache.instance;
  }

  // Case 2: Instance exists but config changed - hot reload
  if (cache.instance && cache.config && !isConfigEqual(cache.config, config)) {
    console.info("[deesse] Config changed, performing hot reload...");
    // Close old pool, create new instance
  }

  // Case 3: No instance exists - create one
  const instance = createDeesse(config);
  cache.pool = extractPool(instance.database);
  cache.instance = instance;
  cache.config = config;

  return instance;
};
```

### Key Observations

1. **`getDeesse` already caches on global** — the instance persists across calls
2. **Config comparison** — `isConfigEqual` checks if the new config is "semantically equal" to the cached one
3. **Returns `Deesse`** — which contains both `auth` and `database`

---

## The Singleton Server-Side Approach

### Core Idea

```tsx
// packages/next/src/components/pages/database-page.tsx
// Server Component - NO "use client"

export async function DatabasePage({ config }: { config: InternalConfig }) {
  const deesse = await getDeesse(config);
  const db = deesse.database;

  // Query database directly
  const tables = await db.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium">Database</h2>
      {/* Render table data */}
    </div>
  );
}
```

### What Changes

1. **`DatabasePage` becomes a Server Component** that accepts `config` as a prop
2. **`root-page.tsx` passes `config` directly** to `DatabasePage`
3. **No serialization through `"use client"` boundary** — `config` is a plain object that serializes fine

### Why This Works

- `InternalConfig` is a plain object (strings, arrays, nested objects) — **it is serializable**
- `getDeesse(config)` returns the cached singleton — **no new instance created**
- `deesse.database` never leaves the server — **only used inside the Server Component**

---

## The Current Flow vs Proposed Flow

### Current Flow

```
root-page.tsx (Server)
    │
    ├── createAuthContext({ config }) → extracts auth
    │
    └── <AdminDashboardLayout>
          └── {result.page.content}  ← DatabasePage as children
                ❌ DatabasePage cannot access config or deesse
```

### Proposed Flow (with singleton)

```
root-page.tsx (Server)
    │
    ├── createAuthContext({ config }) → extracts auth
    │
    ├── if (result.page.slug === "database") {
    │     return (
    │       <AdminDashboardLayout>
    │         <DatabasePage config={config} />  ← Server Component
    │       </AdminDashboardLayout>
    │     );
    │
    └── } else {
          return (
            <AdminDashboardLayout>
              {result.page.content}
            </AdminDashboardLayout>
          );
        }
```

**Wait** — if `DatabasePage` is rendered inside `AdminDashboardLayout` (a Client Component), there's still a serialization boundary!

### The Real Solution

```tsx
// root-page.tsx
const deesse = await getDeesse(config);  // Full deesse available

if (result.page.slug === "database") {
  // Render DatabasePage BEFORE entering the Client Component tree
  return (
    <>
      <AdminSidebarHeader />  {/* Client Components for UI */}
      <AdminSidebarNav items={sidebarItems} />
      <div className="p-4">
        <DatabasePage deesse={deesse} />  {/* Server Component with deesse */}
      </div>
    </>
  );
}

return (
  <AdminDashboardLayout>
    {result.page.content}
  </AdminDashboardLayout>
);
```

### Even Cleaner: Use Layout Components

Create separate client components for the shell:

```tsx
// packages/next/src/components/admin-shell-ui.tsx
"use client";
export function AdminShellUI({ name, icon, items, children, headerActions }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar name={name} icon={icon} items={items} />
        <SidebarInset className="flex h-full flex-col">
          <AdminHeader name={name} items={items} headerActions={headerActions} />
          <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
```

Then in `root-page.tsx`:

```tsx
if (result.page.slug === "database") {
  return (
    <AdminShellUI name={config.name} icon="/nesalia.svg" items={sidebarItems}>
      <DatabasePage deesse={deesse} />  {/* Server Component */}
    </AdminShellUI>
  );
}
```

---

## Security Analysis

### Server Component Access Pattern

```
Request
    │
    ▼
root-page.tsx (Server)
    │
    ├── getDeesse(config) — creates/retrieves singleton
    │
    ├── createAuthContext — validates session, extracts user
    │
    ├── if (!isAdminUser) return 404
    │
    ├── <DatabasePage deesse={deesse} />
    │     │
    │     └── db.select(...) — direct DB access, server-side only
    │           │
    ▼           ▼
    │     RSC Payload sent to client
    │
    ▼
Browser receives HTML + RSC (no raw DB data in transit)
```

### Security Properties

| Property | Status | Explanation |
|----------|--------|-------------|
| **Authentication** | ✅ | `createAuthContext` validates session before rendering |
| **Authorization** | ✅ | `isAdminUser` check blocks non-admins |
| **DB Exposure** | ✅ | `deesse.database` never sent to client |
| **Data in Transit** | ✅ | Only RSC payload (serialized React tree) |
| **Direct DB Access** | ✅ | Server Component queries DB directly |
| **Audit Trail** | ✅ | `session.user.id` available for logging |

### Comparison with API Routes

| Aspect | Server Component | API Routes |
|--------|------------------|------------|
| Auth check | Per request (same) | Per request (same) |
| Data transport | RSC (secure) | HTTP JSON (secure if HTTPS) |
| Round-trips | 0 (inline) | 1 (fetch) |
| Caching | React cache semantics | HTTP cache headers |
| Complexity | Lower (no route file) | Higher (need route handler) |
| CSRF protection | N/A (no mutation) | Required for POST/PUT/DELETE |
| Error handling | throws in render | try/catch in fetch |

---

## Challenges and Limitations

### Challenge 1: Config Source

`DatabasePage` needs the `config`. Currently `root-page.tsx` receives it as a prop, but:

```tsx
// How does DatabasePage get config?
export async function DatabasePage({ config }: { config: InternalConfig }) {
  // config comes from root-page.tsx
}
```

**Solution:** Pass `config` from `root-page.tsx` to `DatabasePage` as a prop when rendering.

### Challenge 2: Where is `config` Defined?

The user's `config` is typically in `src/deesse.config.ts`:

```typescript
// apps/web/src/deesse.config.ts
export const config = defineConfig({
  database: db,
  secret: process.env.AUTH_SECRET!,
  auth: { baseURL, ... },
  plugins: [admin()],
});
```

This file is in the **application**, not in `@deessejs/next`. `DatabasePage` would need to import it, but that creates coupling.

**Solution Options:**

1. **`config` is passed through the component tree** — `root-page.tsx` receives it, passes to `DatabasePage`
2. **Application exposes `getConfig()` function** — imported by `DatabasePage`
3. **Config stored in a shared module**

### Challenge 3: Type Safety

`InternalConfig` includes database connection objects:

```typescript
// packages/deesse/src/config/define.ts
export interface InternalConfig {
  database: PostgresJsDatabase;  // ← NOT just plain data
  secret: string;
  auth: BetterAuthOptions;
  plugins: Plugin[];
}
```

If `config.database` is part of `InternalConfig`, passing it through props would fail serialization!

**Investigation needed:** Is `database` part of the `config` object that `root-page.tsx` receives?

Let me check the actual type of `config` received by `RootPage`:

```typescript
// packages/next/src/root-page.tsx
export interface RootPageProps {
  config: InternalConfig;  // ← This is the full config
  params: Record<string, string | string[]>;
}
```

**If `InternalConfig` includes `database`**, then passing `config` to `DatabasePage` would fail because `database` (PostgresJsDatabase) is not serializable.

### Challenge 4: Hot Reload

During Next.js hot reload, the config might change. `getDeesse` handles this via `isConfigEqual` and recreates the instance if needed. But if `DatabasePage` holds a reference to the old instance...

---

## Key Questions to Investigate

### Q1: What exactly is in `InternalConfig`?

From `packages/deesse/src/config/define.ts`:

```typescript
export interface InternalConfig {
  database: PostgresJsDatabase;  // ← This is a problem
  secret: string;
  name: string;
  auth: BetterAuthOptions;
  admin?: AdminConfig;
  pages?: PageTree[];
  plugins?: Plugin[];
}
```

If `database` is part of `InternalConfig`, then:
- `root-page.tsx` receives `config` which includes `database`
- But `root-page.tsx` works fine because it doesn't serialize `config`
- Passing `config` as prop to a Client Component would fail
- Passing `config` as prop to a Server Component **should work** because Server Components don't serialize props the same way

**Actually**, Server Components DO serialize props when passing to Client Components, but if `DatabasePage` is a Server Component rendered directly by `root-page.tsx` (not passed as children to a Client Component), then props don't cross a serialization boundary.

### Q2: Can Server Components Receive Non-Serializable Props?

Yes, when:
1. Both are Server Components
2. The prop is passed directly (not through a Client Component boundary)

```
root-page.tsx (Server) ──props──> DatabasePage (Server)
                                        │
                                        └── deesse = await getDeesse(config)
```

This works because both execute on the server and props are passed as JavaScript references, not serialized.

### Q3: What Happens if DatabasePage is Children of AdminDashboardLayout?

```tsx
<AdminDashboardLayout>  {/* Client Component */}
  <DatabasePage config={config} />  {/* Server Component as child */}
</AdminDashboardLayout>
```

Here `config` crosses the Server→Client boundary. **This would fail** because React would try to serialize `config` (which contains `database`).

---

## Recommended Implementation

### Step 1: Verify Config Structure

Check if `database` is part of the `config` passed to `root-page.tsx`. If yes, we need to either:

1. Exclude `database` from the config before passing
2. Pass only the necessary parts (`auth`, `secret`, `name`)
3. Create a separate "public config" type

### Step 2: Refactor root-page.tsx

```tsx
const deesse = await getDeesse(config);

if (result.page.slug === "database") {
  return (
    <AdminShellUI name={config.name} icon="/nesalia.svg" items={sidebarItems}>
      <DatabasePage deesse={deesse} />
    </AdminShellUI>
  );
}
```

### Step 3: DatabasePage as Server Component

```tsx
// packages/next/src/components/pages/database-page.tsx
// NO "use client"

export async function DatabasePage({ deesse }: { deesse: Deesse }) {
  const db = deesse.database;

  // Query database
  const stats = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
      (SELECT pg_size_pretty(pg_database_size(current_database()))) as db_size
  `);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Database</h2>
      {/* Render stats */}
    </div>
  );
}
```

---

## Summary

| Aspect | Assessment |
|--------|------------|
| **Feasibility** | ✅ Possible if `database` not in serialized props |
| **Security** | ✅ Very secure — no network transport, direct server access |
| **Complexity** | ✅ Low — no new API routes, no middleware |
| **Performance** | ✅ Best — no round-trips, RSC only |
| **Refactoring** | ⚠️ Need to handle `AdminDashboardLayout` boundary |

### Conditions for Success

1. **`config` passed to `DatabasePage` must not contain `database`** — or `DatabasePage` must be rendered outside the Client Component tree
2. **`AdminShellUI` must be extractable** as a reusable Client Component wrapper
3. **Auth checks remain in `root-page.tsx`** — `DatabasePage` trusts it has admin access

### Next Steps

1. Verify what `config` contains in `root-page.tsx`
2. Test if passing `config` as prop to a Server Component works
3. If `database` is in `config`, create a stripped-down version or use `getDeesse` with a cached approach
