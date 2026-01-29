# Advanced Static Generation

## Overview

Automatic `generateStaticParams` integration for Next.js static site generation from DeesseJS collections.

## Features

### Automatic generateStaticParams
- Auto-generate `generateStaticParams` from collections
- Static routes at build time for published content
- Dynamic routes for drafts and unpublished content
- Hybrid approach: static + dynamic

### Build-Time Static Generation
- Pre-render all published collection items
- Generate static HTML for known routes
- Faster page loads (no server round-trip)
- CDN-friendly static assets

### Automatic Fetch Deduplication
- Leverage Next.js automatic fetch deduplication
- Single data fetch for generateStaticParams + page rendering
- Faster build times
- Reduced database load during build

### Strategy per Collection
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    staticGeneration: {
      strategy: 'published', // static for published, dynamic for drafts
      revalidate: 3600, // ISR revalidation
    }
  }]
})
```

### Build-Time Validation
- Validate dynamic content access during build
- Catch runtime API usage errors at build time
- Ensure Suspense boundaries for runtime data
- Sample param validation

### Suspense Integration
- Automatic Suspense boundaries for runtime params
- Loading states for dynamic routes
- Graceful fallbacks
- Streaming support

## Generation Strategies

### Published Only
```typescript
// Static for published, dynamic for drafts
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    where: { status: 'published' }
  })
  return posts.map(post => ({ slug: post.slug }))
}
```

### All Content
```typescript
// Static for everything
export async function generateStaticParams() {
  const posts = await db.posts.findMany()
  return posts.map(post => ({ slug: post.slug }))
}
```

### Subset
```typescript
// Static for top N, dynamic for rest
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    orderBy: { popularity: 'desc' },
    limit: 100
  })
  return posts.map(post => ({ slug: post.slug }))
}
```

## Route Handlers

### Static API Routes
- Auto-generate static route handlers with `generateStaticParams`
- Pre-generate API responses at build time
- Dynamic fallback for unhandled IDs
- Type-safe responses

```typescript
// app/api/posts/[id]/route.ts
export async function generateStaticParams() {
  const posts = await db.posts.findMany({ status: 'published' })
  return posts.map(post => ({ id: post.id }))
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params
  const post = await db.posts.findById(id)
  return Response.json(post)
}
```

## Benefits

- **Performance**: Static HTML serves instantly from CDN
- **Build-Time Validation**: Catch errors before deployment
- **Hybrid Approach**: Best of static + dynamic
- **SEO Friendly**: Pre-rendered HTML for crawlers
- **Cost Efficient**: Reduce server load with static assets
