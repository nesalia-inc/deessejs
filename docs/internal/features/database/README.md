# Database

DeesseJS uses **Drizzle ORM** with better-auth's database adapter.

## Quick Start

See [Drizzle ORM Setup](./DRIZZLE.md) for full setup instructions.

## TL;DR

```typescript
// database.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const db = drizzle({ client: postgres(process.env.DATABASE_URL!) });
```

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
  },
});
```

## Supported Databases

| Database | Driver |
|----------|--------|
| PostgreSQL | `postgres` (recommended) |
| MySQL | `mysql2` |
| SQLite | `better-sqlite3` |

## CLI

```bash
npx drizzle-kit generate  # Generate migrations
npx drizzle-kit migrate   # Apply migrations
npx drizzle-kit studio    # Visual editor
```

## Why Drizzle?

- Native better-auth integration via `@better-auth/drizzle-adapter`
- Lightweight, type-safe, SQL-like queries
- Single database for auth + plugin settings
