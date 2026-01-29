# Cache Management

## Overview

Advanced cache management with `cacheLife`, `cacheTag`, and preset profiles for DeesseJS collections.

## Features

### Preset Cache Profiles
- seconds: Real-time data
- minutes: Frequently updated
- hours: Multiple daily updates
- days: Daily updates
- weeks: Weekly updates
- max: Rarely changes

### Cache Tags
- Tag cached data for invalidation
- On-demand revalidation
- Multiple tags per entry
- Collection-based tagging

### Cache Life Profiles
- stale: Client cache duration
- revalidate: Background refresh interval
- expire: Maximum cache lifetime

## Basic Usage

### Enable Cache Components
```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
```

### Using Preset Profiles
```typescript
// app/blog/page.tsx
import { cacheLife } from 'next/cache'

export default async function BlogPage() {
  'use cache'

  cacheLife('days') // Blog content updated daily

  const posts = await db.posts.findMany()
  return <PostList posts={posts} />
}
```

## Collection-Based Caching

### Per-Collection Cache Profile
```typescript
// app/posts/[slug]/page.tsx
import { cacheLife } from 'next/cache'

export default async function PostPage(props: PageProps<'/posts/[slug]'>) {
  'use cache'

  cacheLife('days') // Posts cached for a day

  const { slug } = await props.params
  const post = await db.posts.findBySlug(slug)

  return <PostDetail post={post} />
}
```

### Product Caching
```typescript
// app/products/[id]/page.tsx
import { cacheLife } from 'next/cache'

export default async function ProductPage(props: PageProps<'/products/[id]'>) {
  'use cache'

  cacheLife('hours') // Products updated multiple times per day

  const { id } = await props.params
  const product = await db.products.findById(id)

  return <ProductDetail product={product} />
}
```

### Real-Time Data
```typescript
// app/stocks/page.tsx
import { cacheLife } from 'next/cache'

export default async function StocksPage() {
  'use cache'

  cacheLife('seconds') // Real-time stock prices

  const stocks = await fetchStockPrices()
  return <StockList stocks={stocks} />
}
```

## Cache Tagging

### Basic Tagging
```typescript
// app/lib/posts.ts
import { cacheTag } from 'next/cache'

export async function getPosts() {
  'use cache'

  cacheTag('posts')

  return db.posts.findMany()
}
```

### Dynamic Tagging
```typescript
// app/posts/[slug]/page.tsx
import { cacheTag } from 'next/cache'

export default async function PostPage(props: PageProps<'/posts/[slug]'>) {
  'use cache'

  const { slug } = await props.params
  cacheTag(`post-${slug}`)

  const post = await db.posts.findBySlug(slug)
  return <PostDetail post={post} />
}
```

### Multiple Tags
```typescript
export async function getData() {
  'use cache'

  cacheTag('posts', 'blog', 'content')

  return fetchData()
}
```

### Conditional Tagging
```typescript
async function getPost(slug: string) {
  'use cache'

  const post = await fetchPost(slug)

  if (!post) {
    cacheLife('minutes') // Short cache for missing posts
    return null
  }

  cacheTag(`post-${slug}`)
  cacheLife('days') // Long cache for published posts

  return post
}
```

## On-Demand Invalidation

### Revalidate Tag
```typescript
// app/actions.ts
'use server'

import { revalidateTag } from 'next/cache'
import { db } from '@deessejs/db'

export async function updatePost(data: any) {
  const post = await db.posts.update({
    where: { id: data.id },
    data: data.updates
  })

  // Invalidate cache for this post
  revalidateTag(`post-${post.slug}`)

  return post
}
```

### Revalidate Collection
```typescript
// app/actions.ts
'use server'

import { revalidateTag } from 'next/cache'

export async function publishPost(id: string) {
  await db.posts.publish({ id })

  // Invalidate entire posts collection
  revalidateTag('posts')

  revalidatePath('/blog')
}
```

## Configuration

### Cache Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  cache: {
    enabled: true,
    defaultProfile: 'days',
    collections: {
      posts: {
        profile: 'days',
        tagging: true,
        revalidateOnMutation: true,
      },
      products: {
        profile: 'hours',
        tagging: true,
      },
      settings: {
        profile: 'max',
        tagging: false,
      }
    }
  }
})
```

### Custom Cache Profiles
```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    editorial: {
      stale: 600,      // 10 minutes
      revalidate: 3600, // 1 hour
      expire: 86400,    // 1 day
    },
    marketing: {
      stale: 300,       // 5 minutes
      revalidate: 1800, // 30 minutes
      expire: 43200,    // 12 hours
    },
  },
}

export default nextConfig
```

### Use Custom Profile
```typescript
// app/editorial/page.tsx
import { cacheLife } from 'next/cache'

export default async function EditorialPage() {
  'use cache'
  cacheLife('editorial')

  return <EditorialContent />
}
```

## Inline Cache Profiles

### One-Off Configuration
```typescript
export async function getLimitedOffer() {
  'use cache'

  cacheLife({
    stale: 60,        // 1 minute
    revalidate: 300,  // 5 minutes
    expire: 3600,     // 1 hour
  })

  const offer = await getOffer()
  return offer
}
```

### Dynamic Cache Lifetime
```typescript
async function getPost(slug: string) {
  'use cache'

  const post = await fetchPost(slug)
  cacheTag(`post-${slug}`)

  // Use cache timing from CMS data
  cacheLife({
    revalidate: post.revalidateSeconds ?? 3600,
  })

  return post
}
```

## Nested Caching

### Outer Cache Life
```typescript
// app/dashboard/page.tsx
import { cacheLife } from 'next/cache'
import { Widget } from './widget'

export default async function Dashboard() {
  'use cache'

  cacheLife('hours') // Outer cache sets own lifetime

  return (
    <div>
      <h1>Dashboard</h1>
      <Widget /> {/* Has 'minutes' lifetime */}
    </div>
  )
}
```

### Without Explicit Outer
```typescript
export default async function Dashboard() {
  'use cache'
  // No cacheLife - uses default (15 min)
  // Widget with 5 min → Dashboard becomes 5 min
  // Widget with 1 hour → Dashboard stays 15 min

  return <Dashboard />
}
```

## Auto-Generated Cache Tags

### Collection Tags
```typescript
// Auto-generated from config
export async function getPost(slug: string) {
  'use cache'

  const post = await db.posts.findBySlug(slug)

  // Auto-generated tags
  cacheTag('posts', `post-${post.slug}`, `post-${post.id}`)

  return post
}
```

## Best Practices

### Always Use Explicit cacheLife
- Makes behavior clear
- Independent of nested caches
- Easier to reason about

### Tag Consistently
- Tag at collection level
- Tag at individual item level
- Use consistent tag patterns

### Choose Right Profile
- seconds: Real-time
- minutes: Social feeds, news
- hours: Inventory, weather
- days: Blog posts, articles
- weeks: Podcasts, newsletters
- max: Legal, archived content

## Benefits

- **Performance**: Serve cached content fast
- **Freshness**: Background revalidation
- **Control**: Fine-tuned cache durations
- **Invalidation**: Tag-based purging
- **Automation**: Auto-generated from config
- **Flexibility**: Per-collection configuration
