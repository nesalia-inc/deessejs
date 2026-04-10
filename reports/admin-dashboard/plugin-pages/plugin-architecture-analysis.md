# Plugin Architecture Analysis

## Current Plugin System

### Deesse Plugin Type

**Location:** `packages/deesse/src/config/plugin.ts`

The deesse `Plugin` type is minimal:
```typescript
type Plugin = { name: string };
```

This is currently just a marker interface with no functionality.

### Better-Auth Plugin Type

**Location:** `temp/better-auth/packages/core/src/types/plugin.ts`

Better-Auth's `BetterAuthPlugin` is much richer:

```typescript
type BetterAuthPlugin = {
  id: LiteralString;
  init?: (ctx: AuthContext) => Awaited<{ context?, options? }>;
  endpoints?: { [key: string]: Endpoint };
  middlewares?: { path: string; middleware: Middleware }[];
  hooks?: { before?: Hook[]; after?: Hook[] };
  schema?: BetterAuthPluginDBSchema;
  options?: Record<string, any>;
  // ... other fields
};
```

**Key capabilities:**
- `endpoints`: Define API endpoints (like `/admin/list-users`)
- `schema`: Add database tables/fields
- `hooks`: Add lifecycle callbacks
- `middlewares`: Add route middleware

## Current Config Integration

**Location:** `packages/deesse/src/config/define.ts`

```typescript
export function defineConfig(config: Config): InternalConfig {
  const authPlugins: BetterAuthPlugin[] = [admin()];

  return {
    ...config,
    auth: { ...config.auth, plugins: authPlugins },
  } as InternalConfig;
}
```

**Key observations:**
1. The admin plugin is **always included** - user cannot remove it
2. Plugins contribute **endpoints and schema**, but **NOT pages**
3. Pages come entirely from `config.pages` which is user-defined

## How Plugins Could Contribute Pages

### The Gap

Currently, if you want to add user management pages, you must:
1. Define them yourself in `deesse.pages.tsx`
2. Create the components yourself
3. Make auth requests yourself (via `deesseAuth.api.*`)

There's no way for a plugin to contribute:
- Page definitions (name, slug, icon)
- Page content (React components)
- Integrated auth (pages that already use `auth.api.*`)

### What a Plugin Page Contribution Would Look Like

```typescript
// Hypothetical: what a plugin could export
type PluginPageContribution = {
  pages: PageTree[];
  clientComponents?: Record<string, React.ComponentType>;
};

// In admin plugin
export function getAdminPluginPages(): PageTree[] {
  return [
    page({
      name: "Users",
      slug: "users",
      content: <UsersPage />,  // Pre-built component
    }),
  ];
}
```

## Comparison: Current vs Plugin-Based Pages

### Current Approach (User-Defined)

```typescript
// deesse.pages.tsx
import { page, section } from "deesse";
import { Users, Settings } from "lucide-react";
import { UsersPage } from "@/components/admin/users-page";
import { SettingsPage } from "@/components/admin/settings-page";

export const deessePages = [
  page({
    name: "Users",
    slug: "users",
    icon: Users,
    content: <UsersPage />,  // User creates this
  }),
];
```

### Plugin Approach (Plugin-Provided)

```typescript
// better-auth plugin exports pages
export function getAdminPages() {
  return [
    page({
      name: "Users",
      slug: "users",
      icon: Shield,
      content: <AdminUsersPage />,  // Plugin provides this
    }),
  ];
}
```

## Merging Strategy Options

### Option 1: Automatic Merge in defineConfig

```typescript
export function defineConfig(config: Config): InternalConfig {
  const authPlugins: BetterAuthPlugin[] = [admin()];

  // Collect pages from all plugins that implement getPages
  const pluginPages = authPlugins.flatMap((plugin) => {
    if ("getPages" in plugin && typeof plugin.getPages === "function") {
      return plugin.getPages();
    }
    return [];
  });

  return {
    ...config,
    pages: [...pluginPages, ...(config.pages ?? [])],  // Plugin pages first
    auth: { ...config.auth, plugins: authPlugins },
  } as InternalConfig;
}
```

### Option 2: Manual Merge by User

```typescript
// deesse.pages.tsx
import { getPluginPages } from "better-auth/plugins";
import { page } from "deesse";

export const deessePages = [
  ...getPluginPages(),  // Include plugin pages
  page({ name: "Custom", slug: "custom", content: <CustomPage /> }),
];
```

**Option 1 pros:** Less work for user, automatic inclusion
**Option 1 cons:** Less control, potential conflicts

**Option 2 pros:** User controls page order and inclusion
**Option 2 cons:** User must remember to include plugin pages

## Plugin Page Content Access

### The Auth Access Problem

Plugin pages need access to `auth` to make API calls like:
- `auth.api.listUsers()`
- `auth.api.banUser()`
- etc.

But currently:
1. `RootPage` fetches session for route protection
2. `RootPage` renders page content with **no props passed**

```typescript
// Current RootPage render
return <>{result.page.content}</>;  // No auth passed!
```

### Solution: Page Content as Function

Change page content to support being a function that receives context:

```typescript
type PageContent =
  | ReactNode                    // Current: static content
  | ((context: PageContext) => Promise<ReactNode>);  // New: async function

type PageContext = {
  session: Session;
  auth: Auth;
};

type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: PageContent;
};
```

## Example: Admin Plugin Contributing Pages

```typescript
// In better-auth's admin plugin
export function getAdminPages() {
  return [
    page({
      name: "Users",
      slug: "users",
      icon: Users,
      content: async ({ session, auth }) => {
        "use server";
        // Server-side: can use auth.api.listUsers() directly
        const { users } = await auth.api.listUsers({ limit: 10 });
        return <UserListPage users={users} />;
      },
    }),
    page({
      name: "Create User",
      slug: "users/create",
      icon: UserPlus,
      content: async ({ session, auth }) => {
        "use server";
        return <CreateUserPage />;
      },
    }),
  ];
}
```

## Summary

| Aspect | Current | With Plugin Pages |
|--------|---------|-------------------|
| Pages source | User-defined only | User + Plugin |
| Page content | Static ReactNode | Static or async function |
| Auth access | Manual by user | Automatic via context |
| Plugin contribution | Endpoints/Schema | Pages + Content |

The plugin system could be extended to support pages, but requires:
1. Adding `getPages()` to plugin interface
2. Modifying `Page.content` to support async functions
3. Updating `RootPage` to pass auth context to pages