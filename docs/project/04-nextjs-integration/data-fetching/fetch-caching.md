# Fetch API & Caching

## Overview

Extended Next.js fetch() API with persistent caching, revalidation, and tag-based invalidation for DeesseJS collections.

## Features

### Extended Fetch Options
- cache: 'force-cache' | 'no-store' | auto
- next.revalidate: Cache lifetime in seconds
- next.tags: Cache tags for on-demand revalidation
- Automatic deduplication across requests

### Cache Strategies
- Per-request caching configuration
- Collection-level cache defaults
- Tag-based invalidation
- Stale-while-revalidate patterns

## Basic Fetch with Caching

### Default Caching
```typescript
// app/page.tsx
export default async function Page() {
  // Default: auto cache
  let data = await fetch('https://api.vercel.app/blog')
  let posts = await data.json()

  return <PostList posts={posts} />
}
```

### Force Cache
```typescript
// Cache indefinitely, revalidate on-demand
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog', {
    cache: 'force-cache',
  })

  const posts = await data.json()
  return <PostList posts={posts} />
}
```

### No Store (Always Fresh)
```typescript
// Never cache, always fetch fresh
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog', {
    cache: 'no-store',
  })

  const posts = await data.json()
  return <PostList posts={posts} />
}
```

## Revalidation

### Time-Based Revalidation
```typescript
// Revalidate every hour
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog', {
    next: { revalidate: 3600 }, // 1 hour
  })

  const posts = await data.json()
  return <PostList posts={posts} />
}
```

### No Revalidation
```typescript
// Cache indefinitely
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog', {
    next: { revalidate: false },
  })

  const posts = await data.json()
  return <PostList posts={posts} />
}
```

### Prevent Caching
```typescript
// Revalidate of 0 prevents caching
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog', {
    next: { revalidate: 0 },
  })

  const posts = await data.json()
  return <PostList posts={posts} />
}
```

## Cache Tags

### Tag-Based Caching
```typescript
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog', {
    next: { tags: ['blog-posts'] },
  })

  const posts = await data.json()
  return <PostList posts={posts} />
}
```

### Multiple Tags
```typescript
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog', {
    next: { tags: ['blog', 'posts', 'content'] },
  })

  const posts = await data.json()
  return <PostList posts={posts} />
}
```

### Revalidate by Tag
```typescript
// app/actions.ts
'use server'

import { revalidateTag } from 'next/cache'

export async function updatePost() {
  await db.posts.update({ /* ... */ })

  // Revalidate all blog posts
  revalidateTag('blog-posts')
}
```

## Collection-Based Fetching

### Auto-Generated Fetch Wrappers
```typescript
// Auto-generated from collection config
// lib/db/posts.ts
export async function getPosts() {
  const data = await fetch(`${process.env.API_URL}/posts`, {
    cache: 'force-cache',
    next: {
      tags: ['posts'],
      revalidate: 3600,
    },
  })

  return data.json()
}
```

### Collection Fetch Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    fetch: {
      cache: 'force-cache',
      revalidate: 3600,
      tags: ['posts'],
      deduplication: true,
    }
  }]
})
```

### Dynamic Collection Fetching
```typescript
// app/posts/[slug]/page.tsx
export default async function PostPage(props: PageProps<'/posts/[slug]'>) {
  const { slug } = await props.params

  // Auto-tagged with post slug
  const post = await db.posts.findBySlug(slug, {
    fetch: {
      next: { tags: [`post-${slug}`] }
    }
  })

  return <PostDetail post={post} />
}
```

## Fetch with DeesseJS ORM

### Fetch-Through Cache
```typescript
// Collections use fetch internally with caching
export async function getPosts() {
  // Uses DeesseJS fetch wrapper
  const posts = await db.posts.findMany()
  // Internally: fetch with caching, tags, revalidate

  return posts
}
```

### ORM Cache Configuration
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    cache: {
      enabled: true,
      strategy: 'force-cache',
      revalidate: 3600,
      tags: ['posts'],
    }
  }]
})
```

## Advanced Patterns

### Deduplication
```typescript
// Multiple fetches with same URL are deduplicated
export default async function Page() {
  const posts1 = await fetch('/api/posts', { next: { revalidate: 60 } })
  const posts2 = await fetch('/api/posts', { next: { revalidate: 60 } })

  // Only one actual request to /api/posts

  return <div>{/* ... */}</div>
}
```

### Conditional Caching
```typescript
export async function fetchPost(id: string, draftMode: boolean) {
  return await fetch(`/api/posts/${id}`, {
    cache: draftMode ? 'no-store' : 'force-cache',
    next: draftMode ? { revalidate: 0 } : { revalidate: 3600 },
  })
}
```

### Background Revalidation
```typescript
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog', {
    next: { revalidate: 3600 }, // Revalidate every hour
  })

  const posts = await data.json()

  return <PostList posts={posts} />
}
```

## Configuration

### Global Fetch Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  fetch: {
    defaults: {
      cache: 'force-cache',
      revalidate: 3600,
    },
    collections: {
      posts: {
        cache: 'force-cache',
        revalidate: 3600,
        tags: ['posts'],
      },
      products: {
        cache: 'no-store',
        revalidate: 0,
        tags: ['products'],
      }
    }
  }
})
```

## Best Practices

### Choose Right Cache Strategy
- Static content: `force-cache` with long revalidate
- Dynamic content: `no-store` or short revalidate
- User-specific: `no-store`
- Real-time: `cache: 'no-store'`

### Use Tags for Invalidation
- Tag at collection level: `posts`
- Tag at item level: `post-{slug}`
- Revalidate granularly with `revalidateTag`

### Avoid Cache Conflicts
- Don't mix `cache: 'no-store'` with `revalidate`
- Don't set conflicting revalidate values
- Use consistent caching strategy

## Benefits

- **Performance**: Serve cached content fast
- **Flexibility**: Per-request cache control
- **Invalidation**: Tag-based revalidation
- **Simplicity**: Extended fetch API
- **Deduplication**: Automatic request dedup
- **Integration**: Works with DeesseJS ORM
