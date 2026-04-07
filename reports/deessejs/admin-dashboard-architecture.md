# Admin Dashboard Architecture

## Overview

The DeesseJS admin dashboard provides two main pages:
1. **Users Page** - User management via better-auth admin API
2. **Database Page** - Database schema introspection via drizzle-orm

Unlike Payload CMS which has a full admin UI system, DeesseJS builds its dashboard using better-auth's API (API-only) for users and drizzle-orm's introspection for database.

---

## Architecture Comparison

### Payload CMS (Full Admin System)

```
Payload Admin Shell
├── DefaultTemplate (full navigation)
│   ├── AppHeader
│   ├── Nav (sidebar)
│   └── {view} (List, Edit, Document)
└── MinimalTemplate (auth pages)
```

### DeesseJS (Slim Admin)

```
DeesseJS Admin Shell
├── AppSidebar (from @deessejs/next)
│   ├── Users section
│   └── Database section
└── {page} (UsersPage, DatabasePage)
```

---

## 1. Users Page

### Data Source

**better-auth Admin API** provides:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/list-users` | GET | List users with pagination, search |
| `/admin/get-user` | GET | Get single user |
| `/admin/create-user` | POST | Create user |
| `/admin/update-user` | POST | Update user |
| `/admin/set-role` | POST | Change role |
| `/admin/ban-user` | POST | Ban user |
| `/admin/unban-user` | POST | Unban user |
| `/admin/remove-user` | POST | Delete user |
| `/admin/set-user-password` | POST | Set password |

### Client API

```typescript
// Using better-auth's admin client
const client = createAuthClient({
  plugins: [adminClient()],
});

// List users
const { users, total } = await client.admin.listUsers({
  searchValue: "admin",
  searchField: "email",
  searchOperator: "contains",
  limit: 10,
  offset: 0,
});

// Create user
await client.admin.createUser({
  email: "user@example.com",
  password: "password",
  name: "User Name",
  role: "admin",
});

// Ban user
await client.admin.banUser({
  userId: "user-uuid",
  banReason: "Spam",
  banExpiresIn: 60 * 60 * 24 * 7, // 7 days
});
```

### Users Page Structure

```typescript
// app/(deesse)/admin/users/page.tsx
import { adminClient } from "@/lib/auth-client";

export default async function UsersPage() {
  const { users, total } = await adminClient.admin.listUsers({});

  return (
    <div>
      <h1>Users ({total})</h1>
      <UserTable users={users} />
    </div>
  );
}
```

### User Table Component

```typescript
// components/admin/users/user-table.tsx
"use client";

import { useState } from "react";
import { adminClient } from "@/lib/auth-client";
import type { UserWithRole } from "better-auth";

export function UserTable({ initialUsers, total }: Props) {
  const [users, setUsers] = useState(initialUsers);

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "banned", label: "Status" },
    { key: "createdAt", label: "Created" },
    { key: "actions", label: "Actions" },
  ];

  return (
    <Table data={users} columns={columns}>
      {(user) => (
        <tr>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>
            <RoleBadge role={user.role} />
          </td>
          <td>
            <StatusBadge banned={user.banned} />
          </td>
          <td>{formatDate(user.createdAt)}</td>
          <td>
            <UserActions user={user} onUpdate={refetch} />
          </td>
        </tr>
      )}
    </Table>
  );
}
```

### User Actions Component

```typescript
// components/admin/users/user-actions.tsx
"use client";

import { adminClient } from "@/lib/auth-client";
import { BanDialog } from "./ban-dialog";
import { DeleteDialog } from "./delete-dialog";
import { RoleSelect } from "./role-select";

export function UserActions({ user, onUpdate }: Props) {
  const [showBan, setShowBan] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="flex gap-2">
      <RoleSelect
        userId={user.id}
        currentRole={user.role}
        onUpdate={onUpdate}
      />

      {user.banned ? (
        <Button
          variant="outline"
          onClick={() => adminClient.admin.unbanUser({ userId: user.id })}
        >
          Unban
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setShowBan(true)}>
          Ban
        </Button>
      )}

      <Button
        variant="destructive"
        onClick={() => setShowDelete(true)}
      >
        Delete
      </Button>

      <BanDialog
        open={showBan}
        onClose={() => setShowBan(false)}
        userId={user.id}
        onConfirm={onUpdate}
      />

      <DeleteDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        userId={user.id}
        onConfirm={onUpdate}
      />
    </div>
  );
}
```

---

## 2. Database Page

### Data Source

**drizzle-orm Introspection** provides table metadata:

```typescript
import { getTableConfig, getTableColumns } from "drizzle-orm";

// From a defined table
const config = getTableConfig(usersTable);
const columns = getTableColumns(usersTable);

// config contains:
{
  name: "users",
  schema: "public",
  columns: [...],
  indexes: [...],
  foreignKeys: [...],
  checks: [...],
  primaryKeys: [...],
}
```

### Database Page Structure

```typescript
// app/(deesse)/admin/database/page.tsx
import { db } from "@/lib/db";
import { getTablesFromSchema } from "@/lib/db-introspection";

export default async function DatabasePage() {
  const tables = await getTablesFromSchema(db.schema);

  return (
    <div>
      <h1>Database ({tables.length} tables)</h1>
      <TableList tables={tables} />
    </div>
  );
}
```

### Table List Component

```typescript
// components/admin/database/table-list.tsx
"use client";

import { TableMetadata } from "@/types/database";

export function TableList({ tables }: { tables: TableMetadata[] }) {
  return (
    <div className="space-y-4">
      {tables.map((table) => (
        <TableCard key={table.name} table={table} />
      ))}
    </div>
  );
}

export function TableCard({ table }: { table: TableMetadata }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{table.name}</CardTitle>
        <CardDescription>
          {table.columns.length} columns
          {table.indexes.length > 0 && ` • ${table.indexes.length} indexes`}
          {table.foreignKeys.length > 0 && ` • ${table.foreignKeys.length} FKs`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Nullable</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Constraints</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.columns.map((column) => (
              <TableRow key={column.name}>
                <TableCell className="font-mono">{column.name}</TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {column.type}
                </TableCell>
                <TableCell>
                  {column.notNull ? "NOT NULL" : "NULL"}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {column.default ?? "-"}
                </TableCell>
                <TableCell>
                  {column.isPrimaryKey && <Badge>PK</Badge>}
                  {column.isUnique && <Badge variant="outline">UNIQUE</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

---

## 3. Database Introspection Utility

### Implementation

```typescript
// lib/db-introspection.ts
import { getTableConfig, getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

export interface ColumnMetadata {
  name: string;
  type: string;
  notNull: boolean;
  default: unknown;
  isPrimaryKey: boolean;
  isUnique: boolean;
}

export interface TableMetadata {
  name: string;
  schema: string | undefined;
  columns: ColumnMetadata[];
  indexes: IndexMetadata[];
  foreignKeys: ForeignKeyMetadata[];
}

export async function getTablesFromSchema(
  schema: Record<string, PgTable>
): Promise<TableMetadata[]> {
  const tables: TableMetadata[] = [];

  for (const [name, table] of Object.entries(schema)) {
    const config = getTableConfig(table);

    tables.push({
      name: config.name,
      schema: config.schema,
      columns: config.columns.map((col) => ({
        name: col.name,
        type: col.getSQLType(),
        notNull: col.notNull,
        default: col.default,
        isPrimaryKey: col.primary,
        isUnique: col.isUnique,
      })),
      indexes: config.indexes.map((idx) => ({
        name: idx.name,
        columns: idx.columns.map((c) =>
          typeof c === "string" ? c : (c as any).ref
        ),
        isUnique: idx.config.unique,
      })),
      foreignKeys: config.foreignKeys.map((fk) => {
        const ref = fk.reference();
        return {
          name: fk.getName(),
          columnsFrom: ref.columnsFrom,
          tableTo: ref.foreignTable,
          columnsTo: ref.columnsTo,
        };
      }),
    });
  }

  return tables.sort((a, b) => a.name.localeCompare(b.name));
}
```

---

## 4. Admin Sidebar Integration

### AppSidebar Structure

```typescript
// packages/next/src/components/app-sidebar.tsx
import { section, page } from "deesse";

export const adminSidebar = {
  sections: [
    section({
      name: "Dashboard",
      items: [
        page({ name: "Overview", href: "/admin" }),
      ],
    }),
    section({
      name: "Users",
      items: [
        page({ name: "All Users", href: "/admin/users" }),
      ],
    }),
    section({
      name: "Database",
      items: [
        page({ name: "Tables", href: "/admin/database" }),
      ],
    }),
  ],
};
```

---

## 5. Type Definitions

### User Types (from better-auth)

```typescript
// types/admin/user.ts
export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role?: string; // comma-separated roles
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
```

### Database Types

```typescript
// types/admin/database.ts
export interface ColumnMetadata {
  name: string;
  type: string;
  notNull: boolean;
  default?: unknown;
  isPrimaryKey: boolean;
  isUnique: boolean;
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  isUnique: boolean;
}

export interface ForeignKeyMetadata {
  name: string;
  columnsFrom: string[];
  tableTo: string;
  columnsTo: string[];
}

export interface TableMetadata {
  name: string;
  schema?: string;
  columns: ColumnMetadata[];
  indexes: IndexMetadata[];
  foreignKeys: ForeignKeyMetadata[];
}
```

---

## 6. Route Structure

```
app/(deesse)/admin/
├── layout.tsx           # Admin shell with sidebar
├── page.tsx             # Overview/dashboard
├── users/
│   └── page.tsx         # Users list
└── database/
    └── page.tsx         # Database tables
```

---

## 7. Summary

| Page | Data Source | Components Needed |
|------|-------------|------------------|
| Users | better-auth admin API | UserTable, UserActions, BanDialog, DeleteDialog, RoleSelect |
| Database | drizzle-orm introspection | TableList, TableCard, ColumnTable |

### Key Files to Create

```
app/(deesse)/admin/
├── layout.tsx
├── page.tsx
├── users/
│   └── page.tsx
└── database/
    └── page.tsx

components/admin/
├── users/
│   ├── user-table.tsx
│   ├── user-actions.tsx
│   ├── ban-dialog.tsx
│   ├── delete-dialog.tsx
│   └── role-select.tsx
└── database/
    ├── table-list.tsx
    ├── table-card.tsx
    └── column-table.tsx

lib/
├── auth-client.ts       # better-auth client
└── db-introspection.ts # drizzle introspection
```
