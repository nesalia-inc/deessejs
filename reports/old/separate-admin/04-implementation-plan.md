# Implementation Plan

## Overview

This document outlines the step-by-step implementation for creating `@deessejs/admin` and `@deessejs/admin-next` packages.

**Note:** No backward compatibility needed - we're in development, not production. We can make breaking changes freely.

## Step 1: Create `@deessejs/admin` Package Structure

### 1.1 Create directory and package.json

```json
// packages/admin/package.json
{
  "name": "@deessejs/admin",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./config": {
      "import": "./dist/config/index.js",
      "types": "./dist/config/index.d.ts"
    },
    "./config/page": {
      "import": "./dist/config/page.js",
      "types": "./dist/config/page.d.ts"
    },
    "./lib/*": {
      "import": "./dist/lib/*.js",
      "types": "./dist/lib/*.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "better-auth": "^1.0.0",
    "react": ">=18",
    "react-dom": ">=18",
    "lucide-react": "^0.468.0",
    "zod": "^3.23.0"
  },
  "peerDependencies": {
    "better-auth": "^1.0.0",
    "react": ">=18",
    "react-dom": ">=18"
  }
}
```

### 1.2 Create TypeScript config

```json
// packages/admin/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 1.3 Create source files

#### `packages/admin/src/config/page.ts`

Keep React dependencies (LucideIcon, ReactNode) - standard React, not Next.js-specific.

```typescript
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: ReactNode | null;
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

#### `packages/admin/src/config/define.ts`

```typescript
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BetterAuthPlugin } from "better-auth";
import type { Plugin } from "./plugin";
import type { PageTree } from "./page";

export type AdminConfig = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: {
    baseURL: string;
    plugins?: BetterAuthPlugin[];
  };
};

export type InternalAdminConfig = AdminConfig & {
  auth: {
    baseURL: string;
    plugins: BetterAuthPlugin[];
  };
};

export function defineAdminConfig(config: AdminConfig): InternalAdminConfig {
  const authPlugins: BetterAuthPlugin[] = [...(config.auth?.plugins ?? [])];

  return {
    ...config,
    auth: {
      ...config.auth,
      plugins: authPlugins,
    },
  } as InternalAdminConfig;
}
```

#### `packages/admin/src/config/index.ts`

```typescript
export { defineAdminConfig } from "./define.js";
export type { AdminConfig, InternalAdminConfig } from "./define.js";
export { page, section } from "./page.js";
export type { Page, Section, PageTree } from "./page.js";
export { plugin } from "./plugin.js";
export type { Plugin } from "./plugin.js";
```

#### `packages/admin/src/config/plugin.ts`

```typescript
export type Plugin = {
  name: string;
  init?: (config: any) => void | Promise<void>;
};

export function plugin(config: Plugin): Plugin {
  return config;
}
```

#### `packages/admin/src/lib/admin.ts`

Copied from `deesse/src/lib/admin.ts` - no changes needed.

#### `packages/admin/src/lib/validation.ts`

Copied from `deesse/src/lib/validation.ts` - no changes needed.

#### `packages/admin/src/lib/first-admin.ts`

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
  // Check if admin already exists
  const adminExists = await hasAdminUsers(auth);
  if (adminExists) {
    return {
      success: false,
      code: "ADMIN_EXISTS",
      message: "Admin users already exist. Cannot create first admin.",
    };
  }

  // Validate email domain
  const emailValidation = validateAdminEmailDomain(input.email);
  if (!emailValidation.valid) {
    return {
      success: false,
      code: "EMAIL_DOMAIN_BLOCKED",
      message: emailValidation.message,
    };
  }

  // Validate password
  if (input.password.length < 8) {
    return {
      success: false,
      code: "WEAK_PASSWORD",
      message: "Password must be at least 8 characters",
    };
  }

  // Create user
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
      message: error instanceof Error ? error.message : "Internal server error",
    };
  }
}
```

#### `packages/admin/src/lib/navigation.ts`

Copied from `next/src/lib/find-page.ts` (adapted to use `@deessejs/admin` types):

```typescript
import type { PageTree } from "../config/page.js";

export type FindPageResult = { page: Extract<PageTree, { type: "page" }> } | null;

export function findPage(
  pages: PageTree[] | undefined,
  slugParts: string[]
): FindPageResult {
  if (!pages) return null;

  if (slugParts.length === 0) {
    for (const item of pages) {
      if (item.type === "page" && item.slug === "") {
        return { page: item };
      }
    }
    return null;
  }

  const [first, ...rest] = slugParts;

  for (const item of pages) {
    if (item.type === "section") {
      if (item.slug === first) {
        if (rest.length === 0) {
          for (const child of item.children) {
            if (child.type === "page") {
              return { page: child };
            }
          }
          return null;
        }
        return findPage(item.children, rest);
      }
    } else if (item.type === "page") {
      if (item.slug === first && rest.length === 0) {
        return { page: item };
      }
    }
  }

  return null;
}

export function extractSlugParts(params: Record<string, string | string[]>): string[] {
  const slug = params["slug"];
  if (!slug) return [];
  return Array.isArray(slug) ? slug : [slug];
}
```

#### `packages/admin/src/lib/sidebar.ts`

Copied from `next/src/lib/to-sidebar-items.ts` (adapted):

```typescript
import type { PageTree } from "../config/page.js";

export interface SidebarPage {
  type: "page";
  name: string;
  slug: string;
  iconName?: string;
}

export interface SidebarSection {
  type: "section";
  name: string;
  slug: string;
  isFooter?: boolean;
  children: SidebarItem[];
}

export type SidebarItem = SidebarPage | SidebarSection;

function getIconName(icon: unknown): string | undefined {
  if (!icon) return undefined;
  const iconAny = icon as { displayName?: string; name?: string };
  return iconAny.displayName || iconAny.name || undefined;
}

function toSidebarItem(item: PageTree): SidebarItem {
  if (item.type === "page") {
    return {
      type: "page",
      name: item.name,
      slug: item.slug,
      iconName: getIconName(item.icon),
    };
  }

  return {
    type: "section",
    name: item.name,
    slug: item.slug,
    isFooter: item.bottom,
    children: item.children.map(toSidebarItem),
  };
}

export function toSidebarItems(pageTree: PageTree[]): SidebarItem[] {
  const orphanPages = pageTree.filter(
    (item): item is Extract<PageTree, { type: "page" }> => item.type === "page"
  );
  const sections = pageTree.filter(
    (item): item is Extract<PageTree, { type: "section" }> => item.type === "section"
  );

  const items: SidebarItem[] = [];

  if (orphanPages.length > 0) {
    const seenPageNames = new Set<string>();
    const uniqueOrphanPages = orphanPages.filter((page) => {
      if (!seenPageNames.has(page.name)) {
        seenPageNames.add(page.name);
        return true;
      }
      return false;
    });

    items.push({
      type: "section",
      name: "General",
      slug: "general",
      children: uniqueOrphanPages.map(toSidebarItem),
    });
  }

  const seenSlugs = new Set<string>();
  const uniqueSections: typeof sections = [];
  for (const section of sections) {
    if (!seenSlugs.has(section.slug)) {
      seenSlugs.add(section.slug);
      uniqueSections.push(section);
    }
  }

  const mappedSections = uniqueSections.map(toSidebarItem) as SidebarSection[];
  const sortedSections = mappedSections.sort((a, b) => {
    if (a.isFooter && !b.isFooter) return 1;
    if (!a.isFooter && b.isFooter) return -1;
    return 0;
  });

  items.push(...sortedSections);

  return items;
}
```

#### `packages/admin/src/context/sidebar-items-context.tsx`

Copied from `next/src/lib/sidebar-items-context.tsx`:

```typescript
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SidebarItem } from "../lib/sidebar.js";

type SidebarItemsContextValue = {
  items: SidebarItem[];
};

const SidebarItemsContext = createContext<SidebarItemsContextValue | null>(null);

export function SidebarItemsProvider({
  items,
  children,
}: {
  items: SidebarItem[];
  children: ReactNode;
}) {
  return (
    <SidebarItemsContext.Provider value={{ items }}>
      {children}
    </SidebarItemsContext.Provider>
  );
}

export function useSidebarItems(): SidebarItem[] {
  const context = useContext(SidebarItemsContext);
  if (!context) {
    throw new Error("useSidebarItems must be used within a SidebarItemsProvider");
  }
  return context.items;
}
```

#### `packages/admin/src/default-pages.ts`

Structure without React content (for internal use):

```typescript
import { page, section } from "./config/page.js";
import { Home, Users, Database, Settings, Puzzle } from "lucide-react";

export const defaultPageStructure = [
  page({ name: "Home", slug: "", icon: Home, content: null }),
  section({
    name: "Users",
    slug: "users",
    children: [page({ name: "List", slug: "", icon: Users, content: null })],
  }),
  page({ name: "Database", slug: "database", icon: Database, content: null }),
  section({
    name: "Settings",
    slug: "settings",
    children: [
      page({ name: "General", slug: "", icon: Settings, content: null }),
      page({ name: "Plugins", slug: "plugins", icon: Puzzle, content: null }),
    ],
  }),
];
```

#### `packages/admin/src/index.ts`

```typescript
// Config
export { defineAdminConfig } from "./config/index.js";
export type { AdminConfig, InternalAdminConfig } from "./config/index.js";
export { plugin } from "./config/index.js";
export type { Plugin } from "./config/index.js";

// Page types
export { page, section } from "./config/index.js";
export type { Page, Section, PageTree } from "./config/index.js";

// Admin utilities
export {
  isDatabaseEmpty,
  requireDatabaseNotEmpty,
  hasAdminUsers,
} from "./lib/admin.js";

// Email validation
export {
  PUBLIC_EMAIL_DOMAINS,
  isPublicEmailDomain,
  getAllowedDomains,
  isAllowedAdminEmail,
  validateAdminEmailDomain,
} from "./lib/validation.js";

// First admin
export { createFirstAdmin } from "./lib/first-admin.js";
export type { FirstAdminInput, FirstAdminResult } from "./lib/first-admin.js";

// Sidebar
export { toSidebarItems } from "./lib/sidebar.js";
export type { SidebarItem, SidebarPage, SidebarSection } from "./lib/sidebar.js";

// Navigation
export { findPage, extractSlugParts } from "./lib/navigation.js";
export type { FindPageResult } from "./lib/navigation.js";

// Context
export { SidebarItemsProvider, useSidebarItems } from "./context/sidebar-items-context.js";

// Default pages
export { defaultPageStructure } from "./default-pages.js";
```

## Step 2: Create `@deessejs/admin-next` Package

### 2.1 Setup package

Copy `packages/next` to `packages/admin-next` and modify.

### 2.2 Update dependencies

```json
// packages/admin-next/package.json
{
  "name": "@deessejs/admin-next",
  "version": "0.1.0",
  "dependencies": {
    "@deessejs/admin": "workspace:*",
    "@deessejs/ui": "workspace:*",
    "better-auth": "^1.0.0",
    "lucide-react": "^0.468.0"
  },
  "peerDependencies": {
    "@deessejs/admin": "^0.1.0",
    "@deessejs/ui": "^0.3.2",
    "next": ">=14",
    "react": ">=18"
  }
}
```

### 2.3 Update API handler

```typescript
// packages/admin-next/src/api/rest/admin/first-admin.ts
import { NextResponse } from "next/server";
import { createFirstAdmin, type FirstAdminInput } from "@deessejs/admin";

export async function handleFirstAdmin(
  auth: Auth,
  request: Request
): Promise<NextResponse> {
  if (process.env["NODE_ENV"] === "production") {
    return NextResponse.json(
      { message: "First admin setup is only available in development mode" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { message: "Missing required fields: name, email, password" },
      { status: 400 }
    );
  }

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

### 2.4 Update default-pages.tsx

```typescript
// packages/admin-next/src/pages/default-pages.tsx
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

### 2.5 Update root-page.tsx

```typescript
// packages/admin-next/src/root-page.tsx
import { findPage, extractSlugParts, toSidebarItems, defaultPageStructure } from "@deessejs/admin";
import { SidebarItemsProvider } from "@deessejs/admin";
// ... other imports

// Import page components
import { HomePage } from "./components/pages/home-page";
// ... etc.

const pageComponents = {
  home: HomePage,
  users: UsersPage,
  database: DatabasePage,
  settings: SettingsPage,
  plugins: PluginsPage,
} as const;

export async function RootPage({ config, auth, params }: RootPageProps) {
  const slugParts = extractSlugParts(params);

  // ... session checks ...

  const allPages = [...defaultPageStructure, ...(config.pages ?? [])];
  const result = findPage(allPages, slugParts);

  if (!result) {
    return <NotFoundPage slug={slugParts.join("/")} />;
  }

  const sidebarItems = toSidebarItems(allPages);

  // Resolve content React component
  const ContentComponent = result.page.content
    ? pageComponents[result.page.content.type] // Simplified - actual implementation may differ
    : null;

  return (
    <SidebarItemsProvider items={sidebarItems}>
      <AdminDashboardLayout items={sidebarItems}>
        {/* ... first admin setup, etc. ... */}
        {ContentComponent && <ContentComponent />}
      </AdminDashboardLayout>
    </SidebarItemsProvider>
  );
}
```

## Step 3: Update `deesse` Package

### 3.1 Remove admin-specific code

- Delete `deesse/src/lib/admin.ts`
- Delete `deesse/src/lib/validation.ts`
- Delete `deesse/src/config/page.ts`
- Delete `deesse/src/config/define.ts`

### 3.2 Update config/index.ts

```typescript
// packages/deesse/src/config/index.ts
export { plugin } from "./plugin.js";
export type { Plugin } from "./plugin.js";
```

### 3.3 Update deesse/src/index.ts

```typescript
// packages/deesse/src/index.ts
// Core exports only - NO re-exports of admin utilities

export { createDeesse } from "./server.js";
export type { Deesse } from "./server.js";

export { createClient } from "./client.js";
export type { DeesseClient, DeesseClientOptions } from "./client.js";

export { plugin } from "./config/index.js";
export type { Plugin } from "./config/index.js";

export { z } from "zod";
export type { ZodSchema } from "zod";
```

### 3.4 Update deesse/package.json

```json
{
  "peerDependencies": {
    "better-auth": "^1.0.0",
    "next": ">=14",
    "react": ">=18"
  }
}
```

## Step 4: Delete old files

After creating the new packages:

1. Delete `packages/deesse/src/lib/` directory
2. Delete `packages/deesse/src/config/page.ts`
3. Delete `packages/deesse/src/config/define.ts`
4. Rename `packages/next` to `packages/admin-next` OR create fresh from new structure

## Verification Checklist

- [ ] `@deessejs/admin` builds successfully
- [ ] `@deessejs/admin-next` builds successfully
- [ ] `deesse` package builds successfully
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] No circular dependencies
- [ ] Package.json exports are correct
- [ ] README updated for new package structure