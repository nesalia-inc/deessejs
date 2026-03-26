# Deesse DB Commands

## Overview

Wrapper commands around `drizzle-kit` that read configuration from `deesse.config.ts` instead of requiring a separate `drizzle.config.ts`.

## Commands

```bash
deesse db:generate   # Generate migrations from schema changes
deesse db:migrate    # Apply pending migrations to database
deesse db:push       # Push schema changes directly (dev only)
deesse db:studio     # Open Drizzle Studio (database browser)
```

## Design

### Problem

`drizzle-kit` requires a `drizzle.config.ts` file:

```typescript
// drizzle.config.ts (separate from deesse.config.ts)
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
});
```

This is redundant when `deesse.config.ts` already contains the database configuration.

### Solution

`deesse db:*` commands:

1. Read `deesse.config.ts` via dynamic import
2. Generate a temporary `drizzle.config.ts` based on that config
3. Execute `drizzle-kit` with the generated config
4. (Optionally) clean up the temp config after execution

```typescript
// Simplified flow
async function dbGenerate() {
  // 1. Load deesse config
  const config = await import('@deesse-config');
  const db = config.database;

  // 2. Infer dialect from database driver
  const dialect = inferDialect(db); // 'postgresql' | 'mysql' | 'sqlite'

  // 3. Generate drizzle.config.ts
  const configContent = `
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: '${dialect}',
});
  `;
  await fs.writeFile('drizzle.config.ts', configContent);

  // 4. Execute drizzle-kit
  execSync('npx drizzle-kit generate', { stdio: 'inherit' });
}
```

## Implementation Details

### Dialect Inference

```typescript
function inferDialect(db: PostgresJsDatabase): 'postgresql';
function inferDialect(db: MySqlDatabase): 'mysql';
function inferDialect(db: SqliteDatabase): 'sqlite';
```

The dialect is inferred from the Drizzle database type.

### Schema Path

Convention: `./src/schema.ts`

```typescript
const SCHEMA_PATH = './src/schema.ts';
```

### Migrations Output Directory

Convention: `./drizzle`

```typescript
const MIGRATIONS_OUT = './drizzle';
```

### Config File Generation

The generated `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql', // or mysql, sqlite
});
```

## CLI Structure

```typescript
// src/index.ts

const DB_COMMANDS = {
  'db:generate': { drizzle: 'generate', description: 'Generate migrations' },
  'db:migrate': { drizzle: 'migrate', description: 'Apply migrations' },
  'db:push': { drizzle: 'push', description: 'Push schema (dev only)' },
  'db:studio': { drizzle: 'studio', description: 'Open database browser' },
} as const;

type DbCommand = keyof typeof DB_COMMANDS;

async function handleDbCommand(command: DbCommand) {
  const { drizzle } = DB_COMMANDS[command];

  // Load deesse config and generate drizzle config
  await generateDrizzleConfig();

  // Execute drizzle-kit
  execSync(`npx drizzle-kit ${drizzle}`, { stdio: 'inherit' });
}
```

## Alternative: Direct drizzle-kit API

Instead of generating a config file, we could call drizzle-kit's programmatic API directly if available:

```typescript
import { generate, migrate, push, studio } from 'drizzle-kit';

const config = await import('@deesse-config');

await generate({
  schema: config.database,
  out: './drizzle',
  dialect: 'postgresql',
});
```

**Note**: This requires checking if drizzle-kit exposes these functions publicly.

## Open Questions

1. **Schema path**: Is `./src/schema.ts` the right convention?
2. **Migrations out**: Is `./drizzle` the right convention?
3. **Temp config cleanup**: Should we delete `drizzle.config.ts` after execution?
4. **Existing drizzle.config.ts**: How to handle if user already has one?
5. **Drizzle Kit API**: Does drizzle-kit expose a programmatic API?
