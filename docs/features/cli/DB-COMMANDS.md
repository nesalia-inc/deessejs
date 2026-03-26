# Deesse DB Commands

## Overview

Wrapper commands around `drizzle-kit`'s programmatic API that read configuration from `deesse.config.ts`.

**Constraint**: NO `drizzle.config.ts` allowed. Ever.

## Commands

```bash
deesse db:generate   # Generate migrations from schema changes
deesse db:migrate    # Apply pending migrations to database
deesse db:push       # Push schema changes directly (dev only)
deesse db:studio     # Open Drizzle Studio (database browser)
deesse db:introspect # Introspect database and generate schema
```

## Key Discovery: drizzle-kit Has a Programmatic API

After deep analysis of `temp/drizzle-orm/drizzle-kit/src/api.ts`, drizzle-kit exposes **full programmatic APIs** - no CLI, no config file.

### Available APIs

```typescript
// PostgreSQL (from drizzle-kit/api)
import {
  generateDrizzleJson,       // Parse schema files → JSON snapshot
  generateMigration,          // Generate migration SQL between snapshots
  pushSchema,                // Push schema directly to DB
  startStudioPostgresServer, // Start Drizzle Studio
  fromDatabase,              // Introspect DB → schema JSON
} from 'drizzle-kit/api';

// MySQL, SQLite have similar APIs
```

## The Problem: Schema Lives in deesse.config.ts

```typescript
// deesse.config.ts
import { defineConfig } from 'deesse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
    schema, // ← Schema is HERE, not in a separate file
  }),
});
```

**Issue**: `generateDrizzleJson()` expects file paths, but our schema is imported directly into `config.database.schema`.

## Solution Architecture

### Option A: Require schema.ts file (Convention over Magic)

User MUST have a `./src/schema.ts` file that exports the schema, AND import it in `deesse.config.ts`.

```typescript
// ./src/schema.ts (REQUIRED)
export { users, posts, comments } from './schema/tables';
```

```typescript
// deesse.config.ts
import { defineConfig } from 'deesse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema'; // ← imports from schema.ts

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
    schema,
  }),
});
```

**Pros**: Clean, explicit, works with file-based APIs
**Cons**: Dual maintenance of schema export

### Option B: Extract schema from config.database at runtime

Use Node.js to dynamically import `deesse.config.ts`, extract `config.database`, and serialize it.

```typescript
// In CLI, at runtime:
const config = await import('@deesse-config');
const db = config.config.database;

// db.schema is an object with table definitions
// We need to serialize this to JSON for drizzle-kit APIs
```

**Pros**: Single source of truth
**Cons**: Complex serialization, may not work for all drizzle-kit APIs

### Recommended: Option A (schema.ts convention)

User maintains `schema.ts` explicitly. This is standard Drizzle practice anyway.

## Command Implementations

### db:generate

```typescript
import {
  generateDrizzleJson,
  generateMigration,
} from 'drizzle-kit/api';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const SCHEMA_PATH = './src/schema.ts';
const MIGRATIONS_DIR = './drizzle/migrations';
const SNAPSHOT_DIR = './drizzle/meta';

async function dbGenerate() {
  // 1. Verify schema.ts exists
  try {
    await fs.access(SCHEMA_PATH);
  } catch {
    throw new Error(`Schema file not found: ${SCHEMA_PATH}. Create it and export your tables.`);
  }

  // 2. Get current schema snapshot
  const currentSchema = await generateDrizzleJson({
    schema: [SCHEMA_PATH],
    cwd: process.cwd(),
  });

  // 3. Get previous snapshot (last migration)
  let prevSchema = null;
  const snapshotPath = path.join(SNAPSHOT_DIR, '_snapshot.json');
  try {
    const snapshotContent = await fs.readFile(snapshotPath, 'utf-8');
    prevSchema = JSON.parse(snapshotContent);
  } catch {
    // No previous snapshot - this is the first migration
  }

  // 4. Generate migration
  const migration = await generateMigration({
    drizzleJsonPrev: prevSchema ?? undefined,
    drizzleJson: currentSchema,
    outFolder: MIGRATIONS_DIR,
    casing: 'camelCase',
  });

  // 5. Save new snapshot
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  await fs.writeFile(snapshotPath, JSON.stringify(currentSchema, null, 2));

  // 6. Save migration files
  for (const file of migration.files) {
    await fs.writeFile(
      path.join(MIGRATIONS_DIR, file.name),
      file.content
    );
  }

  console.log(`Generated ${migration.files.length} migration(s)`);
}
```

### db:push

```typescript
import { pushSchema } from 'drizzle-kit/api';
import * as fs from 'node:fs/promises';

const SCHEMA_PATH = './src/schema.ts';

async function dbPush(options: { force?: boolean }) {
  // 1. Load config to get database instance
  const config = await import('@deesse-config');
  const db = config.config.database;

  // 2. Verify schema exists
  try {
    await fs.access(SCHEMA_PATH);
  } catch {
    throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
  }

  // 3. Push to database
  const result = await pushSchema({
    schema: SCHEMA_PATH,
    db,
    force: options.force ?? false,
  });

  console.log(`Pushed ${result.tables.length} tables`);
}
```

### db:migrate

```typescript
import { loadConfig } from '../utils/config';

const MIGRATIONS_DIR = './drizzle/migrations';

async function dbMigrate() {
  const config = await loadConfig();
  const db = config.database;

  // 1. Get migration files
  const files = await getMigrationFiles(MIGRATIONS_DIR);
  if (files.length === 0) {
    console.log('No migrations to apply');
    return;
  }

  // 2. Apply each migration
  for (const file of files) {
    const sql = await fs.readFile(file.path, 'utf-8');
    await db.execute(sql);
    console.log(`Applied: ${file.name}`);
  }
}
```

**Issue**: Drizzle's `db.execute()` may not work for raw SQL. May need to use the underlying driver directly.

### db:studio

```typescript
import { startStudioPostgresServer } from 'drizzle-kit/api';
import { loadConfig, detectDialect } from '../utils/config';

async function dbStudio() {
  const config = await loadConfig();
  const db = config.database;
  const dialect = detectDialect(db);

  if (dialect !== 'postgresql') {
    throw new Error(`Studio only supports PostgreSQL for now. Got: ${dialect}`);
  }

  // Get connection info from pool
  const pool = db.$client; // Pool instance

  await startStudioPostgresServer({
    schema: SCHEMA_PATH,
    credentials: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'postgres',
    },
  });
}
```

### db:introspect

```typescript
import { fromDatabase } from 'drizzle-kit/api';
import { loadConfig, detectDialect } from '../utils/config';
import { generateSchema } from '../utils/schema-generator';

const SCHEMA_PATH = './src/schema.ts';

async function dbIntrospect() {
  const config = await loadConfig();
  const db = config.database;
  const dialect = detectDialect(db);

  // 1. Introspect database
  const dbSchema = await fromDatabase(
    db,
    (tableName) => true, // include all tables
    [] // no schema filter
  );

  // 2. Generate TypeScript schema file
  const tsContent = generateSchema(dbSchema, dialect);

  // 3. Write to schema.ts
  await fs.writeFile(SCHEMA_PATH, tsContent);

  console.log(`Introspected ${dbSchema.tables.length} tables → ${SCHEMA_PATH}`);
}
```

**Issue**: `generateSchema()` doesn't exist - we need to implement it. `fromDatabase()` returns a JSON object, not TypeScript code.

## Utils

### loadConfig()

```typescript
// src/utils/config.ts

export async function loadConfig() {
  // Dynamic import of @deesse-config
  // @deesse-config is aliased to ./src/deesse.config.ts in user's project
  const config = await import('@deesse-config');
  return config.config;
}
```

**Challenge**: `@deesse-config` must be resolvable at runtime. This requires:
1. User's `tsconfig.json` has the alias
2. Or we use a relative path resolution

### detectDialect()

```typescript
// src/utils/dialect.ts
import { is, PgDatabase, MySqlDatabase, BaseSQLiteDatabase } from 'drizzle-orm';

export function detectDialect(db: any): 'postgresql' | 'mysql' | 'sqlite' {
  if (is(db, PgDatabase)) return 'postgresql';
  if (is(db, MySqlDatabase)) return 'mysql';
  if (is(db, BaseSQLiteDatabase)) return 'sqlite';
  throw new Error(`Unknown database dialect`);
}
```

### schema-generator (for introspect)

This utility doesn't exist - we need to create it:

```typescript
// src/utils/schema-generator.ts

export function generateSchema(
  dbSchema: PgSchemaInternal,
  dialect: 'postgresql' | 'mysql' | 'sqlite'
): string {
  // Convert PgSchemaInternal JSON → TypeScript code
  // This is complex - need to generate valid Drizzle table definitions
  return `import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});
// ... etc
`;
}
```

## File Structure

```
packages/cli/
├── src/
│   ├── index.ts              # Main entry - dispatch commands
│   ├── bin/
│   │   └── deesse.js        # Entry point
│   ├── commands/
│   │   ├── db.ts            # db:* dispatcher
│   │   ├── db-generate.ts   # db:generate
│   │   ├── db-push.ts       # db:push
│   │   ├── db-migrate.ts    # db:migrate
│   │   ├── db-studio.ts     # db:studio
│   │   └── db-introspect.ts # db:introspect
│   └── utils/
│       ├── config.ts         # loadConfig()
│       ├── dialect.ts        # detectDialect()
│       └── schema-generator.ts # TypeScript → schema file
└── package.json
```

## Package Dependencies

```json
{
  "dependencies": {
    "drizzle-kit": "workspace:*",
    "drizzle-orm": "workspace:*"
  }
}
```

## Open Questions

| Question | Status |
|----------|--------|
| Schema file convention `./src/schema.ts` | Accepted |
| How to get credentials from Pool for studio | Use env vars |
| How to apply migrations (db.execute raw SQL) | Need driver access |
| How to generate TypeScript from PgSchemaInternal | Need to implement schema-generator |
| How to make @deesse-config resolvable at runtime | User must have tsconfig alias |

## Command Priority

1. **db:generate** - Most important, do first
2. **db:push** - Important for dev workflow
3. **db:studio** - Medium, straightforward
4. **db:introspect** - Complex, do last
5. **db:migrate** - Depends on migration storage solution
