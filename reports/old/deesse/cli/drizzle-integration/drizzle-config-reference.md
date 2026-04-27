# Drizzle Kit Configuration Reference

## Overview

The `drizzle.config.ts` file is the central configuration for Drizzle Kit. It defines database connection details, schema locations, migration behavior, and various CLI options.

## Basic Configuration

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Required
  dialect: 'postgresql',  // | 'mysql' | 'sqlite' | 'turso' | 'singlestore' | 'gel'

  // Schema definition
  schema: './src/db/schema',  // string or string[] (glob patterns)

  // Output folder for migrations
  out: './drizzle',

  // Database credentials (dialect-specific)
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Configuration Schema

### Top-Level Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `dialect` | `Dialect` | Yes | - | Database dialect: `postgresql`, `mysql`, `sqlite`, `turso`, `singlestore`, `gel` |
| `schema` | `string \| string[]` | No | - | Path(s) to schema files (glob patterns supported) |
| `out` | `string` | No | `'drizzle'` | Output folder for migrations |
| `driver` | `Driver` | No | - | Database driver: `aws-data-api`, `d1-http`, `expo`, `turso`, `pglite` |
| `dbCredentials` | `DbCredentials` | No | - | Database connection credentials |
| `migrations` | `MigrationsConfig` | No | - | Migration table configuration |
| `breakpoints` | `boolean` | No | `true` | Enable SQL statement breakpoints |
| `tablesFilter` | `string \| string[]` | No | - | Filter tables by glob pattern |
| `schemaFilter` | `string \| string[]` | No | `['public']` | Filter PostgreSQL schemas |
| `verbose` | `boolean` | No | `false` | Print all statements for push |
| `strict` | `boolean` | No | `false` | Ask for confirmation before push |
| `casing` | `'camelCase' \| 'snake_case'` | No | - | Serialization casing |
| `introspect` | `IntrospectConfig` | No | - | Introspect command options |
| `entities` | `EntitiesConfig` | No | - | Entity configuration (roles) |
| `extensionsFilters` | `'postgis'[]` | No | - | Database extensions filter |
| `sql` | `boolean` | No | `true` | Generate SQL files |

## Dialect-Specific dbCredentials

### PostgreSQL (dialect: 'postgresql')

Connection URL:
```typescript
dbCredentials: {
  url: 'postgresql://user:password@host:port/database',
}
```

Or individual parameters:
```typescript
dbCredentials: {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'mydb',
  ssl: 'require',  // boolean | 'require' | 'allow' | 'prefer' | 'verify-full' | TLS options
}
```

With AWS Data API driver:
```typescript
dbCredentials: {
  database: 'mydb',
  secretArn: 'arn:aws:rds:...',
  resourceArn: 'arn:aws:rds:...',
}
```

With PGlite driver:
```typescript
dbCredentials: {
  url: 'file:./db',
}
```

### MySQL (dialect: 'mysql')

Connection URL:
```typescript
dbCredentials: {
  url: 'mysql://user:password@host:port/database',
}
```

Or individual parameters:
```typescript
dbCredentials: {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'mydb',
  ssl: 'require',  // string | SSL options object
}
```

### SQLite (dialect: 'sqlite')

```typescript
dbCredentials: {
  url: 'file:./dev.db',
}
```

With D1 HTTP driver:
```typescript
dbCredentials: {
  driver: 'd1-http',
  accountId: 'your-account-id',
  databaseId: 'your-database-id',
  token: 'your-auth-token',
}
```

### Turso (dialect: 'turso')

```typescript
dbCredentials: {
  url: 'libsql://mydb.turso.io',
  authToken: 'your-auth-token',
}
```

### SingleStore (dialect: 'singlestore')

Connection URL:
```typescript
dbCredentials: {
  url: 'singlestore://user:password@host:port/database',
}
```

Or individual parameters:
```typescript
dbCredentials: {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'mydb',
}
```

### Gel (dialect: 'gel')

```typescript
dbCredentials: {
  url: 'gel://user:password@host:port/database',
  tlsSecurity: 'strict',  // 'insecure' | 'no_host_verification' | 'strict' | 'default'
}
```

## Migrations Configuration

```typescript
migrations: {
  table: '__drizzle_migrations',  // Custom migration table name (default: __drizzle_migrations)
  schema: 'drizzle_schema',      // PostgreSQL only: custom schema for migrations
  prefix: 'index',              // Filename prefix mode: 'index' | 'timestamp' | 'supabase' | 'unix' | 'none'
}
```

## Introspect Configuration

```typescript
introspect: {
  casing: 'camel',  // 'camel' | 'preserve'
}
```

## Entities Configuration

```typescript
entities: {
  roles: true,  // Enable roles introspection
  // or with options
  roles: {
    provider: 'supabase',  // 'supabase' | 'neon' | or custom
    include: ['admin', 'user'],
    exclude: ['internal'],
  },
}
```

## Migration Filename Prefixes

The `prefix` option in migrations controls how migration files are named:

| Prefix | Example Filename | Description |
|--------|------------------|-------------|
| `index` | `0000_harsh_gorgon.sql` | Incremental index with random word |
| `timestamp` | `20240101120000.sql` | Unix timestamp |
| `supabase` | `20240101120000_uuid.sql` | Timestamp with UUID |
| `unix` | `1704062400.sql` | Unix timestamp only |
| `none` | `migration.sql` | Custom name only |

## Breakpoints

When `breakpoints: true` (default), SQL statements in migrations are separated by `-- statement-breakpoint` comments. This is required for databases that do not support multiple DDL statements in a single transaction (MySQL, SQLite, SingleStore).

```sql
CREATE TABLE users;
--> statement-breakpoint
CREATE TABLE posts;
```

## Tables Filter

Use glob patterns to filter which tables are included in push/introspect commands:

```typescript
tablesFilter: ['myapp_*'],  // Only tables starting with 'myapp_'
```

## Schema Filter (PostgreSQL Only)

Filter which PostgreSQL schemas to include:

```typescript
schemaFilter: ['public', 'my_schema'],
```

## Verbose and Strict Modes

For the `push` command:

- `verbose: true` - Print all SQL statements that will be executed
- `strict: true` - Always ask for confirmation before executing any statements

## Environment Variable Support

The configuration file can use `dotenv/config`:

```typescript
import 'dotenv/config';

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## Validation

The configuration is validated using Zod schemas defined in:
- `src/cli/validations/common.ts` - `configCommonSchema`
- `src/cli/validations/cli.ts` - command-specific params

## Example Configurations

### PostgreSQL with URL

```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### PostgreSQL with SSL

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',
  out: './drizzle',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'mydb',
    ssl: {
      rejectUnauthorized: false,
    },
  },
});
```

### MySQL

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema',
  out: './drizzle',
  dbCredentials: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'mydb',
  },
});
```

### SQLite

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema',
  out: './drizzle',
  dbCredentials: {
    url: 'file:./dev.db',
  },
});
```

### Turso

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema',
  out: './drizzle',
  dbCredentials: {
    url: 'libsql://mydb.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

### SingleStore

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'singlestore',
  schema: './src/db/schema',
  out: './drizzle',
  dbCredentials: {
    url: 'singlestore://user:password@host:port/database',
  },
});
```
