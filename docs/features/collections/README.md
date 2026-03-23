# Collections

This is an internal document outlining the collections system for DeesseJS.

## Overview

DeesseJS uses `@deessejs/collections` as its data modeling layer. This is a separate package that can be used standalone, but is deeply integrated into DeesseJS as a database adapter.

## Relationship

`@deessejs/collections` is:
- **Independent** - Can be used without DeesseJS
- **Integrated** - Used as a database adapter in DeesseJS

## Usage

Install the package:

```bash
pnpm add @deessejs/collections
```

Define collections:

```typescript
import { collection, field, f } from '@deessejs/collections';

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
```

## Database Adapter

In DeesseJS, collections is used as a **database adapter**:

```typescript
import { defineConfig, collectionsAdapter } from '@deessejs/core';
import { collection, field, f } from '@deessejs/collections';

const posts = collection({ /* ... */ });
const users = collection({ /* ... */ });

export const config = defineConfig({
  database: collectionsAdapter({
    collections: [posts, users],
    extensions: {
      // Optional: cache, email, storage
    },
  }),
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
- The **Collections** page displays all defined collections (only if collections are configured)
- Users can manage content through the admin interface
- The API routes are automatically generated

If no collections are configured, the Collections page does not appear.

## Extensions

Collections support optional extensions:

```typescript
import { defineConfig, collectionsAdapter, redisCache, sendGridEmail, s3Storage } from '@deessejs/core';

export const config = defineConfig({
  database: collectionsAdapter({
    collections: [posts, users],
    extensions: {
      cache: redisCache({ url: process.env.REDIS_URL! }),
      email: sendGridEmail({ apiKey: process.env.SENDGRID_API_KEY! }),
      storage: s3Storage({ bucket: process.env.AWS_BUCKET! }),
    },
  }),
});
```

## Database Provider

Collections use the database adapter internally:

```typescript
// collectionsAdapter handles database internally
// Supported: PostgreSQL, MySQL, SQLite
```

## Collections without DeesseJS

`@deessejs/collections` can be used standalone:

```typescript
import { defineConfig, collection, field, f, pgAdapter } from '@deessejs/collections';

export const config = defineConfig({
  database: pgAdapter({ url: process.env.DATABASE_URL! }),
  collections: [posts, users],
});
```
