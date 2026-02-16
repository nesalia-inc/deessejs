# MDX Support

## Overview

Native MDX support for content collections with custom components and styling.

## Features

### Auto-Generated mdx-components.tsx
- Required file for @next/mdx with App Router
- Custom component mapping
- Style customization
- Global component availability

### Collection-Based MDX
- MDX fields in collection schema
- Auto-registered MDX components
- Frontmatter support
- Syntax highlighting

### Component Customization
- Custom components for MDX elements
- Reusable UI components in MDX
- Shadcn/UI component integration
- Tailwind styling support

## MDX Configuration

### Basic Setup
```typescript
// mdx-components.tsx
import type { MDXComponents } from 'mdx/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const components: MDXComponents = {
  Card,
  Button,
  // Custom mapping for standard MDX elements
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-bold mt-6 mb-3">{children}</h2>
  ),
  p: ({ children }) => (
    <p className="my-4 leading-7">{children}</p>
  ),
  code: ({ children }) => (
    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
      {children}
    </pre>
  ),
}

export function useMDXComponents(): MDXComponents {
  return components
}
```

## Collection Integration

### MDX Field in Collection
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    fields: [
      {
        name: 'content',
        type: 'mdx',
        required: true,
      }
    ]
  }]
})
```

### Frontmatter Support
```markdown
---
title: "My Post"
slug: "my-post"
publishedAt: "2025-01-15"
tags: ["nextjs", "mdx"]
---

# Content here

This is MDX content with **markdown** and {<JSX />}
```

## Custom Components

### Shadcn/UI Integration
```typescript
// mdx-components.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const components: MDXComponents = {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  // Custom callout component
  Callout: ({ children, type = 'info' }) => (
    <Card className={`my-4 ${
      type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
      type === 'error' ? 'bg-red-50 border-red-200' :
      'bg-blue-50 border-blue-200'
    }`}>
      <CardContent className="pt-6">
        {children}
      </CardContent>
    </Card>
  ),
}
```

### Usage in MDX
```markdown
<Callout type="warning">
  This is a warning callout with **custom styling**.
</Callout>

<Card>
  <CardHeader>
    <CardTitle>Featured Content</CardTitle>
  </CardHeader>
  <CardContent>
    This is a card component from Shadcn/UI.
  </CardContent>
</Card>

<Button variant="default">Click me</Button>
```

## Syntax Highlighting

### Code Block Styling
```typescript
// mdx-components.tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

const components: MDXComponents = {
  pre: ({ children, ...props }) => {
    // @ts-ignore - accessing code element
    const className = children?.props?.className || ''
    const matches = className.match(/language-(?<lang>.+)/)
    const language = matches?.groups?.lang || ''

    if (language) {
      return (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          {...props}
        >
          {/* @ts-ignore */}
          {String(children?.props?.children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      )
    }

    return <pre {...props}>{children}</pre>
  }
}
```

## Configuration

### MDX Options
```typescript
// deesse.config.ts
export const config = defineConfig({
  mdx: {
    components: './mdx-components',
    remarkPlugins: [],
    rehypePlugins: [],
    options: {
      format: 'detect',
    }
  }
})
```

## Content Examples

### Blog Post with MDX
```markdown
---
title: "Getting Started with DeesseJS"
description: "Learn how to build a CMS with DeesseJS"
publishedAt: "2025-01-15"
---

import { Alert } from '@/components/ui/alert'

# Getting Started

<Alert>
  DeesseJS is in active development!
</Alert>

## Features

- Auto-generated types
- Built-in auth
- Modern DX

```typescript
const config = defineConfig({
  collections: [/* ... */]
})
```

<Card>
  <CardHeader>
    <CardTitle>Pro Tip</CardTitle>
  </CardHeader>
  <CardContent>
    Start with the config file!
  </CardContent>
</Card>
```

## Benefits

- **Rich Content**: MDX enables JSX in markdown
- **Custom Components**: Use Shadcn/UI components in content
- **Type Safety**: Components are typed
- **Styling**: Tailwind classes supported
- **Syntax Highlighting**: Code blocks highlighted
- **Flexible**: Custom plugins and configuration
