# Issue: Redundant Deduplication Call in `define.ts`

**Severity:** Low
**Category:** Logic Bug
**File:** `packages/deesse/src/config/define.ts:38-39`
**Discovered:** 2026-04-23

## Summary

`deduplicatePlugins` is called twice in sequence, which is redundant. The second call does nothing useful.

## The Code

```typescript
// Line 38-39
const deduplicatedUserPlugins = deduplicatePlugins([...defaultAuth.plugins, ...userPlugins]);
const finalPlugins = deduplicatePlugins(deduplicatedUserPlugins);
```

## Trace

1. `defaultAuth.plugins` = `[admin()]`
2. `userPlugins` = user's plugins array
3. **First call:** `deduplicatePlugins([admin(), ...userPlugins])`
   - Result: `[admin(), ...userPlugins without any admin plugin]`
4. **Second call:** `deduplicatePlugins(deduplicatedUserPlugins)`
   - Input has no duplicates (first call already removed them)
   - Output is identical to input

## Why It's Redundant

`deduplicatePlugins` removes duplicate plugin IDs by keeping the first occurrence. After the first call, the array is already deduplicated. Running it again on the same array produces the same result.

## Intent vs Reality

The comment says "Apply deduplication to plugins BEFORE the warning and merge" — this describes the first call. The second call has no justification.

### Possible Original Intent

Maybe there was a different plan:

```typescript
// What it might have been intended for:
const deduplicatedDefaults = deduplicatePlugins(defaultAuth.plugins);
const deduplicatedUser = deduplicatePlugins(userPlugins);
const finalPlugins = deduplicatePlugins([...deduplicatedDefaults, ...deduplicatedUser]);
```

But that's NOT what's written. The current code just deduplicates twice.

## Fix

Remove the second call:

```typescript
const deduplicatedUserPlugins = deduplicatePlugins([...defaultAuth.plugins, ...userPlugins]);
```

If deduplication is needed on both arrays separately before combining, do:

```typescript
const deduplicatedDefaults = deduplicatePlugins(defaultAuth.plugins);
const deduplicatedUserPlugins = deduplicatePlugins(userPlugins);
const finalPlugins = deduplicatePlugins([...deduplicatedDefaults, ...deduplicatedUserPlugins]);
```

## Related Issues

- Default auth logic confused (see `default-auth-logic-confused.md`)
- TSchema generic broken (see `tschema-generic-broken.md`)

## Status

Fixed — removed redundant second deduplicatePlugins call on line 39. Changed `plugins: finalPlugins` to `plugins: deduplicatedUserPlugins` at line 51.