# Solution v2 for Memory Leak

## Problems Found

The initial fix had multiple issues:

1. **`extractPool()` always returns `undefined`** - `$context` is a Promise, not an object with pool
2. **Case 2 (HMR) never closes the old pool** - returns cached instance without cleanup
3. **`isConfigEqual` doesn't check database** - Pool changes aren't detected
4. **`turbopack.root` is misconfigured** - causes tailwindcss resolution failure

---

## Fix 1: Remove Turbopack Root (Critical - Blocks Dev Server)

**File:** `examples/base/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // REMOVE: turbopack: { root: path.resolve(__dirname, "../..") }
  // This was incorrectly pointing to monorepo root
};
```

---

## Fix 2: Extract Pool Correctly from Database

The Pool is in `database.$client` (PostgresJsDatabase), not in `auth.$context`.

**File:** `packages/deesse/src/index.ts`

```typescript
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

function extractPool(db: PostgresJsDatabase): unknown {
  // For pg Pool passed to drizzle-orm/node-postgres
  return (db as unknown as { $client?: unknown }).$client;
}
```

And update `getDeesse` to extract pool from database:

```typescript
cache.pool = extractPool(instance.database);
```

---

## Fix 3: Close Pool in Case 2 (HMR)

When config changes on HMR, close the old pool before returning cached instance:

```typescript
// Case 2: Instance exists but config changed - hot reload
if (
  cache.instance &&
  cache.config &&
  !isConfigEqual(cache.config, config)
) {
  console.info("[deesse] Config changed, performing hot reload...");

  // Close old pool if it exists
  const oldPool = extractPool(cache.config.database as PostgresJsDatabase);
  if (oldPool) {
    const pool = oldPool as { end?: () => Promise<void> };
    if (typeof pool.end === "function") {
      await pool.end();
    }
  }

  cache.config = config;
  return cache.instance;
}
```

---

## Fix 4: Add Database to Config Comparison (Optional Enhancement)

While `isConfigEqual` doesn't currently check database, the Case 2 fix handles pool cleanup, so this is optional.

---

## Complete Fixed `packages/deesse/src/index.ts`

```typescript
// @deessejs/deesse core package

import type { InternalConfig } from "./config/define";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createDeesse, type Deesse } from "./server";

export { defineConfig } from "./config";
export type { Config, InternalConfig } from "./config";
export { plugin } from "./config";
export type { Plugin } from "./config";
export { page, section } from "./config";
export type { Page, Section, PageTree } from "./config";

export { z } from "zod";
export type { ZodSchema } from "zod";

export type { Deesse } from "./server";

export { createClient } from "./client";
export type { DeesseClient, DeesseClientOptions } from "./client";

const DEESSE_GLOBAL_KEY = Symbol.for("@deessejs/core.instance");

interface GlobalDeesseCache {
  instance: Deesse | undefined;
  config: InternalConfig | undefined;
  pool: unknown | undefined;
}

function getGlobalCache(): GlobalDeesseCache {
  const g = global as typeof global & {
    [DEESSE_GLOBAL_KEY]?: GlobalDeesseCache;
  };
  if (!g[DEESSE_GLOBAL_KEY]) {
    g[DEESSE_GLOBAL_KEY] = {
      instance: undefined,
      config: undefined,
      pool: undefined,
    };
  }
  return g[DEESSE_GLOBAL_KEY]!;
}

function isConfigEqual(a: InternalConfig, b: InternalConfig): boolean {
  if (a.secret !== b.secret) return false;
  if (a.name !== b.name) return false;
  if (a.auth.baseURL !== b.auth.baseURL) return false;
  return true;
}

function extractPool(db: PostgresJsDatabase): unknown {
  return (db as unknown as { $client?: unknown }).$client;
}

export const getDeesse = async (
  config: InternalConfig
): Promise<Deesse> => {
  const cache = getGlobalCache();

  if (cache.instance && cache.config && isConfigEqual(cache.config, config)) {
    return cache.instance;
  }

  if (
    cache.instance &&
    cache.config &&
    !isConfigEqual(cache.config, config)
  ) {
    console.info("[deesse] Config changed, performing hot reload...");

    // Close old pool if it exists
    const oldPool = extractPool(cache.config.database as PostgresJsDatabase);
    if (oldPool) {
      const pool = oldPool as { end?: () => Promise<void> };
      if (typeof pool.end === "function") {
        await pool.end();
      }
    }

    cache.config = config;
    return cache.instance;
  }

  const instance = createDeesse(config);
  cache.pool = extractPool(instance.database);
  cache.instance = instance;
  cache.config = config;

  return instance;
};

export const clearDeesseCache = (): void => {
  const cache = getGlobalCache();
  cache.instance = undefined;
  cache.config = undefined;
  cache.pool = undefined;
};

export const shutdownDeesse = async (): Promise<void> => {
  const cache = getGlobalCache();

  if (cache.pool) {
    console.info("[deesse] Closing database pool...");
    const pool = cache.pool as { end?: () => Promise<void> };
    if (pool && typeof pool.end === "function") {
      await pool.end();
    }
    cache.pool = undefined;
  }

  cache.instance = undefined;
  cache.config = undefined;
};

if (process.env["NODE_ENV"] !== "test") {
  const shutdown = () => {
    shutdownDeesse()
      .catch(console.error)
      .finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `examples/base/next.config.ts` | Remove `turbopack.root` |
| `packages/deesse/src/index.ts` | Fix pool extraction, add pool cleanup in Case 2 |

---

## What the Fix Does

1. **Before:** `extractPool()` looked in `auth.$context` which is a Promise → always undefined
2. **After:** `extractPool()` looks in `database.$client` → correctly finds the Pool

3. **Before:** Case 2 returned cached instance without closing old pool → Pool leak
4. **After:** Case 2 closes old pool before returning → Pool cleanup on HMR

5. **Before:** `turbopack.root` pointing to monorepo root → tailwindcss not found
6. **After:** Removed `turbopack.root` → proper module resolution

---

## Expected Result

After applying fixes:
- `pnpm dev` starts without tailwindcss error
- RAM stays stable during HMR
- Pool count remains at 1
- No orphaned PostgreSQL connections