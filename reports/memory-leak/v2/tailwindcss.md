# TailwindCSS Module Resolution Error

## Error

```
Error: Can't resolve 'tailwindcss' in 'C:\Users\dpereira\Documents\github\deessejs\examples'
```

## Root Cause

**File:** `examples/base/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),  // ← Points to REPO ROOT
  },
};
```

The `turbopack.root` is set to `../../` which resolves to `C:\Users\dpereira\Documents\github\deessejs` (the monorepo root), NOT `examples/base`.

When Turbopack tries to resolve `tailwindcss` from this context, it looks in the wrong `node_modules` hierarchy.

## Verification

- `tailwindcss` IS installed in `examples/base/node_modules/` (v4.2.2)
- `@tailwindcss/postcss` IS installed in `examples/base/node_modules/` (v4.2.2)
- These packages are NOT in the root `node_modules/` (correct for pnpm workspaces)

Turbopack looking in the monorepo root instead of `examples/base` causes the resolution to fail.

## Fix Required

Remove or correct `turbopack.root`:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Remove turbopack.root entirely
  // OR set to correct path if needed for your setup
};
```

## Impact

- This causes `pnpm dev` to fail immediately with the tailwindcss error
- Even after fixing the Pool memory leak, the dev server won't start
- Must be fixed before testing the memory leak solution