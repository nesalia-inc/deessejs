# Issue: `DeepPartial` Is Not Needed in `types.ts`

**Severity:** Low
**Category:** Code Quality
**File:** `packages/deesse/src/config/types.ts`
**Discovered:** 2026-04-23
**Fixed:** 2026-04-23

## Summary

`DeepPartial<T>` was used to make `Config` fields optional in `defineConfig()`, allowing users to pass incomplete configs. This is counterproductive — TypeScript should enforce required fields, not runtime checks.

## Problem

**Before:**
```typescript
export const defineConfig = <TSchema>(
  config: DeepPartial<Config<TSchema>>  // TypeScript allows {}
): InternalConfig<TSchema> => {
  if (!config.database) throw new Error('[deesse] config.database is required');
  if (!config.secret) throw new Error('[deesse] config.secret is required');
  // ...
```

TypeScript allows passing `{}`, then runtime throws errors. This defeats the purpose of TypeScript's type system.

## Fix

Use `Config<TSchema>` directly:

```typescript
export const defineConfig = <TSchema>(
  config: Config<TSchema>  // TypeScript enforces required fields
): InternalConfig<TSchema> => {
  // No runtime checks needed - TypeScript enforces database, secret, baseURL
```

## Changes Made

1. **Removed** `DeepPartial` type from `types.ts`
2. **Changed** `defineConfig()` signature from `DeepPartial<Config<TSchema>>` to `Config<TSchema>`
3. **Removed** runtime validation checks for `database`, `secret`, `auth.baseURL`
4. **Kept** explicit casts for `session` and `emailAndPassword` (required due to BetterAuthOptions complex types)

## Result

TypeScript now enforces required fields at compile time. Users get type errors if they forget `database`, `secret`, or `auth.baseURL` instead of runtime errors.

## Status

**Fixed** — `DeepPartial` removed, `Config<TSchema>` used directly.