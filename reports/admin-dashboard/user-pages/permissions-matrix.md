# Permissions Matrix for Admin User Pages

## better-auth Default Permissions

From the admin plugin's access statements:

```typescript
const defaultStatements = {
  user: [
    "create", "list", "set-role", "ban", "impersonate",
    "impersonate-admins", "delete", "set-password", "get", "update"
  ],
  session: ["list", "revoke", "delete"],
} as const;

const adminAc = defaultAc.newRole({
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
});

const userAc = defaultAc.newRole({
  user: [],
  session: [],
});
```

## Permission-to-Feature Matrix

| Feature | Required Permission | Description |
|---------|-------------------|-------------|
| **View user list** | `user: ["list"]` | See all users in dashboard |
| **View user detail** | `user: ["get"]` | See individual user profile |
| **Create user** | `user: ["create"]` | Add new user accounts |
| **Edit user** | `user: ["update"]` | Modify user name, email |
| **Delete user** | `user: ["delete"]` | Remove user accounts |
| **Ban user** | `user: ["ban"]` | Temporarily disable account |
| **Unban user** | `user: ["ban"]` | Reactivate banned account |
| **Set user role** | `user: ["set-role"]` | Change user permissions |
| **Set user password** | `user: ["set-password"]` | Reset user password |
| **View user sessions** | `session: ["list"]` | See active sessions |
| **Revoke session** | `session: ["revoke"]` | Invalidate single session |
| **Revoke all sessions** | `session: ["delete"]` | Invalidate all sessions |
| **Impersonate user** | `user: ["impersonate"]` | Login as another user |
| **Impersonate admin** | `user: ["impersonate-admins"]` | Login as admin user |

## Role Definitions

```typescript
// roles.ts - Role definitions
export const roles = {
  admin: {
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
    session: ["list", "revoke", "delete"],
  },
  moderator: {
    user: ["list", "get", "ban", "update"],
    session: ["list"],
  },
  support: {
    user: ["list", "get", "set-password"],
    session: ["list", "revoke"],
  },
  user: {
    user: [],
    session: [],
  },
};
```

## Page Access Requirements

| Page | Min Permission | Notes |
|------|---------------|-------|
| `/admin/users` | `user: ["list"]` | Requires session + list permission |
| `/admin/users/new` | `user: ["create"]` | Requires session + create permission |
| `/admin/users/[id]` | `user: ["get"]` | Requires session + get permission |
| `/admin/users/[id]/edit` | `user: ["update"]` | Requires session + update permission |
| `/admin/users/[id]/sessions` | `session: ["list"]` | Requires session + list permission |
| `/admin/users/[id]/password` | `user: ["set-password"]` | Requires session + set-password permission |

## Component-Level Permission Guards

### Hiding Actions Based on Permissions

```typescript
// components/admin/users/user-row-actions.tsx
"use client";

import { hasPermission } from "better-auth/plugins/admin";

export function UserRowActions({ user, currentUserRole }: UserRowActionsProps) {
  return (
    <div className="flex gap-2">
      {/* Everyone with list permission can view */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/users/${user.id}`}>View</Link>
      </Button>

      {/* Update permission needed */}
      {hasPermission({ role: currentUserRole, permissions: { user: ["update"] } }) && (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/users/${user.id}/edit`}>Edit</Link>
        </Button>
      )}

      {/* Ban permission needed */}
      {hasPermission({ role: currentUserRole, permissions: { user: ["ban"] } }) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleBan(user.id)}
        >
          {user.banned ? "Unban" : "Ban"}
        </Button>
      )}

      {/* Delete permission needed */}
      {hasPermission({ role: currentUserRole, permissions: { user: ["delete"] } }) && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => confirmDelete(user.id)}
        >
          Delete
        </Button>
      )}
    </div>
  );
}
```

### Page-Level Permission Check

```typescript
// app/(deesse)/admin/users/[id]/page.tsx
import { redirect } from "next/navigation";
import { hasPermission } from "better-auth/plugins/admin";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  // Check permission
  if (!hasPermission({
    role: session.user.role,
    permissions: { user: ["get"] },
  })) {
    redirect("/admin/unauthorized");
  }

  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  return <UserDetail user={user} />;
}
```

### Server Action Permission Check

```typescript
// actions/admin/users.ts
"use server";

import { hasPermission } from "better-auth/plugins/admin";
import { auth } from "@/lib/deesse";

export async function deleteUser(userId: string) {
  const session = await auth.api.getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (!hasPermission({
    userId: session.user.id,
    role: session.user.role,
    permissions: { user: ["delete"] },
  })) {
    throw new Error("Forbidden: You don't have permission to delete users");
  }

  return auth.api.removeUser({ userId });
}
```

## AdminUserIds Bypass

Users in the `adminUserIds` array bypass ALL permission checks:

```typescript
// In AdminOptions
{
  adminUserIds: ["user-id-1", "user-id-2"],  // These users bypass permission checks
}
```

If a user ID is in `adminUserIds`, `hasPermission` returns `true` immediately without checking roles.

## Permission Check Flow

```
User requests /admin/users/[id]/edit
        │
        ▼
┌─────────────────────────┐
│ Check session exists?   │
│  └── No → redirect      │
│  └── Yes → continue     │
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│ Check adminUserIds      │
│  └── In list → ALLOW    │
│  └── Not in → continue  │
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│ Check role permissions  │
│  └── Has permission →   │
│      ALLOW              │
│  └── No permission →    │
│      FORBIDDEN          │
└─────────────────────────┘
```

## UI Behavior by Permission Level

| Role | Can View | Can Create | Can Edit | Can Delete | Can Ban | Can Manage Sessions |
|------|----------|------------|----------|------------|---------|---------------------|
| admin | Yes | Yes | Yes | Yes | Yes | Yes |
| moderator | Yes | No | Yes (own users) | No | Yes | View only |
| support | Yes | No | No | No | No | View + Revoke |
| user | No | No | No | No | No | No |

## Custom Role Configuration Example

```typescript
// For a "content moderator" role that can only manage users
const contentModeratorAc = defaultAc.newRole({
  user: ["list", "get"],
  session: ["list"],
});

// In AdminOptions
{
  roles: {
    admin: adminAc,
    contentModerator: contentModeratorAc,
    user: userAc,
  },
  defaultRole: "user",
}
```

This allows creating a role that can see user list and details but cannot make any changes.