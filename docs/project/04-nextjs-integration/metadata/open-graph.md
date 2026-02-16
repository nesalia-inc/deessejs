# Open Graph & Twitter Images

## Overview

Auto-generated Open Graph and Twitter images for DeesseJS collections using ImageResponse API.

## Features

### Auto-Generated OG Images

- opengraph-image.tsx per route
- twitter-image.tsx per route
- Collection-based OG images
- Dynamic images with data

### Image Generation

- ImageResponse API
- Custom fonts
- Local images
- Dynamic data from collections

## Open Graph Images

### Basic OG Image

```typescript
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'DeesseJS App'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        DeesseJS
      </div>
    ),
    size
  )
}
```

### Collection OG Image

```typescript
// app/posts/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Blog Posts'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        Blog
      </div>
    ),
    size
  )
}
```

### Dynamic OG Image with Data

```typescript
// app/posts/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { db } from '@deessejs/db'

export const alt = 'Blog Post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await db.posts.findBySlug(slug)

  if (!post) {
    return new ImageResponse(
      <div style={{ fontSize: 80, background: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Post Not Found
      </div>,
      size
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700 }}>
          {post.title}
        </div>
        <div style={{ fontSize: 32, marginTop: 20 }}>
          {post.author?.name}
        </div>
      </div>
    ),
    size
  )
}
```

## Twitter Images

### Twitter Card Image

```typescript
// app/twitter-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'DeesseJS App'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        @deessejs
      </div>
    ),
    size
  )
}
```

### Collection Twitter Image

```typescript
// app/posts/[slug]/twitter-image.tsx
import { ImageResponse } from 'next/og'
import { db } from '@deessejs/db'

export const alt = 'Blog Post'
export const size = { width: 1200, height: 630 }

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await db.posts.findBySlug(slug)

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: '#000',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700 }}>
          {post.title}
        </div>
        <div style={{ fontSize: 32, marginTop: 30, color: '#888' }}>
          by {post.author?.name}
        </div>
      </div>
    ),
    size
  )
}
```

## Custom Fonts

### Load Custom Font

```typescript
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const size = { width: 1200, height: 630 }

export default async function Image() {
  const fontData = await readFile(
    join(process.cwd(), 'assets/fonts/Inter-Bold.ttf')
  )

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter',
        }}
      >
        DeesseJS
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
}
```

## Local Images

### Use Local Logo

```typescript
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), 'public/logo.png'),
    'base64'
  )
  const logoSrc = `data:image/png;base64,${logoData}`

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
        }}
      >
        <img src={logoSrc} width="200" height="200" />
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

## Configuration

### OG Image Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  seo: {
    openGraph: {
      enabled: true,
      images: {
        enabled: true,
        generator: 'image-response',
        defaults: {
          size: { width: 1200, height: 630 },
          background: 'white',
          font: 'Inter',
        },
      },
    },
    twitter: {
      enabled: true,
      card: 'summary_large_image',
      images: {
        enabled: true,
        generator: 'image-response',
      },
    },
  },
});
```

### Collection OG Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      seo: {
        openGraphImage: {
          enabled: true,
          template: 'post-title', // Use post title
          background: 'gradient',
          gradient: {
            from: '#667eea',
            to: '#764ba2',
            angle: 135,
          },
          includeAuthor: true,
          includeDate: false,
        },
        twitterImage: {
          enabled: true,
          template: 'minimal',
          background: 'black',
          textColor: 'white',
        },
      },
    },
  ],
});
```

## Image Templates

### Title Template

```typescript
// Auto-generated from template
export default async function Image({ params }) {
  const { slug } = await params
  const post = await db.posts.findBySlug(slug)

  return new ImageResponse(
    (
      <div style={containerStyle}>
        <Title>{post.title}</Title>
        <Meta>{post.excerpt}</Meta>
      </div>
    ),
    size
  )
}
```

### Featured Image Template

```typescript
export default async function Image({ params }) {
  const { slug } = await params
  const post = await db.posts.findBySlug(slug)

  return new ImageResponse(
    (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <img src={post.featuredImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 60, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
          <Title>{post.title}</Title>
        </div>
      </div>
    ),
    size
  )
}
```

## Multiple Images

### generateImageMetadata

```typescript
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'
import { db } from '@deessejs/db'

export async function generateImageMetadata() {
  const posts = await db.posts.findMany({ take: 5 })

  return posts.map((post) => ({
    id: post.id,
    alt: post.title,
  }))
}

export default async function Image({
  id,
}: {
  id: Promise<string>
}) {
  const postId = await id
  const post = await db.posts.findById(postId)

  return new ImageResponse(
    <div>{post.title}</div>,
    { width: 1200, height: 630 }
  )
}
```

## Benefits

- **Social Sharing**: Beautiful previews on social media
- **Automation**: Auto-generated from collections
- **Customization**: Per-collection templates
- **Dynamic**: Real-time data in images
- **Fonts**: Custom typography
- **Performance**: Static generation at build time
