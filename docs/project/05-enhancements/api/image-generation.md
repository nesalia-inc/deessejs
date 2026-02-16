# ImageResponse Enhancements for DeesseJS

## Overview

Recommendations for enhancing DeesseJS's ImageResponse integration for dynamic OG images, icons, and social media assets.

## Current State Analysis

Based on the documentation analysis, DeesseJS already has basic ImageResponse support in:

- `docs\next\metadata-icons-manifest.md` - Basic icon generation
- `docs\next\opengraph-twitter-images.md` - OG and Twitter card generation

## Recommended Enhancements

### 1. Template System for ImageResponse

Create a reusable template system for consistent image generation across collections.

```typescript
// lib/image-templates.ts
import { ImageResponse } from 'next/og'

export type ImageTemplate = 'blog' | 'product' | 'profile' | 'event'

export interface TemplateConfig {
  width: number
  height: number
  fontFamily?: string
  gradient?: {
    from: string
    to: string
    angle?: number
  }
  overlay?: {
    enabled: boolean
    color: string
    opacity: number
  }
}

const templates: Record<ImageTemplate, TemplateConfig> = {
  blog: {
    width: 1200,
    height: 630,
    fontFamily: 'Inter',
    gradient: {
      from: '#667eea',
      to: '#764ba2',
      angle: 135,
    },
  },
  product: {
    width: 1200,
    height: 630,
    fontFamily: 'Inter',
    overlay: {
      enabled: true,
      color: '#000',
      opacity: 0.4,
    },
  },
  profile: {
    width: 800,
    height: 800,
    fontFamily: 'Inter',
  },
  event: {
    width: 1200,
    height: 630,
    fontFamily: 'Inter',
    gradient: {
      from: '#f093fb',
      to: '#f5576c',
      angle: 135,
    },
  },
}

export async function generateImageFromTemplate(
  template: ImageTemplate,
  data: {
    title?: string
    subtitle?: string
    description?: string
    imageUrl?: string
    author?: string
    date?: string
  }
) {
  const config = templates[template]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: config.gradient
            ? `linear-gradient(${config.gradient.angle}deg, ${config.gradient.from}, ${config.gradient.to})`
            : 'white',
          position: 'relative',
        }}
      >
        {data.imageUrl && (
          <img
            src={data.imageUrl}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
        {config.overlay?.enabled && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: config.overlay.color,
              opacity: config.overlay.opacity,
            }}
          />
        )}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px',
          }}
        >
          {data.title && (
            <div
              style={{
                fontSize: config.height === 800 ? 64 : 48,
                fontWeight: 700,
                color: config.gradient ? 'white' : 'black',
                textAlign: 'center',
                maxWidth: '80%',
                lineHeight: 1.2,
              }}
            >
              {data.title}
            </div>
          )}
          {data.subtitle && (
            <div
              style={{
                fontSize: 32,
                marginTop: 20,
                color: config.gradient ? 'rgba(255,255,255,0.9)' : '#666',
              }}
            >
              {data.subtitle}
            </div>
          )}
          {data.description && (
            <div
              style={{
                fontSize: 24,
                marginTop: 16,
                color: config.gradient ? 'rgba(255,255,255,0.8)' : '#888',
                textAlign: 'center',
                maxWidth: '70%',
              }}
            >
              {data.description}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: config.width,
      height: config.height,
    }
  )
}
```

### 2. Auto-Generated Collection Images

Enhance collection config to automatically generate OG images:

```typescript
// deesse.config.ts enhancement
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      seo: {
        openGraphImage: {
          enabled: true,
          template: 'blog',
          dynamicFields: {
            title: 'title',
            subtitle: 'excerpt',
            author: 'author.name',
            imageUrl: 'featuredImage.url',
          },
          fallback: {
            title: 'Blog Post',
            gradient: { from: '#667eea', to: '#764ba2' },
          },
        },
      },
    },
  ],
});
```

### 3. Image Bundle Size Optimization

Implement bundle size monitoring and optimization:

```typescript
// lib/image-optimizer.ts
export async function checkImageBundleSize(
  element: ReactElement,
  fonts: any[],
  images: any[]
): Promise<{ size: number; withinLimit: boolean; suggestions: string[] }> {
  const估算Size =
    JSON.stringify(element).length +
    fonts.reduce((acc, f) => acc + f.data.byteLength, 0) +
    images.reduce((acc, i) => acc + i.data.byteLength, 0);

  const suggestions = [];

  if (估算Size > 500 * 1024) {
    suggestions.push('Consider reducing font file sizes - use TTF instead of WOFF');
    suggestions.push('Optimize images: use WebP format, reduce dimensions');
    suggestions.push('Load some assets at runtime instead of bundling');
    suggestions.push('Simplify JSX structure and reduce text length');
  }

  return {
    size: 估算Size,
    withinLimit: 估算Size <= 500 * 1024,
    suggestions,
  };
}
```

### 4. Font Management System

Centralized font loading with caching:

```typescript
// lib/image-fonts.ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from 'react';

export interface FontConfig {
  name: string;
  path: string;
  weight: number;
  style: 'normal' | 'italic';
}

const fontCache = new Map<string, ArrayBuffer>();

export async function loadFont(config: FontConfig): Promise<{
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: 'normal' | 'italic';
}> {
  if (fontCache.has(config.path)) {
    return {
      name: config.name,
      data: fontCache.get(config.path)!,
      weight: config.weight,
      style: config.style,
    };
  }

  const data = await readFile(join(process.cwd(), config.path));
  fontCache.set(config.path, data);

  return {
    name: config.name,
    data,
    weight: config.weight,
    style: config.style,
  };
}

export async function loadFonts(configs: FontConfig[]) {
  return Promise.all(configs.map(loadFont));
}
```

### 5. Emoji Support Configuration

Add emoji support configuration per collection:

```typescript
// deesse.config.ts enhancement
export const config = defineConfig({
  branding: {
    imageGeneration: {
      emoji: 'twemoji', // 'twemoji' | 'blobmoji' | 'noto' | 'openmoji'
      fallbackEmoji: '🎯',
    },
  },
});
```

### 6. Dynamic Image Variants

Generate multiple image sizes for different platforms:

```typescript
// lib/image-variants.ts
export interface ImageVariant {
  name: string;
  width: number;
  height: number;
  contentType: string;
}

export const imageVariants: Record<string, ImageVariant[]> = {
  opengraph: [
    { name: 'default', width: 1200, height: 630, contentType: 'image/png' },
    { name: 'square', width: 1200, height: 1200, contentType: 'image/png' },
    { name: 'twitter-large', width: 1200, height: 600, contentType: 'image/png' },
  ],
  twitter: [
    { name: 'summary', width: 1200, height: 600, contentType: 'image/png' },
    { name: 'large', width: 1200, height: 630, contentType: 'image/png' },
  ],
  favicon: [
    { name: 'icon-32', width: 32, height: 32, contentType: 'image/png' },
    { name: 'icon-192', width: 192, height: 192, contentType: 'image/png' },
    { name: 'icon-512', width: 512, height: 512, contentType: 'image/png' },
  ],
};

export function generateImageVariants(
  type: string,
  generator: (variant: ImageVariant) => ImageResponse
) {
  return imageVariants[type].map((variant) => ({
    ...variant,
    response: generator(variant),
  }));
}
```

### 7. A/B Testing Images

Support for A/B testing different image designs:

```typescript
// lib/image-ab-testing.ts
export async function generateABTestImage(
  variant: 'A' | 'B',
  data: any
): Promise<ImageResponse> {
  const configs = {
    A: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontSize: 60,
      layout: 'centered',
    },
    B: {
      background: 'white',
      fontSize: 48,
      layout: 'left-aligned',
    },
  }

  const config = configs[variant]

  return new ImageResponse(
    (
      <div
        style={{
          background: config.background,
          display: 'flex',
          alignItems: config.layout === 'centered' ? 'center' : 'flex-start',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div style={{ fontSize: config.fontSize }}>{data.title}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

## Implementation Priority

1. **High Priority**
   - Template system implementation
   - Auto-generated collection images
   - Bundle size monitoring

2. **Medium Priority**
   - Font management system
   - Dynamic image variants
   - Emoji support configuration

3. **Low Priority**
   - A/B testing images
   - Advanced customization options

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  imageGeneration: {
    enabled: true,
    templates: {
      posts: 'blog',
      products: 'product',
      users: 'profile',
      events: 'event',
    },
    fonts: [
      {
        name: 'Inter',
        path: 'assets/fonts/Inter-SemiBold.ttf',
        weight: 600,
        style: 'normal',
      },
    ],
    optimization: {
      checkBundleSize: true,
      maxBundleSize: 450 * 1024, // 450KB to stay under 500KB limit
      warnOnApproach: true,
    },
    variants: {
      opengraph: ['default', 'square'],
      twitter: ['summary', 'large'],
    },
  },
});
```
