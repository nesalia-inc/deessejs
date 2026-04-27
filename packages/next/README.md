# @deessejs/next

Next.js integration for the Deesse admin dashboard. Provides server components, page layouts, and API routes for admin authentication and navigation.

## Purpose

This package delivers:

- **`RootPage`** — Server component that handles the `/admin/*` route tree
- **`AdminDashboardLayout`** — Authenticated admin shell with sidebar and header
- **API Routes** — REST handlers for admin endpoints (login, first-admin setup)
- **Page Components** — Login page, first-admin setup, default admin pages

Built on top of:
- `@deessejs/admin` — Framework-agnostic admin configuration
- `better-auth` — Authentication and session management
- `@deessejs/ui` — shadcn/ui component library

## Installation

```bash
npm install @deessejs/next @deessejs/admin @deessejs/ui deesse
```

**Peer dependencies:**

```bash
npm install next@>=14 react@>=18 react-dom@>=18
```

## Usage

### 1. Create the Admin Route Handler

In your Next.js `app/admin/[[...slug]]/page.tsx`:

```tsx
import { RootPage } from "@deessejs/next";
import { config } from "@/deesse.config";

export default function AdminPage(props: RootPageProps) {
  return <RootPage config={config} params={props.params} />;
}
```

### 2. Set Up API Routes

In your `app/api/[...all]/route.ts`:

```tsx
import { REST_GET, REST_POST } from "@deessejs/next/routes";
import { auth } from "@/lib/deesse";

export const GET = REST_GET({ auth });
export const POST = REST_POST({ auth });
```

### 3. Configure Environment Variables

```env
AUTH_SECRET=your-secret-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Default Pages

The admin dashboard ships with default pages:

| Page | Path | Description |
|------|------|-------------|
| Home | `/admin` | Dashboard landing page |
| Users | `/admin/users` | User management |
| Database | `/admin/database` | Database introspection |
| Settings | `/admin/settings` | Admin settings |
| Plugins | `/admin/settings/plugins` | Plugin management |

## API

### Components

#### `RootPage`

The main server component for the admin route tree.

```tsx
import { RootPage } from "@deessejs/next";

export default function AdminPage(props: RootPageProps) {
  return <RootPage config={config} params={props.params} />;
}
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `config` | `InternalConfig` | Deesse configuration from `deesse.config` |
| `params` | `Record<string, string \| string[]>` | Next.js route params |

#### `AdminDashboardLayout`

The authenticated admin shell with sidebar navigation.

```tsx
import { AdminDashboardLayout } from "@deessejs/next";

<AdminDashboardLayout
  name="My Admin"
  icon="/logo.svg"
  items={sidebarItems}
  user={session?.user}
  headerActions={<CustomActions />}
>
  {children}
</AdminDashboardLayout>
```

### Lib

#### `createAuthContext`

Creates authentication context for the request. Handles session validation and admin checks.

```tsx
import { createAuthContext } from "@deessejs/next";

const { user, adminExists, isAdminUser, slugParts } = await createAuthContext({
  config,
  params,
});
```

#### `findAdminPage`

Finds the matching admin page from the page tree.

```tsx
import { findAdminPage } from "@deessejs/next";

const { result, sidebarItems } = findAdminPage(allPages, slugParts);
```

### Routes

#### `REST_GET` / `REST_POST`

Create Next.js route handlers for the admin API.

```tsx
import { REST_GET, REST_POST } from "@deessejs/next/routes";

export const GET = REST_GET({ auth });
export const POST = REST_POST({ auth });
```

## Architecture

### Request Flow

```
Browser → /admin/users
    ↓
RootPage (Server Component)
    ↓
createAuthContext() — validates session
    ↓
findAdminPage() — finds matching page
    ↓
AdminDashboardLayout — renders shell
    ↓
UsersPage — renders page content
```

### Authentication Flow

1. `createAuthContext` calls `getDeesse(config)` to get the auth instance
2. It extracts session from request cookies via `auth.api.getSession()`
3. If no session → redirect to `/admin/login`
4. If no admin exists in dev → show `FirstAdminSetup`
5. If session exists but not admin → 404

### Directory Structure

```
src/
├── root-page.tsx              # Main server component
├── pages/
│   └── default-pages.tsx     # Default admin pages
├── components/
│   ├── layouts/
│   │   ├── admin-shell.tsx   # AdminDashboardLayout
│   │   └── admin-header.tsx  # Header with breadcrumbs
│   ├── pages/
│   │   ├── login-page.tsx    # Login form
│   │   ├── first-admin-setup.tsx
│   │   └── ...
│   └── ui/
│       ├── app-sidebar.tsx    # Sidebar navigation
│       └── sidebar-nav.tsx    # Navigation items
├── lib/
│   ├── auth-context.ts       # createAuthContext
│   └── page-finder.ts        # findAdminPage
└── api/
    └── rest/                 # API route handlers
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@deessejs/admin` | Admin configuration builders, page tree types |
| `@deessejs/ui` | shadcn/ui components (sidebar, breadcrumb, etc.) |
| `deesse` | Core auth library, `getDeesse`, `defineConfig` |
| `better-auth` | Authentication and session management |
| `lucide-react` | Icon library |

## Peer Dependencies

| Package | Version |
|---------|---------|
| `next` | `>=14` |
| `react` | `>=18` |
| `react-dom` | `>=18` |
| `@deessejs/ui` | `0.3.2` |
| `deesse` | `^0.2.11` |

## Troubleshooting

### Hydration Mismatch with next-themes

If using `next-themes`, add `suppressHydrationWarning` to the `<html>` element:

```tsx
<html lang="en" suppressHydrationWarning>
```

### Events Not Working After Hot Reload

If clicking buttons doesn't work after hot reload, you may have a CORS issue between `localhost` and `127.0.0.1`. Add to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};
```

### "Config changed, performing hot reload" Warning

This is expected behavior. When `deesse.config.ts` changes, `getDeesse` recreates the auth instance with the new configuration. It is not an error.
