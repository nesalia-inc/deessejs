# Issue: `auth` Type Should Be `betterAuth()` Return Type

**Severity:** Medium
**Category:** Type Design
**Files:**
- `packages/deesse/src/config/types.ts`
- `packages/deesse/src/server.ts`
**Discovered:** 2026-04-23

## Summary

The `auth` property is manually typed instead of using the actual return type of `betterAuth()`. This causes type drift and requires casting.

## Current Problem

```typescript
// config/types.ts - manual type
auth: { baseURL: string; plugins?: BetterAuthPlugin[]; ... }

// server.ts - cast required
const auth = betterAuth({ ... }) as Auth;
```

## Correct Approach

Use the actual return type of `betterAuth()`:

```typescript
type Auth = Awaited<ReturnType<typeof betterAuth>>;
```

## Status

Fixed — removed `as Auth` cast since betterAuth() correctly infers the generic type.