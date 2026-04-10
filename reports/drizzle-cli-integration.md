# Drizzle-Kit CLI Integration Report

## Table of Contents
1. [How drizzle-kit's CLI Works Programmatically](#1-how-drizzle-kits-cli-works-programmatically)
2. [Core Functions for Generate and Push Operations](#2-core-functions-for-generate-and-push-operations)
3. [API Patterns for Introspection and Migration Generation](#3-api-patterns-for-introspection-and-migration-generation)
4. [How to Integrate into a CLI Tool](#4-how-to-integrate-into-a-cli-tool)

---

## 1. How drizzle-kit's CLI Works Programmatically

### 1.1 CLI Architecture Overview

The drizzle-kit CLI is built on `@drizzle-team/brocli` (a CLI framework) and exposes commands through `src/cli/index.ts`:

```typescript
import { command, run } from '@drizzle-team/brocli';
// Commands imported from ./schema
import { check, drop, exportRaw, generate, migrate, pull, push, studio, up } from './schema';

run([generate, migrate, pull, push, studio, up, check, drop, exportRaw, ...legacy], {
    name: 'drizzle-kit',
    version: version,
});
```

### 1.2 Available Commands

From `src/cli/schema.ts`, the CLI provides these commands:

| Command | Purpose |
|---------|---------|
| `generate` | Generate migration files from schema diffs |
| `migrate` | Apply migrations to database |
| `push` | Push schema changes directly to database (introspection-based) |
| `introspect` (aliases: `pull`) | Generate TypeScript schema from existing database |
| `studio` | Start Drizzle Studio server |
| `check` | Verify configuration |
| `drop` | Drop migrations |
| `export` | Generate SQL diff without migrations |

### 1.3 Configuration System

The configuration is defined in `src/cli/schema.ts` and exported as `Config` type in `src/schemaValidator.ts`. The key configuration options are:

```typescript
type Config = {
    dialect: 'postgresql' | 'mysql' | 'sqlite' | 'singlestore' | 'turso' | 'gel';
    schema?: string | string[];  // Path to schema files
    out?: string;                 // Output folder for migrations
    driver?: 'aws-data-api' | 'd1-http' | 'expo' | 'turso' | 'pglite' | 'durable-sqlite';
    breakpoints?: boolean;        // Enable SQL statement breakpoints
    tablesFilter?: string | string[];
    schemaFilter?: string | string[];
    verbose?: boolean;
    strict?: boolean;
    casing?: 'camelCase' | 'snake_case';
    migrations?: { table?: string; schema?: string; prefix?: Prefix };
    introspect?: { casing: 'camel' | 'preserve' };
    entities?: { roles?: boolean | { provider?: 'supabase' | 'neon'; exclude?: string[]; include?: string[] } };
} & DatabaseCredentials;
```

### 1.4 Command Flow

For each command, the flow is:

1. **Parse/Transform Options** - Validate and transform CLI options via `transform` function
2. **Load Configuration** - If `--config` provided, load from `drizzle.config.ts`
3. **Execute Handler** - Call the appropriate handler function

Example from `generate` command:
```typescript
export const generate = command({
    name: 'generate',
    options: { config, dialect, driver, casing, schema, out, name, breakpoints, custom, prefix },
    transform: async (opts) => {
        return prepareGenerateConfig(opts, from);
    },
    handler: async (opts) => {
        await assertOrmCoreVersion();
        await assertPackages('drizzle-orm');

        if (dialect === 'postgresql') {
            await prepareAndMigratePg(opts);
        } else if (dialect === 'mysql') {
            await prepareAndMigrateMysql(opts);
        }
        // ... other dialects
    },
});
```

---

## 2. Core Functions for Generate and Push Operations

### 2.1 Programmatic API Export

The main programmatic API is exported from `src/api.ts`. This is what CLI tools should use instead of spawning subprocesses.

#### Key Exports from `api.ts`:

```typescript
// PostgreSQL
export const generateDrizzleJson = (imports, prevId?, schemaFilters?, casing?) => PgSchemaKit
export const generateMigration = async (prev: DrizzleSnapshotJSON, cur: DrizzleSnapshotJSON) => string[]
export const pushSchema = async (imports, drizzleInstance, schemaFilters?, tablesFilter?, extensionsFilters?) => PushResult

// SQLite
export const generateSQLiteDrizzleJson = async (imports, prevId?, casing?) => SQLiteSchemaKit
export const generateSQLiteMigration = async (prev, cur) => string[]
export const pushSQLiteSchema = async (imports, drizzleInstance) => PushResult

// MySQL
export const generateMySQLDrizzleJson = async (imports, prevId?, casing?) => MySQLSchemaKit
export const generateMySQLMigration = async (prev, cur) => string[]
export const pushMySQLSchema = async (imports, drizzleInstance, databaseName) => PushResult

// SingleStore
export const generateSingleStoreDrizzleJson = async (imports, prevId?, casing?) => SingleStoreSchemaKit
export const generateSingleStoreMigration = async (prev, cur) => string[]
export const pushSingleStoreSchema = async (imports, drizzleInstance, databaseName) => PushResult

// Studio
export const startStudioPostgresServer = async (imports, credentials, options?) => void
export const startStudioSQLiteServer = async (imports, credentials, options?) => void
export const startStudioMySQLServer = async (imports, credentials, options?) => void
export const startStudioSingleStoreServer = async (imports, credentials, options?) => void
```

### 2.2 Schema Serialization Functions

From `src/serializer/index.ts`:

```typescript
// Serialize schema files to intermediate format
export const serializePg = async (path, casing?, schemaFilter?) => PgSchemaInternal
export const serializeMySql = async (path, casing?) => MySqlSchemaInternal
export const serializeSQLite = async (path, casing?) => SQLiteSchemaInternal
export const serializeSingleStore = async (path, casing?) => SingleStoreSchemaInternal

export const prepareFilenames = (path: string | string[]) => string[]
```

### 2.3 Snapshot Generation

From `src/serializer/pgSerializer.ts`:

```typescript
// Generate schema snapshot from drizzle-orm table definitions
export const generatePgSnapshot = (
    tables: AnyPgTable[],
    enums: PgEnum<any>[],
    schemas: PgSchema[],
    sequences: PgSequence[],
    roles: PgRole[],
    policies: PgPolicy[],
    views: PgView[],
    matViews: PgMaterializedView[],
    casing?: CasingType,
    schemaFilter?: string[]
) => PgSchemaInternal
```

### 2.4 Database Introspection

From `src/serializer/pgSerializer.ts`:

```typescript
// Introspect existing database and return schema
export const fromDatabase = async (
    db: DB,
    tablesFilter?: (table: string) => boolean = () => true,
    schemaFilters?: string[],
    entities?: { roles?: boolean | { provider?: string; include?: string[]; exclude?: string[] } },
    progressCallback?: (stage: IntrospectStage, count: number, status: IntrospectStatus) => void,
    tsSchema?: PgSchemaInternal
) => Promise<PgSchemaInternal>
```

From `src/cli/commands/pgIntrospect.ts`:

```typescript
// Used by push command to introspect database for comparison
export const pgPushIntrospect = async (
    db: DB,
    filters: string[],
    schemaFilters: string[],
    entities: Entities,
    tsSchema?: PgSchemaInternal
) => { schema: PgSchema }
```

### 2.5 Migration Preparation

From `src/migrationPreparator.ts`:

```typescript
// For generate command - uses existing snapshots
export const preparePgMigrationSnapshot = async (snapshots, schemaPath, casing?) => { prev, cur, custom }
export const prepareMySqlMigrationSnapshot = async (migrationFolders, schemaPath, casing?) => { prev, cur, custom }
export const prepareSqliteMigrationSnapshot = async (snapshots, schemaPath, casing?) => { prev, cur, custom }
export const prepareSingleStoreMigrationSnapshot = async (snapshots, schemaPath, casing?) => { prev, cur, custom }

// For push command - introspects database
export const preparePgDbPushSnapshot = async (prev, schemaPath, casing?, schemaFilter?) => { prev, cur }
export const prepareMySqlDbPushSnapshot = async (prev, schemaPath, casing?) => { prev, cur }
export const prepareSQLiteDbPushSnapshot = async (prev, schemaPath, casing?) => { prev, cur }
export const prepareSingleStoreDbPushSnapshot = async (prev, schemaPath, casing?) => { prev, cur }
```

### 2.6 Push Operation Workflow

From `src/cli/commands/push.ts`, the push operation for PostgreSQL follows this pattern:

```typescript
export const pgPush = async (
    schemaPath: string | string[],
    verbose: boolean,
    strict: boolean,
    credentials: PostgresCredentials,
    tablesFilter: string[],
    schemasFilter: string[],
    entities: Entities,
    force: boolean,
    casing: CasingType | undefined,
) => {
    // 1. Connect to database
    const db = await preparePostgresDB(credentials);

    // 2. Serialize current schema from TypeScript files
    const serialized = await serializePg(schemaPath, casing, schemasFilter);

    // 3. Introspect database to get current state
    const { schema: prev } = await pgPushIntrospect(db, tablesFilter, schemasFilter, entities, serialized);

    // 4. Prepare push statements
    const statements = await preparePgPush({ id: randomUUID(), prevId: schema.id, ...serialized }, schema);

    // 5. Check for data loss and get confirmation
    const { shouldAskForApprove, statementsToExecute, infoToPrint } = await pgSuggestions(db, statements.statements);

    // 6. Execute statements if approved
    if (force || approved) {
        for (const dStmnt of statementsToExecute) {
            await db.query(dStmnt);
        }
    }
}
```

---

## 3. API Patterns for Introspection and Migration Generation

### 3.1 Introspection API Pattern

**Purpose**: Generate TypeScript schema from existing database.

```typescript
// 1. Create a database abstraction (DB interface)
type DB = {
    query: (query: string, params?: any[]) => Promise<any[]>;
};

// 2. Call fromDatabase with filters
const introspectedSchema = await fromDatabase(
    db,                                    // Database connection
    (tableName) => tableName.startsWith('my_'),  // Optional filter
    ['public', 'custom'],                  // Schema filters (for PostgreSQL)
    { roles: true },                       // Optional entity filtering
    (stage, count, status) => console.log(`${stage}: ${count}`),  // Progress callback
    tsSchema                               // Optional existing schema for comparison
);
```

**Key Introspection Functions**:
- `src/serializer/pgSerializer.ts` - `fromDatabase()` for PostgreSQL
- `src/serializer/mysqlSerializer.ts` - `fromDatabase()` for MySQL
- `src/serializer/sqliteSerializer.ts` - `fromDatabase()` for SQLite
- `src/serializer/singlestoreSerializer.ts` - `fromDatabase()` for SingleStore

**Output**: Returns a schema JSON object with tables, columns, indexes, foreign keys, views, enums, etc.

### 3.2 Migration Generation API Pattern

**Purpose**: Generate SQL migration files from schema diff.

```typescript
// 1. Get previous snapshot (from existing migration folder)
const prevSnapshot = JSON.parse(fs.readFileSync(lastMigrationFile));

// 2. Get current schema from TypeScript files
const currentSchema = await serializePg(schemaPath, casing);

// 3. Compute diff and generate SQL
const sqlStatements = await generateMigration(prevSnapshot, currentSchema);

// 4. Write to migration file
fs.writeFileSync(`drizzle/${tag}.sql`, sqlStatements.join('\n'));
```

### 3.3 Push Schema API Pattern

**Purpose**: Directly push schema changes to database without migration files.

```typescript
// 1. Create DB wrapper for drizzle instance
const db: DB = {
    query: async (query: string, params?: any[]) => {
        const res = await drizzleInstance.execute(sql.raw(query));
        return res.rows;
    },
};

// 2. Call pushSchema
const result = await pushSchema(
    imports,           // The schema exports (table definitions)
    db,                // Database wrapper
    ['public'],       // schemaFilters
    ['table_*'],      // tablesFilter
    undefined          // extensionsFilters
);

// 3. Handle result
result.hasDataLoss    // boolean - whether statements cause data loss
result.warnings       // string[] - warnings about data loss
result.statementsToExecute  // string[] - SQL statements to run
result.apply()        // Async function to execute all statements
```

### 3.4 Push Result Interface

```typescript
type PushResult = {
    hasDataLoss: boolean;        // Whether any statements cause data loss
    warnings: string[];          // Warning messages
    statementsToExecute: string[]; // SQL statements to execute
    apply: () => Promise<void>;   // Execute all statements
}
```

### 3.5 Resolver Pattern for Conflict Resolution

Drizzle-kit uses resolver functions to handle schema conflicts (renames, deletes, etc.). These are async functions that prompt the user or auto-resolve:

```typescript
// From src/cli/commands/migrate.ts
export const tablesResolver = async (input: ResolverInput<Table>) => {
    const { created, deleted, moved, renamed } = await promptNamedWithSchemasConflict(
        input.created,
        input.deleted,
        'table',
    );
    return { created, deleted, moved, renamed };
};

export const columnsResolver = async (input: ColumnsResolverInput<Column>) => {
    const result = await promptColumnsConflicts(input.tableName, input.created, input.deleted);
    return { created: result.created, deleted: result.deleted, renamed: result.renamed };
};
```

For programmatic use without user interaction, these resolvers can be replaced with auto-resolution logic.

---

## 4. How to Integrate into a CLI Tool

### 4.1 Recommended Approach: Direct API Import

Instead of spawning `npx drizzle-kit` subprocess, import drizzle-kit functions directly:

```typescript
import {
    generateDrizzleJson,
    generateMigration,
    pushSchema,
    generateSQLiteDrizzleJson,
    generateSQLiteMigration,
    pushSQLiteSchema,
} from 'drizzle-kit/api';
```

### 4.2 Schema File Loading Pattern

Use `prepareFilenames` to load schema files:

```typescript
import { prepareFilenames, serializePg } from 'drizzle-kit/serializer';

const filenames = prepareFilenames('./src/db/*.ts');
const schemaSnapshot = await serializePg(filenames, 'camelCase');
```

### 4.3 DB Interface Requirement

Drizzle-kit needs a `DB` interface wrapper around your drizzle instance:

```typescript
type DB = {
    query: (query: string, params?: any[]) => Promise<any[]>;
};

// For PostgreSQL with drizzle-orm
const db: DB = {
    query: async (query: string, params?: any[]) => {
        const res = await drizzleInstance.execute(sql.raw(query));
        return res.rows;
    },
};
```

### 4.4 Generate Command Implementation Pattern

```typescript
async function generateMigrations(options: {
    schemaPath: string | string[];
    outFolder: string;
    dialect: 'postgresql' | 'mysql' | 'sqlite' | 'singlestore';
    casing?: 'camelCase' | 'snake_case';
}) {
    // 1. Load schema files
    const filenames = prepareFilenames(options.schemaPath);

    // 2. Serialize current schema
    let currentSchema;
    if (options.dialect === 'postgresql') {
        currentSchema = await serializePg(filenames, options.casing);
    } else if (options.dialect === 'sqlite') {
        currentSchema = await serializeSQLite(filenames, options.casing);
    }
    // ... other dialects

    // 3. Load previous snapshot from migrations folder
    const snapshots = glob.sync(`${options.outFolder}/meta/*_snapshot.json`);
    const prevSnapshot = snapshots.length > 0
        ? JSON.parse(fs.readFileSync(snapshots[snapshots.length - 1]))
        : getEmptySnapshot(options.dialect); // Use dry schema for new projects

    // 4. Generate migration
    let sqlStatements;
    if (options.dialect === 'postgresql') {
        sqlStatements = await generateMigration(prevSnapshot, currentSchema);
    } else if (options.dialect === 'sqlite') {
        sqlStatements = await generateSQLiteMigration(prevSnapshot, currentSchema);
    }

    // 5. Write migration file
    const tag = generateMigrationTag();
    fs.writeFileSync(`${options.outFolder}/${tag}.sql`, sqlStatements.join('\n'));

    // 6. Write snapshot
    fs.writeFileSync(`${options.outFolder}/meta/${tag}_snapshot.json`, JSON.stringify(currentSchema, null, 2));

    // 7. Update journal
    updateJournal(options.outFolder, tag, currentSchema.version);
}
```

### 4.5 Push Command Implementation Pattern

```typescript
async function pushSchemaToDatabase(options: {
    schemaPath: string | string[];
    dialect: 'postgresql' | 'mysql' | 'sqlite' | 'singlestore';
    db: DB;
    tablesFilter?: string[];
    schemaFilter?: string[];
    force?: boolean;
    verbose?: boolean;
}) {
    // 1. Serialize schema files
    let currentSchema;
    if (options.dialect === 'postgresql') {
        currentSchema = await serializePg(options.schemaPath, undefined, options.schemaFilter);
    }

    // 2. Introspect database
    const introspected = await fromDatabase(
        options.db,
        (table) => matchesFilter(table, options.tablesFilter),
        options.schemaFilter ?? ['public']
    );

    // 3. Get push statements
    const result = await pushSchema(
        getSchemaImports(options.schemaPath), // Need to load actual table definitions
        options.db,
        options.schemaFilter,
        options.tablesFilter
    );

    // 4. Check for data loss
    if (result.hasDataLoss && !options.force) {
        console.warn('Data loss warnings:', result.warnings);
        const approved = await promptConfirmation();
        if (!approved) return;
    }

    // 5. Execute
    if (options.verbose) {
        console.log('Statements to execute:', result.statementsToExecute);
    }
    await result.apply();
}
```

### 4.6 Introspect Command Implementation Pattern

```typescript
async function introspectDatabase(options: {
    db: DB;
    dialect: 'postgresql' | 'mysql' | 'sqlite' | 'singlestore';
    outPath: string;
    tablesFilter?: string[];
    schemaFilter?: string[];
    casing?: 'camel' | 'preserve';
}) {
    // 1. Introspect database
    const schema = await fromDatabase(
        options.db,
        (table) => matchesFilter(table, options.tablesFilter),
        options.schemaFilter ?? ['public'],
        undefined, // entities
        undefined, // progressCallback
    );

    // 2. Convert to TypeScript
    let tsCode;
    if (options.dialect === 'postgresql') {
        tsCode = postgresSchemaToTypeScript(schema, options.casing);
    } else if (options.dialect === 'sqlite') {
        tsCode = sqliteSchemaToTypeScript(schema, options.casing);
    }

    // 3. Write schema file
    fs.writeFileSync(join(options.outPath, 'schema.ts'), tsCode.file);

    // 4. Write relations file if applicable
    if (tsCode.relationsFile) {
        fs.writeFileSync(join(options.outPath, 'relations.ts'), tsCode.relationsFile);
    }
}
```

### 4.7 Key Dependencies to Install

```json
{
    "dependencies": {
        "drizzle-kit": "workspace version or specific version",
        "drizzle-orm": "matching version"
    }
}
```

### 4.8 Import Paths

Based on drizzle-kit package.json exports:

```typescript
// Main API
import { generateDrizzleJson, generateMigration, pushSchema } from 'drizzle-kit/api';

// Serializer functions (for schema file processing)
import { serializePg, serializeMySql, serializeSQLite, serializeSingleStore } from 'drizzle-kit/serializer';
import { prepareFilenames } from 'drizzle-kit/serializer';

// Schema types
import type { PgSchema, PgSchemaInternal } from 'drizzle-kit/serializer/pgSchema';
import type { SQLiteSchema, SQLiteSchemaInternal } from 'drizzle-kit/serializer/sqliteSchema';
import type { MySqlSchema, MySqlSchemaInternal } from 'drizzle-kit/serializer/mysqlSchema';

// DB interface
import type { DB } from 'drizzle-kit/utils';
```

### 4.9 Important Implementation Notes

1. **Schema version handling**: Drizzle-kit uses UUID-based versioning. The `prevId` field links snapshots in a chain.

2. **Casing options**: The `casing` parameter ('camelCase' | 'snake_case') affects how column/table names are serialized in snapshots.

3. **Push vs Generate**:
   - **Generate** compares schema files against existing snapshots in migration folder
   - **Push** compares schema files against live database (via introspection)

4. **Data loss detection**: Push operations detect potentially destructive statements (DROP TABLE, TRUNCATE, etc.) and require confirmation unless `--force` is used.

5. **Breakpoints**: For databases that don't support multiple DDL statements in a transaction (MySQL, SQLite, SingleStore), migrations include `-- statement-breakpoint` markers.

6. **Error handling**: All async operations can throw. Wrap in try-catch and handle appropriately.

7. **TypeScript compilation**: Schema files need to be executed with tsx or similar runtime to import actual table definitions.

---

## 5. Summary: Key Functions Reference

| Operation | Function | File |
|-----------|----------|------|
| Serialize schema files | `serializePg(path, casing, schemaFilter?)` | `serializer/index.ts` |
| Generate snapshot from tables | `generatePgSnapshot(tables, enums, ...)` | `serializer/pgSerializer.ts` |
| Introspect database | `fromDatabase(db, filter, schemas, entities, callback, tsSchema?)` | `serializer/pgSerializer.ts` |
| Generate migration SQL | `generateMigration(prev, cur)` | `api.ts` |
| Push schema to DB | `pushSchema(imports, db, schemaFilters?, tablesFilter?)` | `api.ts` |
| Prepare migration snapshot | `preparePgMigrationSnapshot(snapshots, path, casing)` | `migrationPreparator.ts` |
| Prepare push snapshot | `preparePgDbPushSnapshot(prev, path, casing, schemaFilter)` | `migrationPreparator.ts` |

---

## 6. Current Deesse CLI Issues

The current implementation in `packages/cli/src/commands/db/generate.ts` and `packages/cli/src/commands/db/push.ts` uses:

```typescript
execSync('npx drizzle-kit generate', { cwd, stdio: 'inherit' });
```

**Problems with this approach:**
1. Spawns a subprocess which may fail if npx is not available
2. Cannot capture/control output programmatically
3. Error handling is limited
4. Cannot integrate with deesse's plugin system during migration generation

**Recommended fix**: Use drizzle-kit's programmatic API as described in section 4.
