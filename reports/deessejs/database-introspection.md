# Database Introspection with Drizzle-ORM

## Overview

The Database page in the DeesseJS admin dashboard displays schema information about all tables in the database. This is accomplished through drizzle-orm's introspection utilities.

**Important Note:** Drizzle ORM has **two introspection approaches**:
1. **Table-level introspection** - From defined table instances (runtime)
2. **Database-level introspection** - From existing database via `drizzle-kit introspect`

---

## 1. Table-Level Introspection

### Key Utilities

| Function | Source | Purpose |
|----------|--------|---------|
| `getTableConfig()` | `drizzle-orm/pg-core` | Full table configuration |
| `getTableColumns()` | `drizzle-orm/pg-core` | Column definitions only |

### Usage

```typescript
import { pgTable, text, integer, timestamp, getTableConfig, getTableColumns } from "drizzle-orm/pg-core";

// Define a table (as you would in schema.ts)
const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").unique(),
  role: text("role", { enum: ["admin", "user"] }).default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Get column information
const columns = getTableColumns(users);
// Returns: { id: PgColumn..., name: PgColumn..., email: PgColumn..., createdAt: PgColumn... }

// Get full configuration
const config = getTableConfig(users);
```

### Configuration Structure

```typescript
interface TableConfig {
  name: string;                    // Table name
  schema: string | undefined;      // Schema name (e.g., "public")
  columns: Column[];               // All columns
  indexes: Index[];                // Index definitions
  foreignKeys: ForeignKey[];       // FK definitions
  checks: Check[];                 // Check constraints
  primaryKeys: PrimaryKey[];       // PK definitions
  uniqueConstraints: UniqueConstraint[];
  policies?: PgPolicy[];          // RLS policies (PostgreSQL)
  enableRLS?: boolean;             // Row-level security
}
```

### Column Information

```typescript
interface Column {
  name: string;
  type: string;                   // SQL type
  notNull: boolean;                // NOT NULL constraint
  default: unknown;                // Default value
  primary: boolean;               // Is primary key
  isUnique: boolean;              // Is unique constraint
  uniqueName?: string;            // Unique constraint name
  generated?: { as: string; type: "stored" | "virtual" };
  identity?: { type: "always" | "byDefault" };
}
```

---

## 2. PostgreSQL Introspection Example

### Schema Definition

```typescript
// src/db/schema.ts
import { pgTable, text, integer, timestamp, boolean, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "user"] }).default("user").notNull(),
  banned: boolean("banned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: uuid("author_id").references(() => users.id).notNull(),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### Introspection Utility

```typescript
// lib/db-introspection.ts
import { getTableConfig, getTableColumns } from "drizzle-orm/pg-core";
import type { PgTable } from "drizzle-orm/pg-core";

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  default?: unknown;
  isPrimaryKey: boolean;
  isUnique: boolean;
  references?: string;           // FK reference (e.g., "users.id")
}

export interface TableInfo {
  name: string;
  schema?: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  method?: string;              // btree, hash, gist, gin, etc.
}

export interface ForeignKeyInfo {
  name: string;
  columnsFrom: string[];
  tableTo: string;
  columnsTo: string[];
  onDelete?: string;
  onUpdate?: string;
}

export function introspectTable(table: PgTable): TableInfo {
  const config = getTableConfig(table);

  return {
    name: config.name,
    schema: config.schema,
    columns: config.columns.map((col) => {
      const info: ColumnInfo = {
        name: col.name,
        type: col.getSQLType(),
        notNull: col.notNull,
        default: col.default,
        isPrimaryKey: col.primary,
        isUnique: col.isUnique,
      };

      // Check if column has foreign key reference
      const fk = config.foreignKeys.find((fk) =>
        fk.reference().columnsFrom.includes(col.name)
      );
      if (fk) {
        const ref = fk.reference();
        info.references = `${ref.foreignTable}.${ref.columnsTo.join(", ")}`;
      }

      return info;
    }),
    indexes: config.indexes.map((idx) => ({
      name: idx.name,
      columns: idx.columns.map((c) =>
        typeof c === "string" ? c : (c as any).ref
      ),
      isUnique: idx.config.unique,
      method: idx.config.method,
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
  };
}

export function introspectSchema(
  schema: Record<string, PgTable>
): TableInfo[] {
  return Object.values(schema)
    .map(introspectTable)
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

### Usage in Admin Page

```typescript
// app/(deesse)/admin/database/page.tsx
import { introspectSchema } from "@/lib/db-introspection";
import { db, schema } from "@/lib/db";

export default async function DatabasePage() {
  const tables = introspectSchema(schema);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Database</h1>
        <p className="text-muted-foreground">
          {tables.length} tables in schema
        </p>
      </div>

      {tables.map((table) => (
        <TableCard key={table.name} table={table} />
      ))}
    </div>
  );
}
```

---

## 3. Database-Level Introspection (drizzle-kit)

For introspecting an **existing database** that wasn't defined with drizzle:

### CLI Command

```bash
drizzle-kit introspect --driver=pg
```

### Programmatic Introspection

If you need to introspect a live database:

```typescript
// lib/db-introspection-live.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

export async function introspectLiveDatabase(connectionString: string) {
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool });

  // Get all tables
  const tablesResult = await db.execute(sql`
    SELECT table_name, table_schema
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  // Get columns for each table
  const columnsResult = await db.execute(sql`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
      CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END as is_unique
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
      WHERE tc.constraint_type = 'UNIQUE'
    ) uq ON c.table_name = uq.table_name AND c.column_name = uq.column_name
    WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY c.table_name, c.ordinal_position
  `);

  // Get foreign keys
  const fkResult = await db.execute(sql`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
  `);

  // Group by table and structure
  // ... (implementation)

  return { tables, columns, foreignKeys };
}
```

---

## 4. Displaying Table Information

### Column Type Formatting

```typescript
// utils/format-column-type.ts
export function formatColumnType(type: string): string {
  // Simplify PostgreSQL type names
  const typeMap: Record<string, string> = {
    "character varying": "varchar",
    "character varying(255)": "varchar(255)",
    "timestamp with time zone": "timestamptz",
    "timestamp without time zone": "timestamp",
    "boolean": "bool",
    "integer": "int",
    "character": "char",
  };

  return typeMap[type] || type;
}

export function getColumnTypeColor(type: string): string {
  if (type.includes("int")) return "text-blue-600";
  if (type.includes("bool")) return "text-purple-600";
  if (type.includes("timestamp") || type.includes("date")) return "text-green-600";
  if (type.includes("text") || type.includes("varchar")) return "text-orange-600";
  if (type.includes("uuid")) return "text-pink-600";
  return "text-gray-600";
}
```

### Column Badge Component

```typescript
// components/database/column-badges.tsx
export function ColumnBadges({ column }: { column: ColumnInfo }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {column.isPrimaryKey && (
        <Badge variant="default" className="bg-yellow-500">PK</Badge>
      )}
      {column.isUnique && !column.isPrimaryKey && (
        <Badge variant="outline">UNIQUE</Badge>
      )}
      {column.notNull && (
        <Badge variant="outline">NOT NULL</Badge>
      )}
      {column.references && (
        <Badge variant="secondary">FK → {column.references}</Badge>
      )}
    </div>
  );
}
```

---

## 5. Key Files

| File | Purpose |
|------|---------|
| `lib/db-introspection.ts` | Table-level introspection |
| `lib/db-introspection-live.ts` | Database-level introspection |
| `types/database.ts` | Type definitions |
| `components/database/table-card.tsx` | Table display component |
| `components/database/column-badges.tsx` | Constraint badges |

---

## 6. Summary

| Approach | Use Case | Method |
|----------|----------|--------|
| `getTableConfig()` | Defined tables in code | Direct function call |
| `getTableColumns()` | Column info only | Direct function call |
| `drizzle-kit introspect` | Existing database | CLI command |
| SQL queries | Live database | Raw SQL via `db.execute()` |

### Recommended Pattern

For DeesseJS admin dashboard:

1. **If tables are defined with drizzle** → Use `getTableConfig()` directly
2. **If introspecting live database** → Use raw SQL queries

```typescript
// Recommended: export schema object and introspect it
import { schema } from "./db/schema";

export default async function DatabasePage() {
  const tables = introspectSchema(schema);
  return <TableList tables={tables} />;
}
```
