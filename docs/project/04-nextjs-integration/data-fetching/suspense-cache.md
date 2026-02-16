# Suspense & Cache Patterns

## Overview

Advanced React Suspense and Next.js Cache integration for optimal data fetching and rendering.

## Features

### Automatic Suspense Boundaries
- Suspense boundaries for dynamic route params
- Streaming HTML with fallbacks
- Progressive rendering
- Loading states per component

### use Cache Directive
- Automatic `use cache` directive integration
- Per-collection cache configuration
- Cache tags for invalidation
- Revalidation strategies

### Partial Prerendering (PPR)
- PPR support for hybrid static/dynamic rendering
- Shell static + content dynamic
- Instant initial page load
- Progressive enhancement

### Streaming with Fallbacks
- Stream HTML chunks to client
- Skeleton screens during loading
- Progressive hydration
- Non-blocking rendering

## Suspense Patterns

### Dynamic Route Params
```typescript
// app/blog/[slug]/page.tsx
import { Suspense } from 'react'

export default function Page({ params }: PageProps<'/blog/[slug]'>) {
  return (
    <div>
      <h1>Blog Post</h1>
      <Suspense fallback={<PostSkeleton />}>
        {params.then(({ slug }) => <PostContent slug={slug} />)}
      </Suspense>
    </div>
  )
}
```

### Collection Queries
```typescript
// Auto-generated Suspense boundary
export default function BlogList() {
  return (
    <div>
      <h1>Blog</h1>
      <Suspense fallback={<BlogListSkeleton />}>
        <BlogListContent />
      </Suspense>
    </div>
  )
}

async function BlogListContent() {
  const posts = await db.posts.findMany()
  return posts.map(post => <PostCard key={post.id} post={post} />)
}
```

## Cache Patterns

### Per-Collection Cache Strategy
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    cache: {
      strategy: 'cache',
      tags: ['posts'],
      revalidate: 3600, // 1 hour
    }
  }]
})
```

### Automatic Cache Tags
- Collection-level tags: `posts`, `users`, `products`
- Item-level tags: `post:123`, `user:456`
- Query-based tags: `posts:published`
- Automatic invalidation on mutations

### Cache Revalidation
```typescript
// Automatic revalidation on mutation
await db.posts.update({ id: 1, data: { title: 'New Title' } })
// Automatically invalidates tags: ['posts', 'post:1']
```

## Partial Prerendering

### Shell + Content Pattern
```typescript
// app/blog/[slug]/page.tsx
export const experimental_ppr = true

export default function Page({ params }: PageProps<'/blog/[slug]'>) {
  return (
    <>
      <BlogHeader /> {/* Static shell */}
      <Suspense fallback={<PostSkeleton />}>
        <PostContent slug={params.then(p => p.slug)} /> {/* Dynamic content */}
      </Suspense>
      <BlogFooter /> {/* Static shell */}
    </>
  )
}
```

### PPR Configuration
```typescript
// deesse.config.ts
export const config = defineConfig({
  rendering: {
    partialPrerendering: {
      enabled: true,
      defaultStrategy: 'hybrid',
    }
  }
})
```

## Streaming Architecture

### Progressive HTML Streaming
1. Server renders static shell
2. Streams HTML to client progressively
3. Suspense boundaries show fallbacks
4. Components hydrate as data arrives
5. Page becomes interactive incrementally

### Loading States
```typescript
// Auto-generated skeleton components
export function PostSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  )
}
```

## Cache Strategies

### Strategy: Static
```typescript
cache: {
  strategy: 'static',
  revalidate: false, // Never revalidate
}
```

### Strategy: Stale While Revalidate
```typescript
cache: {
  strategy: 'swr',
  revalidate: 3600, // Revalidate after 1 hour
}
```

### Strategy: On-Demand
```typescript
cache: {
  strategy: 'ondemand',
  revalidate: true, // Manual revalidation
}
```

## Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  cache: {
    defaultStrategy: 'swr',
    defaultRevalidate: 3600,
    tags: {
      prefix: 'deesse',
      delimiter: ':',
    }
  },
  suspense: {
    autoBoundaries: true,
    fallbackComponent: 'Skeleton',
    streaming: true,
  }
})
```

## Benefits

- **Performance**: Instant static shell + progressive content
- **UX**: Skeleton screens better than blank pages
- **Scalability**: Cache reduces database load
- **Developer Experience**: Automatic boundaries and strategies
- **Flexibility**: Per-collection cache configuration
