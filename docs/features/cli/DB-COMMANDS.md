# Deesse DB Commands

## Overview

Wrapper commands around `drizzle-kit`'s programmatic API that read configuration from `deesse.config.ts`. **No `drizzle.config.ts` needed** - we use drizzle-kit's API directly.

## Commands

```bash
deesse db:generate   # Generate migrations from schema changes
deesse db:migrate    # Apply pending migrations to database
deesse db:push       # Push schema changes directly (dev only)
deesse db:studio     # Open Drizzle Studio (database browser)
deesse db:introspect # Introspect database and generate schema
```

## Key Discovery: drizzle-kit Has a Programmatic API

After deep analysis of `temp/drizzle-orm/drizzle-kit/src/api.ts`, we discovered that drizzle-kit exposes **full programmatic APIs** - no CLI or config file needed.

### Available APIs

```typescript
// PostgreSQL
import {
  generateDrizzleJson,    // Parse schema files → JSON snapshot
  generateMigration,       // Generate migration SQL between snapshots
  pushSchema,             // Push schema directly to DB
  startStudioPostgresServer, // Start Drizzle Studio
  fromDatabase,           // Introspect DB → schema JSON
} from 'drizzle-kit/api';

// Similar APIs exist for MySQL, SQLite, etc.
```

## How It Works

### deesse config structure

```typescript
// deesse.config.ts
import { defineConfig } from 'deesse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
    schema,
  }),
});
```

### Command Implementations

#### db:generate

```typescript
import {
  generateDrizzleJson,
  generateMigration,
} from 'drizzle-kit/api';

async function dbGenerate() {
  const config = await import('@deesse-config');

  // 1. Get current schema snapshot from TypeScript files
  const currentSchema = await generateDrizzleJson({
    schema: './src/schema.ts',
    cwd: process.cwd(),
  });

  // 2. Get previous schema snapshot (last migration)
  const prevSchema = await readLastMigrationSnapshot();

  // 3. Generate migration SQL
  const migration = await generateMigration({
    drizzleJsonPrev: prevSchema,
    drizzleJson: currentSchema,
    outFolder: './drizzle',
    casing: 'camelCase',
  });

  // 4. Write migration files
  await writeMigration(migration);

  console.log(`Generated ${migration.files.length} migration(s)`);
}
```

#### db:push

```typescript
import { pushSchema } from 'drizzle-kit/api';

async function dbPush(options: { force?: boolean }) {
  const config = await import('@deesse-config');

  // 1. Get schema from files
  const schemaSnapshot = await generateDrizzleJson({
    schema: './src/schema.ts',
  });

  // 2. Push directly to database
  const result = await pushSchema({
    schema: './src/schema.ts',
    db: config.database, // Drizzle database instance!
    force: options.force,
  });

  console.log(`Pushed ${result.tables.length} tables`);
}
```

#### db:introspect

```typescript
import { fromDatabase } from 'drizzle-kit/api';

async function dbIntrospect() {
  const config = await import('@deesse-config');

  // 1. Introspect existing database
  const dbSchema = await fromDatabase(
    config.database, // Drizzle database instance!
    (table) => true, // filter: include all tables
    [] // schema filters
  );

  // 2. Generate schema.ts file
  await generateSchemaFile(dbSchema);

  console.log(`Introspected ${dbSchema.tables.length} tables`);
}
```

#### db:studio

```typescript
import { startStudioPostgresServer } from 'drizzle-kit/api';

async function dbStudio() {
  const config = await import('@deesse-config');

  await startStudioPostgresServer({
    schema: './src/schema.ts',
    credentials: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME!,
    },
  });
}
```

## Dialect Detection

Drizzle uses `entityKind` to identify database types:

```typescript
import { is, PgDatabase, MySqlDatabase, BaseSQLiteDatabase } from 'drizzle-orm';

function detectDialect(db: any): 'postgresql' | 'mysql' | 'sqlite' {
  if (is(db, PgDatabase)) return 'postgresql';
  if (is(db, MySqlDatabase)) return 'mysql';
  if (is(db, BaseSQLiteDatabase)) return 'sqlite';
  throw new Error('Unknown dialect');
}
```

## Implementation Details

### Package Dependencies

```json
{
  "dependencies": {
    "drizzle-kit": "workspace:*"
  }
}
```

### File Structure

```
packages/cli/
├── src/
│   ├── index.ts           # Main CLI entry
│   ├── commands/
│   │   ├── db.ts          # All db:* commands
│   │   ├── generate.ts    # db:generate implementation
│   │   ├── push.ts        # db:push implementation
│   │   ├── migrate.ts     # db:migrate implementation
│   │   ├── studio.ts      # db:studio implementation
│   │   └── introspect.ts  # db:introspect implementation
│   └── utils/
│       ├── config.ts      # Load @deesse-config
│       ├── dialect.ts     # Dialect detection
│       └── schema.ts      # Schema file handling
```

### Schema Path Convention

```typescript
const DEFAULT_SCHEMA_PATH = './src/schema.ts';
```

### Migrations Output Directory

```typescript
const MIGRATIONS_DIR = './drizzle';
```

## CLI Structure

```typescript
// src/commands/db.ts

const DB_COMMANDS = {
  'db:generate': { description: 'Generate migrations' },
  'db:migrate': { description: 'Apply migrations' },
  'db:push': { description: 'Push schema (dev only)' },
  'db:studio': { description: 'Open database browser' },
  'db:introspect': { description: 'Introspect database' },
} as const;

async function handleDbCommand(command: string, args: string[]) {
  switch (command) {
    case 'db:generate':
      await dbGenerate();
      break;
    case 'db:push':
      await dbPush({ force: args.includes('--force') });
      break;
    case 'db:migrate':
      await dbMigrate();
      break;
    case 'db:studio':
      await dbStudio();
      break;
    case 'db:introspect':
      await dbIntrospect();
      break;
  }
}
```

## Summary: Why This Works

| drizzle-kit CLI | deesse db:* Commands |
|-----------------|----------------------|
| Requires `drizzle.config.ts` | Uses `deesse.config.ts` directly |
| CLI flags for options | Programmatic API |
| Config file generation | Direct API calls |
| `drizzle-kit generate` | `generateDrizzleJson()` + `generateMigration()` |
| `drizzle-kit push` | `pushSchema()` |
| `drizzle-kit studio` | `startStudioPostgresServer()` |
| `drizzle-kit introspect` | `fromDatabase()` |

## Key Files in drizzle-kit

| Purpose | File |
|---------|------|
| Main API exports | `drizzle-kit/src/api.ts` |
| Schema serializer | `drizzle-kit/src/serializer/index.ts` |
| PostgreSQL serializer | `drizzle-kit/src/serializer/pgSerializer.ts` |
| Schema imports | `drizzle-kit/src/serializer/pgImports.ts` |
| Push command | `drizzle-kit/src/cli/commands/push.ts` |
| Generate command | `drizzle-kit/src/cli/commands/generate.ts` |
| Introspect | `drizzle-kit/src/cli/commands/pgIntrospect.ts` |

## Open Questions

1. **Schema file location**: Is `./src/schema.ts` the right convention? Or should we look for `schema.ts` anywhere?

2. **Migrations storage**: Is `./drizzle` the right convention for migration files?

3. **Previous migration tracking**: How do we track which migration was the last one applied?

4. **Connection from database**: How do we get credentials from `config.database` for `fromDatabase()`?

5. **Studio browser**: How to open the studio URL after starting?
