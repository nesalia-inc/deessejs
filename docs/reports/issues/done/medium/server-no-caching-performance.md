# Issue: No Caching in `server.ts` — Performance Analysis

**Severity:** Medium
**Category:** Performance
**Files:**
- `packages/deesse/src/server.ts`
- `packages/deesse/src/index.ts`
**Discovered:** 2026-04-23

## Summary

`createDeesse()` creates new `betterAuth()` and `drizzleAdapter()` instances on every call. Caching is at `getDeesse()` level but has issues.

## Key Issues

### Cache Key is Too Shallow

```typescript
function isConfigEqual(a: InternalConfig, b: InternalConfig): boolean {
  if (a.secret !== b.secret) return false;
  if (a.name !== b.name) return false;
  if (a.auth.baseURL !== b.auth.baseURL) return false;
  return true;  // Missing: plugins, session, emailAndPassword
}
```

Only 3 fields compared. Changes to `auth.plugins` would return stale instance.

### No Thundering Herd Protection

Direct `createDeesse()` calls bypass any caching.

## Recommendations

1. Fix cache key comparison to include all auth fields
2. Consider returning copies instead of same reference

## Status

Open — primary concern is shallow cache key.