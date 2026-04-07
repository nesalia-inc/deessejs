# Payload SDK Analysis

## Executive Summary

The Payload CMS SDK provides a unified interface for interacting with Payload from both server and client contexts. The SDK is designed with a clear separation between server-side (full access) and client-side (restricted) capabilities. At its core, `getPayload()` initializes and caches a Payload instance, while all data operations go through either the **Local API** (direct database access) or the **HTTP API** (REST/GraphQL endpoints).

**Key Files Analyzed:**
- `packages/payload/src/index.ts` - Main SDK implementation (2,868 lines)
- `packages/next/src/utilities/initReq.ts` - Next.js integration
- `packages/payload/src/config/client.ts` - Client config creation
- `packages/payload/src/collections/operations/local/find.ts` - Local API example
- `packages/payload/src/collections/endpoints/find.ts` - REST API handler
- `packages/payload/src/utilities/createLocalReq.ts` - Request object creation

---

## SDK Architecture Overview

### The `Payload` Class

The `BasePayload` class (line 389 in `index.ts`) is the main SDK class containing all data operations:

```typescript
export class BasePayload {
  // Collection operations
  find, findByID, findDistinct, create, update, delete, duplicate
  count, countVersions
  findVersions, findVersionByID, restoreVersion

  // Global operations
  findGlobal, findGlobalVersionByID, findGlobalVersions, updateGlobal, restoreGlobalVersion

  // Auth operations
  login, logout, auth, forgotPassword, resetPassword, unlock, verifyEmail

  // Utilities
  encrypt, decrypt, getAdminURL, getAPIURL

  // Email & Jobs
  sendEmail, jobs
}
```

### `getPayload()` Function

`getPayload()` (line 1,114 in `index.ts`) is the primary entry point:

```typescript
export const getPayload = async (
  options: {
    key?: string  // Cache key for separate instances
  } & InitOptions,
): Promise<Payload>
```

**Key behaviors:**
1. **Caching**: Maintains a Map cache on `global._payload` to prevent re-initialization
2. **HMR Support**: WebSocket connection to `/_next/webpack-hmr` for hot module replacement
3. **Singleton Pattern**: Same config returns cached instance
4. **Cron Initialization**: Can auto-start cron jobs via `cron: true` option

---

## Server-Side SDK

### Initialization

Server-side initialization with `getPayload()`:

```typescript
import { getPayload } from 'payload'

// In a server context (API route, server component, etc.)
const payload = await getPayload({
  config: myPayloadConfig,
  importMap: generatedImportMap,
})
```

### Local API Operations

Server-side, operations use the **Local API** which calls operations directly:

```typescript
// packages/payload/src/collections/operations/local/find.ts
export async function findLocal<
  TSlug extends CollectionSlug,
  TSelect extends SelectFromCollectionSlug<TSlug>>,
>(
  payload: Payload,
  options: { draft?: TDraft } & FindOptions<TSlug, TSelect>,
): Promise<PaginatedDocs<...>>
```

The Local API:
1. Creates a local `PayloadRequest` via `createLocalReq()`
2. Calls the operation directly (e.g., `findOperation`)
3. Bypasses HTTP layer entirely

### Server-Only Features

From `packages/payload/src/config/client.ts`, these are **server-only properties** excluded from client config:

```typescript
export const serverOnlyConfigProperties = [
  'endpoints', 'db', 'editor', 'plugins', 'sharp',
  'onInit', 'secret', 'hooks', 'bin', 'i18n',
  'typescript', 'cors', 'csrf', 'email', 'custom',
  'graphQL', 'jobs', 'kv', 'logger', 'queryPresets',
]
```

Server-side only:
- **Database access**: Direct database operations via adapters
- **Hooks**: `beforeChange`, `afterChange`, `beforeRead`, `afterRead`, etc.
- **Access Control Bypass**: `overrideAccess: true` skips access control
- **Transactions**: Full transaction support
- **Cron Jobs**: Scheduled job execution
- **File System**: Local file uploads, sharp image processing

---

## Client-Side SDK

### `createClientConfig`

Client-side config is sanitized to remove server-only properties:

```typescript
// packages/payload/src/config/client.ts
export const createClientConfig = ({
  config,
  i18n,
  importMap,
}: CreateClientConfigArgs): ClientConfig
```

The client config:
- Removes `secret`, `db`, `hooks`, `endpoints`, etc.
- Strips server-only field properties
- Serializes React components for client use
- Limits localization to locale codes only

### Client-Side Restrictions

**Client-side limitations:**
1. Cannot bypass access control (`overrideAccess: false` is enforced)
2. Cannot use server hooks (they run on server only)
3. Cannot access database directly - must use HTTP API
4. No direct file system or sharp processing
5. Config is stripped of sensitive properties

### Next.js Integration

The `@payloadcms/next` package provides the integration:

```typescript
// packages/next/src/utilities/initReq.ts
export const initReq = async function ({
  canSetHeaders,
  configPromise,
  importMap,
  key,
  overrides,
}): Promise<InitReqResult>
```

This function:
1. Retrieves headers from `next/headers`
2. Initializes i18n with locale detection
3. Executes auth strategies
4. Creates a full `PayloadRequest` object
5. Caches partial results for performance

---

## Entry Points and Import Paths

### Main Import

```typescript
import { getPayload, type Payload } from 'payload'
```

### Exports from `packages/payload/src/index.ts`

The main exports include:

**Core:**
- `getPayload` - Main SDK entry point
- `BasePayload` / `Payload` - The main class

**Config Types:**
- `SanitizedConfig`, `CollectionConfig`, `GlobalConfig`
- `ClientConfig`, `UnauthenticatedClientConfig`

**Operation Options:**
- `FindOptions`, `CreateOptions`, `UpdateOptions`, `DeleteOptions`

**Types:**
- `CollectionSlug<T>`, `GlobalSlug<T>`, `TypedLocale<T>`
- `DataFromCollectionSlug<T>`, `SelectFromCollectionSlug<T>`
- `PayloadTypes`, `GeneratedTypes`, `UntypedPayloadTypes`

**Auth:**
- `LoginResult`, `MeOperationResult`, `Permission`, `Permissions`

### Next.js Specific

```typescript
// packages/next/src/exports/client.ts
'use client'
export { DefaultNavClient, NavHamburger, NavWrapper, ... }
```

---

## Type Safety and Typed Access

### Generated Types Pattern

Payload uses TypeScript module augmentation for type generation:

```typescript
// packages/payload/src/index.ts

// Shape constraint matching generated Config structure
export interface PayloadTypesShape {
  auth: Record<string, unknown>
  blocks: Record<string, unknown>
  collections: Record<string, unknown>
  collectionsJoins: Record<string, unknown>
  collectionsSelect: Record<string, unknown>
  db: { defaultIDType: unknown }
  fallbackLocale: unknown
  globals: Record<string, unknown>
  globalsSelect: Record<string, unknown>
  jobs: unknown
  locale: unknown
  user: unknown
  widgets?: Record<string, unknown>
}

// Fallback untyped types
export interface UntypedPayloadTypes { ... }

// Augmentation interface - users extend this
export interface GeneratedTypes {}

// Merged types with augmentation check
export type PayloadTypes = IsAugmented extends true
  ? GeneratedTypes & Omit<UntypedPayloadTypes, keyof GeneratedTypes>
  : UntypedPayloadTypes
```

### Type Augmentation

Users' `payload-types.ts` augments `GeneratedTypes`:

```typescript
// From test/sdk/payload-types.ts
declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
```

### Typed Collection Access

```typescript
// Typed collection slug
type MyCollectionSlug = 'posts' extends CollectionSlug ? 'posts' : never

// Data with full type safety
const post = await payload.findByID({
  collection: 'posts',
  id: '123',
})
// post is typed as Post (from payload-types.ts)

// With select for partial typing
const partial = await payload.findByID({
  collection: 'posts',
  id: '123',
  select: { title: true, content: true },
})
// partial is typed with only title and content
```

### Select Pattern

```typescript
// packages/payload/src/collections/config/types.ts
export type SelectFromCollectionSlug<TSlug extends CollectionSlug> =
  TypedCollectionSelect[TSlug]
```

Select types are auto-generated:

```typescript
// From payload-types.ts
export interface PostsSelect<T extends boolean = true> {
  text?: T
  number?: T
  number2?: T
  group?: T | { text?: T; number?: T }
  updatedAt?: T
  createdAt?: T
}
```

---

## Local API vs HTTP API

### Local API

**Location**: `packages/payload/src/collections/operations/local/`

The Local API calls operations directly without HTTP:

```typescript
// findLocal calls findOperation directly
return findOperation({
  collection,
  depth,
  where,
  req: await createLocalReq(options, payload),  // Local request
  ...
})
```

**Characteristics:**
- Direct database access
- Full access to hooks and access control
- Can use `overrideAccess: true` to bypass security
- Only available server-side
- No serialization overhead

### HTTP API (REST)

**Location**: `packages/payload/src/collections/endpoints/`

REST handlers wrap operations for HTTP:

```typescript
// packages/payload/src/collections/endpoints/find.ts
export const findHandler: PayloadHandler = async (req) => {
  const collection = getRequestCollection(req)
  const { depth, draft, limit, page, where } = parseParams(req.query)

  const result = await findOperation({
    collection,
    depth, draft, limit, page, where,
    req,  // HTTP request passed through
  })

  return Response.json(result, { headers: headersWithCors({...}) })
}
```

### GraphQL API

**Location**: `packages/graphql/src/resolvers/`

GraphQL resolvers also wrap operations:

```typescript
// packages/graphql/src/resolvers/collections/find.ts
export const find: FindResolver = async (_, args, context) => {
  const result = await findOperation({
    ...args,
    req: context.req,
  })
  return result
}
```

### API Comparison

| Aspect | Local API | REST API | GraphQL API |
|--------|-----------|----------|-------------|
| Context | Server-only | HTTP requests | HTTP requests |
| Access Control | Full control | Enforced | Enforced |
| Hooks | All hooks run | All hooks run | All hooks run |
| Serialization | None | JSON | JSON/GraphQL |
| HTTP Overhead | None | Yes | Yes |
| `overrideAccess` | Available | Always `false` | Always `false` |
| Transactions | Supported | Per-request | Per-request |

### `payloadAPI` Property

The `PayloadRequest` object tracks which API is being used:

```typescript
// packages/payload/src/types/index.ts
payloadAPI: 'GraphQL' | 'local' | 'REST'
```

This is set in `createLocalReq`:

```typescript
// packages/payload/src/utilities/createLocalReq.ts
req.payloadAPI = req?.payloadAPI || 'local'
```

Some operations check this to disable joins for GraphQL:

```typescript
// In findOperation
joins: req.payloadAPI === 'GraphQL' ? false : sanitizedJoins
```

---

## Best Practices

### 1. Server-Side Usage

```typescript
// Prefer getPayload() for caching
import { getPayload } from 'payload'

const payload = await getPayload({ config })
const result = await payload.find({ collection: 'posts' })
```

### 2. Request Context

```typescript
// Create properly typed request context
import { createLocalReq } from 'payload'

const req = await createLocalReq({
  user: currentUser,
  locale: 'en',
  depth: 2,
}, payload)
```

### 3. Access Control

```typescript
// Frontend: always respect access control
const result = await payload.find({
  collection: 'posts',
  overrideAccess: false,  // Enforce access control
})

// Admin/backend: can bypass when needed
const result = await payload.find({
  collection: 'posts',
  overrideAccess: true,  // Skip access control
})
```

### 4. Type Safety

```typescript
// Use typed slugs
import type { CollectionSlug } from 'payload'

async function getPost(slug: CollectionSlug<'posts'>) {
  return payload.findByID({ collection: slug, id: '123' })
}
```

### 5. Performance

```typescript
// Use select to limit fields
const result = await payload.find({
  collection: 'posts',
  select: {
    title: true,
    author: { name: true },
  },
})

// Use depth control for relationships
const result = await payload.find({
  collection: 'posts',
  depth: 1,  // One level of relationships
})
```

---

## File Locations Summary

| Component | Path |
|-----------|------|
| Main SDK | `packages/payload/src/index.ts` |
| Next.js init | `packages/next/src/utilities/initReq.ts` |
| Client config | `packages/payload/src/config/client.ts` |
| Local API operations | `packages/payload/src/collections/operations/local/*.ts` |
| REST endpoints | `packages/payload/src/collections/endpoints/*.ts` |
| GraphQL resolvers | `packages/graphql/src/resolvers/**/*.ts` |
| Request creation | `packages/payload/src/utilities/createLocalReq.ts` |
| REST handler | `packages/next/src/routes/rest/index.ts` |
| Type definitions | `packages/payload/src/types/index.ts` |

---

## Notes

1. **`getTypedPayload()`**: Does not exist in this codebase. Type safety comes from the `GeneratedTypes` augmentation pattern combined with generic type parameters on operations.

2. **HMR Support**: The WebSocket connection in `getPayload()` (lines 1201-1247) listens for `serverComponentChanges` events to trigger config reload.

3. **Request Caching**: The `initReq` utility uses `selectiveCache` to cache partial results and full request objects to avoid repeated initialization.

4. **PayloadRequest**: The core request object containing all context (`user`, `locale`, `payload`, `i18n`, `transactionID`, etc.) is created via `createLocalReq()` and passed through all operations.
