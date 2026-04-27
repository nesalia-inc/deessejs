# Issue: Excessive Type Casting (`as`) in `define.ts`

**Severity:** Medium
**Category:** Type Safety
**File:** `packages/deesse/src/config/define.ts`
**Discovered:** 2026-04-23

## Summary

The `define.ts` file contains 8+ `as` type casts, which hide type errors rather than fix them. Excessive casting indicates design problems.

## All Casts in the File

| Line | Cast | Issue |
|------|------|-------|
| 68 | `config.database as PostgresJsDatabase<TSchema>` | Casting to itself is suspicious |
| 69 | `config.secret as string` | Redundant |
| 72-75 | `mergedAuth.* as ...` | ts-deepmerge returns `any` |
| 84, 86 | `internalConfig as unknown as InternalConfig<TSchema>` | Double cast — signals broken generic |

## Root Causes

1. `merge()` from ts-deepmerge returns `any`
2. `InternalConfig<TSchema>` type definition is complex
3. The double cast is a direct consequence of the broken TSchema generic

## Fixes

Use native object spread instead of ts-deepmerge, or create a typed wrapper.

## Status

Open — needs design fix.