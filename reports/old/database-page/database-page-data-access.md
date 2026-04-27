# Database Page: Data Access Architecture

## Context

The `Database` page in the admin dashboard needs to display real database information (tables, data counts, schema, etc.). This report analyzes how to implement this while maintaining a server-only architecture.

---

## Current Architecture

### Package Structure

```
packages/next/src/
├── root-page.tsx              # Server Component - entry point
├── pages/default-pages.tsx    # Defines pages with React content
├── components/
│   ├── layouts/
│   │   └── admin-shell.tsx   # "use client" - dashboard shell
│   └── pages/
│       └── database-page.tsx # Page content (currently placeholder)
```

### Data Flow Today

```tsx
// root-page.tsx (Server Component)
const { user, adminExists, isLoginPage, isAdminUser, slugParts } = await createAuthContext({ config, params });
const { result, sidebarItems } = findAdminPage(allPages, slugParts);

return (
  <AdminDashboardLayout name={config.name} icon="/nesalia.svg" items={sidebarItems} user={user}>
    {result.page.content}  // ← DatabasePage component
  </AdminDashboardLayout>
);
```

### Key Files

| File | Role |
|------|------|
| `root-page.tsx` | Server Component, creates auth context, renders layout |
| `admin-shell.tsx` | Client Component (`"use client"`), provides sidebar/header UI |
| `database-page.tsx` | Page content, currently a simple placeholder |

---

## How `deesse` is Created and Accessed

### The `getDeesse` Function

```typescript
// packages/deesse/src/index.ts
export const getDeesse = async (config: InternalConfig): Promise<Deesse> => {
  // Returns singleton Deesse instance, cached on global
  // Deesse = { auth: Auth; database: PostgresJsDatabase }
};
```

### The `Deesse` Type

```typescript
// packages/deesse/src/server.ts
export type Deesse = {
  auth: Auth;                      // Better Auth instance
  database: PostgresJsDatabase;    // Drizzle ORM instance
};
```

### Where `deesse` is Created

```typescript
// packages/next/src/lib/auth-context.ts
export async function createAuthContext({ config }) {
  const [deesse, requestHeaders] = await Promise.all([
    getDeesse(config),  // ← deesse created here
    headers(),
  ]);

  const auth = deesse.auth;  // ← only auth is extracted and used
  // ...
}
```

**Critical observation:** `createAuthContext` only extracts `auth` from `deesse`. The `database` property is never exposed.

---

## The Core Problem

### The `"use client"` Boundary

`AdminDashboardLayout` in `admin-shell.tsx` is marked with `"use client"`:

```tsx
"use client";
// ...
export function AdminDashboardLayout(props) {
  // Client Component
}
```

This creates a **serialization boundary** when passing props from Server Components to Client Components.

### How the Server → Client Boundary Works

In Next.js App Router, when a Server Component passes props to a Client Component:

1. **The Server Component executes** (during HTTP request handling)
2. **React serializes the props** to JSON to transmit them to the client
3. **The Client Component hydrates** in the browser with these deserialized props

```
HTTP Request
    │
    ▼
root-page.tsx (Server Component)
    │  createAuthContext()
    │  deesse = getDeesse(config)  ← executes on server
    │
    │  <AdminDashboardLayout deesse={deesse}>
    │         │
    ▼         ▼
    │  React serializes: { deesse: ??? }
    │  (props travel via the "RSC protocol" which uses JSON)
    │
    ▼
AdminDashboardLayout (Client Component)
    │  hydrates with props
    │  if deesse = null/error → problem
    ▼
Browser
```

### Why `deesse` Cannot Cross the Boundary

```typescript
// What we want to pass
const deesse = {
  auth: Auth,                           // Complex object, not serializable
  database: PostgresJsDatabase,         // Class instance, not serializable
  // ...
};

// What arrives on the other side (client side)
deesse = null;  // or error if Next.js cannot serialize
```

**Reason:** `PostgresJsDatabase` contains:
- A TCP connection pool to PostgreSQL
- Closures and functions
- Circular references
- Native code bindings (`pg`)

None of these exist in the browser context. Even if serialization succeeded, it would be useless — the client has no database connection.

### Serializable Props (What Can Cross)

| Type | Can Cross? | Notes |
|------|------------|-------|
| `string` | ✅ | |
| `number` | ✅ | |
| `boolean` | ✅ | |
| `null` / `undefined` | ✅ | |
| `ReactNode` | ✅ | Component descriptors, not instances |
| Flat `Object` | ✅ | No methods, closures, or class instances |
| `Date` | ✅ | Becomes string |
| `Map` / `Set` | ✅ | Becomes `{}` |
| `Promise` | ❌ | Does not cross |
| `Function` | ❌ | Does not cross |
| `Class Instance` | ❌ | Becomes `null` |

### Why `children` (ReactNode) Works

When passing `children` (a ReactNode), React does not serialize the component itself. It serializes a "reference" that the client can use to reconstruct the component tree:

```
Server: children = <DatabasePage />  (reference to component, not executed)
Client: React sees "DatabasePage" descriptor and instantiates it client-side
```

The component **executes on the client**, which is why `DatabasePage` currently cannot access `deesse` — there is no server context during its execution.

### The Boundary Flows Both Ways

The `"use client"` boundary is not just an input problem — it's also an output problem. Child components of `"use client"` are **always Client Components** even without explicit `"use client"`:

```
AdminDashboardLayout ("use client")
    │
    │  children
    ▼
<DatabasePage />  ← Executed on CLIENT, even without explicit "use client"
```

If `DatabasePage` tried to call `getDeesse()` directly, it would fail — `getDeesse` makes network calls to PostgreSQL that don't work on the client.

### The Fundamental Constraint

```
root-page.tsx (Server)
    │
    │  {result.page.content} passes through
    ▼
AdminDashboardLayout ("use client")  ← serialization boundary
    │
    │  children renders
    ▼
DatabasePage  ← Can only receive serializable props
```

---

## Available Data Access Paths

### Path 1: Better Auth Internal Adapter

The `auth` object exposes an internal adapter with methods for auth-related tables:

```typescript
// Already used in packages/admin/src/lib/admin.ts
const context = await auth.$context;
const users = await context.internalAdapter.listUsers(100);
const total = await context.internalAdapter.countTotalUsers();
```

**Available methods:**
- `listUsers(limit?, offset?, sortBy?, where?)`
- `countTotalUsers(where?)`
- `findUserById(userId)`
- `listSessions(userId)`
- `findSession(token)`

**Limitation:** Only covers Better Auth tables (`user`, `session`, `account`, `verification`).

### Path 2: Direct Drizzle Queries

The `database` property is a `PostgresJsDatabase` instance:

```typescript
const db = deesse.database;
// Full Drizzle ORM capabilities
const users = await db.select().from(user).all();
const count = await db.select({ total: count() }).from(user);
```

**Advantage:** Full access to all tables (auth + application tables).
**Problem:** `database` is not exposed from `createAuthContext`.

### Path 3: App-Level Singleton

Applications using `create-deesse-app` typically expose their own singleton:

```typescript
// apps/*/src/lib/deesse.ts
export const deesse = await getDeesse(config);
export const deesseAuth = deesse.auth;
```

`DatabasePage` could import this directly **if** it were a Server Component.

---

## Options for Server-Only Data Access

### Option A: Server Component with Conditional Render

```tsx
// root-page.tsx
const deesse = await getDeesse(config);

if (result.page.name === "Database") {
  return (
    <AdminDashboardLayout ...>
      <DatabasePage deesse={deesse} />  {/* Direct, no serialization */}
    </AdminDashboardLayout>
  );
}

return (
  <AdminDashboardLayout ...>
    {result.page.content}
  </AdminDashboardLayout>
);
```

**Pros:**
- Works with current architecture
- `DatabasePage` receives `deesse` directly as Server Component prop
- No serialization issues

**Cons:**
- Hardcoded conditional for "Database" page
- Not extensible — every new page needing server data needs a special case
- Couples `root-page.tsx` to page implementation details

### Option B: Server Component Context

Create a React context **without** `"use client"`:

```tsx
// deesse-context.ts (Server Component context)
import { createContext } from "react";

export const DeesseContext = createContext<Deesse | null>(null);

// Usage in root-page.tsx
<DeesseContext.Provider value={deesse}>
  <AdminDashboardLayout>
    {result.page.content}
  </AdminDashboardLayout>
</DeesseContext.Provider>

// Usage in DatabasePage
import { use } from "react";
const deesse = use(DeesseContext);
```

**Requires:** React 19 (Next.js 15 supports this).

**Pros:**
- Clean, extensible solution
- Any Server Component page can access `deesse`
- No prop drilling through Client Component boundary

**Cons:**
- Introduces new architectural pattern
- Requires React 19
- Changes the rendering model

### Option C: Transform `AdminDashboardLayout` to Server Component

If `AdminDashboardLayout` didn't have `"use client"`, the problem would largely disappear. However:

```tsx
// admin-shell.tsx without "use client"
// Would this work?
export function AdminDashboardLayout({ children, ...props }) {
  // Uses: @deessejs/ui (has client components inside)
  // Uses: useSidebar() hook (client-side state)
}
```

The sidebar functionality **requires client-side hooks** (`useSidebar()`). This is not feasible without significant refactoring of `@deessejs/ui`.

### Option D: Content Factory Pattern

Instead of `content: ReactNode`, change the type to a factory function:

```typescript
type PageContent =
  | ReactNode
  | ((props: { deesse: Deesse }) => ReactNode);

// Usage
page({
  name: "Database",
  content: ({ deesse }) => <DatabasePage deesse={deesse} />
});
```

**Pros:**
- Type-safe, explicit
- Works within existing architecture

**Cons:**
- Requires significant type changes
- Changes how pages are defined
- Overly complex for the use case

---

## Recommended Approach

### Short Term: Option A (Quick Win)

Implement a specific solution for Database page in `root-page.tsx`:

```tsx
if (result.page.slug === "database" || result.page.name === "Database") {
  return (
    <AdminDashboardLayout ...>
      <DatabasePage deesse={deesse} />
    </AdminDashboardLayout>
  );
}
```

This gets the Database page working with minimal changes.

### Medium Term: Option B (React 19 Context)

When the project is ready to adopt React 19 patterns:

1. Create `DeesseServerContext` (no `"use client"`)
2. Wrap the entire admin render in this context
3. Any Server Component page can `use(DeesseContext)` to access `deesse`

### Architectural Note

The fundamental issue is that **page content is defined as `ReactNode`** in the `Page` type, which assumes static content. For pages that need server data, we need either:

1. Server Components that can receive unserializable props directly
2. A mechanism to inject server-side dependencies

The current architecture with `content: ReactNode` works well for purely presentational pages but breaks down for pages requiring server data access.

---

## Summary

| Aspect | Current State | Issue |
|--------|--------------|-------|
| `deesse` creation | `createAuthContext` | `database` not exposed |
| Layout boundary | `AdminDashboardLayout` is client | Serialization problem |
| Page content | `ReactNode` | Can't receive server props |
| Database access | N/A | No path to `deesse.database` |

**Key decision:** The team needs to choose between Option A (short-term pragmatic) or Option B (long-term clean). Option A enables the Database page now; Option B requires React 19 but provides a scalable pattern.
