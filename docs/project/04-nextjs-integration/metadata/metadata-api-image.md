# generateImageMetadata - Multiple Images

## Overview

Using `generateImageMetadata` to generate multiple versions of images for DeesseJS collections and dynamic metadata.

## Features

### Multiple Image Versions

- Generate different sizes of the same image
- Dynamic metadata based on params
- External data integration
- Auto-generated OG images

## Basic Usage

### Multiple Icon Sizes

```typescript
// app/icon.tsx
import { ImageResponse } from 'next/og'

export function generateImageMetadata() {
  return [
    {
      contentType: 'image/png',
      size: { width: 32, height: 32 },
      id: 'small',
    },
    {
      contentType: 'image/png',
      size: { width: 192, height: 192 },
      id: 'medium',
    },
    {
      contentType: 'image/png',
      size: { width: 512, height: 512 },
      id: 'large',
    },
  ]
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const iconId = await id

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: iconId === 'small' ? 16 : iconId === 'medium' ? 64 : 128,
          background: 'black',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        D
      </div>
    ),
    {
      width: iconId === 'small' ? 32 : iconId === 'medium' ? 192 : 512,
      height: iconId === 'small' ? 32 : iconId === 'medium' ? 192 : 512,
    }
  )
}
```

## Dynamic Images with External Data

### Collection-Based Images

```typescript
// app/posts/[id]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { db } from '@deessejs/db'

export async function generateImageMetadata({
  params,
}: {
  params: { id: string }
}) {
  const post = await db.posts.findById(params.id)

  if (!post) {
    return []
  }

  return [
    {
      id: 'default',
      size: { width: 1200, height: 630 },
      alt: post.title,
      contentType: 'image/png',
    },
    {
      id: 'twitter',
      size: { width: 1200, height: 600 },
      alt: post.title,
      contentType: 'image/png',
    },
  ]
}

export default async function Image({
  id,
}: {
  id: Promise<string>
}) {
  const imageId = await id
  const { params } = await params
  const post = await db.posts.findById(params.id)

  const size = imageId === 'twitter'
    ? { width: 1200, height: 600 }
    : { width: 1200, height: 630 }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: imageId === 'twitter' ? 48 : 64,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {post.title}
      </div>
    ),
    size
  )
}
```

### Multi-Language Images

```typescript
// app/[locale]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export async function generateImageMetadata({
  params,
}: {
  params: { locale: string }
}) {
  const locales = ['en', 'fr', 'de']

  return locales.map((locale) => ({
    id: locale,
    size: { width: 1200, height: 630 },
    alt: `Page in ${locale}`,
    contentType: 'image/png',
  }))
}

export default async function Image({
  params,
  id,
}: {
  params: Promise<{ locale: string }>
  id: Promise<string>
}) {
  const locale = await params
  const imageId = await id

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {locale.toUpperCase()}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

## Configuration

### Auto-Generated Image Metadata

```typescript
// deesse.config.ts
export const config = defineConfig({
  seo: {
    images: {
      enabled: true,
      generateMultiple: true,
      sizes: [
        { name: 'default', width: 1200, height: 630 },
        { name: 'twitter', width: 1200, height: 600 },
        { name: 'square', width: 1200, height: 1200 },
      ],
    },
  },
});
```

### Collection Image Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      seo: {
        openGraphImage: {
          enabled: true,
          multipleSizes: true,
          sizes: [
            { width: 1200, height: 630 },
            { width: 800, height: 418 },
            { width: 400, height: 209 },
          ],
        },
      },
    },
  ],
});
```

## Advanced Patterns

### Dynamic Image Selection

```typescript
export function generateImageMetadata({ params }: { params: { id: string } }) {
  const post = await fetchPost(params.id);

  return [
    {
      id: 'default',
      size: { width: 1200, height: 630 },
      alt: post.title,
    },
    ...(post.hasGallery && {
      id: 'gallery',
      size: { width: 1200, height: 600 },
      alt: `${post.title} - Gallery`,
    }),
  ];
}
```

### Conditional Metadata

```typescript
export function generateImageMetadata({ params }: { params: { id: string } }) {
  const post = await fetchPost(params.id);

  const images = [
    {
      id: 'default',
      size: { width: 1200, height: 630 },
      alt: post.title,
    },
  ];

  if (post.featuredImage) {
    images.push({
      id: 'with-image',
      size: { width: 1200, height: 630 },
      alt: `${post.title} - Featured Image`,
    });
  }

  return images;
}
```

## Best Practices

### Always Provide Alt Text

- Accessibility requirement
- SEO benefit
- Describe image content

### Use Appropriate Sizes

- OG: 1200x630 (default), 1200x600 (Twitter)
- Icons: 32x32, 192x192, 512x512
- Square: 1:1 aspect ratio

### Generate Images Efficiently

- Cache external data fetches
- Use shared components
- Optimize ImageResponse calls

## Benefits

- **Multiple Formats**: Different sizes for different platforms
- **Dynamic**: Based on collection data
- **SEO**: Better social sharing
- **Flexible**: Generate any image variant
- **Type-Safe**: Typed metadata
