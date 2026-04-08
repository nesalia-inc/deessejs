# How PayloadCMS Solves This

PayloadCMS does **NOT** use a "global pool" pattern. The persistence comes from **caching the entire Payload instance globally**, not just the pool.

## 1. Global Singleton for the Complete Instance

```typescript
// packages/payload/src/index.ts
let _cached = (global as any)._payload

if (!_cached) {
  _cached = (global as any)._payload = new Map()
}

export const getPayload = async ({ key = 'default', ...options }) => {
  let cached = _cached.get(key)

  if (cached.payload) {
    if (cached.reload === true) {
      cached.reload = new Promise((res) => (resolve = res))
      await reload(config, cached.payload, false, options)
      cached.reload = false
    }
    return cached.payload  // ← Returns cached instance
  }

  // Initialize new instance
  cached.promise = new BasePayload().init(options)
  cached.payload = await cached.promise

  // Set up WebSocket for HMR detection
  cached.ws = new WebSocket(`/_next/webpack-hmr`)
  cached.ws.onmessage = (event) => {
    if (data.type === 'serverComponentChanges') {
      cached.reload = true
    }
  }

  return cached.payload
}
```

**Key insight**: The **entire Payload instance** is cached globally. The pool is stored on the adapter (`this.pool`), not in a global variable. The adapter is part of the cached Payload instance.

## 2. Adapter Stores Pool on Instance, Not Globally

```typescript
// packages/db-postgres/src/connect.ts
export const connect = async function(options = { hotReload: false }) {
  if (!this.pool) {
    this.pool = new this.pg.Pool(this.poolOptions)  // ← Stored on `this`
  }
  // ... connect logic
}
```

The pool is stored on `this.pool` (the adapter instance). The adapter is part of the cached Payload instance. **There is no separate global pool.**

## 3. Destroy Does NOT Close the Pool

```typescript
// packages/drizzle/src/destroy.ts
export const destroy: Destroy = async function destroy(this: DrizzleAdapter) {
  // ... nulls out schema/tables/enums ...
  this.drizzle = undefined
  // NOTE: this.pool is NOT destroyed or closed!
}
```

During HMR, `destroy()` is called to clear in-memory state, but the **pool is kept alive** because the adapter instance (cached globally) is reused.

## 4. Hot Reload with Existing Pool

```typescript
// During HMR, Payload calls:
await payload.db.connect({ hotReload: true })
```

This reuses the existing pool (since `!this.pool` is false), updates schema references in memory, and skips database operations that shouldn't run during hot reload.

## References

- [PayloadCMS singleton pattern](https://github.com/payloadcms/payload/blob/main/packages/payload/src/index.ts) - Global Payload instance caching with HMR detection
- [PayloadCMS db-postgres connect](https://github.com/payloadcms/payload/blob/main/packages/db-postgres/src/connect.ts) - Pool stored on adapter instance, not globally
- [PayloadCMS drizzle destroy](https://github.com/payloadcms/payload/blob/main/packages/drizzle/src/destroy.ts) - Shows destroy does NOT close pool
