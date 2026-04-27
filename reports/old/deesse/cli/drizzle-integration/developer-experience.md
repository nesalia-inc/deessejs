# Developer Experience: Using Drizzle CLI Commands

## Overview

This guide covers the practical day-to-day experience of using `db:generate`, `db:migrate`, and `db:push` commands when working with the Drizzle ORM CLI. It assumes you have a working `drizzle.config.ts` file and a schema defined in your project.

## The CLI Wrapper Concept

The `@deessejs/cli` package is a wrapper around `drizzle-kit`. It provides a unified interface for database management while inheriting all drizzle-kit configuration through `drizzle.config.ts`.

**How it works:**

- `@deessejs/cli` wraps `drizzle-kit` commands under namespaced subcommands (`db:generate`, `db:migrate`, `db:push`)
- Users invoke commands via `npx @deessejs/cli <command>` instead of calling `drizzle-kit` directly
- Configuration is inherited from `drizzle.config.ts` - no need to specify `--config` in most cases
- The wrapper handles error formatting, progress display, and provides a consistent CLI experience

**Example invocation:**

```bash
# Instead of: drizzle-kit generate
# Use: npx @deessejs/cli db:generate

npx @deessejs/cli db:generate
npx @deessejs/cli db:migrate
npx @deessejs/cli db:push --force
```

**Why wrap drizzle-kit?**

Wrapping drizzle-kit provides several benefits:
1. **Consistent interface** - All deessejs tools use the same command structure
2. **Simplified experience** - Users only need to know `npx @deessejs/cli <command>`
3. **Custom enhancements** - The wrapper can add project-specific behavior
4. **Configuration inheritance** - Settings are centralized in `drizzle.config.ts`

## The Configuration File

The `drizzle.config.ts` file is the central hub for all database operations. Here is a typical configuration:

```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',              // Where migration files are stored
  schema: './src/db/schema',     // Where your schema files live
  dialect: 'postgresql',         // Your database type
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**What this means for you:**

- The CLI automatically reads this file (no need to specify `--config` in most cases)
- Your `DATABASE_URL` environment variable must be set before running any command
- Migration files will appear in the `./drizzle` folder
- Schema changes are detected by comparing your current schema files against the last migration snapshot

## The Three Commands Explained

### db:generate

**Purpose:** Creates SQL migration files based on schema changes you have made.

**When to use:**
- After adding, modifying, or removing tables/columns in your schema files
- When you want a reversible, version-controlled migration history
- Before deploying changes to production

**What happens:**
1. Reads your current schema files from `./src/db/schema`
2. Compares against the previous migration snapshot (stored in `drizzle/meta/`)
3. Generates a new SQL file in `drizzle/` with the required changes
4. Updates the migration journal (`drizzle/meta/_journal.json`)

**Typical workflow:**
```bash
# After modifying your schema files
npx @deessejs/cli db:generate

# Output example:
# drizzle-kit generate
# Migration created: drizzle/0001_friendly_wolverine.sql
```

### db:migrate

**Purpose:** Applies existing migration files to your database.

**When to use:**
- Setting up a new database for the first time
- Applying migrations on a deployment target
- Running in CI/CD pipelines

**What happens:**
1. Reads all migration files from the `out` folder
2. Checks which migrations have already been applied (using a tracking table)
3. Executes only the pending migrations in order
4. Records each applied migration in the tracking table

**Typical workflow:**
```bash
# Apply all pending migrations
npx @deessejs/cli db:migrate

# Output example:
# drizzle-kit migrate
# [ migrations applied successfully ]
```

### db:push

**Purpose:** Directly synchronizes your schema to the database without creating migration files.

**When to use:**
- Rapid prototyping and local development
- When you do not need version-controlled migrations
- Quick schema changes that do not require rollback capability

**What happens:**
1. Introspects your current database schema
2. Compares it against your schema files
3. Calculates the difference and shows you the SQL that would be executed
4. Prompts for confirmation (unless `--force` is used)
5. Applies changes directly to the database

**Typical workflow:**
```bash
# Push changes (will ask for confirmation)
npx @deessejs/cli db:push

# Push changes with auto-approval (for scripts/CI)
npx @deessejs/cli db:push --force
```

## Practical Workflows

### Workflow 1: Creating a New Table

**Scenario:** You need to add a `posts` table to your application.

**Steps:**

1. **Define the schema:**
   ```typescript
   // src/db/schema/posts.ts
   import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
   import { user } from './auth-schema';  // If referencing users

   export const post = pgTable('post', {
     id: uuid('id').primaryKey().defaultRandom(),
     title: text('title').notNull(),
     content: text('content').notNull(),
     authorId: text('author_id')
       .notNull()
       .references(() => user.id, { onDelete: 'cascade' }),
     publishedAt: timestamp('published_at'),
     createdAt: timestamp('created_at').defaultNow().notNull(),
     updatedAt: timestamp('updated_at')
       .$onUpdate(() => new Date())
       .notNull(),
   });
   ```

2. **Export from your schema index:**
   ```typescript
   // src/db/schema/index.ts
   export * from './posts';
   export * from './auth-schema';
   ```

3. **Generate the migration:**
   ```bash
   npx @deessejs/cli db:generate
   # Creates: drizzle/0002_nervous_prometheus.sql
   ```

4. **Review the generated SQL:**
   ```sql
   -- drizzle/0002_nervous_prometheus.sql
   CREATE TABLE IF NOT EXISTS "post" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     "title" text NOT NULL,
     "content" text NOT NULL,
     "author_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
     "published_at" timestamp,
     "created_at" timestamp DEFAULT NOW() NOT NULL,
     "updated_at" timestamp DEFAULT NOW() NOT NULL
   );
   --> statement-breakpoint
   CREATE INDEX IF NOT EXISTS "post_author_id_idx" ON "post"("author_id");
   ```

5. **Apply to your database:**
   ```bash
   npx @deessejs/cli db:migrate
   ```

### Workflow 2: Modifying an Existing Table

**Scenario:** You need to add a `slug` column to the `posts` table.

**Steps:**

1. **Update your schema:**
   ```typescript
   export const post = pgTable('post', {
     id: uuid('id').primaryKey().defaultRandom(),
     title: text('title').notNull(),
     slug: text('slug').notNull().unique(),  // NEW
     content: text('content').notNull(),
     authorId: text('author_id')
       .notNull()
       .references(() => user.id, { onDelete: 'cascade' }),
     publishedAt: timestamp('published_at'),
     createdAt: timestamp('created_at').defaultNow().notNull(),
     updatedAt: timestamp('updated_at')
       .$onUpdate(() => new Date())
       .notNull(),
   });
   ```

2. **Generate migration:**
   ```bash
   npx @deessejs/cli db:generate
   # Migration created: drizzle/0003_white_thunderbolt.sql
   ```

3. **Review the SQL:**
   ```sql
   ALTER TABLE "post" ADD COLUMN "slug" text NOT NULL;
   ```

4. **Apply the migration:**
   ```bash
   npx @deessejs/cli db:migrate
   ```

### Workflow 3: Rapid Prototyping with Push

**Scenario:** You are experimenting with a new feature and need to iterate quickly on schema changes.

**Steps:**

1. **Make schema changes directly**

2. **Push to database immediately:**
   ```bash
   npx @deessejs/cli db:push
   # Shows diff and prompts for confirmation
   # Type 'y' to approve
   ```

3. **Iterate on your schema, running push each time:**
   ```bash
   npx @deessejs/cli db:push --force  # Skip confirmation prompt
   ```

**Note:** When prototyping is complete and you have a stable schema, consider creating proper migrations using `db:generate` and `db:migrate` for version control.

### Workflow 4: Renaming a Column

**Scenario:** You want to rename `publishedAt` to `published_at` for consistency.

**Drizzle approach (two-step):**

1. **First, add the new column:**
   ```typescript
   publishedAt: timestamp('published_at'),  // Changed from 'publishedAt'
   ```

2. **Generate migration:**
   ```bash
   npx @deessejs/cli db:generate
   ```

3. **Review and apply:**
   ```sql
   ALTER TABLE "post" ADD COLUMN "published_at" timestamp;
   ```
   ```bash
   npx @deessejs/cli db:migrate
   ```

4. **Later, after migrating data, drop the old column in a separate migration**

**Important:** Drizzle does not automatically migrate data between renamed columns. You will need to:
1. Add the new column
2. Write a data migration to copy values
3. Drop the old column

### Workflow 5: Setting Up a New Environment

**Scenario:** You are setting up the database for a new development machine or a fresh deployment.

**Steps:**

1. **Ensure environment variables are set:**
   ```bash
   # .env file
   DATABASE_URL=postgresql://user:password@localhost:5432/mydb
   ```

2. **Pull the latest schema (if introspecting from existing DB):**
   ```bash
   npx @deessejs/cli db:introspect
   # This generates schema files from your database
   ```

3. **Apply all migrations:**
   ```bash
   npx @deessejs/cli db:migrate
   # This creates the __drizzle_migrations table if it does not exist
   # Then applies all pending migrations in order
   ```

4. **Verify:**
   ```bash
   # Check the current state
   npx @deessejs/cli db:studio
   # Opens Drizzle Studio at https://local.drizzle.studio
   ```

## Error Handling and Debugging

### Common Errors

#### 1. Configuration Not Found

```
Error: Config file not found
```

**Cause:** No `drizzle.config.ts` (or `.js`, `.json`) in the current directory.

**Solution:**
- Ensure you are running the command from the project root
- Or specify the config path: `npx @deessejs/cli db:generate --config=path/to/config.ts`

#### 2. Database Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Cause:** The database server is not running or the connection URL is wrong.

**Solution:**
- Verify `DATABASE_URL` is correct in your `.env` file
- Ensure your database server is running
- Check firewall settings for local development

#### 3. Migration Table Not Found

```
Error: relation "__drizzle_migrations" does not exist
```

**Cause:** Running `db:migrate` on a fresh database.

**Solution:**
- This is expected for new databases. The migration table is created automatically on first migrate.
- Simply run `npx @deessejs/cli db:migrate` and it will create the table and apply migrations.

#### 4. Pending Migrations on Push

```
Error: Cannot push because there are pending migrations
```

**Cause:** You have unapplied migrations in your `drizzle/` folder.

**Solution:**
- Apply pending migrations first: `npx @deessejs/cli db:migrate`
- Or use `--force` to bypass (not recommended for production)

#### 5. Data Loss Warning

```
⚠️  WARNING: The following operations will cause data loss:
   - DROP COLUMN "old_column"
```

**Cause:** You are dropping a column that contains data.

**Solution:**
- Review carefully if this data is recoverable
- Back up data before proceeding
- Consider a multi-step migration instead of direct drop

### Debugging Tips

#### Use `--verbose` with Push

```bash
npx @deessejs/cli db:push --verbose
```
This shows every SQL statement that will be executed, helping you understand exactly what changes will be made.

#### Use `db:studio` to Inspect State

```bash
npx @deessejs/cli db:studio
```
Opens a web interface at `https://local.drizzle.studio` where you can:
- Browse tables and data
- See schema structure
- Run custom queries

#### Check Migration Journal

```bash
# drizzle/meta/_journal.json
{
  "entries": [
    { "idx": 0, "version": "5", "when": 1704062400, "tag": "0000_harsh_gorgon", "breakpoints": true },
    { "idx": 1, "version": "5", "when": 1704148800, "tag": "0001_friendly_wolverine", "breakpoints": true }
  ]
}
```

This file tracks which migrations have been applied. If corrupted, you may see "migration already applied" errors.

#### Validate Configuration

```bash
npx @deessejs/cli db:check
```
Validates your `drizzle.config.ts` and tests the database connection without executing any commands.

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Mixing Push and Migrate

**Problem:** Using `db:push` and `db:migrate` on the same database leads to schema state inconsistency.

**Solution:** Choose one approach per environment:
- **Development:** Use `db:push` for rapid iteration
- **Production/Staging:** Always use `db:migrate` with version-controlled migrations

### Pitfall 2: Modifying Generated Migrations

**Problem:** Editing migration files after they are generated breaks the migration journal.

**Solution:**
- Never edit generated migration files
- If you need to fix a migration, create a new one
- For critical fixes, drop the broken migration record from `_journal.json` and create a new migration

### Pitfall 3: Forgetting to Generate Migrations

**Problem:** Making schema changes, then running `db:migrate` without generating migrations first.

**Solution:**
- Always run `db:generate` before `db:migrate`
- Consider a script that runs both:
  ```bash
  npx @deessejs/cli db:generate && npx @deessejs/cli db:migrate
  ```

### Pitfall 4: Not Handling Optional Columns Correctly

**Problem:** Adding a `NOT NULL` column without a default to a table with existing rows fails.

**Solution:** When adding a `NOT NULL` column to an existing table:
1. Add the column as nullable first
2. Backfill data
3. Alter to `NOT NULL`
4. Or provide a `default` value

```typescript
// Wrong (will fail on existing rows)
content: text('content').notNull(),

// Correct (has default)
content: text('content').notNull().default(''),

// Correct (nullable first, then migrate data, then alter)
content: text('content'),  // nullable
```

### Pitfall 5: Circular References in Schema

**Problem:** Two tables referencing each other with `onDelete: 'cascade'` can cause issues during migration.

**Solution:**
- Drizzle handles this well, but ensure both columns are defined properly
- Use `relations` to define relationships separately from column definitions

### Pitfall 6: Missing Environment Variables

**Problem:** Running commands without `DATABASE_URL` set causes confusing errors.

**Solution:**
- Use `dotenv/config` in your `drizzle.config.ts`
- Verify environment before running:
  ```bash
  echo $DATABASE_URL
  ```
- Consider a pre-flight check script

### Pitfall 7: Schema Drift Between Environments

**Problem:** Development and production databases get out of sync.

**Solution:**
- Commit your schema files and migrations to version control
- Use the same `db:generate` and `db:migrate` workflow in all environments
- Use `db:introspect` only for initial schema reverse-engineering, not for ongoing sync

## Command Reference Quick Guide

| Command | Use Case | Creates Files | Modifies DB |
|---------|----------|---------------|-------------|
| `db:generate` | Schema changes you want to version-control | Yes (SQL) | No |
| `db:migrate` | Applying versioned migrations | No | Yes |
| `db:push` | Quick prototyping, local dev | No | Yes (direct) |
| `db:introspect` | Reverse-engineer from existing DB | Yes (Schema) | No |
| `db:studio` | Browsing DB visually | No | No |

## Environment-Specific Tips

### Local Development

```bash
# Use push for rapid iteration
npx @deessejs/cli db:push --force

# Or use studio to inspect state
npx @deessejs/cli db:studio
```

### CI/CD Pipeline

```bash
# Generate and apply in one step (only if migrations exist)
npx @deessejs/cli db:generate && npx @deessejs/cli db:migrate

# Or if migrations are pre-committed, just migrate
npx @deessejs/cli db:migrate
```

### Production Deployment

```bash
# Always review migrations first
npx @deessejs/cli db:generate

# Check generated SQL carefully
cat drizzle/*.sql

# Apply with confirmation
npx @deessejs/cli db:migrate
```

## Summary

The Drizzle CLI provides three complementary commands for schema management:

1. **`db:generate`** - Creates version-controlled SQL migrations from your schema files
2. **`db:migrate`** - Applies those migrations to your database
3. **`db:push`** - Directly syncs schema to database without migration files

Use `db:push` for rapid prototyping and local development. Switch to `db:generate` + `db:migrate` when you need reversible, version-controlled schema changes. Always keep your development and production workflows consistent to avoid schema drift.
