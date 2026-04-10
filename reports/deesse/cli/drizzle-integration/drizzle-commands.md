# Drizzle Kit Commands Reference

## Overview: The CLI Wrapper

The `@deessejs/cli` package wraps `drizzle-kit` to provide a unified CLI experience. Users invoke commands via `npx @deessejs/cli` instead of calling `drizzle-kit` directly.

**Key points:**

- `@deessejs/cli` exposes database commands under the `db:` namespace
- Available commands: `db:generate`, `db:migrate`, `db:push` (and more)
- Configuration is inherited from `drizzle.config.ts` - no need to specify `--config`
- The CLI wraps drizzle-kit, so all underlying drizzle-kit options are supported

**Command mapping:**

| @deessejs/cli Command | drizzle-kit Command (internal) |
|----------------------|-------------------------------|
| `npx @deessejs/cli db:generate` | `drizzle-kit generate` |
| `npx @deessejs/cli db:migrate` | `drizzle-kit migrate` |
| `npx @deessejs/cli db:push` | `drizzle-kit push` |

**Example usage:**

```bash
npx @deessejs/cli db:generate
npx @deessejs/cli db:migrate
npx @deessejs/cli db:push --force
```

## generate

Generates migration SQL files by comparing the current schema with the previous snapshot.

**Usage:**
```bash
npx @deessejs/cli db:generate
npx @deessejs/cli db:generate --config=path/to/config
npx @deessejs/cli db:generate --dialect=postgresql --schema=./src/db/schema
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |
| `--dialect` | `Dialect` | Database dialect |
| `--driver` | `Driver` | Database driver |
| `--schema` | `string \| string[]` | Path to schema file(s) |
| `--out` | `string` | Output folder (default: `drizzle`) |
| `--name` | `string` | Migration file name |
| `--breakpoints` | `boolean` | Enable statement breakpoints (default: true) |
| `--custom` | `boolean` | Create empty migration file (default: false) |
| `--prefix` | `Prefix` | Filename prefix mode |
| `--casing` | `CasingType` | Casing: `camelCase` or `snake_case` |

### Flow

1. Load configuration (from file or CLI options)
2. Read previous migration snapshots from `out/meta/` folder
3. Serialize current schema from `schema` paths
4. Compare schemas using `snapshotsDiffer`
5. Generate SQL migration file
6. Update `_journal.json` with new entry

### Output

- SQL migration file: `{out}/{tag}.sql`
- Snapshot file: `{out}/meta/{prefix}_snapshot.json`
- Updated journal: `{out}/meta/_journal.json`

### Example

```bash
# Basic usage with config file
npx @deessejs/cli db:generate

# With custom schema path
npx @deessejs/cli db:generate --schema=./src/db/schema

# With custom output folder
npx @deessejs/cli db:generate --out=./migrations

# Create empty migration file for custom SQL
npx @deessejs/cli db:generate --custom --name=add_users_table
```

---

## migrate

Applies existing migration files to the database.

**Usage:**
```bash
npx @deessejs/cli db:migrate
npx @deessejs/cli db:migrate --config=path/to/config
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |

### Flow

1. Load configuration from config file
2. Connect to database using `dbCredentials`
3. Read migration files from `out` folder
4. Execute migrations in order using Drizzle ORM's migrator
5. Track applied migrations in `__drizzle_migrations` table (or custom table/schema)

### Database Support

- PostgreSQL: Uses `drizzle-orm/postgres-js/migrator` or `drizzle-orm/node-postgres/migrator`
- MySQL: Uses `drizzle-orm/mysql2/migrator`
- SQLite: Uses `drizzle-orm/better-sqlite3/migrator`
- Turso: Uses `drizzle-orm/libsql/migrator`
- SingleStore: Uses `drizzle-orm/singlestore/migrator`

### Example

```bash
# Apply all pending migrations
npx @deessejs/cli db:migrate

# With custom config
npx @deessejs/cli db:migrate --config=production.config.ts
```

---

## push

Pushes schema changes directly to the database without creating migration files.

**Usage:**
```bash
npx @deessejs/cli db:push
npx @deessejs/cli db:push --config=path/to/config
npx @deessejs/cli db:push --verbose --strict
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |
| `--dialect` | `Dialect` | Database dialect |
| `--schema` | `string \| string[]` | Path to schema file(s) |
| `--tablesFilter` | `string \| string[]` | Filter tables by glob |
| `--schemaFilter` | `string \| string[]` | Filter schemas (PostgreSQL) |
| `--extensionsFilters` | `string` | Extension filter (e.g., `postgis`) |
| `--verbose` | `boolean` | Print all statements (default: false) |
| `--strict` | `boolean` | Always ask confirmation (default: false) |
| `--force` | `boolean` | Auto-approve data loss statements (default: false) |
| `--casing` | `CasingType` | Casing: `camelCase` or `snake_case` |

### Flow

1. Introspect current database schema
2. Serialize schema from `schema` paths
3. Compare current DB schema with desired schema
4. Generate SQL statements for changes
5. If `strict` or data-loss detected, prompt for confirmation
6. Execute statements on database

### Data Loss Handling

The `push` command detects potential data loss operations:
- Dropping tables
- Dropping columns
- Truncating tables

When detected:
- If `strict: true`, always asks for confirmation
- If `force: true`, auto-approves
- Otherwise, only asks if data-loss statements exist

### Example

```bash
# Basic push
npx @deessejs/cli db:push

# Verbose output showing all statements
npx @deessejs/cli db:push --verbose

# Strict mode - always ask for confirmation
npx @deessejs/cli db:push --strict

# Force mode - auto-approve all statements
npx @deessejs/cli db:push --force

# Filter specific tables
npx @deessejs/cli db:push --tablesFilter='myapp_*'

# PostgreSQL schema filter
npx @deessejs/cli db:push --schemaFilter='public' --schemaFilter='admin'
```

---

## introspect / pull

Reverse engineers the database schema and generates Drizzle schema files.

**Usage:**
```bash
npx @deessejs/cli db:introspect
npx @deessejs/cli db:introspect --out=./src/db
npx @deessejs/cli db:introspect --config=path/to/config
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |
| `--dialect` | `Dialect` | Database dialect |
| `--out` | `string` | Output folder (default: `drizzle`) |
| `--breakpoints` | `boolean` | Enable statement breakpoints (default: true) |
| `--introspect-casing` | `string` | `camel` or `preserve` (default: `camel`) |
| `--tablesFilter` | `string \| string[]` | Filter tables by glob |
| `--schemaFilter` | `string \| string[]` | Filter schemas (PostgreSQL) |

### Flow

1. Connect to database using `dbCredentials`
2. Introspect database for tables, columns, indexes, etc.
3. Generate Drizzle schema structure
4. Write schema files to `out` folder
5. Create migration file with commented SQL

### Output

- Schema files in `out` folder
- Migration file in `out/{tag}.sql` (commented, for reference)

### Example

```bash
# Basic introspection
npx @deessejs/cli db:introspect

# Custom output directory
npx @deessejs/cli db:introspect --out=./src/db

# With specific tables filter
npx @deessejs/cli db:introspect --tablesFilter='app_*'
```

---

## check

Validates the configuration and schema files.

**Usage:**
```bash
npx @deessejs/cli db:check
npx @deessejs/cli db:check --config=path/to/config
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |
| `--dialect` | `Dialect` | Database dialect |
| `--out` | `string` | Output folder |

### Flow

1. Load configuration
2. Validate all required parameters are present
3. Test database connection
4. Verify schema files can be loaded

### Example

```bash
npx @deessejs/cli db:check
npx @deessejs/cli db:check --config=production.config.ts
```

---

## up

Marks specific migrations as applied without executing them.

**Usage:**
```bash
npx @deessejs/cli db:up
npx @deessejs/cli db:up --config=path/to/config
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |
| `--dialect` | `Dialect` | Database dialect |
| `--out` | `string` | Output folder |

### Flow

1. Load migration files from `out` folder
2. Insert records into migration tracking table
3. Skip actual SQL execution

### Example

```bash
npx @deessejs/cli db:up
```

---

## drop

Removes migration tracking records.

**Usage:**
```bash
npx @deessejs/cli db:drop
npx @deessejs/cli db:drop --config=path/to/config
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |
| `--out` | `string` | Output folder |
| `--driver` | `Driver` | Database driver |

### Example

```bash
npx @deessejs/cli db:drop
```

---

## studio

Starts a web-based interface for exploring and editing the database schema.

**Usage:**
```bash
npx @deessejs/cli db:studio
npx @deessejs/cli db:studio --port=4983 --host=0.0.0.0
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |
| `--port` | `number` | Server port (default: 4983) |
| `--host` | `string` | Server host (default: 0.0.0.0) |
| `--verbose` | `boolean` | Print all executed statements |

### Access

Opens at `https://local.drizzle.studio` (or with custom port/host params)

### Example

```bash
# Default settings
npx @deessejs/cli db:studio

# Custom port
npx @deessejs/cli db:studio --port=3000

# Custom host
npx @deessejs/cli db:studio --host=127.0.0.1

# Verbose mode
npx @deessejs/cli db:studio --verbose
```

---

## export

Generates a SQL diff between the current schema and an empty state.

**Usage:**
```bash
npx @deessejs/cli db:export
npx @deessejs/cli db:export --config=path/to/config
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--config` | `string` | Path to config file |
| `--dialect` | `Dialect` | Database dialect |
| `--schema` | `string \| string[]` | Path to schema file(s) |
| `--sql` | `boolean` | Generate SQL (default: true) |

### Example

```bash
npx @deessejs/cli db:export
```

---

## Dialect-Specific Commands

### PostgreSQL

| Command | File | Description |
|---------|------|-------------|
| `generate` | `src/cli/schema.ts` | Standard generate for PostgreSQL |
| `push` | `src/cli/commands/push.ts` | Uses `pgPushIntrospect` and `pgPushUtils` |
| `introspect` | `src/cli/commands/pgIntrospect.ts` | Uses `pgPushIntrospect` |
| `up` | `src/cli/commands/pgUp.ts` | Marks migrations as applied |
| `check` | `src/cli/commands/check.ts` | Validates PostgreSQL config |

### MySQL

| Command | File | Description |
|---------|------|-------------|
| `generate` | `src/cli/schema.ts` | Standard generate for MySQL |
| `push` | `src/cli/commands/push.ts` | Uses `mysqlIntrospect` and `mysqlPushUtils` |
| `introspect` | `src/cli/commands/mysqlIntrospect.ts` | Uses `mysqlPushIntrospect` |
| `up` | `src/cli/commands/mysqlUp.ts` | Marks migrations as applied |
| `check` | `src/cli/commands/check.ts` | Validates MySQL config |

### SQLite

| Command | File | Description |
|---------|------|-------------|
| `generate` | `src/cli/schema.ts` | Standard generate for SQLite |
| `push` | `src/cli/commands/push.ts` | Uses `sqliteIntrospect` and `sqlitePushUtils` |
| `introspect` | `src/cli/commands/sqliteIntrospect.ts` | Uses `sqlitePushIntrospect` |
| `up` | `src/cli/commands/sqliteUp.ts` | Marks migrations as applied |
| `check` | `src/cli/commands/check.ts` | Validates SQLite config |

### SingleStore

| Command | File | Description |
|---------|------|-------------|
| `generate` | `src/cli/schema.ts` | Standard generate for SingleStore |
| `push` | `src/cli/commands/push.ts` | Uses `singlestoreIntrospect` and `singlestorePushUtils` |
| `introspect` | `src/cli/commands/singlestoreIntrospect.ts` | Uses `singlestorePushIntrospect` |
| `up` | `src/cli/commands/singlestoreUp.ts` | Marks migrations as applied |
| `check` | `src/cli/commands/check.ts` | Validates SingleStore config |
