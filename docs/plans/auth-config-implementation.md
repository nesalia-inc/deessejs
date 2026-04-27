# Auth Config Implementation Plan

## Goal

Build a type-safe auth configuration system that eliminates `as any` casts, uses a battle-tested deep merge library, and provides clear warnings for plugin conflicts.

## Files to Create/Modify

### New Files
- None

### Modified Files
- `packages/deesse/package.json` - Add `ts-deepmerge` dependency
- `packages/deesse/src/config/types.ts` - Update type definitions
- `packages/deesse/src/config/define.ts` - Replace deepMerge, add plugin conflict handling

## Implementation Steps

### Step 1: Add ts-deepmerge dependency (P0)

1. Add `ts-deepmerge` to `packages/deesse/package.json` dependencies:
   ```json
   "ts-deepmerge": "^2.5.0"
   ```

### Step 2: Update type definitions (P0)

1. In `packages/deesse/src/config/types.ts`:
   - Add `DeepPartial<T>` type for nested partial overrides
   - Change `InternalConfig.auth.session` from `NonNullable<BetterAuthOptions['session']>` to `Partial<BetterAuthOptions['session']>`
   - Change `InternalConfig.auth.emailAndPassword` from `NonNullable<BetterAuthOptions['emailAndPassword']>` to `Partial<BetterAuthOptions['emailAndPassword']>`

### Step 3: Replace hand-rolled deepMerge (P0)

1. In `packages/deesse/src/config/define.ts`:
   - Remove the `deepMerge` function (lines 6-32)
   - Add import for `merge` from `ts-deepmerge`
   - Add import for `DeepPartial` type from `./types.js`

### Step 4: Type defaultAuth as Partial<BetterAuthOptions> (P0)

1. In `packages/deesse/src/config/define.ts`:
   - Change `defaultAuth` type from inline object to `Partial<BetterAuthOptions>`
   - This eliminates the `as any` casts on lines 61 and 64

### Step 5: Implement defineConfig<T>() pattern (P1)

1. In `packages/deesse/src/config/define.ts`:
   - Update `defineConfig<TSchema>()` to accept `DeepPartial<Config<TSchema>>` instead of `Config<TSchema>`
   - Use `merge(defaultAuth, config.auth)` for auth merging
   - Return type remains `InternalConfig<TSchema>` for full type safety

### Step 6: Implement hybrid plugin conflict resolution (P1)

1. In `packages/deesse/src/config/define.ts`:
   - Add function `deduplicatePlugins()` that filters plugins by ID:
     ```typescript
     function deduplicatePlugins(plugins: BetterAuthPlugin[]): BetterAuthPlugin[] {
       return plugins.filter((plugin, index) =>
         plugins.findIndex(p => p && p.id === plugin.id) === index
       );
     }
     ```
   - Before merging, check if user config includes `admin()` plugin
   - If duplicate found, log a warning:
     ```typescript
     if (hasAdminPlugin) {
       console.warn(
         '[deesse] The `admin()` plugin is included by default. ' +
         'You can safely remove it from your `auth.plugins` config.'
       );
     }
     ```
   - Apply deduplication to merged plugins array

## Verification

1. Run `pnpm install` to install `ts-deepmerge`
2. Run `pnpm --filter deesse type-check` to verify no TypeScript errors
3. Run `pnpm --filter deesse build` to verify the package builds
4. Create a test config with nested partial auth options to verify deep merge works
5. Create a test config with duplicate `admin()` plugin to verify warning is logged