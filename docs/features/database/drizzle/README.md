# Drizzle ORM Integration

DeesseJS uses Drizzle ORM as its database layer, integrated with better-auth.

## Files

- [Configuration](./configuration.md) - `defineConfig` and database setup
- [Server Instance](./server-instance.md) - `getDeesse()` factory and singleton cache
- [Database Access](./database-access.md) - Query patterns via `deesse.database`
- [Schema](./schema.md) - Defining tables and relations
- [Type Safety](./type-safety.md) - TypeScript integration
- [CLI](./cli.md) - Database CLI commands

## Quick Start

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
});
```

```typescript
// lib/deesse.ts
import { getDeesse } from "deesse";
import { config } from "../deesse.config";

export const deesse = getDeesse(config);
```

## Notes

- Auth (better-auth) is covered separately in the authentication docs
- This folder covers only the database integration, not the auth layer
