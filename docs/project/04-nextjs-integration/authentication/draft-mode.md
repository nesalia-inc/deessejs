# Draft Mode

## Overview

Draft Mode for previewing unpublished content in DeesseJS collections.

## Features

### Draft Mode

- Preview unpublished content
- Toggle between static and dynamic
- Cookie-based session
- Route handler for enable/disable

### Use Cases

- Content preview for editors
- A/B testing
- Personalized content
- Dynamic data in static pages

## Enable Draft Mode

### Draft Route Handler

```typescript
// app/api/draft/route.ts
import { draftMode } from 'next/headers';

export async function GET(request: Request) {
  const draft = await draftMode();
  draft.enable();

  return new Response('Draft mode enabled');
}
```

### Disable Draft Mode

```typescript
// app/api/draft/disable/route.ts
import { draftMode } from 'next/headers';

export async function GET(request: Request) {
  const draft = await draftMode();
  draft.disable();

  return new Response('Draft mode disabled');
}
```

## Check Draft Mode

### In Server Component

```typescript
// app/page.tsx
import { draftMode } from 'next/headers'

export default async function Page() {
  const { isEnabled } = await draftMode()

  return (
    <main>
      <h1>My Blog</h1>
      <p>Draft Mode: {isEnabled ? 'Enabled' : 'Disabled'}</p>
    </main>
  )
}
```

### Conditional Data Fetching

```typescript
// app/posts/[slug]/page.tsx
import { draftMode } from 'next/headers'
import { db } from '@deessejs/db'

export default async function PostPage(props: PageProps<'/posts/[slug]'>) {
  const { isEnabled } = await draftMode()
  const { slug } = await props.params

  // In draft mode, show unpublished posts
  const post = await db.posts.findBySlug(slug, {
    where: isEnabled ? {} : { status: 'published' }
  })

  if (!post) {
    notFound()
  }

  return <PostDetail post={post} />
}
```

## Configuration

### Draft Mode Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  draftMode: {
    enabled: true,
    route: '/api/draft',
    collections: ['posts', 'pages'],
    permissions: {
      enable: 'admin',
      disable: 'admin',
    },
  },
});
```

### Per-Collection Draft

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      draftMode: {
        enabled: true,
        checkPermission: true,
      },
    },
  ],
});
```

## Draft Mode Actions

### Enable Draft Mode Action

```typescript
// app/actions/draft.ts
'use server';

import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function enableDraft() {
  const draft = await draftMode();
  draft.enable();

  redirect('/');
}
```

### Disable Draft Mode Action

```typescript
// app/actions/draft.ts
'use server';

import { draftMode } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function disableDraft() {
  const draft = await draftMode();
  draft.disable();

  revalidatePath('/');
  redirect('/');
}
```

## Collection Preview

### Preview Unpublished Post

```typescript
// app/posts/[slug]/page.tsx
import { draftMode } from 'next/headers'
import { db } from '@deessejs/db'

export default async function PostPage(props: PageProps<'/posts/[slug]'>) {
  const { isEnabled } = await draftMode()
  const { slug } = await props.params

  // Fetch post with draft mode consideration
  const post = await db.posts.findBySlug(slug, {
    draft: isEnabled // Include unpublished in draft mode
  })

  if (!post) {
    notFound()
  }

  return <PostDetail post={post} />
}
```

### Preview Banner

```typescript
// app/components/preview-banner.tsx
'use client'

import { use } from 'react'
import { draftMode } from 'next/headers'

export function PreviewBanner() {
  const { isEnabled } = use(draftMode())

  if (!isEnabled) return null

  return (
    <div className="bg-yellow-400 text-black px-4 py-2">
      <p>Draft Mode - You are seeing unpublished content</p>
    </div>
  )
}
```

## Preview Links

### Generate Preview Link

```typescript
// app/lib/preview.ts
import { draftMode } from 'next/headers';

export async function generatePreviewLink(postId: string) {
  const { isEnabled } = await draftMode();

  if (!isEnabled) {
    // Enable draft mode first
    const draft = await draftMode();
    draft.enable();
  }

  // Return preview URL
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/draft/preview/posts/${postId}`;
}
```

### Preview Route Handler

```typescript
// app/api/draft/preview/posts/[id]/route.ts
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(
  request: Request,
  { params }: RouteContext<'/api/draft/preview/posts/[id]'>
) {
  const draft = await draftMode();
  draft.enable();

  const { id } = await params;
  redirect(`/posts/${id}`);
}
```

## Best Practices

### Security

- Require authentication to enable draft mode
- Check permissions for draft access
- Disable draft mode after session ends

### Performance

- Only use draft mode when needed
- Static generation for published content
- Dynamic rendering in draft mode

### UX

- Show preview banner in draft mode
- Clear indication of unpublished content
- Easy toggle for editors

## Benefits

- **Preview**: See unpublished content
- **Testing**: Test changes before publishing
- **Flexibility**: Toggle between modes
- **Collection Support**: Works with all collections
- **Secure**: Permission-based access
