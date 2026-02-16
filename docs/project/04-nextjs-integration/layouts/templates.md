# Templates & State Reset

## Overview

Using template.js to reset Client Component state on navigation and resynchronize effects.

## Features

### State Reset on Navigation

- Templates reset Client Component state
- Unique key per route segment
- Remounts on segment change
- Effects re-synchronize

### Difference from Layouts

- Layouts maintain state across navigation
- Templates reset state on navigation
- Templates receive unique key
- Layouts don't remount, templates do

### Suspense Behavior

- Layouts: Suspense fallback only on first load
- Templates: Suspense fallback on every navigation
- Better UX for data-heavy pages

## Template vs Layout

### Layout (Persists State)

```typescript
// app/blog/layout.tsx
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <h1>Blog</h1>
      {children}
      {/* State in children persists */}
    </div>
  )
}
```

### Template (Resets State)

```typescript
// app/blog/template.tsx
export default function BlogTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <h1>Blog</h1>
      {children}
      {/* State in children resets on navigation */}
    </div>
  )
}
```

## Use Cases

### Reset Form State

```typescript
// app/contact/template.tsx
export default function ContactTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="contact-page">
      <ContactHeader />
      {children}
      {/* Form state resets when navigating to /contact */}
    </div>
  )
}
```

### Resynchronize Effects

```typescript
// app/analytics/template.tsx
'use client'

import { useEffect } from 'react'

export default function AnalyticsTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // This effect runs every time we navigate to a new analytics page
    analytics.pageview(window.location.pathname)
  }, [])

  return (
    <div>
      {children}
    </div>
  )
}
```

### Reset Scroll Position

```typescript
// app/template.tsx
'use client'

import { useEffect } from 'react'

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Scroll to top on every navigation
    window.scrollTo(0, 0)
  }, [])

  return <>{children}</>
```

## Template Nesting

### Root + Collection Template

```
app/
  template.tsx              # Root template
  blog/
    template.tsx            # Blog template
    [slug]/
      page.tsx
```

### Multiple Templates

```typescript
// Root template
// app/template.tsx
export default function RootTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="root">
      <GlobalHeader />
      {children}
    </div>
  )
}
```

```typescript
// Blog template
// app/blog/template.tsx
export default function BlogTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="blog">
      <BlogNav />
      {children}
      <BlogFooter />
    </div>
  )
}
```

## Template Behavior

### Mounting Behavior

Templates remount when:

- Their segment level changes
- Dynamic params change
- Query params don't trigger remount

### Navigation Examples

```
Starting at /:
<RootTemplate key="/">
  <Page />
</RootTemplate>

Navigate to /about:
<RootTemplate key="/about">  ← Remounts
  <AboutPage />
</RootTemplate>

Navigate to /blog/first-post:
<RootTemplate key="/blog">
  <BlogTemplate key="/blog/first-post">  ← Both remount
    <BlogPost slug="first-post" />
  </BlogTemplate>
</RootTemplate>

Navigate to /blog/second-post:
<RootTemplate key="/blog">  ← Doesn't remount
  <BlogTemplate key="/blog/second-post">  ← Remounts
    <BlogPost slug="second-post" />
  </BlogTemplate>
</RootTemplate>
```

## Collection Templates

### Per-Collection Template

```typescript
// app/(posts)/template.tsx
export default function PostsTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="posts-layout">
      <PostsHeader />
      <main>{children}</main>
      <PostsFooter />
    </div>
  )
}
```

### Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      template: true, // Generate template.tsx
      resetStateOnNavigation: true,
    },
  ],
});
```

### Auto-Generated Template

```typescript
// app/posts/template.tsx - Auto-generated
export default function PostsTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="posts-template">
      <PostsNav />
      <Suspense fallback={<PostsLoading />}>
        {children}
      </Suspense>
    </div>
  )
}
```

## Practical Examples

### Search Page Reset

```typescript
// app/search/template.tsx
'use client'

import { useEffect } from 'react'

export default function SearchTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Reset search state
    return () => {
      // Cleanup search state
    }
  }, [])

  return (
    <div className="search-page">
      {children}
    </div>
  )
}
```

### Wizard/Multi-Step Form

```typescript
// app/wizard/template.tsx
'use client'

export default function WizardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  // State resets when navigating to /wizard
  // Each wizard step gets fresh state
  return (
    <div className="wizard">
      <WizardProgress />
      {children}
    </div>
  )
}
```

### Dashboard Reset

```typescript
// app/dashboard/template.tsx
'use client'

import { useEffect } from 'react'

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Refresh dashboard data on navigation
    refreshDashboard()
  }, [])

  return (
    <div className="dashboard">
      {children}
    </div>
  )
}
```

## Template vs Layout Decision Tree

### Use Template When:

- Need to reset form inputs
- Effects need to re-run on navigation
- Want fresh data on each visit
- Suspense should show on every navigation

### Use Layout When:

- Need to preserve state
- Expensive computations
- Persistent navigation
- Shared UI across routes

## Configuration

### Global Template Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  templates: {
    root: true,
    collections: true,
    resetStateOnNavigation: true,
    showSuspenseOnNavigation: true,
  },
});
```

### Per-Collection Template

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      template: {
        enabled: true,
        resetState: true,
        suspense: true,
      },
    },
  ],
});
```

## Benefits

- **Fresh State**: Reset state on navigation
- **Effects**: Re-synchronize side effects
- **UX**: Show loading states appropriately
- **Data**: Fetch fresh data on navigation
- **Forms**: Reset form inputs
- **Scroll**: Control scroll behavior
