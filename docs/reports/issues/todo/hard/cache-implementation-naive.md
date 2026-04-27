# Issue: `cache.ts` Implementation is Naive/Junior

**Severity:** Low
**Category:** Code Quality
**File:** `packages/deesse/src/cache.ts`
**Discovered:** 2026-04-23

## Summary

The cache implementation has several issues indicating a junior approach: verbose IIFE pattern, missing thundering herd protection, no TTL/eviction, shallow readonly types, and a design that requires string keys without key generation.

## Issues

### Issue 1: Verbose IIFE for Map Delete (lines 15-19)

```typescript
promises: (() => {
  const m = new Map(state.promises);
  m.delete(key);
  return m;
})(),
```

An IIFE to delete from a Map is unnecessary. Could be:
```typescript
promises: (() => { const m = new Map(state.promises); m.delete(key); return m; })(),
```

### Issue 2: No Thundering Herd Protection (line 60)

```typescript
const promise = createInstance(options);
state = setCachePromise(state, key, promise);
```

If two requests come in with the same key before the first completes, both calls to `get()` will create duplicate expensive work.

### Issue 3: No TTL or Eviction

The cache grows indefinitely. No mechanism to expire entries or limit size.

### Issue 4: Readonly is Surface-Level

`Readonly<T>` only prevents direct mutation of properties, it doesn't deep-freeze.

### Issue 5: No Key Generation Function

The cache uses raw `key: string` but doesn't provide a way to derive keys from options.

## Fix Options

### Option A: Remove if Unused

If `createCache` is not used, just delete the file.

### Option B: Improve if Needed

1. Remove IIFE pattern
2. Add thundering herd protection
3. Add optional TTL support
4. Add key function option

## Status

Open — needs decision: remove or improve.