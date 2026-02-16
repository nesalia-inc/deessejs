# Headers - Request Headers

## Overview

Using Next.js `headers()` async function to read HTTP request headers in DeesseJS applications.

## Features

### Read Request Headers

- Access incoming HTTP headers
- Async headers API
- Read-only Headers object
- Authorization header forwarding

### Use Cases

- Authorization token forwarding
- User agent detection
- Referrer tracking
- Custom header extraction

## Basic Usage

### Get Single Header

```typescript
// app/page.tsx
import { headers } from 'next/headers'

export default async function Page() {
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')

  return <div>User Agent: {userAgent}</div>
}
```

### Get All Headers

```typescript
export default async function Page() {
  const headersList = await headers()

  return (
    <div>
      {Array.from(headersList.entries()).map(([key, value]) => (
        <div key={key}>
          <strong>{key}:</strong> {value}
        </div>
      ))}
    </div>
  )
}
```

### Check Header Exists

```typescript
export default async function Page() {
  const headersList = await headers()
  const hasAuth = headersList.has('authorization')

  if (!hasAuth) {
    redirect('/login')
  }

  return <ProtectedContent />
}
```

## Authorization Forwarding

### Forward Auth Token

```typescript
// app/api/external/route.ts
import { headers } from 'next/headers';

export async function GET() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Forward auth to external API
  const response = await fetch('https://external-api.com/data', {
    headers: {
      authorization: authHeader,
    },
  });

  const data = await response.json();

  return Response.json(data);
}
```

### Context-Based Headers

```typescript
// app/page.tsx
import { headers } from 'next/headers'

export default async function Page() {
  const headersList = await headers()

  const referer = headersList.get('referer')
  const userAgent = headersList.get('user-agent')

  after(async () => {
    await analytics.track('page_view', {
      referer,
      userAgent,
    })
  })

  return <PageContent />
}
```

## Configuration

### Auto-Generated Header Forwarding

```typescript
// deesse.config.ts
export const config = defineConfig({
  api: {
    headers: {
      forward: ['authorization', 'user-agent', 'referer'],
      block: ['x-secret-key'],
    },
  },
});
```

### Per-Collection Headers

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      api: {
        headers: {
          required: ['authorization'],
          optional: ['x-request-id'],
        },
      },
    },
  ],
});
```

## Advanced Patterns

### Custom Auth Headers

```typescript
// app/api/posts/route.ts
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const headersList = await headers();

  // Extract custom auth header
  const apiKey = headersList.get('x-api-key');

  if (!apiKey) {
    return Response.json({ error: 'Missing API key' }, { status: 401 });
  }

  const user = await verifyApiKey(apiKey);

  const body = await request.json();
  const post = await db.posts.create({
    data: { ...body, author: user.id },
  });

  return Response.json(post);
}
```

### Request Tracing

```typescript
export default async function Page() {
  const headersList = await headers()

  const requestId = headersList.get('x-request-id') || crypto.randomUUID()

  after(async () => {
    await logRequest({
      id: requestId,
      path: headersList.get('x-path'),
      method: headersList.get('x-method'),
    })
  })

  return <PageContent requestId={requestId} />
}
```

### Device Detection

```typescript
export default async function Page() {
  const headersList = await headers()

  const userAgent = headersList.get('user-agent') || ''

  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent)

  return isMobile ? <MobileLayout /> : <DesktopLayout />
}
```

## Integration with Other Systems

### Analytics Tracking

```typescript
// app/page.tsx
import { headers } from 'next/headers'

export default async function Page() {
  const headersList = await headers()

  const sessionId = headersList.get('x-session-id')

  return <PageContent sessionId={sessionId} />
}
```

### A/B Testing

```typescript
export default async function Page() {
  const headersList = await headers()
  const variant = headersList.get('x-ab-variant') || 'control'

  return <PageContent variant={variant} />
}
```

## Best Practices

### Always Await

```typescript
// ✅ Correct
const headersList = await headers();

// ❌ Wrong
const headersList = headers(); // Returns promise
```

### Headers Are Read-Only

- Cannot modify outgoing headers in Server Components
- Use Route Handlers for response headers
- Use cookies() for set/delete operations

### Check Before Using

```typescript
const headersList = await headers();

const auth = headersList.get('authorization');
if (!auth) {
  throw new Error('Unauthorized');
}
```

## Integration Points

### With fetch

```typescript
const headersList = await headers();

fetch('https://api.example.com', {
  headers: {
    authorization: headersList.get('authorization') || '',
    'user-agent': headersList.get('user-agent') || '',
  },
});
```

### With Server Actions

```typescript
'use server';

import { headers } from 'next/headers';

export async function serverAction() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');

  await performAction({ userId });
}
```

## Benefits

- **Auth**: Easy token forwarding
- **Analytics**: Request tracking
- **Security**: Header-based security
- **Integration**: Forward headers to APIs
- **Detection**: Device/language detection
- **Simple**: Clean async API
