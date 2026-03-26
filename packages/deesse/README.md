# Deesse

Type-safe configuration for DeesseJS.

## Installation

```bash
npm install deesse
```

## Usage

```typescript
import { defineConfig } from 'deesse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
    schema,
  }),
});
```

## Config

### `database`

A Drizzle ORM database instance. Supports PostgreSQL, MySQL, and SQLite.

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const db = drizzle({
  client: new Pool({ connectionString: process.env.DATABASE_URL }),
  schema,
});

export const config = defineConfig({
  database: db,
});
```

## License

MIT
