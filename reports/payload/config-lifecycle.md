# Payload CMS Config Lifecycle

## Overview

Payload CMS has a multi-stage configuration lifecycle that transforms a user-defined `Config` into a locked `SanitizedConfig` that becomes the operational backbone of the CMS. This document describes how config flows from user definition through build and sanitization to runtime usage, with special focus on Next.js integration and the import map system.

---

## 1. Config Types: Config vs SanitizedConfig

### Config (IncomingConfig)

The `Config` type represents the raw, user-supplied configuration object. It is what developers write in their `payload.config.ts`:

```typescript
// User writes this:
export default buildConfig({
  collections: [/* ... */],
  globals: [/* ... */],
  secret: process.env.PAYLOAD_SECRET,
  db: postgresAdapter(/* ... */),
})
```

**Characteristics of Config:**
- All fields are optional (or have defaults)
- Plugins are applied sequentially as transformers
- Collection and global configs retain their original shape
- Block definitions are as provided by the user
- Allows functions that get evaluated later (e.g., `admin.timezones.supportedTimezones` can be a function)

### SanitizedConfig

The `SanitizedConfig` is the post-processed, validated, and locked configuration. It is the type that Payload uses internally at runtime.

**Characteristics of SanitizedConfig:**
- Required fields that were optional in Config are now guaranteed present
- Collections are wrapped in `SanitizedCollectionConfig` with normalized structure
- Globals are wrapped in `SanitizedGlobalConfig`
- Blocks are flattened and merged with base block fields
- `admin.user` is guaranteed to be set to a valid auth-enabled collection slug
- Localization config is normalized: string locale codes become full `Locale` objects
- `localeCodes` array is extracted from `locales`
- Internal collections (jobs, preferences, migrations, locked-documents, folders) are injected
- All field sanitization has completed (field paths resolved, hooks compiled, relationships validated)

---

## 2. Config Flow: From User Definition to getPayload

```
User's payload.config.ts
         |
         v
buildConfig(config)          [packages/payload/src/config/build.ts]
         |
         | async loop over plugins
         v
plugin1(config) --> plugin2(config) --> ... --> pluginN(config)
         |
         v
sanitizeConfig(incomingConfig)    [packages/payload/src/config/sanitize.ts]
         |
         | 1. addDefaultsToConfig()
         | 2. sanitizeAdminConfig()
         | 3. sanitize collections (loop)
         | 4. sanitize globals (loop)
         | 5. inject internal collections (jobs, preferences, migrations, etc.)
         | 6. process localization (string[] --> Locale[])
         | 7. sanitize rich text editor
         | 8. resolve all rich text sanitization promises
         v
SanitizedConfig
         |
         v
getPayload({ config: SanitizedConfig })   [packages/payload/src/index.ts]
         |
         | 1. cache lookup (key = 'default' or custom)
         | 2. BasePayload.init(options)
         | 3. setup HMR WebSocket connection (dev mode)
         v
Payload singleton
```

---

## 3. buildConfig Function

**Location:** `packages/payload/src/config/build.ts`

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

**Plugin system:**
- Plugins receive the current config state and return a (potentially modified) config
- Plugins are async-aware: `plugin(configAfterPlugins)` is awaited, enabling async plugins
- Each plugin runs sequentially, with the output of one feeding into the next
- Plugin order matters: earlier plugins run first and can set up context for later plugins

---

## 4. sanitizeConfig Function

**Location:** `packages/payload/src/config/sanitize.ts`

This is the heart of config processing. It performs the following operations in sequence:

### 4.1. addDefaultsToConfig

Merges defaults into the incoming config. Key defaults applied:
- `admin.routes.*` - all admin routes default to Payload conventions
- `admin.meta.*` - default OG image type, robots, title suffix
- `auth.jwtOrder` - `['JWT', 'Bearer', 'cookie']`
- `routes.*` - admin: `/admin`, api: `/api`, graphql: `/graphql`
- `graphQL.*` - introspection disabled in production, max complexity 1000
- `typescript.autoGenerate` - true in non-production
- `jobs.access.*` - defaultAccess for cancel/queue/run

### 4.2. sanitizeAdminConfig

Processes the admin section:
1. **Sets `admin.user`**: If not specified, finds the first auth-enabled collection, or adds the default user collection
2. **Validates `admin.user`**: Ensures the collection exists and has `auth: true`
3. **Adds dashboard widgets**: Injects the `collections` widget into the admin dashboard
4. **Processes timezone config**: Evaluates `supportedTimezones` function if provided
5. **Sets compatibility flags**
6. **Sets default logging levels**

### 4.3. Block Sanitization (Critical Ordering!)

Blocks are sanitized BEFORE collections because collection join field sanitization needs `config.blocks` to be populated.

For each block:
1. Skips if already sanitized (`_sanitized` flag)
2. Marks as sanitized
3. Concatenates `baseBlockFields` (includes `id` and `_path`)
4. Formats labels
5. Sanitizes fields recursively
6. Flattens block fields for efficient access at runtime

### 4.4. Collection Sanitization

For each user collection:
1. Checks for duplicate slugs (throws `DuplicateCollection`)
2. Tracks slugs in a `Set` for relationship validation
3. Processes drafts config
4. Handles query presets
5. Adds folder field if folders are enabled
6. Calls `sanitizeCollection()`
7. Tracks collections with folders enabled

### 4.5. Global Sanitization

For each global:
1. Checks for scheduled publish enablement
2. Calls `sanitizeGlobal()`

### 4.6. Internal Collections Injection

The following internal collections are added if not already present:
- `payload-locked-documents` - for document locking
- `payload-preferences` - for user preferences
- `payload-migrations` - for database migrations
- `payload-query-presets` - for saved query presets
- `payload-jobs` - for job queue (if jobs enabled)

### 4.7. Localization Processing

Converts `string[]` locales to `Locale[]` objects:

```typescript
// Before: locales: ['en', 'es', 'fr']
// After:  locales: [{ code: 'en', label: 'en', rtl: false, toString: () => 'en' }, ...]
// Also:  localeCodes: ['en', 'es', 'fr']
```

### 4.8. Upload Adapter Deduplication

Collects all unique upload adapters from collections and stores them in `config.upload.adapters` as a deduped array.

---

## 5. When Does Config Get "Locked"

Payload does not have a formal "lock" mechanism where config becomes immutable. However:

### 5.1. Post-Sanitization Modifications Are Discouraged

The sanitization process compiles and resolves many things that are designed to be read-only at runtime:
- Field paths are flattened into `_path` arrays
- Blocks are merged with base fields and flattened
- Collection slugs are registered in sets used for relationship validation
- Labels are formatted from slugs

### 5.2. The Singleton Pattern

Payload uses a module-level singleton with `global._payload` Map. The `config` property is set on the singleton and should be considered fixed for the lifetime of the process.

### 5.3. HMR Triggered Reload

In development, when HMR detects server component changes, Payload calls `reload()` to perform a full config replacement - not mutation.

---

## 6. Next.js Integration

### 6.1. withPayload

**Location:** `packages/next/src/withPayload/withPayload.js`

This is a Next.js config enhancer that must wrap the Next.js config:

```typescript
import { withPayload } from '@payloadcms/next'
import next from 'next'

const nextConfig = {}

export default withPayload(nextConfig)
```

**Key operations performed by withPayload:**

1. **Server External Packages**: Marks Payload packages and database adapters as server-external
2. **Webpack Configuration**: Forces externals for problematic packages
3. **Headers**: Adds `Accept-CH`, `Vary`, `Critical-CH` for preferences
4. **SASS Options**: Silences deprecation warnings
5. **Turbopack Support**: Detects Next.js version and applies appropriate configuration

### 6.2. initReq - Request Initialization

**Location:** `packages/next/src/utilities/initReq.ts`

This is the bridge between Next.js and Payload:

```typescript
export const initReq = async function ({
  canSetHeaders,
  configPromise,
  importMap,
  key,
  overrides,
}) {
  const headers = await getHeaders()
  const cookies = parseCookies(headers)

  const config = await configPromise
  const payload = await getPayload({ config, cron: true, importMap })

  const i18n = await initI18n({ config: config.i18n, context: 'client', language: languageCode })

  const { responseHeaders, user } = await executeAuthStrategies({ canSetHeaders, headers, payload })

  const req = await createLocalReq({ req: { headers, host, i18n, responseHeaders, user }, ... }, payload)

  req.locale = locale?.code

  const permissions = await getAccessResults({ req })

  return { cookies, headers, locale, permissions, req }
}
```

**Caching strategy:**
- Uses `selectiveCache` for per-key caching
- `partialReqCache` with key `'global'` caches the payload instance and i18n globally
- `reqCache` caches per-request results by key

### 6.3. getPayloadHMR (Deprecated)

**Location:** `packages/next/src/utilities/getPayloadHMR.ts`

Legacy function now deprecated in favor of direct `getPayload` import from `payload`.

---

## 7. The Import Map System

### 7.1. Purpose

The import map allows Payload components (React components used in the admin UI) to be referenced by string paths rather than direct imports. This is critical for:
1. **Dynamically loading components** from user code in the admin panel
2. **Supporting custom components** defined in `payload.config.ts`
3. **Enabling HMR** for custom components without full rebuilds

### 7.2. Generation Process

**Location:** `packages/payload/src/bin/generateImportMap/index.ts`

Called in two scenarios:
1. After config sanitization (during `getPayload()` init or `reload()`)
2. Via CLI: `pnpm payload generate:importmap`

### 7.3. PayloadComponent Type

```typescript
export type PayloadComponent<
  TComponentServerProps extends never | object = Record<string, any>,
  TComponentClientProps extends never | object = Record<string, any>,
> = false | RawPayloadComponent<TComponentServerProps, TComponentClientProps> | string
```

Components can be:
- `false` - render empty component
- A string like `"@/components/MyComponent"` - simple path reference
- A `RawPayloadComponent` object with `path`, optional `serverProps`, `clientProps`, and `exportName`

---

## 8. Key Files Reference

| File | Purpose |
|------|---------|
| `packages/payload/src/config/build.ts` | Entry point: runs plugins then calls sanitizeConfig |
| `packages/payload/src/config/sanitize.ts` | Main sanitization logic |
| `packages/payload/src/config/defaults.ts` | Default values and `addDefaultsToConfig` function |
| `packages/payload/src/config/types.ts` | `Config`, `SanitizedConfig`, `Plugin`, `PayloadComponent` types |
| `packages/payload/src/index.ts` | `getPayload`, `BasePayload` class, singleton pattern, `reload` function |
| `packages/next/src/withPayload/withPayload.js` | Next.js config enhancer |
| `packages/next/src/utilities/initReq.ts` | Request initialization bridge between Next.js and Payload |
| `packages/payload/src/bin/generateImportMap/index.ts` | Import map generation logic |

---

## 9. Summary

The config lifecycle:

1. **User writes** `payload.config.ts` with raw `Config` object
2. **buildConfig()** receives the config, runs plugins sequentially
3. **sanitizeConfig()** transforms and validates:
   - Adds defaults
   - Sanitizes admin config
   - Sanitizes blocks (before collections!)
   - Sanitizes collections and globals
   - Injects internal collections
   - Processes localization
4. **Returns `SanitizedConfig`** - fully processed and ready
5. **getPayload()** receives the sanitized config, initializes Payload instance
6. **Instance is cached** in `global._payload` Map
7. **HMR WebSocket** monitors for changes and calls `reload()` as needed
