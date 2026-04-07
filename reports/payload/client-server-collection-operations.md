# Payload CMS: Client-Side vs Server-Side Collection Operations

## Executive Summary

Payload CMS 3.x provides two primary mechanisms for interacting with collections: the **Local API** (used directly via the `payload` object) and the **REST API** (HTTP-based). Both ultimately call the same underlying operations, but they differ significantly in how they handle authentication, access control, request context, and caching. Understanding these differences is critical for building secure, performant applications.

The core insight: **the `payload` object is the same in both contexts** - it exposes Local API methods (`payload.find()`, `payload.create()`, etc.) that internally invoke the core operations. The distinction between client and server lies in how the `PayloadRequest` object is constructed and whether access control is bypassed.

---

## Architecture Overview

### The `payload` Object

The `Payload` instance is obtained via `getPayload()`:

```typescript
// packages/payload/src/index.ts
export const getPayload = async (options: { key?: string } & InitOptions): Promise<Payload> => {
  // Caches Payload instance globally to prevent re-initialization
  // Handles HMR in development
  // Returns BasePayload instance
}
```

The `BasePayload` class exposes all collection operations as methods that delegate to `*Local` functions:

```typescript
// packages/payload/src/index.ts (lines 444-448)
export class BasePayload {
  create = async <TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>>(
    options: CreateOptions<TSlug, TSelect>,
  ): Promise<TransformCollectionWithSelect<TSlug, TSelect>> => {
    return createLocal<TSlug, TSelect>(this, options)
  }

  find = async <TSlug extends CollectionSlug, TSelect extends SelectFromCollectionSlug<TSlug>, TDraft extends boolean = false>(
    options: { draft?: TDraft } & FindOptions<TSlug, TSelect>,
  ): Promise<PaginatedDocs<...>> => {
    return findLocal<TSlug, TSelect, TDraft>(this, options)
  }
  // ... other methods: findByID, update, delete, count, etc.
}
```

### Two-Layer Architecture

Every collection operation has two layers:

1. **Local Layer** (`packages/payload/src/collections/operations/local/`): Accepts options, creates a `PayloadRequest`, calls the operation
2. **Operation Layer** (`packages/payload/src/collections/operations/`): Core business logic, access control, hooks, database queries

```
payload.find({ collection: 'posts', where: { title: { equals: 'Hello' } } })
  └─> findLocal() [local/find.ts]
       └─> createLocalReq() [creates PayloadRequest with user, locale, context]
       └─> findOperation() [operations/find.ts - the actual implementation]
            ├─> executeAccess() [checks access control if overrideAccess=false]
            ├─> payload.db.find() [database query]
            ├─> beforeRead hooks
            ├─> afterRead hooks (field-level transformations)
            └─> afterOperation hooks
```

---

## Server-Side Collection Operations

### Context

Server-side operation refers to execution within:
- Next.js Server Components
- API Routes (`app/(payload)/api/[...slug]/route.ts`)
- Server Actions
- Custom endpoints
- Hooks (beforeChange, afterChange, etc.)

### How It Works

On the server, you get a `Payload` instance via `getPayload()` and call methods directly:

```typescript
// In a Server Component or API Route
import { getPayload } from 'payload'
import { config } from '@/payload.config'

async function getPosts() {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    limit: 10,
    depth: 2,  // Populate relationships to 2 levels
  })

  return docs
}
```

### The `PayloadRequest` Object

The `PayloadRequest` carries all context through an operation:

```typescript
// packages/payload/src/utilities/createLocalReq.ts
export const createLocalReq = async (
  { context, depth, fallbackLocale, locale, req = {}, user, ... },
  payload: Payload
): Promise<PayloadRequest> => {
  req.locale = locale || defaultLocale
  req.fallbackLocale = sanitizedFallback
  req.payloadAPI = 'local'  // Indicates Local API usage
  req.payload = payload
  req.user = user || null   // null for anonymous
  req.payloadDataLoader = getDataLoader(req)

  attachFakeURLProperties(req)  // Creates fake URL if not in HTTP context

  return req as PayloadRequest
}
```

### Key Characteristics

| Aspect | Server-Side Behavior |
|--------|---------------------|
| **Authentication** | You manage it - pass `user` to `createLocalReq` or rely on hooks |
| **Access Control** | Respected by default in REST API; **bypassed by default** in Local API (`overrideAccess: true`) |
| **Request Context** | Full control via `req` parameter |
| **Caching** | React's `cache()` function via `selectiveCache()` in Next.js integration |

---

## Client-Side Collection Operations

### Context

Client-side refers to:
- Browser-based operations
- Operations requiring authentication via cookies/JWT
- The Admin UI's internal data fetching

### REST API Pattern

For authenticated operations from the client, use the REST API:

```typescript
// Client-side fetch
const response = await fetch('/api/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `JWT ${token}`,
  },
  body: JSON.stringify({ title: 'My Post' })
})

const { doc } = await response.json()
```

The REST API routes delegate to operations with proper authentication:

```typescript
// app/(payload)/api/[...slug]/route.ts
import { REST_GET, REST_POST, REST_DELETE, REST_PATCH } from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
```

### REST Handler Flow

The `@payloadcms/next` package provides REST handlers that:

1. Call `initReq()` to get a properly authenticated `PayloadRequest`
2. Execute the operation with `overrideAccess: false` (access control is enforced)
3. Return the response with appropriate headers

---

## Key Differences and Trade-offs

### `overrideAccess` Default Values

This is the most critical security consideration:

| Context | Default `overrideAccess` | Implication |
|---------|-------------------------|-------------|
| **Local API** (Server) | `true` | Access control **bypassed** |
| **REST API** | `false` | Access control **enforced** |
| **GraphQL** | `false` | Access control **enforced** |

From `packages/payload/src/collections/operations/local/find.ts` (line 215):
```typescript
overrideAccess = true,  // Bypassed by default!
```

From `packages/payload/src/collections/operations/find.ts` (line 119):
```typescript
if (!overrideAccess) {
  accessResult = await executeAccess({ disableErrors, req }, collectionConfig.access.read)
}
```

### The `initReq` Caching Mechanism

In Next.js, `initReq` uses React's `cache()` for request-level caching:

```typescript
// packages/next/src/utilities/initReq.ts
const partialReqCache = selectiveCache<PartialResult>('partialReq')
const reqCache = selectiveCache<InitReqResult>('req')

export const initReq = async ({ configPromise, importMap, key, overrides }) => {
  const partialResult = await partialReqCache.get(async () => {
    const payload = await getPayload({ config, cron: true, importMap })
    const { responseHeaders, user } = await executeAuthStrategies({ headers, payload })
    return { payload, user, responseHeaders }
  }, 'global')  // 'global' key = shared across all requests

  return reqCache.get(async () => {
    const req = await createLocalReq({ req: { headers, user, ... }, ... }, payload)
    const permissions = await getAccessResults({ req })
    return { req, permissions }
  }, key)  // 'key' = per-request cache
}
```

### Authentication Flow

**Server Components** (no automatic auth):
```typescript
// Must manually authenticate or use in hooks/endpoints
const payload = await getPayload({ config })
```

**REST API** (automatic auth via cookies/JWT):
```typescript
// Auth handled by executeAuthStrategies in initReq
const { user } = await executeAuthStrategies({ headers, payload })
```

**Next.js Integration** uses `initReq` which combines both:
```typescript
// packages/next/src/utilities/initReq.ts
const { responseHeaders, user } = await executeAuthStrategies({
  canSetHeaders,  // Whether we can set response headers
  headers,
  payload,
})
```

---

## CRUD Operations: Client vs Server Patterns

### Find (List Documents)

**Server-Side (Local API):**
```typescript
const payload = await getPayload({ config })

// Bypasses access control by default
const { docs, totalPages } = await payload.find({
  collection: 'posts',
  where: { status: { equals: 'published' } },
  limit: 10,
  page: 1,
  depth: 0,
  overrideAccess: false,  // Respect access control
})
```

**Client-Side (REST API):**
```typescript
// Automatically respects access control based on JWT cookie
const response = await fetch('/api/posts?limit=10&page=1')
const { docs } = await response.json()
```

### FindByID

**Server-Side:**
```typescript
const post = await payload.findByID({
  collection: 'posts',
  id: '123',
  depth: 1,
})
```

**Client-Side:**
```typescript
const response = await fetch('/api/posts/123')
const { doc } = await response.json()
```

### Create

**Server-Side:**
```typescript
const newPost = await payload.create({
  collection: 'posts',
  data: { title: 'My Post', content: '...' },
  depth: 0,
  // overrideAccess defaults to true - bypasses access control!
})
```

**Client-Side (REST):**
```typescript
const response = await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Authorization': `JWT ${token}` },
  body: JSON.stringify({ title: 'My Post', content: '...' })
})
```

### Update

**Server-Side:**
```typescript
// Bulk update
const result = await payload.update({
  collection: 'posts',
  where: { status: { equals: 'draft' } },
  data: { status: 'published' },
})

// Update by ID
const updated = await payload.update({
  collection: 'posts',
  id: '123',
  data: { title: 'Updated Title' },
})
```

**Client-Side:**
```typescript
// Update by ID
const response = await fetch('/api/posts/123', {
  method: 'PATCH',
  headers: { 'Authorization': `JWT ${token}` },
  body: JSON.stringify({ title: 'Updated Title' })
})
```

### Delete

**Server-Side:**
```typescript
// Delete by ID
const deleted = await payload.delete({
  collection: 'posts',
  id: '123',
})

// Bulk delete
const result = await payload.delete({
  collection: 'posts',
  where: { _status: { equals: 'draft' } },
})
```

**Client-Side:**
```typescript
const response = await fetch('/api/posts/123', {
  method: 'DELETE',
  headers: { 'Authorization': `JWT ${token}` }
})
```

---

## Common Pitfalls

### 1. Forgetting `overrideAccess: false` on the Server

The Local API defaults to `overrideAccess: true`, meaning access control is **bypassed**. For frontend-facing server components, always set it explicitly:

```typescript
// DANGEROUS - bypasses all access control
const posts = await payload.find({ collection: 'posts' })

// SAFE - respects access control
const posts = await payload.find({
  collection: 'posts',
  overrideAccess: false  // Enforce access control
})
```

### 2. Mixing Up Context Between Hooks and Server Components

When in hooks, you receive a `req` object that already has a properly authenticated user. Use it:

```typescript
// In a beforeChange hook - use the req.user!
const myHook = async ({ req, data }) => {
  // req.user is set from the incoming request
  // Can pass it to other operations
  const related = await payload.find({
    collection: 'related',
    where: { owner: { equals: req.user.id } },
    req,  // Pass the full req to maintain context
  })
  return data
}
```

### 3. Not Understanding the `createLocalReq` URL Behavior

When calling Local API outside of an HTTP request context (e.g., in background jobs), Payload creates fake URL properties:

```typescript
// packages/payload/src/utilities/createLocalReq.ts
const attachFakeURLProperties = (req, urlSuffix) => {
  const fallbackURL = `http://${req.host || 'localhost'}${urlSuffix || ''}`
  // Creates a proper URL object for operations that need it
}
```

### 4. Access Control Not Being Invoked in Local API

The `overrideAccess` default is `true` for **all** Local API operations. The server operation only runs access control when explicitly told:

```typescript
// In findOperation (operations/find.ts):
if (!overrideAccess) {
  accessResult = await executeAccess({ disableErrors, req }, collectionConfig.access.read)
  // If access returns false, returns empty results
}
```

### 5. Caching Issues with React Server Components

The `selectiveCache` uses React's `cache()` function which is request-scoped. This means:

```typescript
// This will cache within a single request
const data = await reqCache.get(async () => { ... }, 'my-key')

// But different requests get different caches
// Unless using 'global' as the cache key
```

---

## Best Practices

### 1. Use REST API for All Client-to-Server Communication

```typescript
// Always use REST API from the browser
const { doc } = await fetch('/api/posts/123').then(r => r.json())
```

### 2. Use Local API for Server-Side Operations with Explicit Access Control

```typescript
// In Server Components
const payload = await getPayload({ config })

// Always set overrideAccess explicitly
const posts = await payload.find({
  collection: 'posts',
  overrideAccess: false,  // Or true if intentionally bypassing
  where: { ... }
})
```

### 3. Pass `req` to Maintain Context in Hooks

```typescript
// In hooks, always pass the req
const result = await payload.find({
  collection: 'posts',
  req,  // Preserves user, locale, transaction context
})
```

### 4. Use Typed Options for Better TypeScript Experience

```typescript
import type { FindOptions } from 'payload'

const options: FindOptions<'posts'> = {
  collection: 'posts',
  where: { title: { equals: 'Hello' } },
  depth: 1,
}
```

### 5. Use `select` to Reduce Data Transfer

```typescript
// Only fetch needed fields
const post = await payload.findByID({
  collection: 'posts',
  id: '123',
  select: { title: true, content: true }  // Only these fields
})
```

### 6. Handle Errors Gracefully

```typescript
try {
  const post = await payload.findByID({
    collection: 'posts',
    id: '123',
    disableErrors: true  // Returns null instead of throwing
  })
} catch (error) {
  // Handle other errors
}
```

---

## Code Examples

### Server Component: Fetch Posts with Access Control

```typescript
// app/posts/page.tsx (Server Component)
import { getPayload } from 'payload'
import { config } from '@/payload.config'

export default async function PostsPage() {
  const payload = await getPayload({ config })

  // overrideAccess: false ensures access control is respected
  const { docs: posts, totalDocs } = await payload.find({
    collection: 'posts',
    where: {
      status: { equals: 'published' }
    },
    limit: 10,
    depth: 2,
    overrideAccess: false,
    select: { title: true, excerpt: true, author: true }
  })

  return (
    <div>
      <h1>Posts ({totalDocs})</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  )
}
```

### API Route: Create Post with Authentication

```typescript
// app/api/posts/route.ts
import { initReq } from '@payloadcms/next/utilities/initReq'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { payload, req } = await initReq({
    configPromise: config,
    importMap,
    key: 'create-post'
  })

  const body = await request.json()

  try {
    const doc = await payload.create({
      collection: 'posts',
      data: body,
      req,  // Pass authenticated req
      overrideAccess: false
    })

    return NextResponse.json({ doc })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

### Hook: Validate and Transform on Create

```typescript
// In payload.config.ts
const postsCollection = {
  slug: 'posts',
  hooks: {
    beforeChange: [
      async ({ req, data }) => {
        // Add user as author
        if (req.user) {
          data.author = req.user.id
        }

        // Generate slug from title if not provided
        if (!data.slug && data.title) {
          data.slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
        }

        return data
      }
    ],
    afterRead: [
      async ({ doc, req }) => {
        // Add computed field
        doc.readTime = calculateReadTime(doc.content)
        return doc
      }
    ]
  }
}
```

### Using Transactions

```typescript
const result = await payload.create({
  collection: 'posts',
  data: { title: 'My Post' },
  req,  // Transaction is started automatically if not disabled
})

// If an error occurs, transaction is killed automatically
try {
  const post = await payload.create({
    collection: 'posts',
    data: { title: 'Post 1' },
  })

  await payload.create({
    collection: 'comments',
    data: { post: post.id, body: 'First!' },
  })
} catch (error) {
  // Transaction automatically rolled back
}
```

---

## Summary Table: Local API vs REST API

| Aspect | Local API (Server) | REST API |
|--------|-------------------|----------|
| **Access Control** | Bypassed by default (`overrideAccess: true`) | Enforced by default |
| **Authentication** | Manual via `user` in `createLocalReq` | Automatic via cookies/JWT |
| **Use Case** | Server Components, hooks, custom logic | Client-server communication |
| **Request Context** | Created via `createLocalReq` | Created via `initReq` |
| **Caching** | React `cache()` via selectiveCache | Standard HTTP caching |
| **TypeScript Support** | Full type inference | Partial (response types) |
| **Performance** | Direct function call overhead | HTTP request overhead |

---

## Key File Locations

| Purpose | File Path |
|---------|-----------|
| Main `getPayload` function | `packages/payload/src/index.ts` (line 1114) |
| `BasePayload` class | `packages/payload/src/index.ts` (line 389) |
| Local find operation | `packages/payload/src/collections/operations/local/find.ts` |
| Server find operation | `packages/payload/src/collections/operations/find.ts` |
| Local create operation | `packages/payload/src/collections/operations/local/create.ts` |
| Server create operation | `packages/payload/src/collections/operations/create.ts` |
| `createLocalReq` utility | `packages/payload/src/utilities/createLocalReq.ts` |
| `initReq` for Next.js | `packages/next/src/utilities/initReq.ts` |
| REST API handler | `packages/next/src/routes/rest/index.ts` |
| REST routes | `app/(payload)/api/[...slug]/route.ts` |
| `executeAccess` | `packages/payload/src/auth/executeAccess.ts` |
| `selectiveCache` | `packages/next/src/utilities/selectiveCache.ts` |
