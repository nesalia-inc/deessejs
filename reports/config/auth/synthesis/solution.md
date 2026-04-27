# Solution - Final Recommended Approach

## Summary

The solution combines four key changes to resolve TypeScript structural typing issues while maintaining developer experience. Based on recent web research, we now recommend using established libraries and patterns rather than hand-rolled solutions.

## 1. Use `ts-deepmerge` Library Instead of Hand-Rolled `deepMerge`

```typescript
// Replace hand-rolled deepMerge with ts-deepmerge
import { merge } from "ts-deepmerge";

// DeepPartial type for config overrides
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Clean merge that preserves types
const mergedConfig = merge(defaultConfig, userConfig as DeepPartial<Config>);
```

**Why use a library instead of hand-rolled:**
- Type inference is automatic and correct
- Handles edge cases (arrays, nested objects, null values)
- Actively maintained with bug fixes
- Both `ts-deepmerge` and `deepmerge-ts` are battle-tested

## 2. Use `defineConfig<T>()` Pattern with DeepPartial

```typescript
import { merge } from "ts-deepmerge";

export interface ConfigShape {
  auth: AuthConfig;
  database: DatabaseConfig;
}

export function defineConfig<T extends ConfigShape>(
  userConfig: DeepPartial<T>
): T {
  return merge(defaultConfig, userConfig as DeepPartial<T>);
}
```

**Key patterns from research:**
- `DeepPartial<T>` allows partial overrides at any nesting level
- Return type is fully inferred (not `DeepPartial<T>`)
- Separate default values from schema
- Config becomes immutable after creation

## 3. Implement Hybrid Plugin Conflict Resolution

```typescript
export function defineConfig(config: Config) {
  // Check for duplicate admin plugin
  const hasAdminPlugin = config.auth.plugins?.some(
    p => p && p.id === 'admin'
  );

  if (hasAdminPlugin) {
    console.warn(
      '[deesse] The `admin()` plugin is included by default. ' +
      'You can safely remove it from your `auth.plugins` config.'
    );
  }

  // Deduplicate all plugins by ID (defensive: handle missing ID)
  const uniquePlugins = deduplicatePlugins([
    ...defaultAuth.plugins,
    ...(config.auth.plugins || []),
  ]);

  return { /* merged config with uniquePlugins */ };
}

function deduplicatePlugins(plugins: BetterAuthPlugin[]): BetterAuthPlugin[] {
  return plugins.filter((plugin, index) =>
    plugins.findIndex(p => p && p.id === plugin.id) === index
  );
}
```

**Benefits:**
- Actionable warning tells users exactly what to fix
- Runtime deduplication handles edge cases safely
- Defensive `p && p.id` handles plugins without IDs

## 4. Use `Partial` Instead of `NonNullable` for Internal Config

```typescript
// Risky - deep properties might still be undefined
export type InternalConfig = {
  session: NonNullable<BetterAuthOptions['session']>;
};

// Better - let better-auth apply its own internal defaults
export type InternalConfig = {
  session: Partial<BetterAuthOptions['session']>;
};
```

## Implementation Action Items

Based on the new learnings, priorities have been updated:

| Priority | Action | Rationale |
|----------|--------|-----------|
| **P0** | Replace hand-rolled `deepMerge` with `ts-deepmerge` | Library handles edge cases, better type inference |
| **P0** | Type `defaultAuth` as `Partial<BetterAuthOptions>` | Eliminate `as any` casts |
| **P1** | Implement hybrid plugin conflict resolution | Actionable warning for users |
| **P1** | Add `defineConfig<T>()` pattern with DeepPartial | Industry-standard config pattern |
| **P2** | Replace `!!item` with `!== null` in `isObject` | More idiomatic |
| **P2** | Replace `NonNullable` with `Partial` in `InternalConfig` | Safer for nested types |

## Files Affected

| File | Current Issue |
|------|--------------|
| `packages/deesse/src/config/types.ts` | Uses `BetterAuthOptions['session']` directly |
| `packages/deesse/src/config/define.ts` | Has `as any` casts, uses hand-rolled deepMerge |

## Reviewer Verdict

**Status: APPROVED** - Ready for Technical Design Document (TDD)

**Key changes needed before implementation:**
1. Adopt `ts-deepmerge` library instead of hand-rolled `deepMerge`
2. Type `defaultAuth` as `Partial<BetterAuthOptions>` to eliminate `as any`
3. Implement `defineConfig<T>()` pattern with `DeepPartial<T>`
4. Implement actionable warning for plugin conflicts
5. Use `Partial` instead of `NonNullable` for internal config
