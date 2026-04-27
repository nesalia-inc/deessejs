# Issue: `Deesse` Type Should Be in Types File, Not `server.ts`

**Severity:** Low
**Category:** Code Organization
**File:** `packages/deesse/src/server.ts:7-10`
**Discovered:** 2026-04-23

## The Problem

`server.ts` mixes function definition (`createDeesse`) with type definition (`Deesse`):

```typescript
// server.ts:7-10
export type Deesse = {
  auth: Auth;
  database: PostgresJsDatabase;
};

export const createDeesse = (config: InternalConfig): Deesse => {
  // ...
};
```

This violates separation of concerns. Types belong in `types.ts` or a dedicated types file, not co-located with implementation.

## Current Structure

```
packages/deesse/src/
├── config/
│   ├── types.ts      ← Config types
│   └── ...
├── server.ts         ← has Deesse type AND createDeesse function
├── cache.ts
├── client.ts
└── index.ts
```

## Correct Structure

The `Deesse` type should be in `config/types.ts` alongside other types:

```typescript
// config/types.ts (add Deesse type here)
export type Deesse = {
  auth: Auth;
  database: PostgresJsDatabase;
};
```

```typescript
// server.ts (only the function)
import type { Deesse } from "./config/types.js";

export const createDeesse = (config: InternalConfig): Deesse => {
  // ...
};
```

## Impact

- **Low** — only type relocation
- Improves code organization
- Types are discoverable in one place
- Follows separation of concerns principle

## Related Issues

- `unnecessary-as-auth-cast.md` — the `as Auth` cast exists because types are wrong
- `auth-type-should-be-better-auth-return-type.md` — auth type should use better-auth's generic

## Status

Open — simple type relocation.