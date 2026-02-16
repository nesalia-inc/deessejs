# Metadata - Icons & Manifest

## Overview

Auto-generated icons, favicons, and web app manifests for DeesseJS collections and application branding.

## Features

### Auto-Generated Icons

- favicon, icon, apple-icon from collections
- Programmatic icon generation with ImageResponse
- Multiple sizes and formats
- Per-collection branding

### Web App Manifest

- Auto-generated manifest.json
- Collection-based app configuration
- PWA support
- Installable web apps

## Icon Generation

### Image File Icons

```
app/
  favicon.ico              # Browser tab icon
  icon.png                 # Generic icon
  apple-icon.png           # iOS home screen
```

### Programmatic Icons

```typescript
// app/icon.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '4px',
        }}
      >
        D
      </div>
    ),
    size
  )
}
```

### Apple Icon

```typescript
// app/apple-icon.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '20px',
        }}
      >
        D
      </div>
    ),
    size
  )
}
```

## Collection-Based Icons

### Per-Collection Icons

```typescript
// app/blog/icon.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#2563eb',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        B
      </div>
    ),
    size
  )
}
```

### Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  branding: {
    icons: {
      enabled: true,
      collections: {
        blog: {
          letter: 'B',
          color: '#2563eb',
          gradient: false,
        },
        shop: {
          letter: 'S',
          color: '#16a34a',
          gradient: true,
        },
      },
    },
  },
});
```

## Web App Manifest

### Static Manifest

```json
// app/manifest.json
{
  "name": "My DeesseJS App",
  "short_name": "DeesseJS",
  "description": "Built with DeesseJS",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon",
      "sizes": "any",
      "type": "image/x-icon"
    }
  ]
}
```

### Generated Manifest

```typescript
// app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'My DeesseJS App',
    short_name: 'DeesseJS',
    description: 'Built with DeesseJS',
    start_url: '/',
    display: 'standalone',
    background_color': '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
```

### Dynamic Manifest from Config

```typescript
// app/manifest.ts
import type { MetadataRoute } from 'next';
import { config } from '@deessejs/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.app.name,
    short_name: config.app.shortName,
    description: config.app.description,
    start_url: '/',
    display: 'standalone',
    background_color: config.app.colors.background,
    theme_color: config.app.colors.theme,
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
```

## Configuration

### Branding Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  app: {
    name: 'My App',
    shortName: 'App',
    description: 'Built with DeesseJS',
    colors: {
      background: '#ffffff',
      theme: '#000000',
      primary: '#2563eb',
    },
  },
  branding: {
    icons: {
      enabled: true,
      favicon: true,
      appleIcon: true,
      generator: 'image-response', // or 'image-files'
    },
    manifest: {
      enabled: true,
      display: 'standalone',
      orientation: 'portrait',
    },
  },
});
```

### Icon Generator Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  branding: {
    iconGenerator: {
      type: 'letter', // 'letter' | 'logo' | 'custom'
      letter: 'D',
      font: 'Inter',
      fontWeight: 700,
      gradient: {
        enabled: true,
        from: '#667eea',
        to: '#764ba2',
        angle: 135,
      },
      shape: 'square', // 'square' | 'rounded' | 'circle'
    },
  },
});
```

## Multiple Icons

### Icon Sizes

```typescript
// app/icon.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }

export default function Icon() {
  return new ImageResponse(
    <div style={{
      fontSize: 24,
      background: 'black',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
    }}>
      A
    </div>,
    size
  )
}
```

### Auto-Generated Sizes

```
/icon              → 32x32
/icon-96           → 96x96
/icon-192          → 192x192
/icon-512          → 512x512
/apple-icon        → 180x180
/favicon.ico       → ICO with multiple sizes
```

## Dynamic Icons with Params

### Collection-Based Icons

```typescript
// app/[locale]/icon.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }

export default async function Icon({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const flags = {
    en: '🇬🇧',
    fr: '🇫🇷',
    de: '🇩🇪',
  }

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
        }}
      >
        {flags[locale as keyof typeof flags] || '🌐'}
      </div>
    ),
    size
  )
}
```

## Benefits

- **Branding**: Consistent app icon across platforms
- **PWA**: Installable web app support
- **SEO**: Better search engine presentation
- **Social**: Improved sharing previews
- **Automation**: Auto-generated from config
- **Collection-Based**: Per-collection branding
