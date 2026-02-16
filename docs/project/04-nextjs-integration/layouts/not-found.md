# Not Found Handling

## Overview

Comprehensive 404 handling with not-found.js and global-not-found.js for collection-based content.

## Features

### Auto-Generated not-found.js Files

- Per-collection not-found pages
- Custom 404 UI for each route segment
- Contextual error messages
- Navigation suggestions

### Global 404 Handler

- global-not-found.js for unmatched URLs
- Single 404 page for entire app
- Bypasses normal rendering
- Full HTML document required

### Status Code Handling

- 200 for streamed responses
- 404 for non-streamed responses
- SEO-friendly with noindex meta tags
- Proper HTTP status when possible

## Not Found Patterns

### Basic 404 Page

```typescript
// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mt-4">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
```

### Collection 404

```typescript
// app/blog/[slug]/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Post Not Found</h1>
        <p className="text-gray-600 mt-4">
          The blog post you're looking for doesn't exist.
        </p>
        <div className="mt-6 space-x-4">
          <Link href="/blog" className="text-blue-600">
            View all posts
          </Link>
          <Link href="/" className="text-blue-600">
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
```

### Dynamic 404 with Data

```typescript
// app/not-found.tsx
import Link from 'next/link'
import { headers } from 'next/headers'

export default async function NotFound() {
  const headersList = await headers()
  const domain = headersList.get('host')
  const data = await getSiteData(domain)

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl mt-4">{data.name}</h2>
        <p className="text-gray-600 mt-2">Page not found</p>
        <Link href="/" className="mt-6 inline-block text-blue-600">
          Return Home
        </Link>
      </div>
    </div>
  )
}
```

## Global Not Found

### Experimental Feature

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
  },
};
```

### Global 404 Page

```typescript
// app/global-not-found.tsx
import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
}

export default function GlobalNotFound() {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold">404</h1>
            <p className="text-xl text-gray-600 mt-4">
              This page does not exist.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
```

### When to Use Global Not Found

**Multiple Root Layouts**

```
app/
  (admin)/
    layout.tsx
  (shop)/
    layout.tsx
```

**Dynamic Root Layout**

```
app/
  [locale]/
    layout.tsx
```

## Configuration

### Per-Collection 404

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      notFound: {
        title: 'Post Not Found',
        message: 'The post you are looking for does not exist.',
        showSuggestions: true,
        backLink: '/blog',
        homeLink: true,
      },
    },
  ],
});
```

### Global 404 Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  notFound: {
    global: {
      enabled: true,
      title: '404 - Page Not Found',
      message: 'The page you are looking for does not exist.',
    },
  },
});
```

## SEO Considerations

### Noindex Meta Tag

- Automatically added to 404 pages
- Prevents indexing of soft 404s
- Google guidance compliant

### Status Codes

**Streamed Responses**

- Returns 200 status
- Includes `<meta name="robots" content="noindex" />`
- Content in streamed HTML

**Non-Streamed Responses**

- Returns 404 status
- Proper SEO handling

### Soft 404 Prevention

- Ensure resource exists before streaming
- Use proxy for fast slug validation
- Generate proper 404 responses when needed

## Client Component 404

### usePathname for Dynamic 404

```typescript
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function NotFound() {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-gray-600 mt-4">
          Path: {pathname}
        </p>
        <Link href="/" className="mt-6 inline-block text-blue-600">
          Go Home
        </Link>
      </div>
    </div>
  )
}
```

## Benefits

- **Contextual**: Per-collection 404 pages
- **SEO-Friendly**: Proper status codes and noindex
- **Flexible**: Global and route-level handling
- **User-Friendly**: Helpful navigation suggestions
- **Data-Driven**: Can fetch data for 404 pages
- **Comprehensive**: Handles all unmatched URLs
