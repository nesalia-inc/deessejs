# generateMetadata - Dynamic Metadata

## Overview

Using `generateMetadata` function for dynamic metadata generation from DeesseJS collections and external data.

## Features

### Dynamic Metadata

- Based on route params
- External data integration
- Parent metadata inheritance
- SEO optimization per collection

### Metadata Types

- Static metadata object
- Dynamic generateMetadata function
- Type-safe with Metadata type

## Basic Usage

### Static Metadata

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DeesseJS',
  description: 'WordPress for developers',
};
```

### Dynamic Metadata

```typescript
// app/posts/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.posts.findBySlug(slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}
```

## Collection-Based Metadata

### Auto-Generated Metadata

```typescript
// app/posts/[slug]/page.tsx - Auto-generated
export async function generateMetadata(
  { params }: PageProps<'/posts/[slug]'>,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  const [post, site] = await Promise.all([db.posts.findBySlug(slug), fetchSiteSettings()]);

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${post.title} | ${site.name}`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage, ...previousImages],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}
```

### Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  seo: {
    metadata: {
      enabled: true,
      collections: {
        posts: {
          titleTemplate: '%s | Blog',
          description: 'auto', // Use excerpt
          ogImage: 'coverImage',
          twitterCard: 'summary_large_image',
        },
        products: {
          titleTemplate: '%s | Shop',
          description: 'auto', // Use description
          ogImage: 'mainImage',
          twitterCard: 'summary_large_image',
        },
      },
    },
  },
});
```

## Title Templates

### Root Layout Template

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | DeesseJS',
    default: 'DeesseJS',
  },
};
```

### Page Title

```typescript
// app/about/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  // Output: <title>About | DeesseJS</title>
};
```

### Absolute Title

```typescript
// page.tsx
export const metadata: Metadata = {
  title: {
    absolute: 'Custom Title',
  },
  // Ignores parent template
};
```

## Open Graph Metadata

### Article Type

```typescript
export async function generateMetadata({ params }: PageProps<'/posts/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.posts.findBySlug(slug);

  return {
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      siteName: 'DeesseJS Blog',
      url: `https://example.com/blog/${slug}`,
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
  };
}
```

### Website Type

```typescript
export const metadata: Metadata = {
  openGraph: {
    type: 'website',
    siteName: 'DeesseJS',
    title: 'DeesseJS - WordPress for Developers',
    description: 'The next-generation CMS',
    url: 'https://deessejs.dev',
    images: [
      {
        url: 'https://deessejs.dev/og.png',
        width: 1200,
        height: 630,
        alt: 'DeesseJS',
      },
    ],
  },
};
```

## Twitter Cards

### Summary Large Image

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const post = await getFeaturedPost();

  return {
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      siteId: '1234567890',
      creator: '@deessejs',
      images: [post.coverImage],
    },
  };
}
```

### App Card

```typescript
export const metadata: Metadata = {
  twitter: {
    card: 'app',
    title: 'DeesseJS',
    description: 'WordPress for developers',
    siteId: '1234567890',
    creator: '@deessejs',
    images: ['/og-image.png'],
  },
};
```

## Advanced Patterns

### MetadataBase URL

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'fr-FR': '/fr-FR',
    },
  },
  openGraph: {
    images: '/og-image.png', // Relative path
  },
};
```

### Parent Metadata Inheritance

```typescript
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const previousImages = (await parent).openGraph?.images || [];

  return {
    openGraph: {
      images: ['/new-image.png', ...previousImages],
    },
  };
}
```

### Conditional Metadata

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.posts.findBySlug(slug);

  const metadata: Metadata = {
    title: post.title,
    description: post.excerpt,
  };

  if (post.coverImage) {
    metadata.openGraph = {
      images: [post.coverImage],
    };
  }

  if (post.author) {
    metadata.authors = [{ name: post.author.name }];
  }

  return metadata;
}
```

## Collection Configuration

### Auto-Generated Metadata

```typescript
// deesse.config.ts
export const config = defineConfig({
  seo: {
    metadata: {
      enabled: true,
      collections: {
        posts: {
          title: 'title',
          description: 'excerpt',
          image: 'coverImage',
          type: 'article',
          fields: ['publishedAt', 'author'],
        },
        products: {
          title: 'name',
          description: 'description',
          image: 'mainImage',
          type: 'website',
          price: 'price',
        },
      },
    },
  },
});
```

### Site-Wide Defaults

```typescript
// deesse.config.ts
export const config = defineConfig({
  seo: {
    site: {
      name: 'My App',
      url: 'https://example.com',
    },
    metadata: {
      titleTemplate: '%s | My App',
      descriptionTemplate: 'auto', // Generate from content
    },
  },
});
```

## Best Practices

### Use generateMetadata When

- Depends on route params
- Fetches external data
- Dynamic based on content
- Needs parent metadata

### Use Static Metadata When

- Content is static
- No external dependencies
- Same across all pages

### Always Provide

- Title and description
- Open Graph images
- Twitter cards
- Canonical URLs

## Benefits

- **Dynamic**: Per-collection metadata
- **SEO**: Optimized for search engines
- **Social**: Better sharing previews
- **Type-Safe**: Full TypeScript support
- **Flexible**: Override parent metadata
- **Automatic**: Auto-generated from collections
