# Server Instance

## Deesse Type

```typescript
// The Deesse server instance (database-only, auth comes separately)
// Note: This exposes the full Drizzle instance directly. All drizzle-orm
// operations (select, insert, update, delete, transaction, etc.) are available.
export type Deesse = {
  database: PostgresJsDatabase;
};
```

## Factory Function

```typescript
// packages/deesse/src/server.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Config } from "./config/define";

export function createDeesse(config: Config): Deesse {
  return {
    database: config.database,  // Expose Drizzle instance directly
  };
}
```

## Module-Scoped Singleton

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
