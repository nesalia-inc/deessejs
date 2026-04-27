# Issue: Unnecessary `as Auth` Cast — Type Loss

**Severity:** Medium
**Category:** Type Safety
**File:** `packages/deesse/src/server.ts:12-22`
**Discovered:** 2026-04-23

## The Code

```typescript
const auth = betterAuth({
  database: drizzleAdapter(config.database, {
    provider: "pg",
  }),
  baseURL: config.auth.baseURL,
  secret: config.secret,
  emailAndPassword: config.auth.emailAndPassword,
  trustedOrigins: config.auth.trustedOrigins,
  plugins: config.auth.plugins,
}) as Auth;
```

## Why This Is Obvious Nonsense

`betterAuth()` already returns `Auth<Options>` — a fully generic auth type parameterized by the options you pass in. The function signature:

```typescript
declare const betterAuth: <Options extends BetterAuthOptions>(options: Options & {}) => Auth<Options>;
```

So `betterAuth({ ... })` returns `Auth<typeof options>` — the exact type with the correct generic parameter.

**But `as Auth` widens to `Auth<BetterAuthOptions>`** — the default type parameter, losing all the plugin-specific and option-specific type information.

## What `as Auth` Actually Does

```typescript
// What we pass in:
const auth = betterAuth({ plugins: [admin(), myCustomPlugin()], ... });

// What we get WITHOUT the cast:
Auth<{ plugins: [admin(), myCustomPlugin()], baseURL: string, ... }>

// What we get WITH "as Auth":
Auth<BetterAuthOptions>  // ← Generic info destroyed
```

## Why This Exists

The `as Auth` exists because somewhere in the chain, the type inference is broken:

1. `InternalConfig['auth']` is manually typed (see `auth-type-should-be-better-auth-return-type.md`)
2. `config.auth.emailAndPassword` is `Partial<BetterAuthOptions['emailAndPassword']> | undefined`
3. TypeScript can't infer the full options shape
4. Developer says "screw it" and casts

The cast is a **symptom**, not the **problem**. The problem is that `InternalConfig['auth']` doesn't properly represent what `betterAuth()` expects.

## The Fix

**Remove the cast AND fix the types upstream.**

```typescript
// server.ts - no cast needed
export const createDeesse = (config: InternalConfig): Deesse => {
  const auth = betterAuth({
    database: drizzleAdapter(config.database, {
      provider: "pg",
    }),
    baseURL: config.auth.baseURL,
    secret: config.secret,
    emailAndPassword: config.auth.emailAndPassword,
    trustedOrigins: config.auth.trustedOrigins,
    plugins: config.auth.plugins,
  });  // No cast - TypeScript infers correctly

  return { auth, database: config.database };
};
```

For this to work, `InternalConfig['auth']` must properly type the options so TypeScript can infer the return type.

## Related Issues

- `auth-type-should-be-better-auth-return-type.md` — root cause (wrong manual typing)
- `excessive-type-casting.md` — same pattern (casts hide type problems)

## Status

Fixed — removed `as Auth` cast from server.ts.