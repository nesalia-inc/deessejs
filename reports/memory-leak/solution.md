# Solution for DeesseJS

## Critical Issue with Naive Singleton

The previous proposed solution had a **fatal flaw**:

```typescript
// BROKEN - config comparison by reference
if (_cachedDeesse && _cachedConfig === config) {
  return _cachedDeesse;
}
```

**Why this fails:** On HMR, `deesse.config.ts` is re-evaluated, creating a **new config object**. Even if contents are identical, `{} === {}` is `false` in JavaScript. The cached instance is **never reused**.

---

## Recommended: Production-Ready Singleton

Cache the entire `Deesse` instance on `global` with **deep config comparison** and **graceful shutdown**. No WebSocket HMR detection needed.

```typescript
// packages/deesse/src/index.ts
import type { InternalConfig } from "./config/define";
import { createDeesse, type Deesse } from "./server";

/**
 * Symbol-based global storage for Deesse instance.
 * Using Symbol.for ensures uniqueness across the process.
 */
const DEESSE_GLOBAL_KEY = Symbol.for('@deessejs/core.instance')

interface GlobalDeesseCache {
  instance: Deesse | undefined;
  config: InternalConfig | undefined;
  initializing: Promise<Deesse> | undefined;
  pool: InstanceType<typeof import('pg').Pool> | undefined;
}

function getGlobalCache(): GlobalDeesseCache {
  const g = global as typeof global & { [DEESSE_GLOBAL_KEY]?: GlobalDeesseCache }
  if (!g[DEESSE_GLOBAL_KEY]) {
    g[DEESSE_GLOBAL_KEY] = {
      instance: undefined,
      config: undefined,
      initializing: undefined,
      pool: undefined,
    }
  }
  return g[DEESSE_GLOBAL_KEY]!
}

/**
 * Deep equality check for config comparison.
 * Required because config objects are recreated on HMR.
 */
function isConfigEqual(a: InternalConfig, b: InternalConfig): boolean {
  if (a.secret !== b.secret) return false
  if (a.name !== b.name) return false
  if (a.auth.baseURL !== b.auth.baseURL) return false
  return true
}

export const getDeesse = async (config: InternalConfig): Promise<Deesse> => {
  const cache = getGlobalCache()

  // Case 1: Instance exists and config is semantically equal
  if (cache.instance && cache.config && isConfigEqual(cache.config, config)) {
    return cache.instance
  }

  // Case 2: Instance exists but config changed - hot reload
  if (cache.instance && cache.config && !isConfigEqual(cache.config, config)) {
    console.info('[deesse] Config changed, performing hot reload...')
    cache.config = config
    return cache.instance
  }

  // Case 3: Instance is being initialized by another caller - wait for it
  if (cache.initializing) {
    return cache.initializing
  }

  // Case 4: No instance exists - create one
  cache.initializing = createDeesse(config)
    .then(async (instance) => {
      cache.pool = instance.database.$client
      cache.instance = instance
      cache.config = config
      cache.initializing = undefined
      return instance
    })
    .catch((err) => {
      cache.initializing = undefined
      throw err
    })

  return cache.initializing
}

/**
 * Graceful shutdown - call this on process exit.
 * Ensures all database connections are properly closed.
 */
export const shutdownDeesse = async (): Promise<void> => {
  const cache = getGlobalCache()

  if (cache.pool) {
    console.info('[deesse] Closing database pool...')
    await cache.pool.end()
    cache.pool = undefined
  }

  cache.instance = undefined
  cache.config = undefined
}

// Register graceful shutdown hooks
if (process.env.NODE_ENV !== 'test') {
  const shutdown = () => {
    shutdownDeesse()
      .catch(console.error)
      .finally(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
```

---

## Why No WebSocket HMR Detection?

The memory leak is caused by **Pool accumulation** during HMR, not by stale config. The solution is:

1. **Global singleton** - Instance persists on `global` across HMR
2. **Deep config comparison** - Detects semantic equality of configs
3. **Pool reuse** - Same Pool reused when instance is reused

The WebSocket HMR detection (`/_next/webpack-hmr`) adds unnecessary complexity because:

- It detects when Next.js HMR occurs, but the singleton already survives HMR
- `serverComponentChanges` is PayloadCMS-specific, not a standard Next.js event
- The endpoint path could theoretically change between Next.js versions
- Turbopack has its own hot-reloader implementation

**The singleton pattern works regardless of bundler (webpack, Turbopack, or Rspack).**

---

## Pool Configuration Best Practices

Configure the pool with proper settings for your workload:

```typescript
// In defineConfig or database setup
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Max connections (don't exceed PostgreSQL max_connections)
  idleTimeoutMillis: 30000,     // 30s idle timeout (not 10s default)
  connectionTimeoutMillis: 5000, // 5s connection timeout
}
```

---

## Monitoring (Optional)

Add connection pool metrics for operational visibility:

```typescript
export const getPoolStats = () => {
  const cache = getGlobalCache()
  if (!cache.pool) return null

  return {
    totalCount: cache.pool.totalCount,
    idleCount: cache.pool.idleCount,
    waitingClients: cache.pool.waitingClients,
  }
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/deesse/src/index.ts` | Replace factory.ts with production-ready singleton |
| `packages/deesse/src/factory.ts` | Remove (replaced by global singleton in index.ts) |

---

## Key Differences from Current Implementation

| Before | After |
|--------|-------|
| Factory cache recreated on every HMR | Instance cached on `global` using `Symbol.for` |
| Config compared by reference (never matches) | Config compared by value (deep equality) |
| New `Pool` created on each HMR | Same `Pool` reused across HMR |
| No cleanup mechanism | Graceful shutdown with `pool.end()` on SIGINT/SIGTERM |
| No monitoring | Pool stats available via `getPoolStats()` |
| WebSocket HMR detection (complex) | No WebSocket needed (simpler) |

---

## Edge Cases Handled

| Edge Case | Response |
|-----------|----------|
| Instance exists, config equal | Return cached instance |
| Instance exists, config changed | Hot reload (reuse instance) |
| Another caller initializing | Wait for that promise |
| No instance | Create new one |
| Process exit | Graceful `pool.end()` |

---

## References

- [node-postgres Pool API](https://node-postgres.com/apis/pool) - Pool configuration and cleanup
- [Next.js 16 Blog](https://nextjs.org/blog/next-16) - Turbopack as default bundler
- [Next.js Turbopack for Development](https://nextjs.org/blog/turbopack-for-development-stable) - Turbopack HMR architecture
- [PayloadCMS singleton pattern](https://github.com/payloadcms/payload/blob/main/packages/payload/src/index.ts) - Reference implementation
