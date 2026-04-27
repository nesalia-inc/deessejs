# Admin Page Creation Developer Experience

## Overview

DeesseJS provides a page-based admin dashboard system where pages are defined declaratively using `page()` and `section()` helpers. The architecture makes a **clear distinction between sidebar metadata, Server Pages, and Client Pages**.

## Three Distinct Concepts

### 1. Sidebar Metadata (Pure Data)

The sidebar only needs **metadata** for navigation. This is pure data, not React components:

```typescript
import { page, section } from "@deessejs/admin";

const pages = [
  page({
    name: "Home",        // string - display name
    slug: "",            // string - URL segment
    icon: Home,          // LucideIcon - for sidebar rendering
    content: /* ... */,  // React component
  }),
];
```

The sidebar rendering uses only `{ name, slug, iconName }` - no access to Deesse, no database, no auth.

### 2. Server Pages (Direct Deesse Access)

Server Pages are **async React components** that receive the full Deesse object directly:

```tsx
// app/admin/pages/users-page.tsx
import { getDeesse } from "deesse";

export const UsersPage = async (deesse: Deesse) => {
  // Direct access to auth and database
  const { database, auth } = deesse;

  // Query database directly - NO API call needed
  const users = await database.select().from(schema.users);

  return (
    <div>
      <h1>Users ({users.length})</h1>
      {/* render table */}
    </div>
  );
};
```

**Critical Rule:** Server Pages receive `Deesse` as a parameter. They execute on the server only. The `Deesse` object **never reaches the client**.

### 3. Client Pages (Pure HTTP)

Client Pages are React components with `"use client"`. They make **no direct database access**:

```tsx
// app/admin/pages/interactive-chart.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "deesse";

// Client-side auth client (different from server Deesse)
const client = createClient({
  auth: { baseURL: process.env.NEXT_PUBLIC_BASE_URL! },
});

export const InteractiveChart = () => {
  const [data, setData] = useState<Data[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pure HTTP call to API routes
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return <Chart data={data} />;
};
```

**Critical Rule:** Client Pages use `createClient()` (from `deesse`) for auth, but they only make HTTP calls. **No `Deesse` server object, no direct database access**.

## Explicit Page Creation with `serverPage()` and `clientPage()`

While pages can be defined by passing React components directly to `page()`, DeesseJS provides explicit helpers that make the **intent clear** and provide **better type safety**.

### The `serverPage()` Helper

```typescript
import { serverPage } from "@deessejs/admin";

const UsersPage = serverPage(async (deesse) => {
  const { database } = deesse;
  const users = await database.select().from(schema.users);
  return <UsersTable users={users} />;
});
```

**Benefits:**
- **Explicit intent**:一目了然 (glanceable) that this is a Server Page
- **Typed `Deesse` parameter**: TypeScript knows the callback receives `Deesse`
- **Async enforced**: Server Pages are always async, enforcing server-only execution
- **Plugin-friendly**: Plugins can use `serverPage()` when dynamically creating pages

### The `clientPage()` Helper

```typescript
import { clientPage } from "@deessejs/admin";

const StatsChart = clientPage(() => {
  const [data, setData] = useState<Data[]>([]);
  useEffect(() => {
    fetch("/api/admin/stats").then(res => res.json()).then(setData);
  }, []);
  return <Chart data={data} />;
});
```

**Benefits:**
- **Explicit intent**: Clear that this page runs on the client
- **No `Deesse` leak possible**: The callback receives nothing, making it impossible to accidentally access server objects
- **Self-documenting**: Future maintainers immediately know this page is client-only

### Comparison: Implicit vs Explicit

| Approach | Example | Clarity | Type Safety |
|----------|---------|---------|-------------|
| **Implicit (ReactNode)** | `content: <UsersPage />` | Must check file | Indirect |
| **Explicit (`serverPage`)** | `content: serverPage(async (deesse) => {...})` | Self-documenting | Direct (`deesse` typed) |
| **Explicit (`clientPage`)** | `content: clientPage(() => {...})` | Self-documenting | Cannot leak `Deesse` |

### Complete Example with Explicit Helpers

```tsx
import { defineConfig } from "@deessejs/next";
import { serverPage, clientPage, section } from "@deessejs/admin";

export default defineConfig({
  name: "My Admin",
  database: db,
  secret: process.env.AUTH_SECRET!,
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
  },
  pages: [
    page({
      name: "Home",
      slug: "",
      icon: Home,
      content: serverPage(async (deesse) => {
        const { database } = deesse;
        const stats = await database.select().from(schema.events).limit(5);
        return <RecentActivity events={stats} />;
      }),
    }),
    page({
      name: "Users",
      slug: "users",
      icon: Users,
      content: serverPage(async (deesse) => {
        const { database } = deesse;
        const users = await database.select().from(schema.users);
        return <UsersTable users={users} />;
      }),
    }),
    page({
      name: "Statistics",
      slug: "stats",
      icon: ChartBar,
      content: clientPage(() => {
        const [data, setData] = useState<Data[]>([]);
        useEffect(() => {
          fetch("/api/admin/stats")
            .then(res => res.json())
            .then(setData);
        }, []);
        return <InteractiveChart data={data} />;
      }),
    }),
    section({
      name: "Settings",
      slug: "settings",
      children: [
        page({
          name: "General",
          slug: "",
          icon: Settings,
          content: serverPage(async (deesse) => {
            const { auth } = deesse;
            const sessions = await auth.api.listSessions();
            return <SessionManager sessions={sessions} />;
          }),
        }),
      ],
    }),
  ],
});
```

### When to Use Which?

| Scenario | Recommendation |
|----------|-----------------|
| Data-heavy page with database queries | `serverPage()` |
| Admin page showing lists/tables | `serverPage()` |
| Interactive page with real-time updates | `clientPage()` |
| Chart/dashboard with user input | `clientPage()` |
| Plugin-defined pages | `serverPage()` (for access to `deesse`) |

### Implementation Note

These functions are identity functions that provide type safety and explicit intent:

```typescript
// From: packages/admin/src/config/page.ts

export type ServerPageHandler = (deesse: {
  auth: unknown;
  database: unknown;
}) => Promise<ReactNode>;

export type ClientPageHandler = () => ReactNode;

export function serverPage(handler: ServerPageHandler): ServerPageHandler {
  return handler;
}

export function clientPage(handler: ClientPageHandler): ClientPageHandler {
  return handler;
}
```

**Key points:**
- Both return their handler type for compatibility with the `page()` content field
- `serverPage` uses a structural type (`{ auth: unknown; database: unknown }`) for the deesse parameter - compatible with the actual `Deesse` type through TypeScript's structural typing
- `clientPage` callback receives no parameters, making it impossible to accidentally access server objects
- The actual `"use client"` directive must still be added to the file containing client page components
- These are exported from `@deessejs/admin` and re-exported from `@deessejs/next` for convenience

## The `Deesse` Object

```typescript
export type Deesse = {
  auth: Auth;                      // better-auth Auth instance
  database: PostgresJsDatabase;    // Drizzle database instance
};
```

This object is created once per request via `getDeesse(config)` and is **scoped to the server**. It is passed to Server Pages as a parameter but never serialized or sent to the client.

## Page Definition API

### The `page()` Helper

```typescript
page({
  name: string;           // Display name in sidebar
  slug?: string;         // URL slug (default: slugified name)
  icon?: LucideIcon;     // Lucide icon for sidebar
  content: ReactNode;    // Server or Client Component
})
```

### The `section()` Helper

```typescript
section({
  name: string;           // Section header in sidebar
  slug?: string;          // URL prefix for section
  bottom?: boolean;       // Render at bottom of sidebar
  children: PageTree[];    // Child pages
})
```

## Rendering Flow

```
HTTP Request /admin/users/list
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  RootPage (Server Component)                                │
│                                                             │
│  const config = defineConfig({ ... })                       │
│  const deesse = await getDeesse(config)                    │
│                                                             │
│  const { user, adminExists } = await createAuthContext(...) │
│  const { result, sidebarItems } = findAdminPage(pages, slugParts) │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        │
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│  SidebarItems       │    │  Page Content Rendered           │
│  (metadata only)    │    │                                 │
│                     │    │  result.page.content(deesse)   │
│  { name, slug,      │    │         │                        │
│   iconName, ... }   │    │         ▼                        │
│                     │    │  ┌───────────────────────────┐  │
│  Used by           │    │  │  Server Page receives:     │  │
│  AppSidebar        │    │  │  { auth, database }        │  │
│  (Client)          │    │  │  Executes on server ONLY  │  │
│                    │    │  │  Never sent to client     │  │
└─────────────────────┘    │  └───────────────────────────┘  │
                           └─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  AdminDashboardLayout (Server Shell)                        │
│  - Renders sidebar (Client)                                  │
│  - Renders header                                           │
│  - Renders page content                                     │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
    HTML Response
```

## Complete Example

### 1. Define Pages in Config

```tsx
// deesse.config.ts
import { defineConfig } from "@deessejs/next";
import { HomePage } from "./app/admin/pages/home-page";
import { UsersPage } from "./app/admin/pages/users-page";
import { StatsChart } from "./app/admin/pages/stats-chart";

export default defineConfig({
  name: "My Admin",
  database: db,
  secret: process.env.AUTH_SECRET!,
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
  },
  pages: [
    page({
      name: "Home",
      slug: "",
      icon: Home,
      content: <HomePage />,           // Server Page
    }),
    page({
      name: "Users",
      slug: "users",
      icon: Users,
      content: <UsersPage />,          // Server Page
    }),
    page({
      name: "Statistics",
      slug: "stats",
      icon: ChartBar,
      content: <StatsChart />,         // Client Page (with "use client")
    }),
  ],
});
```

### 2. Server Page Implementation

```tsx
// app/admin/pages/users-page.tsx
import type { Deesse } from "deesse";

export const UsersPage = async (deesse: Deesse) => {
  const { database } = deesse;

  // Direct database query
  const users = await database.select().from(schema.users);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <span className="text-muted-foreground">{users.length} total</span>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### 3. Client Page Implementation

```tsx
// app/admin/pages/stats-chart.tsx
"use client";

import { useState, useEffect } from "react";
import { Chart, type ChartData } from "./chart";

export const StatsChart = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pure HTTP - no direct DB access
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Statistics</h1>
      <Chart data={data} />
    </div>
  );
};
```

### 4. API Route for Client Pages

```typescript
// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { getDeesse } from "deesse";

export async function GET() {
  const { database } = await getDeesse();

  const stats = await database.select().from(schema.events).limit(30);

  return NextResponse.json(stats);
}
```

## Plugin System

Plugins define pages the same way:

```typescript
const myPlugin = plugin({
  name: "analytics",
  schema: z.object({
    enabled: z.boolean().optional(),
  }),
});

myPlugin.onInit = async () => {
  // getDeesse() available for plugins
  const { database } = await getDeesse();

  return {
    pages: [
      page({
        name: "Analytics",
        slug: "analytics",
        icon: BarChart,
        content: serverPage(async (deesse) => {
          const stats = await deesse.database.select().from(schema.events);
          return <AnalyticsDashboard stats={stats} />;
        }),
      }),
    ],
  };
};
```

## Default Page Structure

```
/admin                      → Home (slug: "")
/admin/users                → Users (slug: "users")
/admin/database            → Database (slug: "database")
/admin/settings             → Settings section
/admin/settings             → General (slug: "")
/admin/settings/plugins    → Plugins (slug: "plugins")
```

## Security Model

### Server Pages
- Receive `Deesse` object directly
- Can query database directly
- **Never serialized to client**
- Auth verified before rendering

### Client Pages
- No `Deesse` object access
- Must go through API routes
- API routes verify auth
- Client uses `createClient()` for session management

## Best Practices

### Do: Use Server Pages for Data-Heavy Pages

```tsx
// ✅ Good - Server Page with direct DB access
export const DataTable = async (deesse: Deesse) => {
  const { database } = deesse;
  const data = await database.select().from(schema.records);
  return <Table data={data} />;
};
```

### Don't: Make DB Calls from Client Pages

```tsx
// ❌ Bad - Client Page trying to access DB directly
"use client";
export const BadPage = () => {
  const { database } = getDeesse();  // ERROR: No access to server Deesse
};
```

### Do: Create API Routes for Client Page Data

```typescript
// app/api/admin/data/route.ts
export async function GET() {
  const { database } = await getDeesse();
  const data = await database.select().from(schema.records);
  return NextResponse.json(data);
}
```

```tsx
// app/admin/pages/data-page.tsx
"use client";
export const DataPage = () => {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch("/api/admin/data").then(res => res.json()).then(setData);
  }, []);
  return <Table data={data} />;
};
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's App                                │
│                                                                  │
│  deesse.config.ts                                                │
│       │                                                          │
│       ▼                                                          │
│  defineConfig({ database, secret, auth, pages })                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    @deessejs/deesse                               │
│                                                                  │
│  getDeesse(config) → Deesse { auth, database }                  │
│       │                                                           │
│       └──► Injected into RootPage (Server Component)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  RootPage (Server)                                              │
│       │                                                          │
│       ├── createAuthContext(deesse) → session verification      │
│       │                                                          │
│       ├── findAdminPage(pages, slugParts)                       │
│       │       │                                                  │
│       │       └──► sidebarItems = metadata only                  │
│       │              { name, slug, iconName }                    │
│       │                                                          │
│       └──► result.page.content(deesse) ──────────────────┐      │
│                  │                                    │      │
│                  │ Server Page receives:              │      │
│                  │ - deesse.auth                      │      │
│                  │ - deesse.database                  │      │
│                  │                                    │      │
│                  │ Executes on SERVER ONLY            │      │
│                  │ NEVER sent to client ──────────────┤      │
│                                                        │      │
└────────────────────────────────────────────────────────│──────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  AdminDashboardLayout (Server Shell)                            │
│       │                                                          │
│       ├── AppSidebar (Client) ←── sidebarItems (metadata only)  │
│       │       └── SidebarNav (Client)                           │
│       │                                                          │
│       ├── AdminHeader                                           │
│       │                                                          │
│       └── { children } ←── Rendered Server Page HTML             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Client Pages (if any)                                          │
│       │                                                          │
│       ├── createClient() → BetterAuth client                     │
│       │       └── useSession(), signIn(), etc.                  │
│       │                                                          │
│       └── fetch("/api/admin/...") → API Routes                   │
│                  │                                              │
│                  └──► getDeesse(config) → Deesse                 │
│                          │                                      │
│                          └──► Database queries                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Summary

| Aspect | Server Page | Client Page |
|--------|-------------|-------------|
| Creation helper | `serverPage((deesse) => {...})` | `clientPage(() => {...})` |
| File marker | None (async function) | `"use client"` |
| Receives `Deesse` | ✅ Yes (parameter) | ❌ No |
| Direct DB access | ✅ Yes | ❌ No |
| HTTP calls | ❌ No | ✅ Yes |
| Auth verification | Via `deesse.auth` | Via `createClient()` + API |
| Renders on | Server only | Client (after hydration) |

### Choosing the Right Page Type

**Use `serverPage()` when:**
- Page needs database access
- Page displays data from the server
- Page should be SEO-friendly
- Page benefits from server-side data fetching

**Use `clientPage()` when:**
- Page has interactive elements (forms, charts, real-time updates)
- Page makes HTTP calls to API routes
- Page uses browser-specific APIs
- Page state changes frequently (user input, animations)
