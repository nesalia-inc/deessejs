# getDeesse()

**Package:** `deesse`

**Source:** `packages/deesse/src/index.ts`

## Purpose

Returns the server-side Deesse instance — a singleton wrapping `better-auth` and the Drizzle database. It is used in API routes and Server Components to validate sessions and query the database.

## Interface

| Returns | Type | Description |
|---------|------|-------------|
| `deesse.auth` | `Auth` | better-auth instance: `getSession()`, `signIn()`, `signOut()`, etc. |
| `deesse.database` | `PostgresJsDatabase` | Drizzle database driver for querying |

## Singleton

`getDeesse()` is cached globally. The first call creates the instance; subsequent calls return the same one. When the config changes (compared by `secret`, `name`, `baseURL`, `plugins`, `session`, etc.), the old pool is closed and a new instance is created.

This survives hot module replacement — the cache key uses `Symbol.for()` which is shared across the process.

## Usage

### Module-level singleton

```typescript
// lib/deesse.ts
import { getDeesse } from "@deessejs/deesse";

export const deesse = await getDeesse();
export const { auth } = deesse;
```

### In an API Route

```typescript
import { auth } from "@/lib/deesse";

export async function GET(request: Request) {
  const session = await auth.getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await deesse.database.select().from(schema.users);
  return Response.json(users);
}
```

### In a Server Component

```typescript
import { auth } from "@/lib/deesse";

export default async function AdminPage() {
  const session = await auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const stats = await deesse.database.query.stats.findFirst();
  return <Dashboard stats={stats} />;
}
```

## shutdownDeesse()

Gracefully closes the database pool. Call this on process shutdown to drain active connections.

```typescript
import { shutdownDeesse } from "@deessejs/deesse";
import { deesse } from "@/lib/deesse";

process.on("SIGTERM", async () => {
  await shutdownDeesse(deesse);
  process.exit(0);
});
```

`getDeesse()` automatically registers `SIGINT` and `SIGTERM` handlers in production.
