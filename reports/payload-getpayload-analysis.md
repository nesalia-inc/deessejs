# Payload CMS getPayload({ config }) Internal Analysis

## Executive Summary

`getPayload({ config })` is the main entry point for initializing Payload CMS. It returns a fully configured `Payload` instance that provides access to all CMS functionality including collections, globals, authentication, and database operations. The function implements a sophisticated caching mechanism with Hot Module Replacement (HMR) support, ensuring a single instance is reused across the application while staying in sync during development.

## 1. How getPayload Works

### What getPayload Returns

`getPayload({ config })` returns a `Promise<Payload>` where `Payload` is an instance of the `BasePayload` class. The `Payload` instance is a comprehensive object containing:

- **collections**: Record of collection slugs to collection objects with config and customIDType
- **globals**: Object containing global config
- **db**: Database adapter instance
- **email**: Initialized email adapter
- **authStrategies**: Array of authentication strategies
- **blocks**: Record of block slugs to flattened block configs
- **config**: The sanitized configuration
- **secret**: Derived 32-character hash of the secret key

### Lifecycle of the Payload Instance

1. **First Call**: Creates new `BasePayload` instance and calls `init()`
2. **Cached Calls**: Returns existing cached instance
3. **HMR Detection**: WebSocket connection monitors for config changes and triggers reload
4. **Destroy**: On reload, only database is destroyed and reinitialized, not the full Payload

## 2. Initialization Process

### The init() Method Flow

The `BasePayload.init()` method (line 801 in `packages/payload/src/index.ts`) performs these steps:

```typescript
async init(options: InitOptions): Promise<Payload> {
  // 1. Dependency checking (dev only)
  if (process.env.NODE_ENV !== 'production' && !checkedDependencies) {
    checkedDependencies = true
    void checkPayloadDependencies()
  }

  // 2. Store importMap
  this.importMap = options.importMap

  // 3. Await and store config
  this.config = await options.config

  // 4. Initialize logger
  this.logger = getLogger('payload', this.config.logger)

  // 5. Derive secret (32-char hash of config.secret)
  this.secret = crypto.createHash('sha256')
    .update(this.config.secret).digest('hex').slice(0, 32)

  // 6. Initialize globals
  this.globals = { config: this.config.globals }

  // 7. Initialize collections
  for (const collection of this.config.collections) {
    // Find custom ID type by traversing fields
    this.collections[collection.slug] = {
      config: collection,
      customIDType,
    }
  }

  // 8. Index blocks
  this.blocks = this.config.blocks.reduce((blocks, block) => {
    blocks[block.slug] = block
    return blocks
  }, {})

  // 9. Generate types (dev only)
  if (process.env.NODE_ENV !== 'production') {
    void this.bin({ args: ['generate:types'], log: false })
  }

  // 10. Initialize database adapter
  this.db = this.config.db.init({ payload: this })
  this.db.payload = this

  // 11. Initialize KV adapter
  this.kv = this.config.kv.init({ payload: this })

  // 12. Initialize database
  if (this.db?.init) await this.db.init()

  // 13. Connect to database
  if (!options.disableDBConnect && this.db.connect) {
    await this.db.connect()
  }

  // 14. Initialize email adapter
  if (this.config.email instanceof Promise) {
    this.email = (await this.config.email)({ payload: this })
  } else if (this.config.email) {
    this.email = this.config.email({ payload: this })
  } else {
    this.email = consoleEmailAdapter({ payload: this })
  }

  // 15. Initialize auth strategies
  this.authStrategies = this.config.collections.reduce((authStrategies, collection) => {
    if (collection?.auth) {
      // Add custom strategies
      if (collection.auth.strategies.length > 0) {
        authStrategies.push(...collection.auth.strategies)
      }
      // Add API key strategy if enabled
      if (collection.auth?.useAPIKey) {
        authStrategies.push({
          name: `${collection.slug}-api-key`,
          authenticate: APIKeyAuthentication(collection),
        })
      }
      // Add JWT strategy if local strategy enabled
      if (!collection.auth.disableLocalStrategy && !jwtStrategyEnabled) {
        jwtStrategyEnabled = true
      }
    }
    return authStrategies
  }, [])

  // Add JWT strategy last
  if (jwtStrategyEnabled) {
    this.authStrategies.push({
      name: 'local-jwt',
      authenticate: JWTAuthentication,
    })
  }

  // 16. Run onInit callbacks
  if (!options.disableOnInit) {
    if (typeof options.onInit === 'function') {
      await options.onInit(this)
    }
    if (typeof this.config.onInit === 'function') {
      await this.config.onInit(this)
    }
  }

  // 17. Initialize crons if enabled
  if (options.cron) {
    await this._initializeCrons()
  }

  return this
}
```

### InitOptions Type

```typescript
export type InitOptions = {
  config: Promise<SanitizedConfig> | SanitizedConfig
  cron?: boolean
  disableDBConnect?: boolean
  disableOnInit?: boolean
  importMap?: ImportMap
  onInit?: (payload: Payload) => Promise<void> | void
}
```

## 3. Singleton Pattern

### How Singleton Works

Payload uses a module-level cache stored on `global` to ensure a single instance:

```typescript
let _cached: Map<string, {
  initializedCrons: boolean
  payload: null | Payload
  promise: null | Promise<Payload>
  reload: boolean | Promise<void>
  ws: null | WebSocket
}> = (global as any)._payload

if (!_cached) {
  _cached = (global as any)._payload = new Map()
}
```

### Key Features

1. **Multiple Instances**: You can have separate Payload instances by passing different `key` options
2. **Default Key**: If no key is provided, `'default'` is used
3. **Parallel Call Handling**: When `getPayload` is called multiple times in parallel:
   - First call creates the promise
   - Subsequent calls wait for that promise via `cached.promise`
4. **HMR Support**: WebSocket connection triggers reload when config changes
5. **Reload Mechanism**: Only database is destroyed and reinitialized; collections/globals blocks are updated in-place

### What Happens on Multiple Calls

```typescript
if (cached.payload) {
  // Existing instance found
  if (options.cron && !cached.initializedCrons) {
    cached.initializedCrons = true
    await cached.payload._initializeCrons()
  }

  if (cached.reload === true) {
    // Reload in progress by another call - wait for it
    cached.reload = new Promise((res) => (resolve = res))
    await reload(config, cached.payload, false, options)
    resolve()
    cached.reload = false
  }

  if (cached.reload instanceof Promise) {
    await cached.reload
  }

  // Update importMap if provided
  if (options?.importMap) {
    cached.payload.importMap = options.importMap
  }

  return cached.payload
}
```

## 4. Server/Client Boundary

### Server-Side Usage

`getPayload` is designed to be called **server-side only**. The initialization includes:

- Database connections
- Secret key derivation
- Authentication strategy setup
- Cron job initialization
- Full admin functionality

### Client-Side Considerations

The `importMap` option can be passed from the client to update the Payload instance:

```typescript
if (options?.importMap) {
  cached.payload.importMap = options.importMap
}
```

The `Payload` type exported is actually `BasePayload`, which contains all the CRUD operations:

```typescript
export class BasePayload {
  auth
  count
  create
  find
  findByID
  findGlobal
  update
  delete
  // ... many more
}
```

### HMR WebSocket Connection

In non-production, non-test environments, Payload connects to Next.js HMR WebSocket:

```typescript
if (!cached.ws &&
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test' &&
    process.env.DISABLE_PAYLOAD_HMR !== 'true') {

  const port = process.env.PORT || '3000'
  const protocol = hasHTTPS ? 'wss' : 'ws'
  const path = '/_next/webpack-hmr'

  cached.ws = new WebSocket(
    process.env.PAYLOAD_HMR_URL_OVERRIDE ??
    `${protocol}://localhost:${port}${prefix}${path}`
  )

  cached.ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      const data = JSON.parse(event.data)
      if (data.type === 'serverComponentChanges' ||
          data.action === 'serverComponentChanges') {
        cached.reload = true
      }
    }
  }
}
```

## 5. Config Processing

### Config Building

The `buildConfig()` function in `packages/payload/src/config/build.ts`:

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

### Config Sanitization

The `sanitizeConfig()` function performs extensive transformations:

1. **Admin Config Sanitization**:
   - Sets default logging levels
   - Adds dashboard widgets
   - Validates admin user collection
   - Sets up timezones

2. **Localization Processing**:
   - Converts locale strings to objects with labels
   - Creates `localeCodes` array
   - Sets default fallback

3. **i18n Configuration**:
   - Merges translations
   - Sets fallback language

4. **Block Sanitization**:
   - Adds base block fields
   - Formats labels
   - Sanitizes fields recursively

5. **Collection Sanitization**:
   - Validates slugs (no duplicates)
   - Adds endpoints (auth, upload, default)
   - Adds timestamp fields if missing
   - Sanitizes fields

6. **Global Sanitization**:
   - Similar to collections

## 6. Database Initialization

### Database Adapter Pattern

The database adapter is initialized in `init()`:

```typescript
this.db = this.config.db.init({ payload: this })
this.db.payload = this

if (this.db?.init) {
  await this.db.init()
}

if (!options.disableDBConnect && this.db.connect) {
  await this.db.connect()
}
```

### BaseDatabaseAdapter Interface

The adapter must implement:

```typescript
export interface BaseDatabaseAdapter {
  beginTransaction: BeginTransaction
  commitTransaction: CommitTransaction
  connect?: Connect
  count: Count
  create: Create
  createGlobal: CreateGlobal
  createMigration: CreateMigration
  createVersion: CreateVersion
  deleteMany: DeleteMany
  deleteOne: DeleteOne
  destroy?: Destroy
  find: Find
  findGlobal: FindGlobal
  init?: Init
  migrate: (args?: { migrations?: Migration[] }) => Promise<void>
  // ... many more
}
```

### Migrations

Migrations are run via the `migrate` method:

```typescript
await this.db.migrate()
```

This runs any pending migration up functions.

## 7. Component Architecture

### BasePayload Class Structure

The `BasePayload` class is organized into these main components:

| Component | Type | Description |
|-----------|------|-------------|
| `collections` | `Record<CollectionSlug, Collection>` | Access to all collections |
| `globals` | `Globals` | Access to all globals |
| `db` | `DatabaseAdapter` | Database operations |
| `email` | `InitializedEmailAdapter` | Email sending |
| `authStrategies` | `AuthStrategy[]` | Authentication methods |
| `blocks` | `Record<BlockSlug, FlattenedBlock>` | Block definitions |
| `crons` | `Cron[]` | Scheduled jobs |
| `kv` | `KVAdapter` | Key-value storage |
| `versions` | `Object` | Version history |
| `jobs` | `JobsLocalAPI` | Job queue |

### Collection Initialization

Each collection is stored with its config and any custom ID type:

```typescript
this.collections[collection.slug] = {
  config: collection,
  customIDType,  // 'number' or 'text' or undefined
}
```

### Global Initialization

Globals are simpler:

```typescript
this.globals = {
  config: this.config.globals,
}
```

## 8. Key Insights for DeesseJS

Based on this analysis, here are key patterns for implementing a `createDeesse({ config })` pattern:

### 1. Singleton with Cache Key

```typescript
// Use Map on global for multi-instance support
const _cached = global._deesse = new Map()

export async function createDeesse(options) {
  const key = options.key ?? 'default'
  let cached = _cached.get(key)

  if (!cached) {
    cached = { instance: null, promise: null }
    _cached.set(key, cached)
  }

  if (cached.instance) return cached.instance

  if (!cached.promise) {
    cached.promise = new Deesse().init(options)
  }

  cached.instance = await cached.promise
  return cached.instance
}
```

### 2. Config Sanitization Pipeline

Build a config sanitization function that:
1. Applies defaults
2. Processes plugins
3. Validates and transforms fields
4. Sets up collections and globals

### 3. Adapter Initialization Pattern

```typescript
this.db = this.config.db.init({ deesse: this })
this.kv = this.config.kv.init({ deesse: this })
await this.db.init()
await this.db.connect()
```

### 4. Lifecycle Hooks

Support `onInit` callback in config:

```typescript
if (!options.disableOnInit) {
  if (typeof options.onInit === 'function') {
    await options.onInit(this)
  }
  if (typeof this.config.onInit === 'function') {
    await this.config.onInit(this)
  }
}
```

### 5. HMR Support via Reload Function

Extract reload logic for HMR:

```typescript
export const reload = async (
  config: SanitizedConfig,
  deesse: Deesse,
  options?: InitOptions
): Promise<void> => {
  await deesse.db.destroy()
  deesse.config = config
  // Update collections, globals, blocks in-place
  await deesse.db.init()
  await deesse.db.connect({ hotReload: true })
}
```

### 6. Secret Derivation

```typescript
this.secret = crypto.createHash('sha256')
  .update(this.config.secret).digest('hex').slice(0, 32)
```

### 7. Async Config Support

Allow config to be a Promise for flexible loading:

```typescript
this.config = await options.config
```

---

## Source Code References

- Main getPayload function: `packages/payload/src/index.ts` (lines 1108-1251)
- BasePayload class: `packages/payload/src/index.ts` (lines 389-1075)
- Init method: `packages/payload/src/index.ts` (lines 801-1068)
- Reload function: `packages/payload/src/index.ts` (lines 1017-1075)
- Config build: `packages/payload/src/config/build.ts`
- Config sanitize: `packages/payload/src/config/sanitize.ts`
- Config types: `packages/payload/src/config/types.ts`
- Database types: `packages/payload/src/database/types.ts`
- Collection sanitize: `packages/payload/src/collections/config/sanitize.ts`
