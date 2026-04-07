# Payload CMS `buildConfig` (Internal "defineConfig") Analysis

## 1. Location and Export

**File:** `packages/payload/src/config/build.ts`

The function is named **`buildConfig`**, not `defineConfig`. It is exported from the main payload package at:
- `packages/payload/src/index.ts` (line 1378)
  ```typescript
  export { buildConfig } from './config/build.js'
  ```

**Note:** The user-facing `defineConfig` name comes from Next.js/Vite conventions. Payload internally uses `buildConfig` which performs the same role.

## 2. Purpose and Behavior

`buildConfig` is the entry point for processing a user's Payload configuration. It:
1. Processes plugins (if any exist) by chaining them sequentially
2. Delegates to `sanitizeConfig` for the actual sanitization

```typescript
export async function buildConfig(config: Config): Promise<SanitizedConfig> {
  if (Array.isArray(config.plugins)) {
    let configAfterPlugins = config
    for (const plugin of config.plugins) {
      configAfterPlugins = await plugin(configAfterPlugins)
    }
    return await sanitizeConfig(configAfterPlugins)
  }

  return await sanitizeConfig(config)
}
```

## 3. Config Sanitization Flow (`sanitizeConfig`)

**File:** `packages/payload/src/config/sanitize.ts`

The sanitization process:

1. **Add Defaults** - Calls `addDefaultsToConfig()` to merge defaults with user config
2. **Sanitize Admin** - Calls `sanitizeAdminConfig()` which:
   - Sets up logging levels
   - Adds default dashboard widget
   - Configures user collection (or uses first auth-enabled collection)
   - Sets up timezones
3. **Setup Orderable** - Calls `setupOrderable()` for orderable fields
4. **Add Auth Endpoints** - Pushes auth root endpoints to config
5. **Process Localization** - Converts locale strings to Locale objects with labels
6. **Process i18n** - Sets up translations
7. **Sanitize Blocks** - Adds base block fields, sanitizes block fields
8. **Sanitize Collections** - Validates unique slugs, sanitizes each collection
9. **Sanitize Globals** - Sanitizes each global config
10. **Add System Collections** - Adds migrations, preferences, locked documents, query presets, jobs collections
11. **CSRF Configuration** - Adds serverURL to CORS origins
12. **Editor Processing** - Initializes rich text editor
13. **Execute RichText Promises** - Resolves async rich text sanitization

## 4. Key Types

**File:** `packages/payload/src/config/types.ts`

**`Config` (IncomingConfig):**
- User-provided configuration with optional properties
- Contains: admin, collections, globals, blocks, db, secret, plugins, etc.

**`SanitizedConfig`:**
- After sanitization, all properties are guaranteed to exist (DeepRequired)
- collections → SanitizedCollectionConfig[]
- blocks → FlattenedBlock[]
- globals → SanitizedGlobalConfig[]
- Added properties: paths (config, configDir, rawConfig), upload.adapters (deduped)

**`Plugin` type:**
```typescript
export type Plugin = (config: Config) => Config | Promise<Config>
```

## 5. Raw Config vs Sanitized Config

| Aspect | Raw Config (Config) | Sanitized Config |
|--------|-------------------|------------------|
| collections | CollectionConfig[] | SanitizedCollectionConfig[] |
| blocks | Block[] | FlattenedBlock[] (flattened, base fields merged) |
| admin | Partial | DeepRequired with timezones |
| localization | LocalizationConfig | SanitizedLocalizationConfig (with localeCodes) |
| i18n | Optional | Always present with fallbackLanguage |
| paths | Not present | Added with config/configDir/rawConfig |
| plugins | Optional | Fully resolved (executed sequentially) |
| csrf | Optional string[] | serverURL automatically added |
| jobs.enabled | Optional | Computed boolean from tasks/workflows |

## 6. Defaults Processing

**File:** `packages/payload/src/config/defaults.ts`

`addDefaultsToConfig()` mutates the incoming config to add defaults:
- admin routes (login: '/login', admin: '/admin', etc.)
- graphQL settings (maxComplexity: 1000)
- jobs with default access controls
- telemetry enabled by default
- typescript autoGenerate enabled
- KV adapter default (DatabaseKVAdapter)
- Folders collection (if any collection uses folders)

## 7. Key Sanitization Steps Detail

### 7.1 Block Sanitization (Order Matters!)

Blocks are sanitized BEFORE collections because collection join field sanitization needs `config.blocks` to be populated.

For each block:
1. Skips if already sanitized (`_sanitized` flag)
2. Marks as sanitized
3. Concatenates `baseBlockFields` (includes `id` and `_path`)
4. Formats labels (creates `label` and `labels` from slug if not provided)
5. Sanitates fields recursively
6. Flattens block fields for efficient access at runtime

### 7.2 Collection Sanitization

For each user collection:
1. Checks for duplicate slugs (throws `DuplicateCollection`)
2. Tracks slugs in a `Set` for relationship validation
3. Processes drafts config (marks collections with `schedulePublish` for scheduled publishing)
4. Handles query presets (enables query presets, adds relationship)
5. Adds folder field to collection if folders are enabled
6. Calls `sanitizeCollection()` from `packages/payload/src/collections/config/sanitize.js`
7. Tracks collections with folders enabled for folder collection injection

### 7.3 Localization Processing

If localization is enabled and locales are `string[]`, converts them to `Locale[]` objects with `code`, `label`, `rtl`, `toString()`:

```typescript
// Before (string[]):
locales: ['en', 'es', 'fr']

// After (Locale[]):
locales: [
  { code: 'en', label: 'en', rtl: false, toString: () => 'en' },
  { code: 'es', label: 'es', rtl: false, toString: () => 'es' },
  { code: 'fr', label: 'fr', rtl: false, toString: () => 'fr' }
]

// Also extracted:
localeCodes: ['en', 'es', 'fr']
```

## 8. Plugin System

Plugins receive the current config state and return a (potentially modified) config:

```typescript
const myPlugin = (incomingConfig) => {
  return {
    ...incomingConfig,
    collections: [
      ...incomingConfig.collections,
      { slug: 'auto-added', fields: [] }
    ]
  }
}

export default buildConfig({
  plugins: [myPlugin],
  // ... rest of config
})
```

**Plugin characteristics:**
- Plugins are async-aware: `plugin(configAfterPlugins)` is awaited
- Each plugin runs sequentially
- Plugin order matters

## 9. Internal Collections Injection

The following internal collections are automatically added if not already present:
- `payload-locked-documents` - for document locking
- `payload-preferences` - for user preferences
- `payload-migrations` - for database migrations
- `payload-query-presets` - for saved query presets
- `payload-jobs` - for job queue (if jobs enabled)

## 10. Key File Locations

| File | Purpose |
|------|---------|
| `packages/payload/src/config/build.ts` | Entry point: runs plugins then calls sanitizeConfig |
| `packages/payload/src/config/sanitize.ts` | Main sanitization logic |
| `packages/payload/src/config/defaults.ts` | Default values and addDefaultsToConfig |
| `packages/payload/src/config/types.ts` | Config, SanitizedConfig, Plugin types |
| `packages/payload/src/collections/config/sanitize.js` | Collection sanitization |
| `packages/payload/src/globals/config/sanitize.js` | Global sanitization |

## 11. Summary

`buildConfig` is the bridge between the user's raw configuration and the operational `SanitizedConfig`. It:

1. Applies plugins sequentially to transform the config
2. Calls `sanitizeConfig` which adds defaults, validates, and transforms all parts of the config
3. Returns a fully processed `SanitizedConfig` ready for `getPayload()`

The sanitization process is comprehensive, handling blocks before collections, converting locales to objects, injecting internal collections, and resolving all async operations before returning.
