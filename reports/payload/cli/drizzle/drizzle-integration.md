# Drizzle Integration in Payload CMS

## Overview

Payload CMS uses Drizzle ORM as its database abstraction layer for PostgreSQL. The integration is architected across two core packages:

- `@payloadcms/drizzle` - Database-agnostic Drizzle integration layer
- `@payloadcms/db-postgres` - PostgreSQL-specific adapter built on node-postgres

## Architecture

### Two-Stage Schema Building

Payload employs a two-stage schema building process that separates the abstract Payload schema from the Drizzle-specific implementation:

1. **Raw Schema Stage** (`buildRawSchema.ts`)
   - Builds an intermediate `RawTable` representation from Payload collection/global configs
   - Contains abstract column definitions, indexes, foreign keys, and relations
   - Database-agnostic representation

2. **Drizzle Table Stage** (`buildDrizzleTable.ts`)
   - Converts `RawTable` instances into Drizzle `pgTable` definitions
   - Generates TypeScript code that mirrors the raw schema structure
   - Outputs `drizzle.config.ts` for Drizzle Kit compatibility

### Connection Management

The `connect.ts` file in `@payloadcms/db-postgres` handles database initialization:

```typescript
this.drizzle = drizzle({ client: this.pool, logger, schema: this.schema })
```

Key behaviors:
- Creates a connection pool using `pg.Pool`
- Wraps pool client with Drizzle ORM
- Supports read replicas via `withReplicas` from drizzle-orm
- Auto-reconnect on `ECONNRESET` errors
- Automatic database creation if it does not exist
- Extension creation (e.g., PostGIS)

## Key Files

| File | Purpose |
|------|---------|
| `packages/drizzle/src/index.ts` | Main Drizzle driver implementation |
| `packages/drizzle/src/migrate.ts` | Migration runner |
| `packages/drizzle/src/queries/operatorMap.ts` | Query operator mappings |
| `packages/db-postgres/src/connect.ts` | PostgreSQL connection initialization |
| `packages/db-postgres/src/types.ts` | PostgreSQL-specific types |

## Query Operations

Drizzle powers all database operations in Payload:

### Read Operations
- `find()` - Query with filters, pagination, sort
- `findOne()` - Single record lookup
- `findAll()` - All records matching criteria
- Query operators map to Drizzle equivalents (e.g., `equals`, `notequals`, `like`, `in`)

### Write Operations
- `create()` - Insert new record
- `update()` - Update existing record
- `delete()` - Remove record
- `upsert()` - Insert or update (uses `insert` with `onConflict`)

### Relationship Queries
- `findRelation()` - Query relationship tables
- Relationships stored as separate junction tables in Postgres

## Migration System

### How Migrations Work

Payload stores migrations in a `payload_migrations` collection:

```typescript
export interface Migration {
  id: string;
  name: string;
  batch: number;
  up: (args: MigrationArgs) => Promise<void>;
  down?: (args: MigrationArgs) => Promise<void>;
  timestamp: number;
}
```

Migration arguments available:
- `db` - Drizzle database instance
- `payload` - Payload instance
- `req` - Express Request object

### Dev Schema Push

In non-production environments, Payload uses `pushDevSchema` to automatically synchronize schema changes:

```typescript
await pushDevSchema(this as unknown as DrizzleAdapter)
```

This uses Drizzle Kit's `push` command to update the database schema without generating migration files.

### Production Migrations

Production migrations:
- Must be defined in `prodMigrations` config option
- Run automatically on server start in production
- Controlled via `PAYLOAD_MIGRATING` environment variable

## Drizzle Kit Integration

Payload generates a `drizzle.config.ts` file that is compatible with Drizzle Kit CLI:

```typescript
import { defineConfig } from 'drizzle-kit'
```

This enables standard Drizzle Kit commands:
- `drizzle-kit generate` - Generate migrations
- `drizzle-kit push` - Push schema changes
- `drizzle-kit studio` - Open database GUI

## Summary

Drizzle integration in Payload CMS provides:
- Full ORM capabilities with type-safe queries
- Migration management with up/down functions
- Automatic schema synchronization in development
- Production-ready migration system
- Read replica support
- Connection pooling with pg
- Extension support (PostGIS, etc.)
