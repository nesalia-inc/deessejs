# Database - Simplified Approach

## Decision

**Drizzle ORM won.** No abstraction layer, no "Standard ORM" initiative. Just Drizzle.

---

## Rationale

The original idea was to create a database abstraction similar to how Standard Schema provides a common interface for validation libraries. After analysis:

1. **Creating a Standard ORM is over-engineering** - The problem is already solved by better-auth's DBAdapter
2. **Drizzle is the de facto standard** - It's lightweight, type-safe, SQL-like, and works with better-auth natively
3. **More databases ≠ better** - Adding Prisma support would double maintenance burden with marginal benefit

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       User Project                           │
│                                                              │
│  deesse.config.ts                                           │
│  └── database: { db }  ← Drizzle instance                  │
│  └── auth: betterAuth config                                │
│                                                              │
│  database.ts                                                │
│  └── drizzle({ client: postgres(...) })                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  better-auth                                 │
│  └── database: drizzleAdapter(db, { provider: "pg" })      │
└─────────────────────────────────────────────────────────────┘
```

---

## Supported Databases

| Database | Driver | Status |
|----------|--------|--------|
| PostgreSQL | `postgres` or `pg` | Recommended |
| MySQL | `mysql2` | Supported |
| SQLite | `better-sqlite3` or `libsql` | Supported |

---

## Setup

### 1. Install Dependencies

```bash
npm install drizzle-orm better-auth @better-auth/drizzle-adapter
npm install postgres  # for PostgreSQL
```

### 2. Create Database Instance

```typescript
// database.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle({ client: queryClient });
```

### 3. Configure Deesse

```typescript
// deesse.config.ts
import { defineConfig } from '@deessejs/deesse';
import { db } from './database';

export const config = defineConfig({
  database: { db },
  auth: {
    api: {
      emailAndPassword: { enabled: true },
    },
    client: {
      baseURL: process.env.NEXT_PUBLIC_APP_URL,
    },
  },
});
```

### 4. Generate Auth Schema

```bash
npx auth@latest generate
```

This creates the required tables for better-auth (users, sessions, accounts, verification).

### 5. Run Migrations

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## Drizzle Schema

### Basic User Table

```typescript
// schema.ts
import { varchar, timestamp, boolean } from "drizzle-orm/postgres-core";
import { pgTable } from "drizzle-orm/postgres-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Plugin Schema Example

```typescript
// schema.ts
import { text, boolean, timestamp } from "drizzle-orm/postgres-core";

export const pluginSettings = pgTable("plugin_settings", {
  id: varchar("id", { length: 255 }).primaryKey(),
  pluginId: varchar("plugin_id", { length: 255 }).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value"),  // JSON stored as text
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

---

## Database Operations

### Query

```typescript
import { eq } from "drizzle-orm";

// Find user by email
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, "user@example.com"))
  .limit(1);
```

### Insert

```typescript
await db.insert(users).values({
  id: crypto.randomUUID(),
  email: "new@example.com",
  emailVerified: false,
});
```

### Update

```typescript
import { eq, set } from "drizzle-orm";

await db
  .update(users)
  .set({ emailVerified: true })
  .where(eq(users.id, userId));
```

### Delete

```typescript
await db.delete(users).where(eq(users.id, userId));
```

### Transactions

```typescript
await db.transaction(async (trx) => {
  await trx.insert(users).values({ /* ... */ });
  await trx.insert(sessions).values({ /* ... */ });
});
```

---

## CLI Commands

```bash
# Generate migrations from schema changes
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate

# Push schema changes directly (dev only)
npx drizzle-kit push

# Open visual database editor
npx drizzle-kit studio
```

---

## Why Not Prisma?

Prisma is excellent, but for Deesse:

1. **Better-auth officially supports Drizzle** - `@better-auth/drizzle-adapter` exists and is maintained
2. **Drizzle is lighter** - No Prisma client overhead, direct SQL
3. **Drizzle feels like SQL** - Better for developers who want to understand queries
4. **Simpler stack** - One less ORM to maintain compatibility with

If you prefer Prisma, you can still use it via better-auth's Prisma adapter, but it's not the recommended path.

---

## Related Documents

- [Authentication](../authentication/README.md)
- [Plugins](../plugins/README.md)
- [Configuration](../config/README.md)
