# Proposed Architecture: @deessejs/admin and @deessejs/admin-next

## Overview

The goal is to decouple admin functionality into two packages:

- **`@deessejs/admin`** - Shared admin logic for React-based frameworks (Next.js, Tanstack, etc.)
- **`@deessejs/admin-next`** - Next.js-specific implementation

Note: "Framework-agnostic" means usable across different React frameworks, not vanilla JS. We keep React dependencies (`LucideIcon`, `ReactNode`, context) in `@deessejs/admin`.

## Package Structure

### Package: `@deessejs/admin`

**Purpose:** Contains admin logic shared across React-based frameworks.

```
packages/admin/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # Main exports

    # Configuration (moved from deesse)
    ├── config/
    │   ├── page.ts                 # Page, Section, PageTree, page(), section()
    │   │                            # Uses LucideIcon and ReactNode (standard React)
    │   ├── define.ts               # AdminConfig, defineAdminConfig()
    │   └── plugin.ts               # Plugin type (from deesse)

    # Admin utilities (moved from deesse/src/lib/)
    ├── lib/
    │   ├── admin.ts                # isDatabaseEmpty, hasAdminUsers, requireDatabaseNotEmpty
    │   ├── validation.ts           # Email validation (isPublicEmailDomain, etc.)
    │   ├── first-admin.ts          # createFirstAdmin() → Result type
    │   ├── sidebar.ts              # SidebarItem types, toSidebarItems()
    │   └── navigation.ts           # findPage(), extractSlugParts()

    # React context (framework-agnostic React)
    ├── context/
    │   └── sidebar-items-context.tsx  # SidebarItemsProvider, useSidebarItems()

    # Default pages structure (no React content)
    ├── default-pages.ts            # PageTree[] with LucideIcon components

    # Types
    └── types.ts                    # Shared admin types
```

### Package: `@deessejs/admin-next`

**Purpose:** Next.js-specific adapters and React components.

```
packages/admin-next/               # Renamed from packages/next
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # Main exports

    # Next.js API handlers (adapters)
    ├── api/
    │   └── rest/
    │       ├── index.ts
    │       └── admin/
    │           └── first-admin.ts  # Calls admin.createFirstAdmin() → NextResponse

    # React page components
    ├── components/
    │   ├── pages/
    │   │   ├── index.ts
    │   │   ├── home-page.tsx
    │   │   ├── users-page.tsx
    │   │   ├── database-page.tsx
    │   │   ├── settings-page.tsx
    │   │   ├── plugins-page.tsx
    │   │   ├── login-page.tsx
    │   │   ├── first-admin-setup.tsx
    │   │   ├── not-found-page.tsx
    │   │   └── admin-not-configured.tsx
    │   ├── layouts/
    │   │   ├── index.ts
    │   │   └── admin-shell.tsx    # AdminDashboardLayout
    │   └── ui/
    │       ├── index.ts
    │       ├── app-sidebar.tsx
    │       ├── sidebar-nav.tsx
    │       ├── production-only.tsx
    │       └── development-only.tsx

    # Page definitions with React content
    ├── pages/
    │   ├── index.ts
    │   └── default-pages.tsx           # Pages with actual <HomePage /> React components

    # Next.js page components
    ├── root-page.tsx                    # Next.js page component (uses next/navigation)
    └── root-layout.tsx                  # Next.js layout

    # Route definitions
    └── routes.ts                        # REST_GET, REST_POST using better-auth/next-js
```

## Key Type Definitions

### `packages/admin/src/config/page.ts`

The page types keep React dependencies (LucideIcon, ReactNode) since this is a React-specific package.

```typescript
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;          // LucideIcon - standard React component
  content: ReactNode | null;  // ReactNode - standard React type
};

export type Section = {
  type: "section";
  name: string;
  slug: string;
  bottom?: boolean;
  children: PageTree[];
};

export type PageTree = Page | Section;

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function page(config: {
  name: string;
  slug?: string;
  icon?: LucideIcon;
  content: ReactNode | null;
}): Page {
  return {
    type: "page",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    icon: config.icon,
    content: config.content,
  };
}

export function section(config: {
  name: string;
  slug?: string;
  bottom?: boolean;
  children: PageTree[];
}): Section {
  return {
    type: "section",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    bottom: config.bottom,
    children: config.children,
  };
}
```

**Note:** Unlike the initial proposal, we keep `LucideIcon` and `ReactNode` because:
1. This is a React-specific package, not vanilla JS
2. Other React frameworks (Tanstack, Remix) can use these same types
3. The distinction is about Next.js-specific code (API routes, server components), not about React

### `packages/admin/src/lib/first-admin.ts`

```typescript
import type { Auth } from "better-auth";
import { hasAdminUsers } from "./admin.js";
import { validateAdminEmailDomain } from "./validation.js";

export type FirstAdminInput = {
  name: string;
  email: string;
  password: string;
};

export type FirstAdminResult =
  | { success: true; userId: string }
  | {
      success: false;
      code:
        | "ADMIN_EXISTS"
        | "INVALID_EMAIL"
        | "WEAK_PASSWORD"
        | "EMAIL_DOMAIN_BLOCKED"
        | "INTERNAL_ERROR";
      message: string;
    };

export async function createFirstAdmin(
  auth: Auth,
  input: FirstAdminInput
): Promise<FirstAdminResult> {
  // 1. Check if admin exists
  if (await hasAdminUsers(auth)) {
    return { success: false, code: "ADMIN_EXISTS", message: "Admin users already exist" };
  }

  // 2. Validate email
  const emailValidation = validateAdminEmailDomain(input.email);
  if (!emailValidation.valid) {
    return { success: false, code: "EMAIL_DOMAIN_BLOCKED", message: emailValidation.message };
  }

  // 3. Validate password
  if (input.password.length < 8) {
    return { success: false, code: "WEAK_PASSWORD", message: "Password must be at least 8 characters" };
  }

  // 4. Create user
  try {
    const result = await (auth.api as any).createUser({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
        role: "admin",
      },
    });
    return { success: true, userId: result.user?.id };
  } catch (error) {
    return {
      success: false,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Internal server error"
    };
  }
}
```

### `packages/admin-next/src/api/rest/admin/first-admin.ts`

```typescript
import { NextResponse } from "next/server";
import { createFirstAdmin, type FirstAdminInput } from "@deessejs/admin";

export async function handleFirstAdmin(
  auth: Auth,
  request: Request
): Promise<NextResponse> {
  // Environment check (Next.js specific)
  if (process.env["NODE_ENV"] === "production") {
    return NextResponse.json(
      { message: "First admin setup is only available in development mode" },
      { status: 403 }
    );
  }

  // Parse and validate input
  const body = await request.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { message: "Missing required fields: name, email, password" },
      { status: 400 }
    );
  }

  // Call framework-agnostic logic
  const input: FirstAdminInput = { name, email, password };
  const result = await createFirstAdmin(auth, input);

  if (result.success) {
    return NextResponse.json(
      { message: "Admin user created successfully", userId: result.userId },
      { status: 201 }
    );
  }

  return NextResponse.json(
    { code: result.code, message: result.message },
    { status: 400 }
  );
}
```

### `packages/admin-next/src/pages/default-pages.tsx`

The default pages include React content - this stays in `admin-next`:

```typescript
import { page, section } from "@deessejs/admin";
import { Home, Users, Database, Settings, Puzzle } from "lucide-react";
import { HomePage } from "../components/pages/home-page";
import { UsersPage } from "../components/pages/users-page";
import { DatabasePage } from "../components/pages/database-page";
import { SettingsPage } from "../components/pages/settings-page";
import { PluginsPage } from "../components/pages/plugins-page";

export const defaultPages = [
  page({
    name: "Home",
    slug: "",
    icon: Home,
    content: <HomePage />,
  }),
  section({
    name: "Users",
    slug: "users",
    children: [
      page({
        name: "List",
        slug: "",
        icon: Users,
        content: <UsersPage />,
      }),
    ],
  }),
  page({
    name: "Database",
    slug: "database",
    icon: Database,
    content: <DatabasePage />,
  }),
  section({
    name: "Settings",
    slug: "settings",
    children: [
      page({
        name: "General",
        slug: "",
        icon: Settings,
        content: <SettingsPage />,
      }),
      page({
        name: "Plugins",
        slug: "plugins",
        icon: Puzzle,
        content: <PluginsPage />,
      }),
    ],
  }),
];
```

### `packages/admin/src/default-pages.ts`

A version without React content for reference (used internally by admin logic):

```typescript
import { page, section } from "./config/page.js";

// This would be the same structure but without content
// admin-next's default-pages.tsx imports from here and adds content
export const defaultPageStructure = [
  page({ name: "Home", slug: "", icon: Home }),
  section({
    name: "Users",
    slug: "users",
    children: [page({ name: "List", slug: "", icon: Users })],
  }),
  page({ name: "Database", slug: "database", icon: Database }),
  section({
    name: "Settings",
    slug: "settings",
    children: [
      page({ name: "General", slug: "", icon: Settings }),
      page({ name: "Plugins", slug: "plugins", icon: Puzzle }),
    ],
  }),
];
```

## Dependency Chain

### After Refactoring

```
deesse (core)
├── server.ts     # better-auth wrapper
├── client.ts     # React auth client (naturally React-specific)
├── plugin.ts     # Generic plugin system
└── cache.ts      # Utility

@deessejs/admin (React-agnostic)
├── config/page.ts     # Page, Section, PageTree (uses ReactNode, LucideIcon)
├── config/define.ts    # AdminConfig
├── lib/admin.ts       # hasAdminUsers, isDatabaseEmpty
├── lib/validation.ts  # Email validation
├── lib/first-admin.ts # createFirstAdmin()
├── lib/sidebar.ts     # SidebarItem types
├── lib/navigation.ts  # findPage()
├── context/           # React context (no Next.js deps)
└── default-pages.ts   # Default page structure (no content)

@deessejs/admin-next (Next.js bindings)
├── api/rest/admin/first-admin.ts  # Adapter
├── components/pages/*.tsx          # React page components
├── components/layouts/admin-shell.tsx
├── components/ui/app-sidebar.tsx
├── context/sidebar-items-context.tsx   # (re-exports from @deessejs/admin or local)
├── pages/default-pages.tsx         # With React content
├── root-page.tsx                    # Main page (uses next/navigation)
└── routes.ts                       # REST handlers (uses better-auth/next-js)

@deessejs/ui (shadcn/ui components)
└── 50+ UI components
```

### Dependency Direction

```
deesse
  ↑
  │ (peer - deesse doesn't depend on admin, but they share types)
  │
@deessejs/admin ← no Next.js dependencies (but uses React)

@deessejs/admin-next
  ├── depends on → @deessejs/admin
  ├── depends on → deesse (for Config, server)
  └── depends on → @deessejs/ui

@deessejs/ui (no dependencies on admin packages)
```

## Exports API

### `@deessejs/admin` Exports

```typescript
// config/page.ts
export { page, section }
export type { Page, Section, PageTree }

// config/define.ts
export { defineAdminConfig }
export type { AdminConfig, InternalAdminConfig }

// config/plugin.ts (moved from deesse)
export { plugin }
export type { Plugin }

// lib/admin.ts
export { isDatabaseEmpty, requireDatabaseNotEmpty, hasAdminUsers }

// lib/validation.ts
export {
  PUBLIC_EMAIL_DOMAINS,
  isPublicEmailDomain,
  getAllowedDomains,
  isAllowedAdminEmail,
  validateAdminEmailDomain
}

// lib/first-admin.ts
export { createFirstAdmin }
export type { FirstAdminInput, FirstAdminResult }

// lib/sidebar.ts
export { toSidebarItems }
export type { SidebarItem, SidebarPage, SidebarSection }

// lib/navigation.ts
export { findPage, extractSlugParts }
export type { FindPageResult }

// context/sidebar-items-context.tsx
export { SidebarItemsProvider, useSidebarItems }

// default-pages.ts
export { defaultPageStructure }
```

### `@deessejs/admin-next` Exports

```typescript
// Main entry
export { RootPage } from "./root-page";
export { RootLayout } from "./root-layout";

// Admin layout
export { AdminDashboardLayout } from "./components/layouts";
export type { AdminDashboardUser } from "./components/layouts";

// Sidebar
export { AppSidebar } from "./components/ui";
export { SidebarNav } from "./components/ui";
export { SidebarItemsProvider, useSidebarItems } from "@deessejs/admin"; // Re-export

// Pages
export {
  HomePage,
  UsersPage,
  DatabasePage,
  SettingsPage,
  PluginsPage,
  LoginPage,
  FirstAdminSetup,
  NotFoundPage,
  AdminNotConfigured
} from "./components/pages";

// Routes
export { REST_GET, REST_POST } from "./routes";
export { handleFirstAdmin } from "./api/rest/admin/first-admin";

// Page tree
export { defaultPages } from "./pages/default-pages";
```

## Migration Strategy

### Phase 1: Create @deessejs/admin

1. Create `packages/admin/` directory structure
2. Copy `deesse/src/config/page.ts` → `admin/src/config/page.ts`
3. Copy `deesse/src/config/plugin.ts` → `admin/src/config/plugin.ts`
4. Create `admin/src/config/define.ts` (AdminConfig type)
5. Copy `deesse/src/lib/admin.ts` → `admin/src/lib/admin.ts`
6. Copy `deesse/src/lib/validation.ts` → `admin/src/lib/validation.ts`
7. Extract `first-admin.ts` logic from `next/src/api/rest/admin/first-admin.ts`
8. Copy `next/src/lib/find-page.ts` → `admin/src/lib/navigation.ts`
9. Copy `next/src/lib/to-sidebar-items.ts` → `admin/src/lib/sidebar.ts`
10. Copy `next/src/lib/sidebar-items-context.tsx` → `admin/src/context/`
11. Create `admin/src/default-pages.ts`
12. Update `deesse/src/index.ts` to import from `@deessejs/admin` for re-exports

### Phase 2: Create @deessejs/admin-next

1. Copy `packages/next` to `packages/admin-next`
2. Update `api/rest/admin/first-admin.ts` to use `@deessejs/admin`'s `createFirstAdmin()`
3. Update imports to use `@deessejs/admin` for shared logic
4. Keep Next.js-specific code (routes, page components) in `admin-next`

### Phase 3: Update deesse package

1. Remove admin-specific code from `deesse/src/` (moved to admin)
2. Update `deesse/src/index.ts` to re-export from `@deessejs/admin` for backward compatibility
3. Update `deesse/package.json` to add `@deessejs/admin` as peer dependency

### Phase 4: Clean up

1. Remove duplicate exports
2. Update all internal imports to use new package paths
3. Update documentation

## Key Clarification: What "Framework-Agnostic" Means

In this context, "framework-agnostic" means:

| Category | Meaning | Examples |
|----------|---------|----------|
| **Framework-agnostic** | Works with any React framework | Next.js, Tanstack, Remix, React Native |
| **Next.js-specific** | Only works with Next.js | API routes, `next/navigation`, `next/headers` |
| **React-agnostic** | Not tied to a specific React framework | React context, hooks, component props |

`@deessejs/admin` is **React-agnostic** (not Next.js-specific):
- Uses React types (`ReactNode`, `LucideIcon`) - standard across frameworks
- Uses React context - works in any React framework
- Does NOT use `next/navigation`, `next/headers`, or API routes

`@deessejs/admin-next` is **Next.js-specific**:
- Uses API routes
- Uses `next/navigation` for redirects
- Uses `next/headers` for request headers