# generateStaticParams - Static Route Generation

## Overview

Using `generateStaticParams` to statically generate routes at build time from DeesseJS collections.

## Features

### Build-Time Generation

- Generate static HTML for collection items
- Pre-render all pages at build time
- Faster initial page loads
- CDN-friendly static routes

### Dynamic Fallbacks

- Generate subset at build time
- Generate all paths on first visit
- Control unspecified paths with dynamicParams

### Route Handler Support

- Static API responses
- Pre-generate endpoints at build time
- Type-safe params

## Basic Usage

### All Posts at Build Time

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    where: { status: 'published' }
  })

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await db.posts.findBySlug(slug)

  return <PostDetail post={post} />
}
```

### Subset at Build Time

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    where: { status: 'published' },
  });

  // Generate top 10 at build time, rest on first visit
  return posts.slice(0, 10).map((post) => ({
    slug: post.slug,
  }));
}

export const dynamicParams = true; // Others generated on demand
```

## Multiple Dynamic Segments

### Category + Product

```typescript
// app/shop/[category]/[product]/page.tsx
export async function generateStaticParams() {
  const products = await db.products.findMany({
    where: { available: true }
  })

  return products.map((product) => ({
    category: product.category,
    product: product.slug,
  }))
}

export default async function Page({
  params,
}: {
  params: Promise<{ category: string; product: string }>
}) {
  const { category, product } = await params

  const item = await db.products.findByCategoryAndSlug(category, product)

  return <ProductDetail product={item} />
}
```

### Parent + Child Generation

```typescript
// app/shop/[category]/layout.tsx
export async function generateStaticParams() {
  const categories = await db.categories.findMany();

  return categories.map((cat) => ({
    category: cat.slug,
  }));
}

// app/shop/[category]/[product]/page.tsx
export async function generateStaticParams({ params }: { params: { category: string } }) {
  const products = await db.products.findMany({
    where: { category: params.category },
  });

  return products.map((product) => ({
    product: product.slug,
  }));
}
```

## Configuration

### Auto-Generated generateStaticParams

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      staticGeneration: {
        enabled: true,
        strategy: 'published', // Only published items
        buildTime: 'all', // or 'subset' or 'none'
      },
    },
  ],
});
```

### Strategy Options

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      staticGeneration: {
        enabled: true,
        strategy: 'published', // 'published' | 'all' | 'draft'
        subsetSize: 100, // If strategy is 'subset'
        dynamicParams: true, // Generate others on demand
        revalidate: 3600, // ISR revalidation
      },
    },
  ],
});
```

## Route Handlers

### Static API Responses

```typescript
// app/api/posts/[id]/route.ts
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    where: { status: 'published' },
  });

  return posts.map((post) => ({
    id: String(post.id),
  }));
}

export async function GET(request: Request, { params }: RouteContext<'/api/posts/[id]'>) {
  const { id } = await params;

  const post = await db.posts.findById(id);

  if (!post) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(post);
}
```

### With Caching

```typescript
// app/api/posts/[id]/route.ts
export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }, { id: '3' }];
}

async function getPost(id: Promise<string>) {
  'use cache';

  const resolvedId = await id;
  return await db.posts.findById(resolvedId);
}

export async function GET(request: Request, { params }: RouteContext<'/api/posts/[id]'>) {
  const post = await getPost(params.then((p) => p.id));

  return Response.json(post);
}
```

## Dynamic Fallbacks

### All Paths on First Visit

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  return []; // No paths at build time
}

export const dynamic = 'force-static'; // Generate on first visit
```

### Only Generated Paths

```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  return posts.slice(0, 10).map((post) => ({
    slug: post.slug,
  }));
}

export const dynamicParams = false; // Others return 404
```

## Collection Configuration

### Per-Collection Static Generation

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      staticGeneration: {
        enabled: true,
        status: 'published', // Only published content
        subsetSize: 0, // 0 = all
        generateAtBuild: 'all',
      },
    },
    {
      name: 'products',
      staticGeneration: {
        enabled: true,
        status: 'all',
        subsetSize: 100,
        generateAtBuild: 'subset',
      },
    },
  ],
});
```

### Auto-Generated Function

```typescript
// Auto-generated from collection config
// app/posts/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    where: { status: config.staticGeneration.status },
    take: config.staticGeneration.subsetSize || undefined,
  });

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
```

## Advanced Patterns

### Locale-Based Generation

```typescript
// app/[locale]/posts/[slug]/page.tsx
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const posts = await db.posts.findMany({
    where: {
      status: 'published',
      locale: params.locale,
    },
  });

  return posts.map((post) => ({
    locale: params.locale,
    slug: post.slug,
  }));
}
```

### Date-Based Generation

```typescript
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
  });

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
```

## Best Practices

### Choose Right Strategy

- **All**: Build all content at build time
- **Subset**: Build top N, rest on-demand
- **None**: Generate all on first visit

### Consider Build Performance

- Limit build-time generation for large datasets
- Use subset for frequent builds
- Monitor build times

### Use with ISR

- Combine with revalidate for fresh content
- Static shell + dynamic updates
- Best of both worlds

## Benefits

- **Performance**: Serve static HTML from CDN
- **SEO**: Pre-rendered HTML for crawlers
- **Scalability**: Handle large content sets
- **Flexibility**: Control generation strategy
- **Automation**: Auto-generated from collections
