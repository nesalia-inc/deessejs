# Drizzle-ORM Integration in DeesseJS

## Overview

This document describes how drizzle-orm integrates with the DeesseJS app. It covers:

1. How the database is configured in `defineConfig`
2. How `createDeesse()` creates the server instance with `deesse.database`
3. Direct database access via the Drizzle instance

**Note:** This document covers only the database integration. Auth (better-auth) is covered separately.

---

## 1. Configuration (`defineConfig`)

### Config Type

```typescript
// packages/deesse/src/config/define.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type Config = {
  name?: string;
  database: PostgresJsDatabase;  // Drizzle instance
  plugins?: Plugin[];
  pages?: PageTree[];
};

export function defineConfig(config: Config): Config {
  return config;
}
```

### User Configuration

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const config = defineConfig({
  name: "My App",
  database: drizzle({
    client: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});
```

### Supported Databases

| Database | Driver | Import |
|----------|--------|--------|
| PostgreSQL | `pg` or `postgres` | `drizzle-orm/node-postgres` |
| MySQL | `mysql2` | `drizzle-orm/mysql2` |
| SQLite | `better-sqlite3` | `drizzle-orm/better-sqlite3` |

---

## 2. Server Instance (`createDeesse`)

### Deesse Type

```typescript
// The Deesse server instance (database-only, auth comes separately)
export type Deesse = {
  database: PostgresJsDatabase; // Drizzle instance (direct access)
};
```

### Factory Function

```typescript
// packages/deesse/src/server.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Config } from "./config/define";

export function createDeesse(config: Config): Deesse {
  return {
    database: config.database,  // Expose Drizzle instance directly
  };
}
```

### Module-Scoped Cache

```typescript
// packages/deesse/src/factory.ts
type CacheState<T> = {
  instances: Map<string, T>;
  promises: Map<string, Promise<T>>;
};

const empty = <T>(): CacheState<T> => ({
  instances: new Map(),
  promises: new Map(),
});

const setInstance = <T>(state: CacheState<T>, key: string, instance: T): CacheState<T> => ({
  instances: new Map(state.instances).set(key, instance),
  promises: new Map(state.promises).delete(key),
});

const setPromise = <T>(state: CacheState<T>, key: string, promise: Promise<T>): CacheState<T> => ({
  instances: state.instances,
  promises: new Map(state.promises).set(key, promise),
});

const getCached = <T>(state: CacheState<T>, key: string): T | Promise<T> | undefined => {
  const instance = state.instances.get(key);
  if (instance !== undefined) return instance;
  return state.promises.get(key);
};

// Factory with immutable state
const createFactory = <T, Options>(
  createInstance: (options: Options) => Promise<T>
) => {
  let state: CacheState<T> = empty();

  return {
    async get(key: string, options: Options): Promise<T> {
      const cached = getCached(state, key);
      if (cached !== undefined) return cached as T;

      const promise = createInstance(options);
      state = setPromise(state, key, promise);

      try {
        const instance = await promise;
        state = setInstance(state, key, instance);
        return instance;
      } catch {
        state = { ...state, promises: new Map(state.promises).delete(key) };
        throw;
      }
    },

    getState(): Readonly<CacheState<T>> { return state; },

    clear(): void { state = empty(); },
  };
};

// Module-scoped cache
const deesseCache = createFactory<Deesse, Config>(createDeesse);

export const getDeesse = (config: Config) => deesseCache.get("main", config);
export const clearDeesseCache = () => deesseCache.clear();
```

### Why Module-Scoped?

- **No global state** - cache is scoped to the module
- **Predictable** - same key returns same cached instance
- **Testable** - `clearDeesseCache()` for tests
- **Thundering herd prevention** - same promise returned to concurrent calls

---

## 3. Database Access via `deesse.database`

### The Pattern

```typescript
// lib/deesse.ts
import { createDeesse } from "deesse";
import { config } from "../deesse.config";

export const deesse = createDeesse(config);
```

### Accessing the Database

```typescript
import { deesse } from "@/lib/deesse";
import { eq, desc } from "drizzle-orm";
import { users, posts } from "@/db/schema";

// Select
const allUsers = await deesse.database
  .select()
  .from(users)
  .orderBy(desc(users.createdAt));

// Select with filter
const [user] = await deesse.database
  .select()
  .from(users)
  .where(eq(users.email, "admin@example.com"))
  .limit(1);

// Insert
await deesse.database.insert(users).values({
  email: "new@example.com",
  name: "New User",
});

// Update
await deesse.database
  .update(users)
  .set({ name: "Updated Name" })
  .where(eq(users.id, userId));

// Delete
await deesse.database.delete(users).where(eq(users.id, userId));

// Transaction
await deesse.database.transaction(async (trx) => {
  await trx.insert(posts).values({
    title: "New Post",
    authorId: userId,
  });
});
```

---

## 4. Configuration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        deesse.config.ts                           │
│                                                                  │
│  export const config = defineConfig({                           │
│    database: drizzle({ client: new Pool({...}) }),             │
│  });                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        lib/deesse.ts                              │
│                                                                  │
│  export const deesse = createDeesse(config);                     │
│                                                                  │
│  deesse.database  ──►  drizzle({ client: new Pool({...}) })   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Schema Integration

### Your Schema

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "user"] }).default("user").notNull(),
  banned: boolean("banned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: uuid("author_id").references(() => users.id).notNull(),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Using with `deesse.database`

```typescript
// In any server code (API routes, Server Components, etc.)
import { deesse } from "@/lib/deesse";
import { posts, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUserPosts(authorId: string) {
  return deesse.database
    .select({
      post: posts,
      author: users,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.authorId, authorId));
}
```

---

## 6. Type Safety

### With Schema

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

type DbWithSchema = PostgresJsDatabase<typeof schema>;

// Access typed schema via deesse.database
export async function getUser(id: string) {
  return deesse.database
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
}
```

### Drizzle Config Options

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 7. CLI Commands

### db:generate

```bash
npx deesse db:generate
```

Runs `drizzle-kit generate` to create migration files.

### db:push

```bash
npx deesse db:push
```

Pushes schema changes to database (development).

### db:migrate

```bash
npx deesse db:migrate
```

Runs pending migrations.

---

## 8. Summary

### Key Points

| Aspect | Detail |
|--------|--------|
| Config input | `database: PostgresJsDatabase` |
| `createDeesse()` | Returns `{ database }` |
| `deesse.database` | Direct Drizzle instance |
| Cache | Module-scoped, no global state |
| Auth | Covered separately |

### Files

| File | Purpose |
|------|---------|
| `deesse.config.ts` | User config with database |
| `lib/deesse.ts` | Wiring layer (`createDeesse()`) |
| `src/config/define.ts` | Config type definitions |
| `src/server.ts` | `createDeesse()` factory |
| `src/factory.ts` | Module-scoped cache |

### What This Document Covers

- ✅ Database configuration
- ✅ `createDeesse()` server factory
- ✅ `deesse.database` access
- ✅ Module-scoped caching
- ✅ Schema integration
- ❌ Auth (covered separately)
- ❌ Client integration (covered separately)
