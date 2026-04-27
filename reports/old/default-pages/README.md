# Analysis: Default Admin Pages Architecture in @deessejs/next

## Overview

This document analyzes the architecture for default admin pages (`/home`, `/users`, `/database`, `/settings`, `/plugins`) in `@deessejs/next` and clarifies the architectural distinction between **default pages** (built into the package) and **custom pages** (defined by the user).

---

## Key Architectural Principle

**Default pages MUST NOT be defined in the user's `deesse.pages.tsx`.**

Instead, they should be:
1. **Native to packages/next** - Built into the `@deessejs/next` package itself
2. **Completely hidden from the user** - The user should not even know these pages exist in their page tree
3. **Automatically included** - Available when using the deesse admin, without requiring registration
4. **Using the same page DSL** - They still use `page()` and `section()` functions, but are merged internally

The user's `deesse.pages.tsx` should only contain their own custom pages. The default pages are merged into the page tree internally by the `RootPage` or `toSidebarItems` function.

---

## 1. Routing Structure and Page Registration

The routing in `@deessejs/next` is based on a **catch-all route** pattern with `[[...slug]]` in Next.js App Router.

**Key Files:**
- `examples/base/src/app/(deesse)/admin/[[...slug]]/page.tsx` - The actual Next.js page that catches all admin routes
- `packages/next/src/root-page.tsx` - The main `RootPage` component that handles routing logic
- `packages/next/src/lib/find-page.ts` - The page matching logic

**How routing works:**
1. All admin URLs match the `[[...slug]]` route (e.g., `/admin/users`, `/admin/dashboard`)
2. The slug is extracted via `extractSlugParts(params)` which converts `{ slug: string[] }` to `string[]`
3. `findPage(config.pages, slugParts)` recursively searches the `PageTree[]` to find the matching page
4. The page's `content` ReactNode is rendered directly

**Page Tree Structure (from `packages/deesse/src/config/page.ts`):**
```typescript
type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: ReactNode | null;
};

type Section = {
  type: "section";
  name: string;
  slug: string;
  bottom?: boolean;
  children: PageTree[];
};

type PageTree = Page | Section;
```

---

## 2. Existing Pages Implementation

### Login Page
**File:** `packages/next/src/components/login-page.tsx`
- Client component using `"use client"` directive
- Uses `@deessejs/ui` components (Card, Input, Label, Button)
- Makes POST to `/api/auth/sign-in/email` for authentication
- Redirects to `/admin` on success

### FirstAdminSetup
**File:** `packages/next/src/components/first-admin-setup.tsx`
- Client component for initial admin creation
- POSTs to `/api/first-admin` endpoint (handled in `routes.ts`)
- Redirects to `/admin/login?created=true` after success

### DashboardPage
**File:** `packages/next/src/components/dashboard-page.tsx`
- Simple wrapper that composes `AdminShell` with children
- Accepts `name`, `items` (SidebarItem[]), `header`, and `children`

### NotFoundPage
**File:** `packages/next/src/components/not-found-page.tsx`
- Simple fallback for unmatched routes

---

## 3. Components and Layouts Available

### AdminShell
**File:** `packages/next/src/components/admin-shell.tsx`

```typescript
interface AdminShellProps {
  name?: string;
  items: SidebarItem[];
  header?: React.ReactNode;
  children: React.ReactNode;
}
```
- Uses `SidebarProvider` from `@deessejs/ui/sidebar`
- Composes `AppSidebar` + `SidebarInset` with header area

### AppSidebar
**File:** `packages/next/src/components/app-sidebar.tsx`
- Renders the collapsible sidebar with header, content, footer
- Uses lucide-react `SparklesIcon` for branding
- Accepts `name` for sidebar header display

### SidebarNav
**File:** `packages/next/src/components/sidebar-nav.tsx`
- Renders navigation items from `SidebarItem[]`
- Uses `usePathname()` to determine active state
- Uses lucide-react icons dynamically via string lookup

### toSidebarItems
**File:** `packages/next/src/lib/to-sidebar-items.ts`
- Converts `PageTree[]` to `SidebarItem[]` for sidebar rendering
- Extracts icon names from lucide components
- Groups orphan pages under "General" section
- Sorts sections with `bottom: true` at the end

---

## 4. Default Pages vs. Custom Pages

### Two Distinct Page Categories

This architecture separates pages into two categories:

| Aspect | Default Pages | Custom Pages |
|--------|---------------|---------------|
| **Location** | `packages/next/src/` | User's `deesse.pages.tsx` |
| **Registration** | Automatic (internal) | Manual (user-defined) |
| **Visibility** | Hidden from user | Visible to user |
| **Modifiable** | No | Yes |
| **Merging** | Happens in `RootPage` or `toSidebarItems` | User controls their own tree |

### Default Pages (Built-in)

These pages are **automatically available** and **hidden from the user**:

```typescript
// packages/next/src/pages/default-pages.ts

import { page, section } from '@deessejs/core';
import { Home, Users, Database, Settings, Puzzle } from 'lucide-react';
import { HomePage } from './admin/home-page';
import { UsersPage } from './admin/users-page';
import { DatabasePage } from './admin/database-page';
import { SettingsPage } from './admin/settings-page';
import { PluginsPage } from './admin/plugins-page';

export const defaultPages: PageTree[] = [
  page({
    name: 'Home',
    slug: '',
    icon: Home,
    content: <HomePage />,
  }),
  section({
    name: 'Users',
    slug: 'users',
    children: [
      page({
        name: 'All Users',
        slug: 'users',
        icon: Users,
        content: <UsersPage />,
      }),
    ],
  }),
  page({
    name: 'Database',
    slug: 'database',
    icon: Database,
    content: <DatabasePage />,
  }),
  section({
    name: 'Settings',
    slug: 'settings',
    children: [
      page({
        name: 'General',
        slug: 'settings',
        icon: Settings,
        content: <SettingsPage />,
      }),
    ],
  }),
  section({
    name: 'Plugins',
    slug: 'plugins',
    children: [
      page({
        name: 'All Plugins',
        slug: 'plugins',
        icon: Puzzle,
        content: <PluginsPage />,
      }),
    ],
  }),
];
```

### Custom Pages (User-Defined)

These pages are **defined by the user** in their `deesse.pages.tsx`:

```typescript
// examples/base/src/deesse.pages.tsx

import { page, section } from 'deesse';
import { Settings, BarChart3 } from 'lucide-react';
import { SettingsPage } from './components/admin/settings-page';
import { ReportsPage } from './components/admin/reports-page';

export const deessePages = [
  page({
    name: 'Dashboard',
    slug: 'dashboard',
    icon: BarChart3,
    content: <ReportsPage />,
  }),
  section({
    name: 'Settings',
    slug: 'settings',
    children: [
      page({
        name: 'General',
        slug: 'settings',
        icon: Settings,
        content: <SettingsPage />,
      }),
    ],
  }),
];
```

### Page Tree Merging (Internal)

The merging of default pages and custom pages happens **internally**, not in user code:

```typescript
// packages/next/src/root-page.tsx (conceptual)

import { defaultPages } from './pages/default-pages';

interface RootPageProps {
  config: DeesseConfig;
}

export function RootPage({ config }: RootPageProps) {
  // Merge default pages with user pages internally
  const allPages = [...defaultPages, ...config.pages];

  // Find matching page...
  const matchedPage = findPage(allPages, slugParts);

  // Convert to sidebar items
  const sidebarItems = toSidebarItems(allPages);

  // Render...
}
```

---

## 5. Page Registration and Navigation Pattern

**Sidebar Navigation Flow:**
1. Default pages are defined in `packages/next/src/pages/default-pages.ts`
2. Custom pages are defined in user's `deesse.pages.tsx`
3. `RootPage` merges both page trees internally: `[...defaultPages, ...config.pages]`
4. `RootPage` uses `toSidebarItems(mergedPages)` to convert to `SidebarItem[]`
5. `DashboardPage` receives `items` prop and renders `AdminShell`
6. `AdminShell` renders `AppSidebar` which renders `SidebarNav`

**URL Matching Logic (from `find-page.ts`):**
- For `/admin/users/list`, slugParts = `['users', 'list']`
- First matches section `users`, then looks for child page `list`
- For pages without sections, matches page.slug directly

---

## 6. Existing User and Database Functionality

### User Management (from better-auth)
- `auth.api.listUsers({ limit, offset, searchValue, filterField, ... })`
- `auth.api.getUser({ query: { id } })`
- `auth.api.createUser({ body: { email, password, name, role } })`
- `auth.api.adminUpdateUser({ userId, data })`
- `auth.api.removeUser({ userId })`
- `auth.api.banUser({ userId, banReason, banExpiresIn })`
- `auth.api.unbanUser({ userId })`
- `auth.api.setRole({ body: { userId, role } })`
- `auth.api.listUserSessions({ body: { userId } })`
- `auth.api.revokeUserSession({ body: { userId, sessionId } })`

### Database Utilities (from `packages/deesse/src/lib/admin.ts`)
- `isDatabaseEmpty(auth)` - Check if any users exist
- `hasAdminUsers(auth)` - Check if any admin role users exist
- `validateAdminEmail(email)` - Validate admin email format

### Schema Reference (from `examples/base/src/db/schema/auth-schema.ts`)
- `user` table: id, name, email, emailVerified, image, createdAt, updatedAt, role, banned, banReason, banExpires
- `session` table: id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId, impersonatedBy
- `account` table: OAuth provider accounts
- `verification` table: Email verification tokens

---

## Recommendations for Default Pages Implementation

### /home Page
- Landing page at `/admin` (empty slug)
- Simple welcome card with quick stats (total users, etc.)
- Quick links to common actions
- Use `DashboardPage` or standalone component

### /users Page
- List all users with pagination, search, and filtering
- Client component with server-side data fetching
- Actions: create user, edit user, ban/unban, delete user
- Use table component from `@deessejs/ui`

### /database Page
- Show database connection status
- Display schema tables information
- Show migration status
- Use Drizzle's introspection capabilities for table listing

### /settings Page
- Admin configuration and preferences
- Site name, logo, and branding settings
- Email configuration and notification settings
- Security settings (password policies, session timeouts)
- API keys management
- Environment variable display (read-only, masked values)
- Theme preferences (light/dark mode toggle)
- Localization settings (language, timezone)

### /plugins Page
- List all installed plugins with status indicators
- Enable/disable plugins without requiring full restart
- Plugin marketplace or registry browser
- Plugin configuration UI (per-plugin settings)
- Plugin health checks and version info
- Dependency visualization between plugins
- One-click updates for plugin packages

---

## Architecture Summary

**Key Principles:**
1. Default pages are **native to `packages/next`** and **hidden from the user**
2. Custom pages are **user-defined** in their `deesse.pages.tsx`
3. Page tree merging happens **internally** in `RootPage` or `toSidebarItems`
4. Both use the same `page()` and `section()` DSL from `@deessejs/core`
5. Users cannot see, modify, or override default pages

**Implementation Recommendations:**
1. Create `packages/next/src/pages/default-pages.ts` containing default page definitions
2. Create page components in `packages/next/src/components/admin/` (HomePage, UsersPage, DatabasePage)
3. Modify `RootPage` to merge `defaultPages` with `config.pages` internally
4. Ensure the merge order allows custom pages to potentially override defaults if needed
5. Default pages are invisible to the user's page tree configuration

**Files to Create/Modify:**
- `packages/next/src/pages/default-pages.ts` (new)
- `packages/next/src/components/admin/home-page.tsx` (new)
- `packages/next/src/components/admin/users-page.tsx` (new)
- `packages/next/src/components/admin/database-page.tsx` (new)
- `packages/next/src/components/admin/settings-page.tsx` (new)
- `packages/next/src/components/admin/plugins-page.tsx` (new)
- `packages/next/src/root-page.tsx` (modify - add merging logic)
