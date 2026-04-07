# Configuration

## Config Type

```typescript
// packages/deesse/src/config/define.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type Config = {
  name?: string;
  database: PostgresJsDatabase;  // Drizzle instance
};

export function defineConfig(config: Config): Config {
  return config;
}
```

**Note:** The `database` field accepts a Drizzle instance. This documentation covers PostgreSQL via `drizzle-orm/node-postgres`. Other databases (MySQL, SQLite) use different drizzle drivers.

## User Configuration

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

## Supported Databases

| Database | Driver | Import |
|----------|--------|--------|
| PostgreSQL | `pg` or `postgres` | `drizzle-orm/node-postgres` |
| MySQL | `mysql2` | `drizzle-orm/mysql2` |
| SQLite | `better-sqlite3` | `drizzle-orm/better-sqlite3` |

## Configuration Flow

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
│  export const deesse = getDeesse(config);                       │
│                                                                  │
│  deesse.database  ──►  drizzle({ client: new Pool({...}) })   │
└─────────────────────────────────────────────────────────────────┘
```
