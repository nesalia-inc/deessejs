# Loading States

## Overview

Automatic loading UI generation with React Suspense for instant loading states and progressive rendering.

## Features

### Auto-Generated loading.js Files

- Instant loading UI on navigation
- Skeleton components based on collection structure
- Streaming HTML with fallbacks
- Automatic Suspense boundaries

### Collection-Based Skeletons

- Generate skeleton UI from collection schema
- Realistic content placeholders
- Shimmer animations
- Configurable skeleton styles

### Instant Loading States

- Prefetched fallback UI
- Immediate navigation response
- Interruptible navigation
- Shared layouts stay interactive

## Loading Patterns

### Basic Loading Component

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return <LoadingSkeleton />
}
```

### Collection List Skeleton

```typescript
// app/blog/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
```

### Single Item Skeleton

```typescript
// app/blog/[slug]/loading.tsx
export default function Loading() {
  return (
    <article className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-64 bg-gray-200 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </article>
  )
}
```

### Table Skeleton

```typescript
// app/@admin/posts/loading.tsx
export default function Loading() {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {[...Array(10)].map((_, i) => (
          <tr key={i} className="animate-pulse">
            <td><div className="h-4 bg-gray-200 rounded w-48" /></td>
            <td><div className="h-4 bg-gray-200 rounded w-20" /></td>
            <td><div className="h-4 bg-gray-200 rounded w-24" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Streaming Architecture

### Progressive Rendering

1. User clicks link
2. Prefetched loading UI shows immediately
3. Server streams HTML chunks
4. Content progressively replaces skeleton
5. Page becomes interactive incrementally

### Suspense Boundaries

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
      <Suspense fallback={<RecentActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  )
}
```

## Configuration

### Per-Collection Loading UI

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      ui: {
        loading: {
          type: 'skeleton',
          animation: 'shimmer',
          showCount: 5,
        },
      },
    },
  ],
});
```

### Global Loading Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  loading: {
    defaultType: 'skeleton',
    animation: 'shimmer',
    color: 'gray-200',
    streaming: true,
  },
});
```

## Loading Variants

### Spinner

```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
    </div>
  )
}
```

### Skeleton with Shimmer

```typescript
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded" />
    </div>
  )
}
```

### Dots Loader

```typescript
export default function Loading() {
  return (
    <div className="flex space-x-2">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
    </div>
  )
}
```

### Progress Bar

```typescript
'use client'

import { useEffect, useState } from 'react'

export default function Loading() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => (prev + 10) % 100)
    }, 200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full bg-gray-200 rounded-full h-1">
      <div
        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
```

## SEO Considerations

### Metadata Before Streaming

- generateMetadata resolves before streaming
- Metadata placed in initial HTML
- Crawlers get proper SEO tags

### Bot Detection

- Twitterbot, Googlebot get static HTML
- JavaScript-disabled browsers get blocking behavior
- Streaming doesn't impact SEO

### Soft 404 Handling

- Streamed 404 pages get `<meta name="robots" content="noindex" />`
- Prevents indexing of soft 404s
- Proper 404 status when possible

## Platform Support

### Supported Platforms

- **Node.js**: Full streaming support
- **Docker**: Full streaming support
- **Static Export**: No streaming support
- **Edge**: Platform-specific adapters

## Benefits

- **Instant Feedback**: Loading UI shows immediately
- **Better UX**: Skeletons better than blank screens
- **Progressive**: Content loads incrementally
- **SEO-Friendly**: Metadata in initial HTML
- **Interactive**: Layouts stay interactive during load
- **Configurable**: Per-collection loading strategies
