# Page Type Safety & Props

## Overview

Advanced page props handling with PageProps helper, params as promises, and searchParams for collection-based pages.

## Features

### PageProps Helper

- Auto-generated `PageProps<'/route'>` helper
- Strongly typed params and searchParams
- Inferred from directory structure
- Global helper available after type generation

### Params as Promises

- params prop is a promise (Next.js 15)
- Async/await or React.use() to access values
- Backward compatibility support (deprecated)

### SearchParams Handling

- URL query string as searchParams prop
- Filtering, pagination, sorting support
- Type-safe search params
- Collection-based query builders

## Page Patterns

### Basic Page with PageProps

```typescript
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  return <h1>Blog Post: {slug}</h1>
}
```

### Page with SearchParams

```typescript
// app/shop/page.tsx
export default async function Page(props: PageProps<'/shop'>) {
  const { page = '1', sort = 'asc', query = '' } = await props.searchParams

  const products = await db.products.findMany({
    where: {
      name: { contains: query }
    },
    orderBy: { [sort]: 'asc' },
    skip: (parseInt(page) - 1) * 20,
    take: 20,
  })

  return <ProductList products={products} />
}
```

### Combined Params and SearchParams

```typescript
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  const { tab = 'content' } = await props.searchParams

  const post = await db.posts.findBySlug(slug)

  return (
    <div>
      <PostTabs activeTab={tab} post={post} />
      <PostContent post={post} />
    </div>
  )
}
```

## Collection Page Generation

### Auto-Generated List Pages

```typescript
// app/posts/page.tsx - Auto-generated
export default async function Page(props: PageProps<'/posts'>) {
  const { page = '1', sort = 'createdAt' } = await props.searchParams

  const posts = await db.posts.findMany({
    orderBy: { [sort]: 'desc' },
    skip: (parseInt(page) - 1) * 10,
    take: 10,
  })

  return <PostList posts={posts} />
}
```

### Auto-Generated Single Pages

```typescript
// app/posts/[slug]/page.tsx - Auto-generated
export default async function Page(props: PageProps<'/posts/[slug]'>) {
  const { slug } = await props.params

  const post = await db.posts.findBySlug(slug)

  if (!post) {
    notFound()
  }

  return <PostDetail post={post} />
}
```

## Configuration

### Collection Page Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      pages: {
        list: {
          path: '/posts',
          enabled: true,
          itemsPerPage: 10,
          sortableFields: ['title', 'createdAt', 'updatedAt'],
          filterableFields: ['status', 'category'],
        },
        detail: {
          path: '/posts/[slug]',
          enabled: true,
          slugField: 'slug',
        },
      },
    },
  ],
});
```

### SearchParams Schema

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      searchParams: {
        page: { type: 'number', default: 1 },
        sort: { type: 'enum', values: ['title', 'createdAt', 'updatedAt'], default: 'createdAt' },
        order: { type: 'enum', values: ['asc', 'desc'], default: 'desc' },
        query: { type: 'string', default: '' },
        status: { type: 'enum', values: ['draft', 'published'], optional: true },
      },
    },
  ],
});
```

## URL Query Builders

### Auto-Generated Query Builders

```typescript
// Client-side query builder
import { buildUrl } from '@deessejs/url';

const url = buildUrl('/posts', {
  page: 2,
  sort: 'title',
  order: 'asc',
  query: 'nextjs',
});
// => /posts?page=2&sort=title&order=asc&query=nextjs
```

### Type-Safe Query Params

```typescript
'use client'

import { use } from 'react'
import { PageProps } from 'next'

export default function PostListPage(props: PageProps<'/posts'>) {
  const searchParams = use(props.searchParams)
  // searchParams is fully typed!

  return (
    <div>
      <Link href="/posts?sort=title">Sort by title</Link>
      {/* ^ Build queries with autocomplete */}
    </div>
  )
}
```

## Client Component Pages

### Using React.use()

```typescript
'use client'

import { use } from 'react'

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = use(params)
  const { tab = 'content' } = use(searchParams)

  return <PostDetail slug={slug} tab={tab} />
}
```

### useSearchParams Hook

```typescript
'use client'

import { useSearchParams } from 'next/navigation'

export default function PostFilters() {
  const searchParams = useSearchParams()
  const query = searchParams.get('query') || ''

  return (
    <input
      defaultValue={query}
      // Update URL on change
      onChange={(e) => {
        const params = new URLSearchParams(searchParams)
        params.set('query', e.target.value)
        window.history.pushState(null, '', `?${params.toString()}`)
      }}
    />
  )
}
```

## Advanced Patterns

### Multi-Dimension Filtering

```typescript
// app/products/page.tsx
export default async function Page(props: PageProps<'/products'>) {
  const {
    page = '1',
    sort = 'name',
    category,
    priceMin,
    priceMax,
  } = await props.searchParams

  const products = await db.products.findMany({
    where: {
      category: category || undefined,
      price: {
        gte: priceMin ? Number(priceMin) : undefined,
        lte: priceMax ? Number(priceMax) : undefined,
      }
    },
    orderBy: { [sort]: 'asc' },
  })

  return <ProductList products={products} filters={await props.searchParams} />
}
```

### Pagination with SearchParams

```typescript
// Auto-generated pagination component
export function Pagination({ page, totalPages }: { page: number, totalPages: number }) {
  const params = useSearchParams()

  const buildUrl = (newPage: number) => {
    const newParams = new URLSearchParams(params)
    newParams.set('page', String(newPage))
    return `?${newParams.toString()}`
  }

  return (
    <div className="flex gap-2">
      {page > 1 && <Link href={buildUrl(page - 1)}>Previous</Link>}
      <span>Page {page} of {totalPages}</span>
      {page < totalPages && <Link href={buildUrl(page + 1)}>Next</Link>}
    </div>
  )
}
```

## Benefits

- **Type Safety**: PageProps auto-generated from route
- **IntelliSense**: Autocomplete for params and searchParams
- **Validation**: SearchParams schema validation
- **URL State**: Clean URLs with query params
- **Pagination**: Built-in pagination support
- **Filtering**: Easy filtering and sorting
- **Client-Side**: use() hook for client components
