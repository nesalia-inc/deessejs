# Issue: `plugin.ts` Should Not Be in `config/` Directory

**Severity:** Low
**Category:** Code Organization
**File:** `packages/deesse/src/config/plugin.ts`
**Discovered:** 2026-04-23

## Summary

`plugin.ts` is located at `packages/deesse/src/config/plugin.ts` but should be at `packages/deesse/src/plugin/index.ts`. The `config/` directory is for configuration, `plugin/` is a distinct module.

## Correct Location

```
packages/deesse/src/
├── config/
│   ├── define.ts
│   ├── page.ts
│   └── types.ts
├── plugin/              ← new directory
│   └── index.ts
├── cache.ts
├── client.ts
└── server.ts
```

## Update Required

1. Move `plugin.ts` to `plugin/index.ts`
2. Update exports in `index.ts`

## Status

Open — simple file move.