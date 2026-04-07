# CLI Commands

Deesse provides database CLI commands for managing schemas and migrations.

## db:generate

Generate migration files from schema changes:

```bash
npx deesse db:generate
```

Runs `drizzle-kit generate` to create migration files in the `drizzle/` folder.

**Example output:**
```
[✓] Generated migration: 2024-01-15-123456_add_users_table.sql
[✓] Generated migration: 2024-01-15-234567_add_posts_table.sql
```

## db:push

Push schema changes directly to the database (development only):

```bash
npx deesse db:push
```

**Warning:** This directly modifies the database schema. Do not use in production.

```bash
# Skip confirmation
npx deesse db:push --yes
```

## db:migrate

Apply pending migrations:

```bash
npx deesse db:migrate
```

Runs all pending migrations from the `drizzle/` folder in order.

**Example:**
```
[✓] Applied migration: 2024-01-15-123456_add_users_table.sql
[✓] Applied migration: 2024-01-15-234567_add_posts_table.sql
```

## db:studio

Open Drizzle Studio to visually explore and edit your data:

```bash
npx deesse db:studio
```

Opens a local web interface at `http://localhost:4983`.

## Direct Drizzle Commands

You can also use drizzle-kit directly:

```bash
# Generate migrations
npx drizzle-kit generate

# Push schema (dev)
npx drizzle-kit push

# Migrate
npx drizzle-kit migrate

# Drop everything (careful!)
npx drizzle-kit drop

# Check for drift
npx drizzle-kit check
```

## Configuration

The CLI reads from `drizzle.config.ts`:

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```
