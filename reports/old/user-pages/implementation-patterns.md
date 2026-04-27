# Implementation Patterns for Admin User Pages

## Using better-auth's adminClient

### Client Setup

```typescript
// lib/client.ts
import { createClient } from "deesse";
import { adminClient } from "better-auth/client/plugins";

export const client = createClient({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    plugins: [adminClient()],
  },
});

// Access admin operations via client.auth.admin
// Example: client.auth.admin.listUsers()
```

### Query Types

```typescript
// types/admin/user.ts
export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role?: string;
  emailVerified: boolean;
  banned: boolean;
  banReason?: string;
  banExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ListUsersParams {
  searchValue?: string;
  searchField?: "email" | "name";
  searchOperator?: "contains" | "starts_with" | "ends_with";
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filterField?: string;
  filterValue?: unknown;
  filterOperator?: string;
}

export interface ListUsersResult {
  users: UserWithRole[];
  total: number;
  limit?: number;
  offset?: number;
}
```

## Server Actions for User Management

```typescript
// actions/admin/users.ts
"use server";

import { deesse } from "@/lib/deesse";
import type { ListUsersParams, UserWithRole } from "@/types/admin";

const { auth } = deesse;

export async function listUsers(
  params: ListUsersParams = {}
): Promise<ListUsersResult> {
  return auth.api.listUsers(params);
}

export async function getUser(id: string): Promise<UserWithRole | null> {
  const result = await auth.api.getUser({ query: { id } });
  return result?.user || null;
}

export async function createUser(data: {
  email: string;
  password?: string;
  name: string;
  role?: string;
}): Promise<{ user: UserWithRole }> {
  return auth.api.createUser({
    body: {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role || "user",
    },
  });
}

export async function updateUser(
  userId: string,
  data: Partial<{
    name: string;
    email: string;
    role: string;
  }>
): Promise<{ user: UserWithRole }> {
  return auth.api.adminUpdateUser({
    userId,
    data,
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return auth.api.removeUser({
    userId,
  });
}

export async function banUser(
  userId: string,
  reason?: string,
  expiresIn?: number
): Promise<{ user: UserWithRole }> {
  return auth.api.banUser({
    userId,
    banReason: reason,
    banExpiresIn: expiresIn,
  });
}

export async function unbanUser(userId: string): Promise<{ user: UserWithRole }> {
  return auth.api.unbanUser({
    userId,
  });
}

export async function setUserRole(
  userId: string,
  role: string | string[]
): Promise<void> {
  return auth.api.setRole({
    body: {
      userId,
      role: Array.isArray(role) ? role.join(",") : role,
    },
  });
}

export async function setUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  return auth.api.setUserPassword({
    userId,
    newPassword,
  });
}

export async function listUserSessions(
  userId: string
): Promise<{ sessions: Session[] }> {
  return auth.api.listUserSessions({
    body: { userId },
  });
}

export async function revokeUserSession(
  userId: string,
  sessionId: string
): Promise<void> {
  return auth.api.revokeUserSession({
    body: { userId, sessionId },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  return auth.api.revokeUserSessions({
    body: { userId },
  });
}
```

## Pagination Strategies

### Offset-Based Pagination

better-auth's `listUsers` uses offset-based pagination:

```typescript
// Simple offset pagination
const result = await listUsers({
  limit: 20,
  offset: 0,
});

// For infinite scroll or load more
const loadMore = async () => {
  const next = await listUsers({
    limit: 20,
    offset: currentOffset + 20,
  });
  setUsers([...users, ...next.users]);
};
```

### Pagination Component

```typescript
// components/admin/users/pagination.tsx
"use client";

import { Button } from "@deessejs/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
      </span>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <span className="flex items-center px-2">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(offset + limit)}
          disabled={offset + limit >= total}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
```

## Optimistic Updates

```typescript
// components/admin/users/user-row.tsx
"use client";

export function UserRow({ user, onUpdate }: { user: UserWithRole; onUpdate: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticUser, setOptimisticUser] = useState(user);

  const handleBan = () => {
    // Optimistic update
    setOptimisticUser(prev => ({ ...prev, banned: true }));

    startTransition(async () => {
      try {
        await banUser(user.id);
        onUpdate(); // Refresh from server
      } catch {
        // Revert on error
        setOptimisticUser(user);
      }
    });
  };

  return (
    <TableRow>
      <TableCell>{optimisticUser.name}</TableCell>
      <TableCell>{optimisticUser.email}</TableCell>
      <TableCell>
        <Badge variant={optimisticUser.banned ? "destructive" : "success"}>
          {optimisticUser.banned ? "Banned" : "Active"}
        </Badge>
      </TableCell>
      <TableCell>
        <Button onClick={handleBan} disabled={isPending}>
          {optimisticUser.banned ? "Unban" : "Ban"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
```

## Error Handling

```typescript
// Error handling in server actions
export async function banUser(userId: string, reason?: string): Promise<{ user: UserWithRole }> {
  try {
    return await auth.api.banUser({
      userId,
      banReason: reason,
    });
  } catch (error) {
    // Log for debugging
    console.error("Ban user failed:", error);

    // Throw user-friendly error
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to ban user. Please try again."
    );
  }
}

// In component
const handleBan = async () => {
  try {
    await banUser(userId);
  } catch (error) {
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to ban user",
      variant: "destructive",
    });
  }
};
```

## Integration with Admin Layout

```typescript
// Using page() with AdminShell integration
import { AdminShell } from "@deessejs/next/admin-shell";
import { Users, Plus } from "lucide-react";

const UsersPageContent = () => {
  // ... user table implementation
};

export const UsersPage = page({
  name: "Users",
  slug: "users",
  icon: Users,
  content: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="size-4 mr-2" />
            Add User
          </Link>
        </Button>
      </div>
      <UsersTable />
    </div>
  ),
});
```

## Client-Side Permission Checking

```typescript
// components/admin/users/users-page.tsx
"use client";

import { client } from "@/lib/client";
import { redirect } from "next/navigation";

export function UsersPage() {
  const { data: session, isPending } = client.auth.useSession();

  if (isPending) {
    return <LoadingSkeleton />;
  }

  if (!session) {
    redirect("/admin/login");
  }

  // Check permission using adminClient
  const canListUsers = client.auth.admin.hasPermission({
    permissions: { user: ["list"] },
  });

  if (!canListUsers) {
    return <PermissionDenied />;
  }

  return <UsersTable />;
}
```

## Search and Filter Implementation

```typescript
// components/admin/users/user-table.tsx
"use client";

export function UserTable() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");

  const { data, isPending, refetch } = useQuery({
    queryKey: ["users", search, roleFilter, statusFilter],
    queryFn: () => listUsers({
      searchValue: search,
      filterField: roleFilter ? "role" : undefined,
      filterValue: roleFilter,
    }),
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      refetch();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={roleFilter ?? ""} onValueChange={setRoleFilter}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </Select>
      </div>

      <Table>
        {/* ... table content */}
      </Table>
    </div>
  );
}
```

## Data Table Skeleton

```typescript
// components/admin/users/user-table-skeleton.tsx
export function UserTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>

      <div className="border rounded-lg">
        <div className="border-b px-4 py-3">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3">
            <div className="flex gap-4 items-center">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Skeleton className="h-4 w-[200px]" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}
```