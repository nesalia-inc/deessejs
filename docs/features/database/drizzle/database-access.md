# Database Access

## The Pattern

```typescript
// lib/deesse.ts
import { getDeesse } from "deesse";
import { config } from "../deesse.config";

export const deesse = getDeesse(config);
```

## Accessing the Database

```typescript
import { deesse } from "@/lib/deesse";
import { eq, desc } from "drizzle-orm";
import { users, posts } from "@/db/schema";

// Select
const allUsers = await deesse.database
  .select()
  .from(users)
  .orderBy(desc(users.createdAt));

// Select with filter
const [user] = await deesse.database
  .select()
  .from(users)
  .where(eq(users.email, "admin@example.com"))
  .limit(1);

// Insert
await deesse.database.insert(users).values({
  email: "new@example.com",
  name: "New User",
});

// Update
const [targetUser] = await deesse.database
  .select()
  .from(users)
  .where(eq(users.email, "old@example.com"))
  .limit(1);

await deesse.database
  .update(users)
  .set({ name: "Updated Name" })
  .where(eq(users.id, targetUser.id));

// Delete
await deesse.database.delete(users).where(eq(users.id, targetUser.id));

// Transaction
await deesse.database.transaction(async (trx) => {
  const [user] = await trx.select().from(users).limit(1);
  await trx.insert(posts).values({
    title: "New Post",
    authorId: user.id,
  });
});
```

## Direct Drizzle Access

The `deesse.database` property exposes the full Drizzle instance directly. All drizzle-orm operations are available:

- `select()`, `insert()`, `update()`, `delete()`
- `query()` for prepared queries
- `transaction()` for atomic operations
- `batch()` for batch operations
- `execute()` for raw SQL

```typescript
// Raw SQL when needed
import { sql } from "drizzle-orm";

const result = await deesse.database.execute(
  sql`SELECT COUNT(*) FROM users WHERE banned = false`
);
```
