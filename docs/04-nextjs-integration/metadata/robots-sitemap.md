# Robots.txt & Sitemap.xml

## Overview

Auto-generated robots.txt and sitemap.xml for DeesseJS collections with SEO optimization.

## Features

### Auto-Generated Robots.txt
- Collection-based rules
- Role-based access rules
- Sitemap references
- Crawler-specific rules

### Auto-Generated Sitemap
- Collection URLs
- Dynamic routes
- Localization support
- Image and video sitemaps
- Multiple sitemaps

## Robots.txt

### Static Robots
```txt
# app/robots.txt
User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/

Sitemap: https://example.com/sitemap.xml
```

### Generated Robots
```typescript
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/private/'],
    },
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

### Collection-Based Rules
```typescript
// app/robots.ts
import type { MetadataRoute } from 'next'
import { config } from '@deessejs/config'

export default function robots(): MetadataRoute.Robots {
  const disallowed = config.collections
    .filter(c => c.permissions?.read === 'admin')
    .map(c => `/${c.name}/*`)

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', ...disallowed],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/admin/'],
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

### Crawler-Specific Rules
```typescript
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: '/admin/',
        crawlDelay: 1,
      },
      {
        userAgent: ['Applebot', 'Bingbot'],
        allow: '/',
        disallow: ['/private/'],
      },
      {
        userAgent: '*',
        disallow: '/api/',
      },
    ],
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

## Sitemap.xml

### Static Sitemap
```xml
<!-- app/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/blog</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Generated Sitemap
```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://example.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://example.com/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]
}
```

### Collection-Based Sitemap
```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { db } from '@deessejs/db'

export default async function sitemap(): MetadataRoute.Sitemap {
  const posts = await db.posts.findMany({
    where: { status: 'published' },
    select: { slug: true, updatedAt: true },
  })

  const blogUrls = posts.map((post) => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [
    {
      url: 'https://example.com',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    ...blogUrls,
  ]
}
```

### Multi-Collection Sitemap
```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { db } from '@deessejs/db'

export default async function sitemap(): MetadataRoute.Sitemap {
  const [posts, products, pages] = await Promise.all([
    db.posts.findMany({ where: { status: 'published' } }),
    db.products.findMany({ where: { available: true } }),
    db.pages.findMany({ where: { published: true } }),
  ])

  return [
    { url: 'https://example.com', lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    ...posts.map(p => ({
      url: `https://example.com/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map(p => ({
      url: `https://example.com/shop/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...pages.map(p => ({
      url: `https://example.com/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]
}
```

## Localization

### Multi-Locale Sitemap
```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { db } from '@deessejs/db'
import { config } from '@deessejs/config'

export default async function sitemap(): MetadataRoute.Sitemap {
  const locales = config.i18n.locales // ['en', 'fr', 'de']
  const posts = await db.posts.findMany({ where: { status: 'published' } })

  const postUrls = posts.flatMap((post) => {
    return locales.map((locale) => ({
      url: `https://example.com/${locale}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `https://example.com/${l}/blog/${post.slug}`])
        ),
      },
    }))
  })

  return postUrls
}
```

## Image Sitemaps

### Image Sitemap
```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { db } from '@deessejs/db'

export default async function sitemap(): MetadataRoute.Sitemap {
  const posts = await db.posts.findMany({
    where: { status: 'published' },
    include: { featuredImage: true },
  })

  return posts.map((post) => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
    images: post.featuredImage
      ? [`https://example.com${post.featuredImage.url}`]
      : [],
  }))
}
```

## Video Sitemaps

### Video Sitemap
```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { db } from '@deessejs/db'

export default async function sitemap(): MetadataRoute.Sitemap {
  const videos = await db.videos.findMany()

  return videos.map((video) => ({
    url: `https://example.com/videos/${video.slug}`,
    lastModified: video.updatedAt,
    videos: [
      {
        title: video.title,
        thumbnail_loc: video.thumbnailUrl,
        description: video.description,
      },
    ],
  }))
}
```

## Multiple Sitemaps

### Large Site Sitemaps
```typescript
// app/product/sitemap.ts
import type { MetadataRoute } from 'next'

export async function generateSitemaps() {
  const totalCount = await db.products.count()
  const sitemapCount = Math.ceil(totalCount / 50000)

  return Array.from({ length: sitemapCount }, (_, i) => ({
    id: String(i),
  }))
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>
}): Promise<MetadataRoute.Sitemap> {
  const index = Number(await id)
  const start = index * 50000
  const end = start + 50000

  const products = await db.products.findMany({
    skip: start,
    take: 50000,
    select: { id: true, updatedAt: true },
  })

  return products.map((product) => ({
    url: `https://example.com/product/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
}
```

## Configuration

### SEO Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  seo: {
    robots: {
      enabled: true,
      collections: {
        protected: 'disallow',
        public: 'allow',
      }
    },
    sitemap: {
      enabled: true,
      collections: ['posts', 'products', 'pages'],
      changeFrequency: {
        posts: 'weekly',
        products: 'daily',
        pages: 'monthly',
      },
      priority: {
        posts: 0.7,
        products: 0.8,
        pages: 0.5,
      }
    }
  }
})
```

### Collection Sitemap Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    sitemap: {
      enabled: true,
      path: 'blog',
      changeFrequency: 'weekly',
      priority: 0.7,
      includeImages: true,
      imageField: 'featuredImage',
    }
  }]
})
```

## Benefits

- **SEO**: Better search engine crawling
- **Control**: Fine-tuned crawler access
- **Automation**: Auto-generated from collections
- **Localization**: Multi-language support
- **Media**: Image and video sitemaps
- **Scalability**: Multiple sitemaps for large sites
