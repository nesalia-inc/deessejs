# Memory Leak Investigation v2 - Complete Analysis

## Executive Summary

Despite implementing a global singleton for Pool management, RAM climbs from ~500MB to 4-6GB after a few minutes of running `pnpm dev` in `examples/base`. The fix was incomplete - there were multiple issues with the implementation.

---

## Root Causes Identified

### 1. `extractPool()` Always Returns `undefined`

**File:** `packages/deesse/src/index.ts` (lines 62-67)

```typescript
function extractPool(auth: Deesse["auth"]): unknown {
  const authAny = auth as unknown as { $context?: { pool?: unknown } };
  return authAny.$context?.pool;  // ALWAYS returns undefined
}
```

**Problem:** `$context` on better-auth's returned `auth` object is a **Promise**, not an object with a `pool` property:

```typescript
// From better-auth's types:
$context: Promise<AuthContext<Options> & InferPluginContext<Options>>;
```

Since Promises don't have a `pool` property, `extractPool()` always returns `undefined`.

**Consequence:** `cache.pool` is always `undefined`, so `shutdownDeesse()` never actually closes the pool.

---

### 2. Case 2 (HMR) Never Closes the Old Pool

**File:** `packages/deesse/src/index.ts` (lines 84-91)

```typescript
// Case 2: Instance exists but config changed - hot reload
if (
  cache.instance &&
  cache.config &&
  !isConfigEqual(cache.config, config)
) {
  console.info("[deesse] Config changed, performing hot reload...");
  cache.config = config;
  return cache.instance;  // <-- Returns cached instance WITHOUT closing old pool
}
```

**Problem:** When HMR fires:
1. `deesse.config.ts` re-evaluates at module level, creating a **new** `Pool` object
2. `getDeesse(config)` is called with the new config containing the new Pool
3. `isConfigEqual()` returns `false` because the new config has a different Pool reference
4. Case 2 executes - it just updates `cache.config` and returns the **cached instance**
5. The **new Pool is never used**, the **old Pool is never closed**
6. Each HMR leaves one Pool orphaned

---

### 3. `isConfigEqual` Doesn't Check Database/Pool

**File:** `packages/deesse/src/index.ts` (lines 51-56)

```typescript
function isConfigEqual(a: InternalConfig, b: InternalConfig): boolean {
  if (a.secret !== b.secret) return false;
  if (a.name !== b.name) return false;
  if (a.auth.baseURL !== b.auth.baseURL) return false;
  return true;  // <-- Always returns true for database!
}
```

**Problem:** The function only checks `secret`, `name`, and `auth.baseURL`. It does NOT check the `database` field.

---

### 4. The Pool Lives in `database.$client`, Not in `auth.$context`

**File:** `packages/deesse/src/server.ts` (lines 17-31)

```typescript
export function createDeesse(config: InternalConfig): Deesse {
  const auth = betterAuth({
    database: drizzleAdapter(config.database, {
      provider: "pg",
    }),
    // ...
  });

  return {
    auth,
    database: config.database,  // Pool is in config.database.$client
  };
}
```

The `Pool` is the `client` object passed to `drizzle()`. For `pg.Pool`, it's directly accessible via `config.database.$client` or `db.$client`.

---

## Additional Issue: Turbopack Root Config

**File:** `examples/base/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),  // Points to REPO ROOT, not examples/base
  },
};
```

**Problem:** `turbopack.root` is set to `../../` which resolves to the monorepo root, not `examples/base`. This causes Turbopack to resolve `tailwindcss` from the wrong `node_modules` hierarchy.

---

## Data Flow Analysis

```
deesse.config.ts (module level)
├── new Pool({ connectionString: ... })  ← NEW Pool created on HMR
└── drizzle({ client: new Pool(...) })  ← PostgresJsDatabase wrapping Pool

lib/deesse.ts
└── getDeesse(config)  ← config has NEW Pool

packages/deesse/src/index.ts
├── getDeesse(config)
│   ├── Case 1: isConfigEqual → returns cached (if equal)
│   ├── Case 2: !isConfigEqual → returns cached, config updated, pool NEVER CLOSED
│   └── Case 3: no cached → createDeesse(config), extractPool fails
│
└── shutdownDeesse()  ← Only called on SIGINT/SIGTERM, NOT on HMR
```

---

## Required Fixes

### Fix 1: Extract Pool Correctly

The Pool is in `database.$client` for PostgresJsDatabase, not in `auth.$context`.

```typescript
// In createDeesse, extract pool before wrapping
function extractPoolFromDatabase(db: PostgresJsDatabase): unknown {
  // For pg Pool passed to drizzle-orm/node-postgres
  return (db as unknown as { $client?: unknown }).$client;
}
```

### Fix 2: Close Pool in Case 2

When config changes (HMR), close the old pool before returning cached instance.

```typescript
if (!isConfigEqual(cache.config, config)) {
  // Close old pool if it exists
  const oldPool = extractPoolFromDatabase(cache.config.database);
  if (oldPool && typeof (oldPool as { end?: Function }).end === 'function') {
    await (oldPool as { end: () => Promise<void> }).end();
  }
  // ... continue
}
```

### Fix 3: Fix Turbopack Root

Remove or fix `turbopack.root` in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Remove turbopack.root or set to correct path
};
```

---

## Key Files to Modify

| File | Change |
|------|--------|
| `packages/deesse/src/index.ts` | Fix `extractPool()`, add pool cleanup in Case 2, use correct pool source |
| `examples/base/next.config.ts` | Remove or fix `turbopack.root` |
| `examples/base/src/deesse.config.ts` | Consider not creating Pool at module level |

---

## Verification After Fix

After implementing the fixes, monitor:
1. RAM usage should stay stable (~500MB) during HMR
2. Pool count should remain constant (1 pool)
3. PostgreSQL connections should not accumulate

Check with:
```bash
# Monitor RAM
pnpm dev
# In another terminal, watch RAM
tasklist | grep node  # Windows
# or
ps aux | grep next   # Mac/Linux
```