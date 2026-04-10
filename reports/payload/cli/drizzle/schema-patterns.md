# Schema Patterns in Payload CMS with Drizzle

## Overview

Payload CMS defines schemas through collection and global configuration objects, which are then transformed into Drizzle ORM table definitions. This document covers how schemas are defined, how relationships work, and the code generation process.

## Schema Definition Flow

```
Payload Config (collections/globals)
        ↓
    Raw Schema Builder
        ↓
    Drizzle Table Generator
        ↓
    drizzle.config.ts
```

## Raw Schema Structure

The intermediate raw schema is defined in `packages/drizzle/src/schema/buildRawSchema.ts`:

```typescript
interface RawTable {
  name: string
  columns: Map<string, RawColumn>
  indexes: RawIndex[]
  foreignTables: Map<string, RawForeignTable>
  relations: RawRelation[]
}

interface RawColumn {
  name: string
  type: ColumnTypes
  default?: any
  notNull?: boolean
  primaryKey?: boolean
  unique?: boolean
  index?: boolean
  // ... type-specific properties
}
```

## Column Types

Payload supports the following column types, mapped to their Drizzle equivalents:

### Basic Types

| Payload Type | Drizzle Function | Notes |
|--------------|-----------------|-------|
| `text` | `text()` | VARCHAR equivalent |
| `number` | `integer()` / `numeric()` | `mode: 'number'` for numeric |
| `checkbox` | `boolean()` | |
| `email` | `text()` | Validated at app level |
| `textarea` | `text()` | No difference from text |
| `date` | `timestamp()` | |
| `json` | `jsonb()` | |
| `richText` | `jsonb()` | Stores Slate.js content |
| `code` | `text()` | |

### Postgres-Specific Types

| Payload Type | Drizzle Function | Notes |
|--------------|-----------------|-------|
| `uuid` | `uuid()` | Uses `gen_random_uuid()` default |
| `serial` | `integer()` | Auto-incrementing |
| `timestamp` | `timestamp()` | Supports `mode: 'date'\|'string'` |
| `numeric` | `numeric()` | High precision decimal |
| `enum` | Custom enum type | Generated from options |
| `geometry` | `geometryColumn()` | PostGIS extension |
| `vector` | `vector()` | pgvector extension |
| `halfvec` | `halfvec()` | pgvector half-precision |
| `sparsevec` | `sparsevec()` | Sparse vectors |
| `bit` | `bit()` | Fixed-length bit string |

### Timestamp Mode Options

```typescript
timestamp: {
  mode: 'date' | 'string'  // JavaScript Date object or ISO string
  withTimezone?: boolean    // Store with timezone
  precision?: number        // Sub-second precision (0-6)
}
```

## Relationship Patterns

### One-to-One

```typescript
// In collection config
const Post = {
  slug: 'posts',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      hasOne: true,  // One-to-one
    },
  ],
}
```

Drizzle creates:
- Foreign key on the relationship field
- Index on the foreign key column

### One-to-Many

```typescript
{
  name: 'comments',
  type: 'relationship',
  relationTo: 'comments',
  hasMany: true,  // One-to-many
}
```

Drizzle creates:
- Junction table with foreign keys to both tables
- `*Many` relationship accessor in Drizzle schema

### Many-to-Many

```typescript
{
  name: 'tags',
  type: 'relationship',
  relationTo: 'tags',
  hasMany: true,
  manyRelationFKeysToReferences: false,  // Creates junction table
}
```

### Polymorphic Relationships

Payload supports polymorphic relationships via a `morph` relationship type:

```typescript
{
  name: 'media',
  type: 'upload',
  relationTo: 'media',
}

{
  name: 'featuredMedia',
  type: 'relationship',
  relationTo: 'posts',
  morph: 'featured',
}
```

## Indexes

### Auto-Generated Indexes

Drizzle automatically creates indexes for:
- Primary keys
- Foreign key columns
- Unique constraints

### Custom Indexes

Defined in field configuration:

```typescript
{
  name: 'slug',
  type: 'text',
  unique: true,  // Creates unique index
  index: true,   // Creates non-unique index
}
```

### Composite Indexes

Defined in `indexes` option at collection level:

```typescript
const Post = {
  slug: 'posts',
  indexes: [
    {
      columns: ['status', 'publishDate'],
      name: 'status_publish_idx',
    },
  ],
}
```

## Code Generation

The `columnToCodeConverter.ts` generates Drizzle TypeScript code from column definitions:

```typescript
export const columnToCodeConverter: ColumnToCodeConverter = ({
  adapter,
  addEnum,
  addImport,
  column,
  tableKey,
}) => {
  // Generates code like: text('title', { mode: 'string' }).notNull()
}
```

### Generated Code Examples

**Text field:**
```typescript
text('title').notNull()
```

**UUID with default:**
```typescript
uuid('id').defaultRandom().primaryKey()
```

**Timestamp:**
```typescript
timestamp('createdAt', { mode: 'string', withTimezone: true }).defaultNow()
```

**Enum:**
```typescript
// First generates the enum:
export const enum_post_status = pgEnum('post_status', ['draft', 'published'])

// Then uses it:
enum_post_status('status').notNull().default('draft')
```

**Relationship:**
```typescript
uuid('author_id').references(() => users.id, { onDelete: 'cascade' })
```

## Blocks and Globals

### Blocks

Blocks are defined as special collections with type discriminators:

```typescript
{
  slug: 'content-block',
  fields: [
    {
      name: 'blockType',
      type: 'text',
    },
    // Block-specific fields
  ],
}
```

Two storage strategies:
1. **Relational (default)** - Each block type gets its own table
2. **JSON** - All blocks stored in single `blocks` table as JSON

### Globals

Globals are singletons stored with a special `global` slug pattern:

```typescript
{
  slug: 'site-settings',
  type: 'global',
  fields: [
    { name: 'title', type: 'text' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
  ],
}
```

## Schema Transformation Hooks

### beforeSchemaInit

Modify raw schema before Drizzle tables are generated:

```typescript
const adapter = postgresAdapter({
  beforeSchemaInit: (rawSchema) => {
    // Add custom columns
    rawSchema.collections.get('posts').columns.set('customField', {
      name: 'customField',
      type: 'text',
      default: 'value',
    })
    return rawSchema
  },
})
```

### afterSchemaInit

Access generated Drizzle schema:

```typescript
const adapter = postgresAdapter({
  afterSchemaInit: (schema) => {
    // Inspect or modify drizzle schema
    console.log(Object.keys(schema))
  },
})
```

## Migration Patterns

### Up Migration

```typescript
{
  name: 'add_author_index',
  up: async ({ db, payload }) => {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS author_idx ON posts (author_id)
    `)
  },
}
```

### Down Migration

```typescript
{
  name: 'add_author_index',
  down: async ({ db, payload }) => {
    await db.execute(sql`
      DROP INDEX IF EXISTS author_idx
    `)
  },
}
```

### Relationship Migration (v2 to v3)

Payload includes built-in migrations for common patterns:

```typescript
// Migrates relationship fields to junction tables
// Converts blocks storage from relational to JSON
```

## Drizzle Kit Compatibility

Payload generates a `drizzle.config.ts` file:

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/payload-types.ts',
  out: './drizzle',
  dialect: 'postgresql',
})
```

This enables standard Drizzle Kit workflows while maintaining Payload's schema abstraction layer.
