# Users Pages Implementation Analysis

## Overview

This report analyzes how to create a Users management page for the DeesseJS admin dashboard, analogous to the existing Table View pages (`/admin/database` and `/admin/database/[table_slug]`). The analysis is based on the better-auth admin plugin API and the current implementation patterns in the codebase.

## Key Finding: Client-Side is the Right Approach

Unlike the Table pages (which use server-side SQL queries to `information_schema`), Users pages should use **client-side data fetching** with `authClient.admin.*` methods. This is:

1. **Secured by design** - better-auth's admin middleware validates session + admin role on every request
2. **Simpler** - No need for REST API proxies, better-auth handles everything
3. **React-ish** - Uses hooks (`useQuery`, `useMutation`) which is idiomatic for TanStack Query

## Better-Auth Client Architecture

### Client Setup

From `better-auth.com/docs/concepts/client`:

```typescript
// React
import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"  // [!code highlight]

const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [adminClient()]  // [!code highlight]
})
```

### DeesseJS Server Pattern: Default Config + User Config Merge

The server (`packages/deesse/src/config/define.ts`) follows a pattern where:

1. **Default config** is defined with sensible defaults
2. **User config** is merged on top, with user values overriding defaults
3. **Deep merge** for nested objects, **array concatenation** for plugins

```typescript
// Server default config (simplified)
const defaultAuth = {
  plugins: [admin()],                    // admin() is ALWAYS first
  emailAndPassword: { enabled: true },
  session: { maxAge: 60 * 60 * 24 * 7 }, // 7 days
  trustedOrigins: [config.auth.baseURL],
};

// User merges on top
const mergedAuth = {
  baseURL: config.auth.baseURL,           // Required
  secret: config.secret,                   // Required
  plugins: [...defaultAuth.plugins, ...(config.auth.plugins || [])], // Concat
  emailAndPassword: deepMerge(defaultAuth.emailAndPassword, config.auth.emailAndPassword || {}),
  session: deepMerge(defaultAuth.session, config.auth.session || {}),
  trustedOrigins: config.auth.trustedOrigins || defaultAuth.trustedOrigins,
};
```

### DeesseJS Client: Should Follow Same Pattern

**Current state:**
```typescript
export function createClient(options: DeesseClientOptions) {
  return { auth: createAuthClient(options.auth) };
}
```

**Problem:** No default config, no merging, user must manually add `adminClient()`.

**Proposed fix - Follow server pattern:**

```typescript
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import type { BetterAuthClientOptions } from "better-auth/client";

export interface DeesseClientOptions {
  baseURL: string;
  plugins?: BetterAuthClientOptions["plugins"];
  sessionOptions?: BetterAuthClientOptions["sessionOptions"];
}

// Default client config
const defaultClientConfig = {
  plugins: [adminClient()] as BetterAuthClientOptions["plugins"],
};

export function createClient(options: DeesseClientOptions) {
  // Merge user config with defaults
  const mergedPlugins = [
    ...defaultClientConfig.plugins,
    ...(options.plugins || []),
  ];

  return {
    auth: createAuthClient({
      baseURL: options.baseURL,
      plugins: mergedPlugins,
      sessionOptions: options.sessionOptions,
    }),
  };
}
```

**Key principles:**
1. `adminClient()` is always included by default (like `admin()` on server)
2. User can add additional plugins via `plugins` array
3. `sessionOptions` are optional and merged if provided
4. `baseURL` is required (no global default on client)

Better-auth uses declaration merging to provide typed `authClient.admin.*` methods - no manual type definitions needed.

## Better-Auth Admin Plugin API

### Admin API Methods (Client-Side)

From `better-auth.com/docs/plugins/admin`:

```typescript
// List Users
const { data: users, error } = await authClient.admin.listUsers({
  query: {
    searchValue: "some name",
    searchField: "name",
    searchOperator: "contains",
    limit: 100,
    offset: 0,
    sortBy: "name",
    sortDirection: "desc",
    filterField: "email",
    filterValue: "hello@example.com",
    filterOperator: "eq",
  },
});
// Returns: { users: User[], total: number, limit?: number, offset?: number }

// Get User
const { data } = await authClient.admin.getUser({
  query: { id: "user-id" },
});

// Create User
const { data: newUser } = await authClient.admin.createUser({
  email: "user@example.com",
  password: "secure-password",
  name: "James Smith",
  role: "user",
  data: { customField: "customValue" },
});

// Update User
const { data } = await authClient.admin.updateUser({
  userId: "user-id",
  data: { name: "John Doe" },
});

// Set Role
const { data } = await authClient.admin.setRole({
  userId: "user-id",
  role: "admin",
});

// Set Password
const { data } = await authClient.admin.setUserPassword({
  newPassword: 'new-password',
  userId: 'user-id',
});

// Ban User
await authClient.admin.banUser({
  userId: "user-id",
  banReason: "Spamming",
  banExpiresIn: 60 * 60 * 24 * 7, // seconds
});

// Unban User
await authClient.admin.unbanUser({
  userId: "user-id",
});

// List User Sessions
const { data } = await authClient.admin.listUserSessions({
  userId: "user-id",
});

// Revoke Session
await authClient.admin.revokeUserSession({
  sessionToken: "session_token_here",
});

// Revoke All Sessions
await authClient.admin.revokeUserSessions({
  userId: "user-id",
});

// Impersonate User
const { data } = await authClient.admin.impersonateUser({
  userId: "user-id",
});

// Stop Impersonating
await authClient.admin.stopImpersonating();

// Remove User (Hard Delete)
const { data } = await authClient.admin.removeUser({
  userId: "user-id",
});

// Check Permissions
const { data } = await authClient.admin.hasPermission({
  userId: "user-id",
  permission: { "project": ["create", "update"] },
});

const canDelete = authClient.admin.checkRolePermission({
  permissions: { user: ["delete"] },
  role: "admin",
});
```

### User Type

```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Admin plugin fields:
  role?: string;           // Default: "user", admin roles: "admin"
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
}
```

## Recommended Architecture

### Stack

- **TanStack Query** (`@tanstack/react-query`) - Data fetching, caching, pagination state
- **TanStack Table** (`@tanstack/react-table`) - Table UI with sorting, filtering
- **better-auth client** - Already provides typed auth client with admin plugin

### Component Structure

```
packages/next/src/components/pages/
├── users-list-page.tsx       # Main list page (client component)
├── user-detail-page.tsx      # User detail/edit (client component)
└── user-form.tsx            # Create/Edit user form
```

### UsersListPage (Client Component with TanStack Query + Table)

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { createClient } from "deesse";

const authClient = createClient({ auth: { baseURL: "/api/auth" } });

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue() ?? "-",
  }),
  columnHelper.accessor("role", {
    header: "Role",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("banned", {
    header: "Status",
    cell: (info) => info.getValue() ? "Banned" : "Active",
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.display({
    id: "actions",
    cell: (props) => (
      <UserActions userId={props.row.original.id} />
    ),
  }),
];

export const UsersListPage = () => {
  const queryClient = useQueryClient();

  // Fetch users with TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", page, pageSize, search, sortBy, sortDir],
    queryFn: () =>
      authClient.admin.listUsers({
        query: {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          searchValue: search || undefined,
          sortBy: sortBy || undefined,
          sortDirection: sortDir || "desc",
        },
      }),
  });

  // Ban/Unban mutation
  const banMutation = useMutation({
    mutationFn: ({ userId, ban }) =>
      ban
        ? authClient.admin.banUser({ userId, banReason: "Admin action" })
        : authClient.admin.unbanUser({ userId }),
    onSuccess: () => queryClient.invalidateQueries(["admin", "users"]),
  });

  const table = useReactTable({
    data: data?.users ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount: Math.ceil((data?.total ?? 0) / pageSize),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Users</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          Create User
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center gap-4">
        <span>
          Showing {data?.offset ?? 0} to {(data?.offset ?? 0) + (data?.users?.length ?? 0)} of {data?.total}
        </span>
        <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
};
```

### UserDetailPage

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "deesse";

const authClient = createClient({ auth: { baseURL: "/api/auth" } });

export const UserDetailPage = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => authClient.admin.getUser({ query: { id: userId } }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<User>) =>
      authClient.admin.updateUser({ userId, data }),
    onSuccess: () => queryClient.invalidateQueries(["admin", "user", userId]),
  });

  const banMutation = useMutation({
    mutationFn: (ban: boolean) =>
      ban
        ? authClient.admin.banUser({ userId, banReason: "Admin action" })
        : authClient.admin.unbanUser({ userId }),
    onSuccess: () => queryClient.invalidateQueries(["admin", "user", userId]),
  });

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1>{user.name ?? user.email}</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      <div className="grid gap-4">
        <div>
          <label>Role</label>
          <select
            value={user.role}
            onChange={(e) => updateMutation.mutate({ role: e.target.value })}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label>Status</label>
          <span>{user.banned ? "Banned" : "Active"}</span>
          <Button
            variant={user.banned ? "default" : "destructive"}
            onClick={() => banMutation.mutate(!user.banned)}
          >
            {user.banned ? "Unban" : "Ban"}
          </Button>
        </div>

        <div>
          <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
          <p>Email Verified: {user.emailVerified ? "Yes" : "No"}</p>
        </div>
      </div>

      {/* Sessions */}
      <UserSessions userId={userId} />
    </div>
  );
};
```

## Updated Route Definitions

```typescript
// In default-pages.tsx
section({
  name: "Users",
  slug: "users",
  children: [
    page({
      name: "List",
      slug: "",
      icon: Users,
      content: <UsersListPage />,
    }),
    dynamicPage({
      name: "User Detail",
      slug: "[user_id]",
      icon: User,
      content: (params) => <UserDetailPage userId={params["user_id"]} />,
    }),
  ],
}),
```

## Security

All admin endpoints are secured by better-auth's `adminMiddleware`:

1. **Session validation** - Must have valid session cookie
2. **Role check** - User must have admin role (or be in `adminUserIds`)
3. **Self-protection** - Cannot ban/delete your own account

No additional security measures needed.

## Comparison with Table Pages

| Aspect | Table Pages | Users Pages |
|--------|-------------|-------------|
| Data Fetching | Server Component (SQL) | Client Component (TanStack Query) |
| Endpoint | `information_schema` | `authClient.admin.*` |
| Security | Manual whitelist | Built-in (admin middleware) |
| Actions | None (read-only) | Full CRUD + Ban/Unban/Delete |
| Schema | Dynamic from DB | Fixed User interface |

## Dependencies to Add

```json
{
  "@tanstack/react-query": "^5.x",
  "@tanstack/react-table": "^8.x"
}
```

## Files to Create/Modify

**New Files:**
- `packages/next/src/components/pages/users-list-page.tsx`
- `packages/next/src/components/pages/user-detail-page.tsx`
- `packages/next/src/components/pages/user-sessions.tsx` (optional)
- `packages/next/src/components/pages/user-form.tsx` (optional)

**Modified Files:**
- `packages/deesse/src/client.ts` - Add `adminClient()` plugin
- `packages/next/src/pages/default-pages.tsx` - Add `[user_id]` dynamic route
- `packages/next/src/components/pages/users-page.tsx` - Remove stub
