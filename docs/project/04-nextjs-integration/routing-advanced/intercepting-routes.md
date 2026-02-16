# Intercepting Routes - Advanced Patterns

## Overview

Advanced intercepting route patterns for modals, overlays, and context-preserving navigation in DeesseJS admin.

## Intercepting Route Conventions

- `(.)` - Match segments on the same level
- `(..)` - Match segments one level above
- `(..)(..)` - Match segments two levels above
- `(...)` - Match segments from the root app directory

## Modal Patterns

### Photo/Gallery Modal

```
app/
  feed/
    page.tsx                    # Feed view
  (.)photo/
    @modal/
      (.)feed/
        photo/
          [id]/
            page.tsx            # Photo modal
```

### Blog Post Preview Modal

```
app/
  blog/
    page.tsx                    # Blog list
  (.)blog/
    @modal/
      (.)blog/
        [slug]/
          page.tsx              # Post preview modal
```

### Collection Item Modal

Auto-generated for all collections:

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      ui: {
        intercepts: {
          preview: true, // /@modal/(.)posts/[slug]
          edit: true, // /@modal/(.)posts/[id]/edit
          delete: true, // /@modal/(.)posts/[id]/delete
        },
      },
    },
  ],
});
```

## Context Preservation

### Modal State on Refresh

- URL stays shareable (`/photo/123`)
- Modal opens on direct navigation
- Feed renders underneath on refresh
- Back button closes modal (not previous page)

### Forward/Backward Navigation

- Closing modal on back navigation
- Reopening modal on forward navigation
- Preserving scroll position
- Maintaining component state

## Admin Dashboard Modals

### Quick Edit Modal

```
app/
  @admin/
    posts/
      page.tsx                    # Posts list
  (.)@admin/
    @modal/
      (.)@admin/
        posts/
          [id]/
            edit/
              page.tsx            # Edit modal
```

### Delete Confirmation

```
app/
  @admin/
    users/
      page.tsx
  (.)@admin/
    @modal/
      (.)@admin/
        users/
          [id]/
            delete/
              page.tsx            # Delete confirmation
```

### Login Modal (Top Navbar)

```
app/
  layout.tsx                       # Root layout with navbar
  login/
    page.tsx                       # Dedicated login page
  (.)login/
    @modal/
      (.)/
        login/
          page.tsx                 # Login modal
```

## Shopping Cart Modal

### Side Cart Pattern

```
app/
  layout.tsx
  shop/
    page.tsx
  (.)cart/
    @modal/
      (.)shop/
        cart/
          page.tsx                 # Side cart modal
```

### Cart Management

- Add to cart without leaving current page
- Cart persists across navigation
- Checkout via modal or dedicated page
- Shareable cart URL

## Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  intercepts: {
    collections: {
      posts: {
        preview: {
          route: '/@modal/(.)posts/[slug]',
          layout: 'modal',
          size: 'large',
        },
        edit: {
          route: '/@modal/(.)posts/[id]/edit',
          layout: 'modal',
          size: 'medium',
        },
      },
    },
    custom: [
      {
        name: 'login',
        route: '/(.)login/@modal/(.)/login',
        trigger: '.login-button',
      },
    ],
  },
});
```

## Modal Layouts

### Auto-Generated Modal Layout

```typescript
// app/@modal/layout.tsx
export default function ModalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex items-center justify-center min-h-screen">
        {children}
      </div>
    </div>
  )
}
```

### Modal Size Variants

- `small` - 400px max-width
- `medium` - 600px max-width
- `large` - 800px max-width
- `full` - 90% max-width

## Back Button Behavior

### Custom Back Handler

```typescript
'use client'

import { useRouter } from 'next/navigation'

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleClose = () => {
    router.back() // Closes modal, not previous page
  }

  return (
    <div>
      <button onClick={handleClose}>Close</button>
      {children}
    </div>
  )
}
```

## Benefits

- **Shareable URLs**: Modal content linkable
- **Context Preserved**: Background stays visible on refresh
- **Better UX**: Modal closes on back, not page navigation
- **SEO Friendly**: Dedicated pages exist alongside modals
- **Flexible**: Multiple intercept patterns supported
