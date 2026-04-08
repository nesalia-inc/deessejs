# Memory Leak in Development Server

## Problem

When running `pnpm dev` in `examples/base`, RAM usage climbs indefinitely until the system runs out of memory. This is caused by database connection pool accumulation during Next.js Hot Module Replacement (HMR).

### Root Cause

In `examples/base/src/deesse.config.ts`:

```typescript
export const config = defineConfig({
  database: drizzle({
    client: new Pool({  // ← NEW POOL CREATED ON EVERY HMR
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});
```

During development with Next.js (Turbopack/Webpack):

1. When a file changes, Next.js performs hot module replacement
2. `deesse.config.ts` is re-evaluated, creating a **new `pg.Pool` instance**
3. The old `Pool` is never closed - `pg.Pool` does not auto-close idle connections
4. Each Pool maintains its own set of database connections
5. Over time, these accumulate → RAM climbs indefinitely

### Why the Existing Cache Doesn't Help

The `deesse` package uses a factory cache (`packages/deesse/src/factory.ts`):

```typescript
const deesseFactory = createCache<Deesse, InternalConfig>(async (config) => {
  return createDeesse(config);
});

export const getDeesse = async (config: InternalConfig): Promise<Deesse> => {
  return deesseFactory.get("main", config);
};
```

However:
- The **closure** holding the cache state is recreated on HMR
- A **new factory** is created on each HMR, so the cache key `"main"` points to a new factory instance
- The old `deesse` instance (with its Pool) is no longer referenced by the new factory
- BUT the old Pool object still exists and holds open database connections
- `better-auth` holds a reference to the Pool via the drizzle adapter
