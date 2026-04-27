# Better-Auth Config Types - Analysis

## TL;DR

The `deepMerge` function in `defineConfig` uses a TypeScript signature (`source: Partial<T>`) that is structurally too strict. When `defaultAuth.session` is inferred as a narrow type like `{ maxAge: number }`, TypeScript requires the source to match that narrow type exactly. But `BetterAuthOptions['session']` has many more properties, causing a type error. The solution uses intersection types (`T & S`) instead and explicitly types `defaultAuth` as `Partial<BetterAuthOptions>` to let TypeScript infer the correct combined type.

## Final Goal

Users should configure DeesseJS auth using better-auth's options directly with full type inference:

```typescript
import { defineConfig } from "deesse";

export const config = defineConfig({
  database: db,
  secret: process.env.AUTH_SECRET!,
  auth: {
    baseURL: "http://localhost:3000",
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    session: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24,   // 1 day
    },
  },
});
```

The `Config` type must:
1. **Infer from better-auth** - When better-auth adds/removes options, users should see those changes
2. **Support deep merge** - User config should override defaults without replacing entire nested objects
3. **Be simple** - No custom types to maintain, just wrap better-auth's types
4. **Named export** - Use `export const config = defineConfig(...)` (not `export default`)
5. **Consistent alias** - Accessible via `@deesse-config` alias across all packages

## Status

- [x] Investigation complete
- [x] Key findings identified
- [x] Ready for plan

## Additional Research

Based on web research, we found better approaches:

- [Deep Merge Patterns](../../learnings/deep-merge-patterns.md) - Use `ts-deepmerge` library
- [Config System Patterns](../../learnings/config-system-patterns.md) - defineConfig<T>() pattern

## Recommendations

1. Replace hand-rolled `deepMerge` with `ts-deepmerge` or `deepmerge-ts`
2. Wrap better-auth behind a versioned `AuthFacade` interface
3. Implement `defineConfig<T>()` with DeepPartial and Zod validation

## Structure

- `learnings/deep-merge-types.md` - TypeScript structural typing issue with `Partial<T>`
- `learnings/plugin-conflicts.md` - Admin plugin deduplication problem
- `analysis/better-auth-types.md` - Deep dive into `BetterAuthOptions['session']` and `BetterAuthOptions['emailAndPassword']`
- `synthesis/solution.md` - Final recommended approach with intersection signature, explicit defaults typing, and hybrid plugin resolution
