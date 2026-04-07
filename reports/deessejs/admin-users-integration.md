# Admin Users Integration with better-auth

## Overview

The Users page in the DeesseJS admin dashboard uses better-auth's admin plugin API. Since better-auth is **API-only** for admin features (no built-in UI), we must build all React components ourselves.

---

## 1. better-auth Admin Capabilities

### What exists

| Feature | Status | API |
|---------|--------|-----|
| List users | ✅ | `auth.api.listUsers()` |
| Get user | ✅ | `auth.api.getUser()` |
| Create user | ✅ | `auth.api.createUser()` |
| Update user | ✅ | `auth.api.adminUpdateUser()` |
| Delete user | ✅ | `auth.api.removeUser()` |
| Ban user | ✅ | `auth.api.banUser()` |
| Unban user | ✅ | `auth.api.unbanUser()` |
| Set role | ✅ | `auth.api.setRole()` |
| Set password | ✅ | `auth.api.setUserPassword()` |
| List sessions | ✅ | `auth.api.listUserSessions()` |
| Revoke sessions | ✅ | `auth.api.revokeUserSession()` |

### What doesn't exist

- No React hooks for admin
- No admin UI components
- No pre-built admin pages

---

## 2. Client Setup

### Auth Client with Admin Plugin

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  plugins: [adminClient()],
});

// Typed exports
export const { admin } = authClient;
```

### Server-Side Admin Instance

```typescript
// lib/auth-server.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/drizzle-adapter";
import { admin } from "better-auth/plugins";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  plugins: [admin()],
});

// Admin API (server-only)
export const adminApi = auth.api;
```

---

## 3. User Types

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

## 4. Server Actions for Users

Since admin operations require authentication, we use Server Actions:

```typescript
// actions/admin/users.ts
"use server";

import { adminApi } from "@/lib/auth-server";
import type { ListUsersParams, UserWithRole } from "@/types/admin";

export async function listUsers(
  params: ListUsersParams = {}
): Promise<ListUsersResult> {
  return adminApi.listUsers(params);
}

export async function getUser(id: string): Promise<UserWithRole | null> {
  const result = await adminApi.getUser({ query: { id } });
  return result?.user || null;
}

export async function createUser(data: {
  email: string;
  password?: string;
  name: string;
  role?: string;
}): Promise<{ user: UserWithRole }> {
  return adminApi.createUser({
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
  return adminApi.adminUpdateUser({
    userId,
    data,
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return adminApi.removeUser({
    userId,
  });
}

export async function banUser(
  userId: string,
  reason?: string,
  expiresIn?: number
): Promise<{ user: UserWithRole }> {
  return adminApi.banUser({
    userId,
    banReason: reason,
    banExpiresIn: expiresIn,
  });
}

export async function unbanUser(userId: string): Promise<{ user: UserWithRole }> {
  return adminApi.unbanUser({
    userId,
  });
}

export async function setUserRole(
  userId: string,
  role: string | string[]
): Promise<void> {
  return adminApi.setRole({
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
  return adminApi.setUserPassword({
    userId,
    newPassword,
  });
}
```

---

## 5. React Components

### User Table

```typescript
// components/admin/users/user-table.tsx
"use client";

import { useState } from "react";
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
import { useRouter } from "next/navigation";
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

  const handleBan = () => {
    startTransition(async () => {
      await banUser(user.id);
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

### Role Select

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

### Ban Dialog

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
  onConfirm: () => void;
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
    // TODO: Pass reason and days to banUser
    onConfirm();
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

## 6. Users Page

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

## 7. Key Files

```
components/admin/users/
├── user-table.tsx      # Main table with pagination
├── user-row.tsx        # Row with actions
├── role-select.tsx     # Role dropdown
├── ban-dialog.tsx       # Ban confirmation dialog
└── delete-dialog.tsx   # Delete confirmation dialog

actions/admin/users.ts  # Server actions for all user operations
types/admin/user.ts     # TypeScript interfaces
```

---

## 8. Summary

| Component | Purpose | Complexity |
|-----------|---------|------------|
| `user-table.tsx` | Display users with pagination/search | Medium |
| `user-row.tsx` | Single row with action buttons | Low |
| `role-select.tsx` | Dropdown for role changes | Low |
| `ban-dialog.tsx` | Dialog for banning users | Medium |
| `delete-dialog.tsx` | Dialog for deleting users | Low |
| `actions/users.ts` | Server actions wrapping admin API | Low |

All components are **custom-built** because better-auth provides no admin UI components.
