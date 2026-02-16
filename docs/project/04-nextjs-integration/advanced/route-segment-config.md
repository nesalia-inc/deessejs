# Route Segment Config

## Overview

Route segment configuration options for controlling caching, rendering behavior, runtime, and more in DeesseJS collections.

## Segment Config Options

### Available Options
- `dynamic` - Control dynamic/static rendering
- `dynamicParams` - Handle dynamic segments
- `revalidate` - Set revalidation frequency
- `fetchCache` - Control fetch caching behavior
- `runtime` - Node.js vs Edge runtime
- `preferredRegion` - Geographic region preference
- `maxDuration` - Maximum execution time

## Dynamic Behavior

### Auto (Default)
```typescript
// app/posts/page.tsx
export const dynamic = 'auto'
// Cache as much as possible, allow dynamic behavior
```

### Force Dynamic
```typescript
// app/posts/page.tsx
export const dynamic = 'force-dynamic'
// Render for each user at request time
// Equivalent to all fetch requests having { cache: 'no-store' }
```

### Force Static (Error)
```typescript
// app/posts/page.tsx
export const dynamic = 'error'
// Force static rendering, error if dynamic APIs used
// Equivalent to getStaticProps
```

### Force Static
```typescript
// app/posts/page.tsx
export const dynamic = 'force-static'
// Force static, cookies/headers return empty values
```

## Collection Configuration

### Per-Collection Segment Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    segmentConfig: {
      dynamic: 'auto',
      revalidate: 3600,
      runtime: 'nodejs',
    }
  }, {
    name: 'analytics',
    segmentConfig: {
      dynamic: 'force-dynamic',
      runtime: 'edge',
    }
  }]
})
```

### Auto-Generated Segment Config
```typescript
// app/posts/[slug]/page.tsx - Auto-generated
export const dynamic = 'auto'
export const revalidate = 3600
export const runtime = 'nodejs'

export default async function Page(props: PageProps<'/posts/[slug]'>) {
  const { slug } = await props.params
  const post = await db.posts.findBySlug(slug)
  return <PostDetail post={post} />
}
```

## Revalidation

### Time-Based Revalidation
```typescript
// app/posts/page.tsx
export const revalidate = 60 // Revalidate every 60 seconds

export default async function Page() {
  const posts = await db.posts.findMany()
  return <PostList posts={posts} />
}
```

### On-Demand Revalidation
```typescript
// app/posts/page.tsx
export const revalidate = false

// Server action to revalidate
'use client'

import { revalidatePath } from 'next/cache'

export function revalidatePosts() {
  revalidatePath('/posts')
}
```

### Tag-Based Revalidation
```typescript
// app/posts/page.tsx
export const revalidate = 3600

async function getPosts() {
  'use cache'
  cacheTag('posts')

  return db.posts.findMany()
}

// Revalidate by tag
import { revalidateTag } from 'next/cache'

revalidateTag('posts')
```

## Dynamic Params

### Enable Dynamic Params (Default)
```typescript
// app/posts/[slug]/page.tsx
export const dynamicParams = true
// Generate on-demand if not in generateStaticParams
```

### Disable Dynamic Params
```typescript
// app/posts/[slug]/page.tsx
export const dynamicParams = false
// Return 404 for params not in generateStaticParams
```

### With generateStaticParams
```typescript
// app/posts/[slug]/page.tsx
export const dynamicParams = true
export async function generateStaticParams() {
  const posts = await db.posts.findMany({ where: { status: 'published' }})
  return posts.map(post => ({ slug: post.slug }))
}
// Published posts static, others on-demand
```

## Fetch Cache

### Auto (Default)
```typescript
export const fetchCache = 'auto'
// Cache when possible, allow dynamic behavior
```

### Force No Store
```typescript
export const fetchCache = 'force-no-store'
// All fetch requests use cache: 'no-store'
```

### Only Cache
```typescript
export const fetchCache = 'only-cache'
// All fetch requests must be cacheable
```

## Runtime

### Node.js (Default)
```typescript
// app/api/process/route.ts
export const runtime = 'nodejs'

export async function POST(request: Request) {
  // Can use Node.js APIs
  const fs = await import('fs')
  return Response.json({ success: true })
}
```

### Edge Runtime
```typescript
// app/api/edge/route.ts
export const runtime = 'edge'

export async function GET() {
  // Fast, lightweight, closer to users
  return Response.json({ message: 'Hello from Edge' })
}
```

### Collection Runtime Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    segmentConfig: {
      runtime: 'nodejs',
      preferredRegion: 'home',
    }
  }, {
    name: 'analytics',
    segmentConfig: {
      runtime: 'edge',
      preferredRegion: 'global',
    }
  }]
})
```

## Preferred Region

### Geographic Region
```typescript
// app/api/data/route.ts
export const preferredRegion = 'iad1' // US East

export async function GET() {
  const data = await fetchData()
  return Response.json(data)
}
```

### Multiple Regions
```typescript
export const preferredRegion = ['iad1', 'sfo1'] // US East + US West

export async function GET() {
  return Response.json({ data: 'hello' })
}
```

### Global
```typescript
export const preferredRegion = 'global'

export async function GET() {
  return Response.json({ message: 'Hello from worldwide' })
}
```

## Max Duration

### Execution Time Limit
```typescript
// app/api/long-running/route.ts
export const maxDuration = 300 // 5 minutes

export async function POST() {
  // Long-running task
  await processLargeDataset()
  return Response.json({ success: true })
}
```

### Page-Level Timeout
```typescript
// app/dashboard/page.tsx
export const maxDuration = 60

export default async function Page() {
  const data = await fetchWithTimeout('/api/data', 60000)
  return <Dashboard data={data} />
}
```

## Configuration

### Global Segment Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  segmentConfig: {
    defaults: {
      dynamic: 'auto',
      revalidate: false,
      runtime: 'nodejs',
      preferredRegion: 'auto',
    },
    collections: {
      posts: {
        dynamic: 'auto',
        revalidate: 3600,
        runtime: 'nodejs',
      },
      analytics: {
        dynamic: 'force-dynamic',
        runtime: 'edge',
        preferredRegion: 'global',
      },
    }
  }
})
```

### Per-Page Config
```typescript
// app/posts/[slug]/page.tsx
export const dynamic = 'auto'
export const revalidate = 3600
export const runtime = 'nodejs'
export const preferredRegion = 'home'
export const maxDuration = 30

export default async function Page(props: PageProps<'/posts/[slug]'>) {
  const { slug } = await props.params
  const post = await db.posts.findBySlug(slug)
  return <PostDetail post={post} />
}
```

## Best Practices

### Static Content
```typescript
// Use for rarely changing content
export const dynamic = 'error'
export const revalidate = 86400 // 24 hours
```

### Dynamic Content
```typescript
// Use for user-specific or real-time content
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

### Hybrid Content
```typescript
// Use for mostly static with some dynamic
export const dynamic = 'auto'
export const revalidate = 3600 // 1 hour
```

## Benefits

- **Performance**: Control caching per route
- **Flexibility**: Mix static and dynamic routes
- **Geographic**: Deploy closer to users
- **Cost Control**: Limit execution time
- **Developer Experience**: Sensible defaults
- **Scalability**: Edge runtime for global performance
