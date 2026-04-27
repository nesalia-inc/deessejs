# Deep Merge Types - TypeScript Structural Typing Issue

## Problem

When using `BetterAuthOptions['emailAndPassword']` and `BetterAuthOptions['session']` directly in the `Config` type, a TypeScript error occurs during config merging.

## Error Message

```
src/config/define.ts(58,45): error TS2559:
Type 'BetterAuthDBOptions<"session", ...> & { expiresIn?: number; ... }'
has no properties in common with type 'Partial<{ maxAge: number; }>'.
```

## Root Cause: `Partial<T>` is Too Strict

The constraint `source: Partial<T>` forces TypeScript to require that the source be a subset of the target. This is a direct consequence of TypeScript's structural typing.

### Step-by-Step Breakdown

1. `defaultAuth.session` is inferred as `{ maxAge: number }`
2. TypeScript infers `T` as `{ maxAge: number }`
3. `source` must be `Partial<{ maxAge: number }>` = `{ maxAge?: number }`
4. `BetterAuthOptions['session']` has additional properties (`expiresIn`, `cookieCache`, etc.)
5. TypeScript rejects this "wider" type because a more specific (narrower) type is expected

### Why This Happens

TypeScript's structural typing means a "wider" (more general) type cannot be assigned to a "narrower" (more specific) type. The `deepMerge` signature says "the source must be a partial of exactly this narrow type," but better-auth's types are intentionally richer.

## Secondary Issue: Functions Break `typeof === 'object'`

The `deepMerge` function checks:

```typescript
typeof targetValue === 'object'  // false for functions!
```

Functions fall through to the `else` branch and are assigned directly. Runtime behavior is correct, but TypeScript cannot prove it because the type narrowing fails.

## Solution: Intersection Signature

```typescript
// Source can have more properties than target, return preserves all
function deepMerge<T extends object, S extends object>(target: T, source: S): T & S {
  const result = { ...target } as any;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }
  }

  return result as T & S;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}
```

**Key improvements:**
- Returns `T & S` intersection - preserves all properties from both target and source
- Uses `for...in` with `hasOwnProperty` - handles non-enumerable properties correctly
- Uses explicit `!== null` check - more idiomatic than `!!` for nullish checking
- The intersection return type allows TypeScript to understand that properties from both objects are preserved

## Type `defaultAuth` Explicitly

```typescript
const defaultAuth: Partial<BetterAuthOptions> = {
  emailAndPassword: { enabled: true },
  session: { maxAge: 60 * 60 * 24 * 7 },
};

// Now deepMerge(defaultAuth.session, config.auth.session || {})
// merges Partial<Session> with Partial<Session> - TypeScript is happy
```

By explicitly typing `defaultAuth` as `Partial<BetterAuthOptions>`, TypeScript infers the correct combined type during merge operations, eliminating the need for `as any` casts.

## Files Affected

| File | Issue |
|------|-------|
| `packages/deesse/src/config/define.ts` | Uses narrow `Partial<T>` signature and has `as any` casts |
