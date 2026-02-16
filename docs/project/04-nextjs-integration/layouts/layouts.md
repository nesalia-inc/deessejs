# Advanced Layouts

## Overview

Advanced Next.js layout patterns with DeesseJS integration, including typed layouts, params as promises, and nested layouts.

## Features

### LayoutProps Typing
- Auto-generated `LayoutProps<'/route'>` helper
- Strongly typed params inferred from directory structure
- Typed named slots for parallel routes
- Global helper available after type generation

### Params as Promises
- params prop is now a promise (Next.js 15)
- Async/await or React.use() to access values
- Backward compatibility with synchronous access (deprecated)

### Nested Layouts
- Deeply nested layout hierarchies
- Shared UI across route segments
- Collection-based layout generation
- Multiple root layouts support

## Layout Patterns

### Root Layout
```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
```

### Collection Layout
```typescript
// app/blog/layout.tsx
export default async function BlogLayout({
  children,
  params,
}: LayoutProps<'/blog'>) {
  const params_data = await params

  return (
    <div className="blog-layout">
      <BlogHeader />
      <main>{children}</main>
      <BlogFooter />
    </div>
  )
}
```

### Dynamic Layout with Params
```typescript
// app/[locale]/layout.tsx
export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  )
}
```

### Parallel Route Slots Layout
```typescript
// app/@admin/layout.tsx
export default function AdminLayout(props: LayoutProps<'/@admin'>) {
  return (
    <div className="admin-layout">
      <AdminNav />
      <div className="flex">
        <main>{props.children}</main>
        {props.analytics && (
          <aside>{props.analytics}</aside>
        )}
      </div>
    </div>
  )
}
```

## Multiple Root Layouts

### Route Group Pattern
```
app/
  (shop)/
    layout.tsx              # Shop root layout
    products/
      page.tsx
  (marketing)/
    layout.tsx              # Marketing root layout
    about/
      page.tsx
```

### Dedicated Root Layouts
```
app/
  dashboard/
    layout.tsx              # Dashboard root layout
    page.tsx
  blog/
    layout.tsx              # Blog root layout
    page.tsx
```

## Layout Caching

### Automatic Layout Caching
- Layouts cached during navigation
- No unnecessary server requests
- Reusable across routes

### Data Fetching in Layouts
```typescript
// Deduped with React.cache or fetch
export async function getUser(id: string) {
  const res = await fetch(`https://.../users/${id}`)
  return res.json()
}

// app/dashboard/layout.tsx
export default async function DashboardLayout({
  children,
}: LayoutProps<'/dashboard'>) {
  const user = await getUser('1')

  return (
    <>
      <nav>
        <UserName name={user.name} />
      </nav>
      {children}
    </>
  )
}

// app/dashboard/page.tsx
export default async function Page() {
  const user = await getUser('1') // Deduped!

  return <h1>Welcome {user.name}</h1>
}
```

## Active Nav Links

### useSelectedLayoutSegment
```typescript
// app/ui/nav-link.tsx
'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'

export function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  const segment = useSelectedLayoutSegment()
  const isActive = segment === href.replace('/', '')

  return (
    <Link
      href={href}
      className={isActive ? 'font-bold' : 'font-normal'}
    >
      {children}
    </Link>
  )
}
```

## Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  layouts: {
    defaultLayout: 'admin',
    collections: {
      posts: {
        layout: 'blog',
        nested: true,
      }
    },
    parallelRoutes: {
      admin: ['@analytics', '@settings'],
    }
  }
})
```

## Params Handling

### Server Component (Async)
```typescript
export default async function Layout({
  params,
}: LayoutProps<'/dashboard/[team]'>) {
  const { team } = await params
  return <div>Team: {team}</div>
}
```

### Client Component (use())
```typescript
'use client'

import { use } from 'react'

export default function Layout({
  params,
}: {
  params: Promise<{ team: string }>
}) {
  const { team } = use(params)
  return <div>Team: {team}</div>
}
```

## Layout Exports

### Metadata in Layouts
```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <section>{children}</section>
}
```

## Benefits

- **Type Safety**: LayoutProps auto-generated from directory structure
- **Performance**: Layout caching reduces server requests
- **Flexibility**: Multiple root layouts for different sections
- **Params**: Promise-based params for better streaming
- **Nested Support**: Deep layout hierarchies supported
