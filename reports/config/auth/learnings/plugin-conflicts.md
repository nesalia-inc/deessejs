# Plugin Conflicts - Admin Plugin Deduplication

## Problem

DeesseJS automatically injects the `admin()` plugin in `defaultAuth`. If the user also passes `admin()` in their config, the resulting plugin array contains duplicates.

## Example Conflict

```typescript
// User defines admin() themselves
defineConfig({
  auth: {
    plugins: [admin()],  // <-- Conflict! We also add admin() internally
  }
})

// Without handling: [admin(), admin()] - duplicate plugin!
```

## Types of Conflicts

| Conflict Type | Example | Current Behavior | Desired Behavior |
|--------------|---------|-----------------|------------------|
| **Duplicate plugin** | `admin()` in both | `[admin(), admin()]` | Deduplicate + warn |
| **Primitive override** | `enabled: false` vs `true` | Source wins | Source wins |
| **Nested override** | `session.maxAge` | Deep merge | Deep merge |

The duplicate plugin case is the most problematic because it can cause:
- Double initialization of the same plugin
- Unexpected behavior in authentication flows
- Confusion when debugging

## Recommended Solution: Hybrid Approach

**Actionable warning + Runtime deduplication:**

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

## Why This Approach Works

- **Actionable warning** tells the user exactly what to do - they can remove the duplicate plugin from their config
- **Deduplication** handles all duplicates safely, even if the warning is missed
- **Defensive programming** (`p && p.id`) handles cases where a plugin might not have an ID

## Priority

P1 - Should be implemented early in the development cycle to prevent user confusion.
