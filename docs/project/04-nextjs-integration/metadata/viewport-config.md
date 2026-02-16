# Viewport Configuration

## Overview

Configuring viewport with static viewport object and dynamic generateViewport function for DeesseJS applications.

## Features

### Viewport Configuration

- Theme color
- Viewport width and scale
- Color scheme (light/dark)
- Responsive settings

### Static vs Dynamic

- Static: Same config for all routes
- Dynamic: Config based on route params or data

## Static Viewport

### Basic Configuration

```typescript
// app/layout.tsx
import type { Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: 'black',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### Responsive Theme Color

```typescript
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'cyan' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};
```

### Full Viewport Config

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: 'black',
  colorScheme: 'dark',
};
```

## Dynamic Viewport

### From External Data (Cached)

```typescript
// app/layout.tsx
export async function generateViewport() {
  'use cache';

  const { themeColor, width, initialScale } = await db.siteConfig.get();

  return {
    themeColor,
    width,
    initialScale,
  };
}
```

### User-Preference Based

```typescript
// app/layout.tsx
import { cookies } from 'next/headers';

export async function generateViewport() {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value || 'dark';

  return {
    themeColor: theme === 'dark' ? '#000000' : '#ffffff',
    colorScheme: theme,
  };
}
```

### Route-Based Viewport

```typescript
// app/blog/[slug]/layout.tsx
export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>
) {
  const { slug } = await params
  const post = await db.posts.findBySlug(slug)

  return {
    themeColor: post.brandColor || 'default',
  }
}
```

## Configuration

### Site-Wide Defaults

```typescript
// deesse.config.ts
export const config = defineConfig({
  viewport: {
    themeColor: {
      light: '#ffffff',
      dark: '#000000',
    },
    width: 'device-width',
    initialScale: 1,
    userScalable: false,
  },
});
```

### Per-Collection Overrides

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      viewport: {
        themeColor: {
          light: '#00ff00',
          dark: '#003300',
        },
      },
    },
  ],
});
```

## Integration with Metadata

### Viewport + Metadata

```typescript
// app/layout.tsx
import type { Viewport, Metadata } from 'next';

export const viewport: Viewport = {
  themeColor: 'black',
};

export const metadata: Metadata = {
  title: 'My App',
  description: 'My description',
};
```

## Best Practices

### Keep It Simple

- Use viewport for theme color
- Let Next.js handle width/scale defaults
- Avoid overriding default viewport unless necessary

### Performance

- Use static viewport when possible
- Cache external data for dynamic viewport
- Avoid runtime viewport when not needed

### Accessibility

- Support light/dark themes
- Test color contrast
- Respect user preferences

## Benefits

- **Theming**: Easy theme color configuration
- **Performance**: Static when possible
- **Flexibility**: Dynamic based on data
- **Type-Safe**: Viewport type
- **Simple**: Easy configuration
