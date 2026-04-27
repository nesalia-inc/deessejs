# Implementation Proposal: Plugin Pages System

## Overview

This proposal outlines how plugins like better-auth's admin plugin could contribute pages to the deesse admin dashboard. The key changes needed are:

1. **Extend the Plugin interface** to support `getPages()`
2. **Modify `Page.content`** to support async functions receiving auth context
3. **Update `RootPage`** to handle async page content
4. **Update `defineConfig`** to merge plugin pages

---

## Change 1: Extend Plugin Interface

**File:** `packages/deesse/src/config/plugin.ts`

```typescript
import type { PageTree } from "./page";

type Plugin = {
  name: string;
  // New: allow plugins to contribute pages
  getPages?: () => PageTree[];
};
```

---

## Change 2: Modify Page.content Type

**File:** `packages/deesse/src/config/page.ts`

```typescript
import type { Session, Auth } from "better-auth";

type PageContext = {
  session: Session;
  auth: Auth;
};

type PageContent =
  | ReactNode                                          // Static content (current)
  | null                                               // Empty page
  | ((context: PageContext) => Promise<ReactNode>)    // Async server content (new)
  | ((context: PageContext) => ReactNode);            // Sync server content (new)

type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: PageContent;
};
```

---

## Change 3: Update RootPage to Handle Async Content

**File:** `packages/next/src/root-page.tsx`

```typescript
// Before (line ~72)
return <>{result.page.content}</>;

// After
const content = result.page.content;

if (typeof content === "function") {
  // Async or sync function that receives auth context
  const pageContent = await content({ session, auth });
  return <>{pageContent}</>;
}

return <>{content}</>;
```

**Full context in RootPage:**
```typescript
export async function RootPage({ config, auth, params, searchParams }) {
  const resolvedParams = await params;
  const slugParts = resolvedParams.slug ?? [];

  // 1. Check if database has users
  const usersExist = await checkUsersExist(config);
  if (!usersExist) {
    return <FirstAdminSetup auth={auth} config={config} />;
  }

  // 2. Server-side session check - session is now available
  const session = await (auth.api as any).getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/admin/login");
  }

  // 3. Find page
  const result = findPage(config.pages, slugParts);
  if (!result) {
    notFound();
  }

  // 4. Render content (now supporting async functions)
  const content = result.page.content;

  if (typeof content === "function") {
    const pageContent = await content({ session, auth });
    return <>{pageContent}</>;
  }

  return <>{content}</>;
}
```

---

## Change 4: Update defineConfig to Merge Plugin Pages

**File:** `packages/deesse/src/config/define.ts`

```typescript
export function defineConfig(config: Config): InternalConfig {
  const authPlugins: BetterAuthPlugin[] = [admin()];

  // Collect pages from plugins that implement getPages
  const pluginPages = authPlugins.flatMap((plugin) => {
    if ("getPages" in plugin && typeof plugin.getPages === "function") {
      return plugin.getPages();
    }
    return [];
  });

  return {
    ...config,
    // Merge plugin pages first, user pages second (user can override)
    pages: [...pluginPages, ...(config.pages ?? [])],
    auth: { ...config.auth, plugins: authPlugins },
  } as InternalConfig;
}
```

---

## Example: Admin Plugin Providing Pages

**In better-auth's admin plugin:**

```typescript
// packages/better-auth/src/plugins/admin/pages.ts

import { page, section } from "deesse";
import { Users, UserPlus, Shield, Sessions } from "lucide-react";
import { UserListPage } from "./client/user-list-page";
import { UserDetailPage } from "./client/user-detail-page";
import { CreateUserPage } from "./client/create-user-page";

export function getAdminPages(): PageTree[] {
  return [
    section({
      name: "Users",
      slug: "users",
      icon: Users,
      children: [
        page({
          name: "All Users",
          slug: "users",
          icon: Users,
          content: async ({ session, auth }) => {
            "use server";

            // Server-side data fetching
            const { users, total } = await auth.api.listUsers({
              limit: 20,
              offset: 0,
            });

            // Permission check
            const canCreate = hasPermission({
              role: session.user.role,
              permissions: { user: ["create"] },
            });

            return (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold">Users ({total})</h1>
                  {canCreate && (
                    <Button asChild>
                      <Link href="/admin/users/new">Add User</Link>
                    </Button>
                  )}
                </div>
                <UserListPage initialUsers={users} />
              </div>
            );
          },
        }),
        page({
          name: "Create User",
          slug: "users/new",
          icon: UserPlus,
          content: async ({ session, auth }) => {
            "use server";

            // Check permission
            const canCreate = hasPermission({
              role: session.user.role,
              permissions: { user: ["create"] },
            });

            if (!canCreate) {
              redirect("/admin/unauthorized");
            }

            return <CreateUserPage />;
          },
        }),
        page({
          name: "User Detail",
          slug: "users/[id]",
          icon: Shield,
          content: async ({ session, auth }) => {
            "use server";

            // This page receives [id] as slug segment
            // We need to extract it from params (handled separately)
            return <UserDetailPage />;
          },
        }),
        page({
          name: "Sessions",
          slug: "users/[id]/sessions",
          icon: Sessions,
          content: async ({ session, auth }) => {
            "use server";

            return <UserSessionsPage />;
          },
        }),
      ],
    }),
  ];
}
```

**Plugin registers getPages:**

```typescript
// In admin plugin definition
export const admin = (): BetterAuthPlugin => ({
  id: "admin",
  // ... existing endpoints, hooks, etc.

  // NEW: contribute pages
  getPages,
});
```

---

## User Override Example

User can still override plugin pages:

```typescript
// deesse.pages.tsx
import { getPluginPages } from "better-auth/plugins";
import { page } from "deesse";

export const deessePages = [
  ...getPluginPages(),  // Include plugin pages

  // Override the users page with custom content
  page({
    name: "All Users",  // Same name/slug as plugin page
    slug: "users",
    content: <CustomUserListPage />,  // User's custom implementation
  }),

  // Add custom pages
  page({
    name: "Analytics",
    slug: "analytics",
    content: <AnalyticsPage />,
  }),
];
```

---

## Client Components in Plugin Pages

Plugin pages can render Client Components:

```typescript
// Server-side async content
async ({ session, auth }) => {
  "use server";

  const { users } = await auth.api.listUsers({ limit: 10 });

  // Client component receives serializable props
  return (
    <UserTable
      initialUsers={users}
      sessionRole={session.user.role}
    />
  );
}
```

```typescript
// Client Component
"use client";

export function UserTable({ initialUsers, sessionRole }) {
  const [users, setUsers] = useState(initialUsers);

  const canBan = hasPermission({
    role: sessionRole,
    permissions: { user: ["ban"] },
  });

  return (
    <Table>
      {/* ... table content */}
      {canBan && <BanButton />}
    </Table>
  );
}
```

---

## TypeScript Types

```typescript
// packages/deesse/src/config/page.ts
import type { ReactNode } from "react";
import type { Session, Auth } from "better-auth";
import type { LucideIcon } from "lucide-react";

export type PageContext = {
  session: Session;
  auth: Auth;
};

export type PageContent =
  | ReactNode
  | null
  | ((context: PageContext) => Promise<ReactNode>)
  | ((context: PageContext) => ReactNode);

export type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: PageContent;
};

export type Section = {
  type: "section";
  name: string;
  slug: string;
  bottom?: boolean;
  children: PageTree[];
};

export type PageTree = Page | Section;
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `packages/deesse/src/config/plugin.ts` | Add optional `getPages()` to Plugin type |
| `packages/deesse/src/config/page.ts` | Add `PageContext` type, support function in `PageContent` |
| `packages/next/src/root-page.tsx` | Await and call async page content with session/auth |
| `packages/deesse/src/config/define.ts` | Merge plugin pages into config.pages |

---

## Benefits

1. **Plugin-provided pages** - Admin plugin can provide full user management UI
2. **Server-side data fetching** - Pages can use `auth.api.*` directly
3. **Type safety** - Full TypeScript support with `PageContext` types
4. **Backward compatible** - Static content still works
5. **User override** - Users can override plugin pages with custom implementations