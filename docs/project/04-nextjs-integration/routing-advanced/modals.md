# Modals Implementation

## Overview

Complete modal implementation using parallel routes and intercepting routes for shareable, context-preserving modals.

## Features

### Shareable Modals

- URL-based modal state
- Deep linking to modals
- Share modal URLs
- Modal content accessible on refresh

### Context Preservation

- Background content stays on refresh
- Independent navigation states
- Modal closes on back navigation
- Reopens on forward navigation

### Auto-Generated Modal Infrastructure

- Modal slot (@modal)
- Intercept routes
- default.js for slot reset
- Modal layouts and components

## Implementation Patterns

### Login Modal

**1. Main Login Page**

```typescript
// app/login/page.tsx
import { Login } from '@/components/login'

export default function LoginPage() {
  return <Login />
}
```

**2. Modal Slot with Intercept**

```typescript
// app/@auth/(.)login/page.tsx
import { Modal } from '@/components/ui/modal'
import { Login } from '@/components/login'

export default function LoginModal() {
  return (
    <Modal>
      <Login />
    </Modal>
  )
}
```

**3. Modal Slot Default**

```typescript
// app/@auth/default.tsx
export default function AuthDefault() {
  return null;
}
```

**4. Root Layout with Modal Slot**

```typescript
// app/layout.tsx
export default function RootLayout(props: LayoutProps<'/'>) {
  return (
    <html>
      <body>
        {props.children}
        {props.auth}
      </body>
    </html>
  )
}
```

**5. Open Modal from Link**

```typescript
// Any component
import Link from 'next/link'

export function Navigation() {
  return (
    <nav>
      <Link href="/login">Open Login Modal</Link>
    </nav>
  )
}
```

**6. Close Modal with Back**

```typescript
// components/ui/modal.tsx
'use client'

import { useRouter } from 'next/navigation'

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <button
            onClick={() => router.back()}
            className="absolute top-4 right-4"
          >
            ×
          </button>
          {children}
        </div>
      </div>
    </div>
  )
}
```

**7. Close Modal with Link**

```typescript
// components/ui/modal.tsx
import Link from 'next/link'

export function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50">
      <Link
        href="/"
        className="absolute inset-0 bg-black/50"
        scroll={false}
      />
      <div className="relative">
        {children}
      </div>
    </div>
  )
}
```

**8. Reset Modal Slot**

```typescript
// app/@auth/page.tsx
export default function AuthPage() {
  return null;
}

// OR catch-all
// app/@auth/[...catchAll]/page.tsx
export default function CatchAll() {
  return null;
}
```

## Collection Modals

### Auto-Generated Preview Modal

```typescript
// app/@modal/(.)posts/[slug]/page.tsx
import { Modal } from '@/components/ui/modal'
import { PostPreview } from '@/components/posts'

export default async function PostPreviewModal(
  props: PageProps<'/@modal/(.)posts/[slug]'>
) {
  const { slug } = await props.params

  const post = await db.posts.findBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <Modal>
      <PostPreview post={post} />
    </Modal>
  )
}
```

### Auto-Generated Edit Modal

```typescript
// app/@modal/(.)posts/[id]/edit/page.tsx
import { Modal } from '@/components/ui/modal'
import { PostEditForm } from '@/components/posts'

export default async function PostEditModal(
  props: PageProps<'/@modal/(.)posts/[id]/edit'>
) {
  const { id } = await props.params

  const post = await db.posts.findById(id)

  if (!post) {
    notFound()
  }

  return (
    <Modal>
      <PostEditForm post={post} />
    </Modal>
  )
}
```

### Delete Confirmation Modal

```typescript
// app/@modal/(.)posts/[id]/delete/page.tsx
import { Modal } from '@/components/ui/modal'
import { PostDeleteConfirmation } from '@/components/posts'

export default async function PostDeleteModal(
  props: PageProps<'/@modal/(.)posts/[id]/delete'>
) {
  const { id } = await props.params

  const post = await db.posts.findById(id)

  return (
    <Modal>
      <PostDeleteConfirmation post={post} />
    </Modal>
  )
}
```

## Configuration

### Collection Modal Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      ui: {
        modals: {
          preview: {
            enabled: true,
            route: '/@modal/(.)posts/[slug]',
            layout: 'Modal',
            size: 'large',
          },
          edit: {
            enabled: true,
            route: '/@modal/(.)posts/[id]/edit',
            layout: 'Modal',
            size: 'medium',
          },
          delete: {
            enabled: true,
            route: '/@modal/(.)posts/[id]/delete',
            layout: 'Modal',
            size: 'small',
          },
        },
      },
    },
  ],
});
```

### Modal Slot Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  modals: {
    slot: '@modal',
    intercepts: {
      login: '/(.)login',
      posts: {
        preview: '/(.)posts/[slug]',
        edit: '/(.)posts/[id]/edit',
        delete: '/(.)posts/[id]/delete',
      },
    },
  },
});
```

## Modal Variants

### Size Variants

```typescript
// components/ui/modal.tsx
export function Modal({
  children,
  size = 'medium',
}: {
  children: React.ReactNode
  size?: 'small' | 'medium' | 'large' | 'full'
}) {
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    full: 'max-w-6xl',
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className={`bg-white rounded-lg shadow-xl w-full p-6 ${sizeClasses[size]}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
```

### Side Modal

```typescript
// components/ui/side-modal.tsx
export function SideModal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl">
        {children}
      </div>
    </div>
  )
}
```

### Bottom Sheet (Mobile)

```typescript
// components/ui/bottom-sheet.tsx
export function BottomSheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="bg-white rounded-t-xl shadow-xl p-4 max-h-[80vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
```

## Best Practices

### Modal vs Page

- Use modals for quick actions (preview, edit, delete)
- Use dedicated pages for complex workflows
- Always provide a page version for SEO

### Back Button Behavior

- Modal closes on back navigation
- Not previous page navigation
- Use router.back() to close

### URL Structure

```
/modal/(.)posts/[slug]     → Intercepted modal
/posts/[slug]              → Dedicated page
```

### Accessibility

- Focus trap in modal
- Escape key closes modal
- Click outside closes modal
- ARIA attributes

## Benefits

- **Shareable**: Modal URLs are shareable
- **Context**: Background preserved on refresh
- **SEO**: Dedicated pages exist
- **UX**: Smooth modal interactions
- **Accessible**: Keyboard and screen reader support
- **Flexible**: Multiple modal types supported
