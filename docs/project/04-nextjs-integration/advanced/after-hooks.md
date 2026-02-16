# After - Post-Response Execution

## Overview

Using Next.js `after()` function for background tasks, logging, and analytics in DeesseJS applications.

## Features

### Background Tasks

- Execute tasks after response is sent
- Non-blocking operations
- Analytics and logging
- Data synchronization
- Webhook processing

### Use Cases

- Logging user actions
- Sending analytics events
- Background data updates
- Email notifications
- Cache warming

## Basic Usage

### Simple After Hook

```typescript
// app/layout.tsx
import { after } from 'next/server'
import { log } from '@/lib/analytics'

export default function Layout({ children }: { children: React.ReactNode }) {
  after(() => {
    log('Page rendered')
  })

  return <>{children}</>
}
```

### After with Data Fetching

```typescript
// app/api/posts/route.ts
import { after } from 'next/server';
import { db } from '@deessejs/db';

export async function POST(request: Request) {
  const body = await request.json();
  const post = await db.posts.create({ data: body });

  // Log analytics after response
  after(async () => {
    await analytics.track('post_created', {
      postId: post.id,
      authorId: post.authorId,
    });
  });

  return Response.json(post);
}
```

## Collection-Based After Hooks

### Auto-Generated Analytics

```typescript
// app/posts/[slug]/page.tsx
import { after } from 'next/server'
import { db } from '@deessejs/db'

export default async function Page(props: PageProps<'/posts/[slug]'>) {
  const { slug } = await props.params
  const post = await db.posts.findBySlug(slug)

  // Track page view after response
  after(async () => {
    await analytics.track('page_view', {
      collection: 'posts',
      slug,
      postId: post.id,
    })
  })

  return <PostDetail post={post} />
}
```

### Update View Count

```typescript
// app/posts/[slug]/page.tsx
import { after } from 'next/server'
import { db } from '@deessejs/db'

export default async function Page(props: PageProps<'/posts/[slug]'>) {
  const { slug } = await props.params
  const post = await db.posts.findBySlug(slug)

  // Increment view count in background
  after(async () => {
    await db.posts.update({
      where: { id: post.id },
      data: { views: { increment: 1 } }
    })
  })

  return <PostDetail post={post} />
}
```

## Configuration

### Auto-Generated After Hooks

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      afterHooks: {
        enabled: true,
        analytics: true,
        viewTracking: true,
      },
    },
  ],
});
```

### Custom After Hooks

```typescript
// deesse.config.ts
export const config = defineConfig({
  after: {
    hooks: {
      onPageView: async ({ collection, id, params }) => {
        await analytics.track('page_view', { collection, id });
      },
      onMutation: async ({ collection, action, data }) => {
        await logMutation(collection, action, data);
      },
    },
  },
});
```

## Advanced Patterns

### Nested After Hooks

```typescript
import { after } from 'next/server'

export default async function Page() {
  after(async () => {
    await analytics.track('page_view')

    after(async () => {
      await updateRecommendedContent()
    })
  })

  return <div>Page</div>
}
```

### Error Handling in After

```typescript
import { after } from 'next/server';

export async function POST(request: Request) {
  // Perform main operation
  const result = await createPost();

  // After runs even if main operation fails
  after(async () => {
    try {
      await sendNotification(result);
    } catch (error) {
      console.error('Notification failed:', error);
    }
  });

  return Response.json(result);
}
```

### Request APIs in After

```typescript
// app/api/route.ts
import { after } from 'next/server';
import { cookies, headers } from 'next/headers';

export async function POST(request: Request) {
  // Perform mutation
  await db.posts.create({ data: await request.json() });

  // Access request APIs in after
  after(async () => {
    const userAgent = (await headers()).get('user-agent');
    const session = (await cookies()).get('session');

    await analytics.track('post_created', {
      userAgent,
      session: session?.value,
    });
  });

  return Response.json({ success: true });
}
```

## Best Practices

### Use Cases for After

- Analytics and logging
- Background data synchronization
- Sending notifications (email, webhooks)
- Cache warming
- Metrics collection

### Don't Use For

- Critical operations that affect the response
- User-facing errors
- Data that needs to be in the response

## Benefits

- **Non-Blocking**: Doesn't slow down responses
- **Reliability**: Runs even if response errors
- **Simple**: Easy to use for background tasks
- **Flexible**: Works in Server Components, Route Handlers, Server Actions
