# Drizzle-ORM: Configuration, Database Connections, and Adapters

## Overview

Drizzle-ORM uses a **driver/adapter pattern** where each database provider (PostgreSQL, MySQL, SQLite, etc.) has its own driver package. The core `drizzle-orm` package provides the schema definitions, query builders, and base database classes, while drivers handle the database-specific connection logic.

---

## 1. How Drizzle-ORM Configures Database Connections

### The `DrizzleConfig` Type

Every adapter uses the shared `DrizzleConfig<TSchema>` type defined in `drizzle-orm/src/utils.ts`:

```typescript
export interface DrizzleConfig<TSchema extends Record<string, unknown> = Record<string, never>> {
  logger?: boolean | Logger;
  schema?: TSchema;
  casing?: Casing;
  cache?: Cache;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `logger` | `boolean \| Logger` | Enable built-in logger (`true`) or provide custom Logger |
| `schema` | `TSchema` | The schema object containing table definitions |
| `casing` | `'snake_case' \| 'camelCase'` | Field name casing transformation |
| `cache` | `Cache` | Query caching mechanism |

### Connection Configuration Pattern

Each driver accepts the `drizzle()` function with **three overloads**:

```typescript
// Example from node-postgres driver
export function drizzle<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TClient extends NodePgClient = Pool,
>(
  ...params:
    | [TClient | string]                                      // 1. Connection string or client only
    | [TClient | string, DrizzleConfig<TSchema>]             // 2. With explicit config object
    | [DrizzleConfig<TSchema> & { client?: TClient }]         // 3. Single config object with client
): NodePgDatabase<TSchema> & { $client: TClient }
```

**Three ways to call `drizzle()`:**

```typescript
// 1. Connection string only
const db = drizzle(connectionString);

// 2. Client instance + config
const db = drizzle(client, { schema, logger: true });

// 3. Single config object (connection details + drizzle config merged)
const db = drizzle({
  connection: 'postgres://user:pass@host:5432/db',
  schema,
  logger: true,
  casing: 'camelCase',
});
```

---

## 2. How `drizzle()` Works with Different Adapters

### Architecture: Driver + Session + Database

Each adapter follows the same construction pattern:

```
drizzle(connection)
    ↓
construct(client, config)
    ├── Creates dialect (PgDialect, MySqlDialect, SQLiteAsyncDialect, etc.)
    ├── Extracts relational schema (if schema provided)
    ├── Creates Driver instance (holds client + dialect + options)
    ├── Creates Session instance (from Driver)
    ├── Creates Database instance (holds dialect + session + schema)
    └── Attaches $client and $cache to database
```

### Example: PostgreSQL with node-postgres

```typescript
// The internal construct function
function construct<TSchema, TClient>(
  client: TClient,
  config: DrizzleConfig<TSchema> = {},
): NodePgDatabase<TSchema> & { $client: TClient } {
  // 1. Create dialect with optional casing
  const dialect = new PgDialect({ casing: config.casing });

  // 2. Set up logger
  let logger;
  if (config.logger === true) {
    logger = new DefaultLogger();
  } else if (config.logger !== false) {
    logger = config.logger;
  }

  // 3. Extract relational schema config
  let schema: RelationalSchemaConfig<TablesRelationalConfig> | undefined;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(
      config.schema,
      createTableRelationsHelpers,
    );
    schema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap,
    };
  }

  // 4. Create driver and session
  const driver = new NodePgDriver(client, dialect, { logger, cache: config.cache });
  const session = driver.createSession(schema);

  // 5. Create database instance
  const db = new NodePgDatabase(dialect, session, schema) as NodePgDatabase<TSchema>;

  // 6. Attach raw client and cache
  db.$client = client;
  db.$cache = config.cache;
  if (db.$cache) {
    db.$cache['invalidate'] = config.cache?.onMutate;
  }

  return db;
}
```

---

## 3. Available Adapters

### PostgreSQL Drivers

| Driver | Location | Notes |
|--------|----------|-------|
| `node-postgres` | `src/node-postgres/driver.ts` | Pool-based, standard PostgreSQL |
| `postgres-js` | `src/postgres-js/driver.ts` | Async postgres.js library |
| `neon-http` | `src/neon-http/driver.ts` | Neon serverless PostgreSQL |
| `neon-serverless` | `src/neon-serverless/driver.ts` | Neon serverless ws |
| `vercel-postgres` | `src/vercel-postgres/driver.ts` | Vercel Postgres |
| `planetscale-serverless` | `src/planetscale-serverless/driver.ts` | PlanetScale/MySQL |
| `aws-data-api/pg` | `src/aws-data-api/pg/driver.ts` | AWS Aurora Data API |
| `pglite` | `src/pglite/driver.ts` | PGlite in-browser PostgreSQL |

### MySQL Drivers

| Driver | Location | Notes |
|--------|----------|-------|
| `mysql2` | `src/mysql2/driver.ts` | mysql2 with promise/callback support |
| `mysql-proxy` | `src/mysql-proxy/driver.ts` | MySQL protocol proxy |
| `singlestore` | `src/singlestore/driver.ts` | SingleStore (MemSQL) |
| `prisma/mysql` | `src/prisma/mysql/driver.ts` | MySQL via Prisma |

### SQLite Drivers

| Driver | Location | Notes |
|--------|----------|-------|
| `better-sqlite3` | `src/better-sqlite3/driver.ts` | Sync SQLite for Node.js |
| `libsql` | `src/libsql/driver.ts` | LibSQL (Turso) - async |
| `bun-sqlite` | `src/bun-sqlite/driver.ts` | Bun SQLite |
| `d1` | `src/d1/driver.ts` | Cloudflare D1 |
| `sql-js` | `src/sql-js/driver.ts` | SQLite compiled to JS |
| `op-sqlite` | `src/op-sqlite/driver.ts` | OP-SQLite for React Native |
| `expo-sqlite` | `src/expo-sqlite/driver.ts` | Expo SQLite |
| `tidb-serverless` | `src/tidb-serverless/driver.ts` | TiDB Serverless |

---

## 4. Database Instance Creation and Access

### Core Database Classes

Drizzle-ORM provides three base database classes (one per SQL family):

| Class | Used By |
|-------|---------|
| `PgDatabase` | PostgreSQL, CockroachDB |
| `MySqlDatabase` | MySQL, MariaDB, PlanetScale |
| `BaseSQLiteDatabase` | SQLite, libSQL, Turso |

### The `$_` Internal Property

```typescript
declare readonly _: {
  readonly schema: TSchema | undefined;
  readonly fullSchema: TFullSchema;
  readonly tableNamesMap: Record<string, string>;
  readonly session: PgSession<TQueryResult, TFullSchema, TSchema>;
};
```

### Accessing the Raw Client

```typescript
const db = drizzle(connectionString);
const pool = db.$client; // Access the underlying pg Pool or similar
```

### Query Builder Property (`db.query`)

When a schema is provided, Drizzle generates a relational query builder for each table:

```typescript
const allUsers = await db.query.users.findMany();
```

---

## 5. Schema Definitions

### Defining a Schema

```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Complete Example

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users, posts } from './schema';

const schema = { users, posts };

const db = drizzle({
  connection: 'postgres://user:pass@localhost:5432/mydb',
  schema,
  logger: true,
});

const allUsers = await db.query.users.findMany();

const usersWithPosts = await db
  .select()
  .from(users)
  .leftJoin(posts, eq(posts.authorId, users.id));
```

---

## 6. Logger System

```typescript
export interface Logger {
  logQuery(query: string, params: unknown[]): void;
}

// Usage
const db = drizzle({
  connection,
  logger: {
    logQuery(query, params) {
      console.log('SQL:', query, params);
    }
  }
});
```

---

## 7. Key Files Summary

| File | Purpose |
|------|---------|
| `drizzle-orm/src/utils.ts` | `DrizzleConfig` type, `isConfig()` helper |
| `drizzle-orm/src/logger.ts` | `Logger` interface, `DefaultLogger` |
| `drizzle-orm/src/relations.ts` | `extractTablesRelationalConfig()` |
| `drizzle-orm/src/pg-core/db.ts` | `PgDatabase` base class |
| `drizzle-orm/src/mysql-core/db.ts` | `MySqlDatabase` base class |
| `drizzle-orm/src/sqlite-core/db.ts` | `BaseSQLiteDatabase` base class |
| `drizzle-orm/src/node-postgres/driver.ts` | PostgreSQL driver example |

---

## Summary

Drizzle-ORM's configuration is simple and driver-based:
1. **Choose your adapter** based on your database
2. **Call `drizzle()`** with connection string, client, or config object
3. **Pass schema** for relational query builder
4. **Access `$client`** for raw driver access
5. **No singletons** - create as many db instances as needed
