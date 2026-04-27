# Admin Plugin & User Management

DeesseJS integrates better-auth's admin plugin to provide user management capabilities. Since better-auth is **API-only** for admin features (no built-in UI), all React components are custom-built.

---

## DeesseJS Integration

The admin plugin is enabled through DeesseJS's configuration:

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { admin } from "better-auth/plugins";

export const config = defineConfig({
  database: drizzle({ client: pool }),
  auth: {
    plugins: [admin()],
  },
});

export const deesse = getDeesse(config);

// Access admin API via deesse.auth.api
const { auth } = deesse;
const users = await auth.api.listUsers({});
```

---

## Admin Plugin Capabilities

### Available Features

| Feature | Status | API Method |
|---------|--------|------------|
| List users | Available | `auth.api.listUsers()` |
| Get user | Available | `auth.api.getUser()` |
| Create user | Available | `auth.api.createUser()` |
| Update user | Available | `auth.api.adminUpdateUser()` |
| Delete user | Available | `auth.api.removeUser()` |
| Ban user | Available | `auth.api.banUser()` |
| Unban user | Available | `auth.api.unbanUser()` |
| Set role | Available | `auth.api.setRole()` |
| Set password | Available | `auth.api.setUserPassword()` |
| List sessions | Available | `auth.api.listUserSessions()` |
| Revoke sessions | Available | `auth.api.revokeUserSession()` |

### Not Included

- No React hooks for admin operations
- No admin UI components
- No pre-built admin pages

---

## Client Setup

### Auth Client with Admin Plugin

```typescript
// lib/auth-client.ts
import { createClient } from "deesse";
import { adminClient } from "better-auth/client/plugins";

export const client = createClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  plugins: [adminClient()],
});
```

### Server-Side Admin Access

```typescript
// lib/deesse.ts
import { getDeesse } from "deesse";
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { drizzleAdapter } from "better-auth/drizzle-adapter";
import { admin } from "better-auth/plugins";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const config = defineConfig({
  database: drizzle({ client: pool }),
  auth: {
    plugins: [admin()],
  },
});

export const deesse = getDeesse(config);

// Admin API via deesse.auth.api
export const adminApi = deesse.auth.api;
```

---

## User Type Structure

```typescript
// types/admin/user.ts
export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role?: string;              // "admin" or "user,moderator"
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

---

## Server Actions for User Management

All admin operations require authentication and should be used within Server Actions:

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
```

---

## React Components for Admin UI

### User Table

```typescript
// components/admin/users/user-table.tsx
"use client";

import { useState, useEffect } from "react";
import { useTransition } from "react";
import { listUsers } from "@/actions/admin/users";
import type { UserWithRole, ListUsersParams } from "@/types/admin";
import { UserRow } from "./user-row";
import { UserPagination } from "./user-pagination";

export function UserTable() {
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState<ListUsersParams>({
    limit: 20,
    offset: 0,
  });

  const loadUsers = (newParams: ListUsersParams) => {
    startTransition(async () => {
      const result = await listUsers(newParams);
      setUsers(result.users);
      setTotal(result.total);
    });
  };

  // Initial load
  useEffect(() => {
    loadUsers(params);
  }, []);

  const handlePageChange = (offset: number) => {
    const newParams = { ...params, offset };
    setParams(newParams);
    loadUsers(newParams);
  };

  const handleSearch = (search: string) => {
    const newParams = { ...params, searchValue: search, offset: 0 };
    setParams(newParams);
    loadUsers(newParams);
  };

  return (
    <div className="space-y-4">
      <UserSearch onSearch={handleSearch} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onUpdate={() => loadUsers(params)}
            />
          ))}
        </TableBody>
      </Table>

      <UserPagination
        total={total}
        limit={params.limit || 20}
        offset={params.offset || 0}
        onChange={handlePageChange}
      />
    </div>
  );
}
```

### User Row with Actions

```typescript
// components/admin/users/user-row.tsx
"use client";

import { useState, useTransition } from "react";
import { deleteUser, banUser, unbanUser, setUserRole } from "@/actions/admin/users";
import type { UserWithRole } from "@/types/admin";
import { RoleSelect } from "./role-select";
import { BanDialog } from "./ban-dialog";
import { DeleteDialog } from "./delete-dialog";

export function UserRow({
  user,
  onUpdate,
}: {
  user: UserWithRole;
  onUpdate: () => void;
}) {
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      await setUserRole(user.id, newRole);
      onUpdate();
    });
  };

  const handleBan = (reason: string | undefined, banExpiresIn: number | undefined) => {
    startTransition(async () => {
      await banUser(user.id, reason, banExpiresIn);
      onUpdate();
    });
  };

  const handleUnban = () => {
    startTransition(async () => {
      await unbanUser(user.id);
      onUpdate();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteUser(user.id);
      onUpdate();
    });
  };

  return (
    <TableRow>
      <TableCell>{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <RoleSelect
          userId={user.id}
          currentRole={user.role || "user"}
          onChange={handleRoleChange}
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        {user.banned ? (
          <Badge variant="destructive">Banned</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}
      </TableCell>
      <TableCell>
        {new Date(user.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          {user.banned ? (
            <Button size="sm" variant="outline" onClick={handleUnban}>
              Unban
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBanDialog(true)}
            >
              Ban
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </Button>
        </div>

        <BanDialog
          open={showBanDialog}
          onClose={() => setShowBanDialog(false)}
          userId={user.id}
          onConfirm={handleBan}
        />

        <DeleteDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          userId={user.id}
          userName={user.name}
          onConfirm={handleDelete}
        />
      </TableCell>
    </TableRow>
  );
}
```

### Role Select Component

```typescript
// components/admin/users/role-select.tsx
"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
];

export function RoleSelect({
  userId,
  currentRole,
  onChange,
  disabled,
}: {
  userId: string;
  currentRole: string;
  onChange: (role: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Select
      value={currentRole.split(",")[0]}
      onValueChange={onChange}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Ban Dialog Component

```typescript
// components/admin/users/ban-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BanDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** Callback receives (reason: string | undefined, banExpiresIn: number | undefined) */
  onConfirm: (reason: string | undefined, banExpiresIn: number | undefined) => void;
}

export function BanDialog({
  open,
  onClose,
  userId,
  onConfirm,
}: BanDialogProps) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");

  const handleConfirm = () => {
    // Convert days to milliseconds, undefined for permanent (0)
    const banExpiresIn = days === "0"
      ? undefined
      : parseInt(days) * 24 * 60 * 60 * 1000;
    onConfirm(reason || undefined, banExpiresIn);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            This will prevent the user from accessing their account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="reason">Reason (optional)</label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Spam, abuse, etc."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="days">Ban Duration</label>
            <select
              id="days"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="365">1 year</option>
              <option value="0">Permanent</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Ban User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Admin Users Page

```typescript
// app/(deesse)/admin/users/page.tsx
import { listUsers } from "@/actions/admin/users";
import { UserTable } from "@/components/admin/users/user-table";

export default async function UsersPage() {
  const initialUsers = await listUsers({ limit: 20, offset: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

      <UserTable initialUsers={initialUsers} />
    </div>
  );
}
```

---

## File Structure

```
components/admin/users/
├── user-table.tsx      # Main table with pagination and search
├── user-row.tsx         # Row with action buttons
├── role-select.tsx      # Role dropdown component
├── ban-dialog.tsx       # Ban confirmation dialog
└── delete-dialog.tsx   # Delete confirmation dialog

actions/admin/users.ts   # Server actions wrapping admin API
types/admin/user.ts      # TypeScript interfaces
app/(deesse)/admin/users/page.tsx  # Admin users page
```

---

## Component Summary

| Component | Purpose | Complexity |
|-----------|---------|------------|
| `user-table.tsx` | Display users with pagination and search | Medium |
| `user-row.tsx` | Single row with action buttons | Low |
| `role-select.tsx` | Dropdown for role changes | Low |
| `ban-dialog.tsx` | Dialog for banning users with duration options | Medium |
| `delete-dialog.tsx` | Dialog for deleting users | Low |
| `actions/users.ts` | Server actions wrapping admin API | Low |

All UI components are **custom-built** because better-auth provides no admin UI components out of the box.
