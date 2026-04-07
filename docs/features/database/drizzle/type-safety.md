# Type Safety

## Schema Typing

The Drizzle instance is typed based on the schema you pass to `drizzle()`:

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./src/db/schema";

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
    schema,
  }),
});
```

## Query Typing

```typescript
import { deesse } from "@/lib/deesse";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

// Fully typed - users table columns are inferred
export async function getUser(id: string) {
  return deesse.database
    .select()
    .from(users)
    .where(eq(users.id, id));
}

// Return type is inferred from the schema
type User = Awaited<ReturnType<typeof getUser>>[number];
```

## Column Inference

Each column in your schema has a specific TypeScript type:

```typescript
import { users } from "./src/db/schema";

// users.id is typed as string (uuid)
users.id        // string

// users.email is typed as string
users.email     // string

// users.createdAt is typed as Date
users.createdAt // Date

// users.banned is typed as boolean
users.banned    // boolean
```

## Type-Safe Queries

```typescript
import { deesse } from "@/lib/deesse";
import { eq, and, or } from "drizzle-orm";
import { users } from "@/db/schema";

// AND condition
const activeAdmins = await deesse.database
  .select()
  .from(users)
  .where(
    and(
      eq(users.role, "admin"),
      eq(users.banned, false)
    )
  );

// OR condition
const specialUsers = await deesse.database
  .select()
  .from(users)
  .where(
    or(
      eq(users.role, "admin"),
      eq(users.role, "moderator")
    )
  );
```

## Drizzle Kit Types

For migrations and CLI operations:

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

The Drizzle config ensures type consistency between your schema definition and the database.