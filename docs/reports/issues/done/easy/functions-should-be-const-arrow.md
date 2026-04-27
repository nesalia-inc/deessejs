# Issue: Functions Should Be `const` Arrow Functions

**Severity:** Low
**Category:** Code Style
**File:** `packages/deesse/src/config/define.ts`
**Discovered:** 2026-04-23

## Summary

All functions in `define.ts` use regular `function` declarations instead of `const` arrow functions. Per project rules (functional programming, no classes), `const` arrow functions should be preferred.

## Current Code

```typescript
// Line 10-13
function deduplicatePlugins(plugins: BetterAuthPlugin[]): BetterAuthPlugin[] {
  return plugins.filter((plugin, index) =>
    plugins.findIndex(p => p && p.id === plugin.id) === index
  );
}

// Line 22
export function defineConfig<TSchema extends Record<string, unknown>>(
  config: DeepPartial<Config<TSchema>>
): InternalConfig<TSchema> {

// Line 93
export function getGlobalConfig<TSchema extends Record<string, unknown> = Record<string, never>>(): InternalConfig<TSchema> {
```

## Expected Code

```typescript
// Line 10-13
const deduplicatePlugins = (plugins: BetterAuthPlugin[]): BetterAuthPlugin[] => {
  return plugins.filter((plugin, index) =>
    plugins.findIndex(p => p && p.id === plugin.id) === index
  );
};

// Line 22
export const defineConfig = <TSchema extends Record<string, unknown>>(
  config: DeepPartial<Config<TSchema>>
): InternalConfig<TSchema> => {

// Line 93
export const getGlobalConfig = <TSchema extends Record<string, unknown> = Record<string, never>>(): InternalConfig<TSchema> => {
```

## Rationale

1. **Consistency** — Project rules favor functional patterns; arrow functions are the standard
2. **No `this` binding issues** — Arrow functions don't have implicit `this`
3. **Explicit return types** — The type annotations remain clear
4. **Shorter syntax** — Less boilerplate for simple functions

## Related Issues

- TSchema generic broken (see `tschema-generic-broken.md`)
- Default auth logic confused (see `default-auth-logic-confused.md`)

## Status

**Fixed** — applied across entire `packages/deesse` package.

**Files modified:**
- `packages/deesse/src/config/define.ts`
- `packages/deesse/src/config/page.ts`
- `packages/deesse/src/config/plugin.ts`
- `packages/deesse/src/client.ts`
- `packages/deesse/src/server.ts`
- `packages/deesse/src/index.ts`

**All 9 functions converted:**
- `function deduplicatePlugins(...)` → `const deduplicatePlugins = (...) => {...}`
- `function getGlobalCache()` → `const getGlobalCache = () => {...}`
- `function isConfigEqual(...)` → `const isConfigEqual = (...) => {...}`
- `function extractPool(...)` → `const extractPool = (...) => {...}`
- `export function defineConfig(...)` → `export const defineConfig = (...) => {...}`
- `export function getGlobalConfig(...)` → `export const getGlobalConfig = (...) => {...}`
- `export function createDeesse(...)` → `export const createDeesse = (...) => {...}`
- `export function createClient(...)` → `export const createClient = (...) => {...}`
- `export function plugin(...)` → `export const plugin = (...) => {...}`
- `function toSlug(...)` → `const toSlug = (...) => {...}`
- `export function page(...)` → `export const page = (...) => {...}`
- `export function section(...)` → `export const section = (...) => {...}`