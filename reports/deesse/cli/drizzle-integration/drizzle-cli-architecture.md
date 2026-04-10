# Drizzle Kit CLI Architecture

## Overview

Drizzle Kit is the CLI tool for Drizzle ORM that manages database migrations, schema pushing, and introspection. It is published as the `drizzle-kit` npm package and is built using TypeScript.

## Entry Point

**File**: `src/cli/index.ts`

The CLI entry point uses `@drizzle-team/brocli` as the command framework. All commands are registered and executed through the `run()` function:

```typescript
import { command, run } from '@drizzle-team/brocli';
import { check, drop, exportRaw, generate, migrate, pull, push, studio, up } from './schema';

run([generate, migrate, pull, push, studio, up, check, drop, exportRaw, ...legacy], {
  name: 'drizzle-kit',
  version: version,
});
```

## Command Registration Pattern

Each command is defined using the `command()` function from brocli with the following structure:

```typescript
export const generate = command({
  name: 'generate',
  options: { /* command options */ },
  transform: async (opts) => { /* preprocess options */ },
  handler: async (opts) => { /* execute command */ },
});
```

## Available Commands

| Command | Description | File |
|---------|-------------|------|
| `generate` | Generate migration SQL files from schema changes | `src/cli/schema.ts` |
| `migrate` | Apply migrations to the database | `src/cli/schema.ts` |
| `push` | Push schema changes directly to the database | `src/cli/schema.ts` |
| `introspect` / `pull` | Reverse engineer database to Drizzle schema | `src/cli/schema.ts` |
| `check` | Validate configuration and schema | `src/cli/schema.ts` |
| `up` | Mark migrations as applied without executing | `src/cli/commands/pgUp.ts` etc. |
| `drop` | Remove migration records | `src/cli/commands/drop.ts` |
| `studio` | Start Drizzle Studio web UI | `src/cli/schema.ts` |
| `export` | Export current schema as SQL | `src/cli/schema.ts` |

## Legacy Commands

The following legacy commands are deprecated but still functional (hidden from help):

- `generate:pg`, `generate:mysql`, `generate:sqlite` -> use `generate`
- `push:pg`, `push:mysql`, `push:sqlite` -> use `push`
- `introspect:pg`, `introspect:mysql`, `introspect:sqlite` -> use `introspect`
- `up:pg`, `up:mysql`, `up:sqlite` -> use `up`
- `check:pg`, `check:mysql`, `check:sqlite` -> use `check`

## Configuration Loading

**File**: `src/cli/commands/utils.ts` - `drizzleConfigFromFile()`

The CLI automatically searches for configuration files in this order:
1. `drizzle.config.ts`
2. `drizzle.config.js`
3. `drizzle.config.json`

The configuration file is loaded using `tsx` (TypeScript execution) with proper ES5 target checking. The `safeRegister()` function ensures proper TypeScript compilation and handles dynamic imports.

## Schema Loading

**File**: `src/serializer/index.ts` - `prepareFilenames()`

Schema files are discovered using glob patterns:

```typescript
export const prepareFilenames = (path: string | string[]) => {
  if (typeof path === 'string') {
    path = [path];
  }
  const result = path.reduce((result, cur) => {
    const globbed = glob.sync(`${prefix}${cur}`);
    // ... process files
  }, new Set<string>());
};
```

Supported file extensions: `.ts`, `.js`, `.cjs`, `.mjs`, `.mts`, `.cts`

## Connection Management

**File**: `src/cli/connections.ts`

Database connections are handled by dialect-specific functions:

- `preparePostgresDB()` - PostgreSQL (supports pg, postgres.js, @vercel/postgres, @neondatabase/serverless, aws-data-api, pglite)
- `connectToMySQL()` - MySQL (mysql2, @planetscale/database)
- `connectToSQLite()` - SQLite (better-sqlite3, @libsql/client, d1-http)
- `connectToLibSQL()` - LibSQL/Turso
- `connectToSingleStore()` - SingleStore
- `prepareGelDB()` - Gel

## Command Flow

Each command follows this pattern:

1. **Options Definition**: Define CLI options with types and defaults
2. **Transform**: Pre-process options (load config, merge CLI/config)
3. **Validation**: Validate using Zod schemas
4. **Handler**: Execute the command with proper error handling

## Internal Modules

### api.ts

The main API entry point exposing programmatic functions:

- `generateDrizzleJson()` - Generate JSON snapshot from schema imports
- `generateMigration()` - Generate SQL migration statements between snapshots
- `pushSchema()` - Push schema changes directly to PostgreSQL
- `generateSQLiteDrizzleJson()` - SQLite snapshot generation
- `generateMySQLDrizzleJson()` - MySQL snapshot generation
- `generateSingleStoreDrizzleJson()` - SingleStore snapshot generation
- `startStudio*Server()` - Start Drizzle Studio for each dialect

### migrationPreparator.ts

Prepares migration snapshots from schema files:

- `preparePgMigrationSnapshot()` - PostgreSQL migration snapshot
- `prepareMySqlMigrationSnapshot()` - MySQL migration snapshot
- `prepareSqliteMigrationSnapshot()` - SQLite migration snapshot
- `preparePgDbPushSnapshot()` - PostgreSQL push snapshot
- `prepareSQLiteDbPushSnapshot()` - SQLite push snapshot

### snapshotsDiffer.ts

Calculates differences between schema snapshots:

- `applyPgSnapshotsDiff()` - PostgreSQL diff
- `applyMysqlSnapshotsDiff()` - MySQL diff
- `applySqliteSnapshotsDiff()` - SQLite diff
- `applySingleStoreSnapshotsDiff()` - SingleStore diff
- `applyLibSQLSnapshotsDiff()` - LibSQL/Turso diff

### Serializer Modules

Per-dialect serializers convert Drizzle schema to JSON snapshots:

| Dialect | Serializer | Schema |
|--------|------------|--------|
| PostgreSQL | `pgSerializer.ts` | `pgSchema.ts` |
| MySQL | `mysqlSerializer.ts` | `mysqlSchema.ts` |
| SQLite | `sqliteSerializer.ts` | `sqliteSchema.ts` |
| SingleStore | `singlestoreSerializer.ts` | `singlestoreSchema.ts` |

## Prompt/Resolution System

The CLI uses `hanji` (a terminal UI library) for interactive prompts when conflicts are detected:

- `promptColumnsConflicts()` - Column rename/delete conflicts
- `promptNamedConflict()` - Role/policy conflicts
- `promptNamedWithSchemasConflict()` - Table/enum/sequence/view conflicts
- `promptSchemasConflict()` - Schema conflicts

## Key Dependencies

- `@drizzle-team/brocli` - CLI framework
- `hanji` - Terminal UI/prompts
- `chalk` - Terminal colors
- `glob` - File globbing
- `tsx` - TypeScript execution
- `zod` - Schema validation
- `drizzle-orm` - ORM core
