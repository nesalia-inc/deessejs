# CLI Commands

Deesse provides database CLI commands for managing schemas and migrations.

## db:generate

Generate migration files from schema changes:

```bash
npx deesse db:generate
```

Runs `drizzle-kit generate` to create migration files in the `drizzle/` folder.

## db:push

Push schema changes directly to the database (development only):

```bash
npx deesse db:push
```

**Warning:** This directly modifies the database schema. Do not use in production.

```bash
# Skip confirmation
npx deesse db:push --force
```

## db:migrate

Apply pending migrations:

```bash
npx deesse db:migrate
```

Runs all pending migrations from the `drizzle/` folder in order.

```bash
# Show what would be migrated without executing
npx deesse db:migrate --dry-run
```

## Requirements

All commands require:

- `src/db/schema.ts` - Your Drizzle tables
- `drizzle.config.ts` - Standard drizzle-kit config
- `.env` - Should contain `DATABASE_URL`

## Direct Drizzle Commands

You can also use drizzle-kit directly:

```bash
npx drizzle-kit generate
npx drizzle-kit push
npx drizzle-kit migrate
npx drizzle-kit drop
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
