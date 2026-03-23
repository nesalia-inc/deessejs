# Collections

This is an internal document outlining the collections system for DeesseJS.

## Overview

DeesseJS uses `@deessejs/collections` as its data modeling layer. This is a separate package that can be used standalone, but is deeply integrated into DeesseJS for managing content collections.

## Relationship

`@deessejs/collections` is:
- **Independent** - Can be used without DeesseJS
- **Integrated** - Natively supported in DeesseJS admin

## Usage

Install the package:

```bash
pnpm add @deessejs/collections
```

Define collections:

```typescript
import { defineConfig, collection, field, f } from '@deessejs/collections';

const posts = collection({
  slug: 'posts',
  fields: {
    title: field({ fieldType: f.text() }),
    content: field({ fieldType: f.text() }),
    author: field({
      fieldType: f.relation({ to: 'users' })
    }),
    published: field({ fieldType: f.boolean() }),
    createdAt: field({ fieldType: f.timestamp() }),
  },
});

const users = collection({
  slug: 'users',
  fields: {
    name: field({ fieldType: f.text() }),
    email: field({ fieldType: f.email() }),
  },
});

export const config = defineConfig({
  collections: [posts, users],
});
```

## Field Types

| Type | Description |
|------|-------------|
| `f.text()` | String |
| `f.number()` | Integer |
| `f.boolean()` | Boolean |
| `f.email()` | Email with validation |
| `f.date()` | Date only |
| `f.timestamp()` | Date with time |
| `f.select(['a', 'b'])` | Enum |
| `f.json()` | JSON object |
| `f.relation({ to: 'collection' })` | Relation to another collection |

## API Endpoints

Collections automatically generate REST endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/collections/:collection` | List records |
| GET | `/api/collections/:collection/:id` | Get record |
| POST | `/api/collections/:collection` | Create record |
| PUT | `/api/collections/:collection/:id` | Update record |
| DELETE | `/api/collections/:collection/:id` | Delete record |

## Integration with DeesseJS

In DeesseJS admin:
- The **Collections** page displays all defined collections
- Users can manage content through the admin interface
- The API routes are automatically generated

## Database Provider

Collections work with any database provider:

```typescript
import { defineConfig, collection, pgAdapter } from '@deessejs/collections';

export const config = defineConfig({
  database: pgAdapter({ url: process.env.DATABASE_URL! }),
  collections: [/* collections */],
});
```

Supported providers:
- PostgreSQL (`pgAdapter`)
- MySQL (`mysqlAdapter`)
- SQLite (`sqliteAdapter`)
- Custom adapters
