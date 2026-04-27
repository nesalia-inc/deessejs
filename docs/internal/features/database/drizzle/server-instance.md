# Server Instance

## Overview

The server instance is created via `getDeesse()`, a factory function that returns a cached singleton. The actual instance creation is delegated to `createDeesse()`.

## Type Definitions

```typescript
// packages/deesse/src/types.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// The Deesse server instance
// Note: This exposes the full Drizzle instance directly. All drizzle-orm
// operations (select, insert, update, delete, transaction, etc.) are available.
export type Deesse = {
  database: PostgresJsDatabase;
};

// Configuration passed to getDeesse()
export type Config = {
  name?: string;
  database: PostgresJsDatabase;
};
```

## getDeesse Signature

```typescript
// packages/deesse/src/factory.ts

/**
 * Creates or returns the cached Deesse instance.
 *
 * @param config - Configuration object containing the Drizzle database instance
 * @returns The cached Deesse instance with database access
 *
 * @remarks
 * This function implements a singleton pattern with a single "main" cache key.
 * Only ONE Deesse instance exists per application lifecycle.
 *
 * @example
 * ```typescript
 * import { getDeesse } from "deesse";
 * import { config } from "./deesse.config";
 *
 * const deesse = getDeesse(config);
 * ```
 */
export function getDeesse(config: Config): Deesse {
  return deesseCache.get("main", config);
}
```

### Signature Analysis

| Aspect | Detail |
|--------|--------|
| **Parameters** | `config: Config` - Must contain a initialized Drizzle instance |
| **Returns** | `Deesse` - A cached singleton instance |
| **Cache key** | `"main"` - Hardcoded, single instance per app |
| **Async** | No - `createDeesse()` is sync for this basic version |

### Parameter Details

```typescript
type Config = {
  name?: string;           // Optional app name for logging/debugging
  database: PostgresJsDatabase;  // Required - initialized Drizzle instance
};
```

The `database` field must be a **fully initialized** Drizzle instance:

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const database = drizzle({
  client: new Pool({ connectionString: process.env.DATABASE_URL }),
});

// This is valid
const deesse = getDeesse({ database });
```

### Return Value

```typescript
type Deesse = {
  database: PostgresJsDatabase;  // Direct access to Drizzle instance
};
```

**Important:** The returned `Deesse` object exposes the underlying Drizzle instance directly. All drizzle-orm methods are accessible:

```typescript
const deesse = getDeesse(config);

// These all work directly on deesse.database
deesse.database.select()
deesse.database.insert()
deesse.database.update()
deesse.database.delete()
deesse.database.transaction()
```

## createDeesse (Internal Factory)

```typescript
// packages/deesse/src/server.ts

/**
 * Factory function that creates a Deesse instance from config.
 *
 * @param config - Configuration object
 * @returns A new Deesse instance (not cached)
 *
 * @remarks
 * This is called internally by the cache. Usually you won't call this directly.
 */
export function createDeesse(config: Config): Deesse {
  return {
    database: config.database,
  };
}
```

**Why separate `createDeesse` from `getDeesse`?**

1. **Testing** - `createDeesse` can be tested in isolation
2. **Flexibility** - The cache layer can be swapped without changing instance creation
3. **Future-proofing** - Additional logic (auth, plugins) can be added to `createDeesse` without breaking the cache interface

The cache uses a **singleton pattern** with a single `"main"` key:

```typescript
// packages/deesse/src/factory.ts
type CacheState<T> = {
  instances: Map<string, T>;
  promises: Map<string, Promise<T>>;
};

const empty = <T>(): CacheState<T> => ({
  instances: new Map(),
  promises: new Map(),
});

const setInstance = <T>(state: CacheState<T>, key: string, instance: T): CacheState<T> => ({
  instances: new Map(state.instances).set(key, instance),
  promises: new Map(state.promises).delete(key),
});

const setPromise = <T>(state: CacheState<T>, key: string, promise: Promise<T>): CacheState<T> => ({
  instances: state.instances,
  promises: new Map(state.promises).set(key, promise),
});

const getCached = <T>(state: CacheState<T>, key: string): T | Promise<T> | undefined => {
  const instance = state.instances.get(key);
  if (instance !== undefined) return instance;
  return state.promises.get(key);
};

// Singleton cache with immutable state
const createCache = <T, Options>(
  createInstance: (options: Options) => Promise<T>
) => {
  let state: CacheState<T> = empty();

  return {
    async get(key: string, options: Options): Promise<T> {
      const cached = getCached(state, key);
      if (cached !== undefined) return cached as T;

      const promise = createInstance(options);
      state = setPromise(state, key, promise);

      try {
        const instance = await promise;
        state = setInstance(state, key, instance);
        return instance;
      } catch {
        state = { ...state, promises: new Map(state.promises).delete(key) };
        throw;
      }
    },

    getState(): Readonly<CacheState<T>> { return state; },

    clear(): void { state = empty(); },
  };
};

// Module-scoped singleton
const deesseCache = createCache<Deesse, Config>(createDeesse);

// Singleton accessor - only one instance per app
export const getDeesse = (config: Config) => deesseCache.get("main", config);
export const clearDeesseCache = () => deesseCache.clear();
```

**Key insight:** The `"main"` key means only **one** Deesse instance exists per application. Subsequent calls to `getDeesse()` with different configs will return the **first** cached instance. This is intentional — Deesse is designed as a single-instance per app pattern.

## Why Module-Scoped?

- **No global state** - cache is scoped to the module
- **Predictable** - same key returns same cached instance
- **Testable** - `clearDeesseCache()` for tests
- **Thundering herd prevention** - same promise returned to concurrent calls
