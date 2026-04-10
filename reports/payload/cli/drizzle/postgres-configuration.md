# PostgreSQL Configuration in Payload CMS

## Database Adapter Configuration

Payload CMS uses `@payloadcms/db-postgres` for PostgreSQL support. Below are all configuration options available when setting up a PostgreSQL database connection.

## Core Configuration Options

### `pool` (PoolConfig)

Connection pool configuration passed directly to `pg.Pool`:

```typescript
pool?: PoolConfig
```

Key properties:
- `max` - Maximum number of clients in pool
- `idleTimeoutMillis` - Client idle timeout before closing
- `connectionTimeoutMillis` - Time to wait for connection
- `ssl` - SSL configuration object

### `poolOptions` (PoolConfig)

Alternative pool options location. Used interchangeably with `pool`:

```typescript
poolOptions?: PoolConfig
```

### `connectionString` (string)

PostgreSQL connection string:

```typescript
connectionString: string
// Example: 'postgresql://user:password@localhost:5432/payload'
```

### `idType` ('serial' | 'uuid')

Controls how primary keys are generated:

```typescript
idType?: 'serial' | 'uuid'
```

- `'serial'` - Auto-incrementing integer IDs (default)
- `'uuid'` - UUID v4 primary keys with `gen_random_uuid()`

### `schemaName` (string)

PostgreSQL schema name for Payload collections (default: `'public'`):

```typescript
schemaName?: string
```

## Extension Support

### `extensions` (Record<string, boolean>)

PostgreSQL extensions to enable:

```typescript
extensions?: Record<string, boolean>
// Example: { postgis: true }
```

The adapter creates extensions via:

```sql
CREATE EXTENSION IF NOT EXISTS "<extension_name>"
```

Common extensions:
- `postgis` - Geographic information system support
- `uuid-ossp` - UUID generation functions

## Logging

### `logger` (boolean | DrizzleLoggerConfig)

Enable Drizzle query logging:

```typescript
logger?: boolean | DrizzleLoggerConfig
```

When `true`, logs all SQL queries. Can be customized with a Drizzle logger configuration object.

## Migration Configuration

### `migrationDir` (string)

Custom directory for migration files:

```typescript
migrationDir?: string
```

### `prodMigrations` (Migration[])

Production migration definitions:

```typescript
prodMigrations?: Migration[]
```

Each migration must implement:

```typescript
interface Migration {
  id: string;
  name: string;
  batch: number;
  up: (args: MigrationArgs) => Promise<void>;
  down?: (args: MigrationArgs) => Promise<void>;
  timestamp: number;
}
```

## Schema Building Hooks

### `beforeSchemaInit` (Function)

Callback executed before schema is built:

```typescript
beforeSchemaInit?: (rawSchema: RawSchema) => RawSchema
```

Allows modification of the raw schema before Drizzle tables are generated.

### `afterSchemaInit` (Function)

Callback executed after schema is built:

```typescript
afterSchemaInit?: (drizzleSchema: typeof import('drizzle-orm/pg-core')) => void
```

Allows inspection or modification of the final Drizzle schema.

## Data Storage Options

### `blocksAsJSON` (boolean)

Store blocks as JSON instead of relational tables:

```typescript
blocksAsJSON?: boolean
```

- `true` - Blocks stored in `blocks` table as JSON
- `false` - Blocks stored in separate tables per block type (relational, default)

## Read Replicas

### `readReplicaOptions` (string[])

Array of read replica connection strings:

```typescript
readReplicaOptions?: string[]
```

Example:

```typescript
readReplicaOptions: [
  'postgresql://user:pass@replica1:5432/payload',
  'postgresql://user:pass@replica2:5432/payload',
]
```

Implementation uses `withReplicas` from drizzle-orm to route read queries to replicas.

## Database Creation

### `disableCreateDatabase` (boolean)

Prevent automatic database creation:

```typescript
disableCreateDatabase?: boolean
```

Default: `false` (database will be created if it does not exist)

## Push Schema Behavior

### `push` (boolean)

Control automatic schema push in development:

```typescript
push?: boolean
```

- `false` - Disable automatic schema push
- `true` - Push schema changes automatically (default in dev)

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PAYLOAD_DROP_DATABASE` | Set to `'true'` to drop all tables on startup |
| `PAYLOAD_MIGRATING` | Set to `'true'` to skip schema push during migrations |
| `NODE_ENV` | If not `'production'`, schema is pushed automatically |

## Complete Configuration Example

```typescript
import { postgresAdapter } from '@payloadcms/db-postgres'

export const adapter = postgresAdapter({
  pool: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  connectionString: process.env.POSTGRES_URL,
  idType: 'uuid',
  schemaName: 'public',
  extensions: {
    postgis: true,
  },
  logger: true,
  migrationDir: './migrations',
  prodMigrations: [],
  blocksAsJSON: false,
  readReplicaOptions: [
    'postgresql://user:pass@read-replica:5432/payload',
  ],
})
```

## Connection Retry Logic

The adapter implements automatic reconnection with exponential backoff:

```typescript
if (err.code === 'ECONNRESET') {
  setTimeout(() => {
    void connectWithReconnect({ adapter, pool, pool: this.pool, reconnect: true })
  }, 1000)
}
```

This ensures resilient connections in production environments.
