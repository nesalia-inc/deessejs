# Issue: Duplicate `page.ts` in `deesse` and `admin` Packages

**Severity:** Medium
**Category:** Code Duplication
**Files:**
- `packages/deesse/src/config/page.ts`
- `packages/admin/src/config/page.ts`
**Discovered:** 2026-04-23

## Summary

`packages/deesse/src/config/page.ts` is a duplicate of `packages/admin/src/config/page.ts`. The admin package has a superset of the same types plus additional functionality.

## Comparison

| Feature | `deesse` | `admin` |
|---------|----------|---------|
| `Page`, `Section`, `PageTree` | yes | yes |
| `page()`, `section()` | yes | yes |
| `SlugSegment`, `parseSlug()` | no | yes |
| `serverPage()`, `clientPage()`, `dynamicPage()` | no | yes |

## Fix Options

- **Option A:** Delete deesse's page.ts, re-export from admin
- **Option B:** Move to shared package

## Status

Open — needs decision.