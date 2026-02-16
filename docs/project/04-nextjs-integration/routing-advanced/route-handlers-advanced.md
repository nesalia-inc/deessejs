# Route Handlers - Advanced

## Overview

Advanced Route Handler patterns for DeesseJS collections with type-safe context, streaming, webhooks, and more.

## Features

### Auto-Generated Route Handlers
- CRUD endpoints for each collection
- HTTP methods: GET, POST, PUT, PATCH, DELETE
- RouteContext typing helper
- Params as promises
- Cookies and headers manipulation

### Streaming Support
- AI streaming responses (OpenAI, etc.)
- Progressive data loading
- Server-Sent Events
- Large dataset streaming

### Webhook Handling
- Signature verification
- Webhook processing
- Third-party integrations
- Async webhook handling

## Route Handler Patterns

### Basic Collection Handler
```typescript
// app/api/posts/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const posts = await db.posts.findMany()
  return Response.json(posts)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const post = await db.posts.create({ data: body })
  return Response.json(post, { status: 201 })
}
```

### Dynamic Route Handler
```typescript
// app/api/posts/[id]/route.ts
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/posts/[id]'>
) {
  const { id } = await ctx.params

  const post = await db.posts.findById(id)

  if (!post) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(post)
}
```

### Route Context Helper
```typescript
// Strongly typed params
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/users/[id]/posts/[postId]'>
) {
  const { id, postId } = await ctx.params
  // Fully typed params
  return Response.json({ userId: id, postId })
}
```

## Cookies & Headers

### Reading Cookies
```typescript
// app/api/me/route.ts
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await verifyToken(token.value)
  return Response.json(user)
}
```

### Setting Cookies
```typescript
// app/api/login/route.ts
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const user = await authenticate(email, password)

  const cookieStore = await cookies()
  cookieStore.set('session', user.sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })

  return Response.json(user)
}
```

### Reading Headers
```typescript
// app/api/route.ts
import { headers } from 'next/headers'

export async function GET() {
  const headersList = await headers()
  const authorization = headersList.get('authorization')
  const userAgent = headersList.get('user-agent')

  return Response.json({ authorization, userAgent })
}
```

### Setting Headers
```typescript
export async function GET() {
  return new Response('Hello', {
    status: 200,
    headers: {
      'X-Custom-Header': 'value',
      'Cache-Control': 'public, s-maxage=60',
    },
  })
}
```

## Caching & Revalidation

### Route Segment Config
```typescript
// app/api/posts/route.ts
export const revalidate = 60 // Revalidate every 60 seconds
export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await db.posts.findMany()
  return Response.json(posts)
}
```

### Static Generation with generateStaticParams
```typescript
// app/api/posts/[id]/route.ts
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    where: { status: 'published' }
  })
  return posts.map(post => ({ id: String(post.id) }))
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/posts/[id]'>
) {
  const { id } = await ctx.params
  const post = await db.posts.findById(id)
  return Response.json(post)
}
```

## Streaming

### AI Streaming (OpenAI)
```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { StreamingTextResponse, streamText } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
  })

  return new StreamingTextResponse(result.toAIStream())
}
```

### Custom Streaming
```typescript
// app/api/stream/route.ts
function iteratorToStream(iterator: AsyncIterator<Uint8Array>) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()

      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    },
  })
}

async function* streamData() {
  yield new TextEncoder().encode('data: {"message": "Hello"}\n\n')
  await new Promise(resolve => setTimeout(resolve, 100))
  yield new TextEncoder().encode('data: {"message": "World"}\n\n')
}

export async function GET() {
  const iterator = streamData()
  const stream = iteratorToStream(iterator)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

## Webhooks

### Webhook Handler
```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import crypto from 'crypto'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  // Verify webhook signature
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Process webhook
  const event = JSON.parse(body)

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object)
      break
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object)
      break
  }

  return Response.json({ success: true })
}
```

### Async Webhook Processing
```typescript
// app/api/webhooks/github/route.ts
export async function POST(request: Request) {
  const event = await request.json()

  // Process webhook asynchronously
  processGitHubWebhook(event).catch(console.error)

  // Return immediately
  return Response.json({ received: true })
}

async function processGitHubWebhook(event: any) {
  // Background processing
  await syncRepository(event)
}
```

## Query Parameters

### URL Query Params
```typescript
// app/api/posts/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const query = searchParams.get('query') || ''

  const posts = await db.posts.findMany({
    where: {
      title: { contains: query }
    },
    skip: (page - 1) * limit,
    take: limit,
  })

  return Response.json(posts)
}
```

## FormData Handling

### FormData Upload
```typescript
// app/api/upload/route.ts
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const name = formData.get('name') as string

  if (!file) {
    return Response.json({ error: 'No file uploaded' }, { status: 400 })
  }

  // Process file
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `/uploads/${Date.now()}-${file.name}`

  await uploadToStorage(filename, buffer)

  return Response.json({ filename, name })
}
```

### FormData Validation with Zod
```typescript
// app/api/contact/route.ts
import { z } from 'zod'
import { zfd } from 'zod-form-data'

const contactSchema = zfd.formData({
  name: zfd.text(z.string().min(1)),
  email: zfd.text(z.string().email()),
  message: zfd.text(z.string().min(10)),
})

export async function POST(request: Request) {
  const formData = await request.formData()
  const result = contactSchema.safeParse(formData)

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten() },
      { status: 400 }
    )
  }

  const { name, email, message } = result.data

  await sendContactEmail({ name, email, message })

  return Response.json({ success: true })
}
```

## CORS

### Per-Route CORS
```typescript
// app/api/route.ts
export async function GET(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  const allowedOrigins = ['https://example.com']

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'false',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  return new Response('Hello', {
    status: 200,
    headers: corsHeaders,
  })
}
```

## Segment Config Options

### Dynamic Route Handler
```typescript
// app/api/posts/route.ts
export const dynamic = 'force-dynamic' // Always dynamic
export const runtime = 'nodejs' // or 'edge'

export async function GET() {
  const posts = await db.posts.findMany()
  return Response.json(posts)
}
```

### Static Route Handler
```typescript
// app/api/posts/route.ts
export const dynamic = 'error' // Force static
export const revalidate = 3600 // Revalidate every hour

export async function GET() {
  const posts = await db.posts.findMany()
  return Response.json(posts)
}
```

## Configuration

### Auto-Generated Route Handlers
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    api: {
      enabled: true,
      basePath: '/api',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      caching: {
        revalidate: 60,
        dynamic: 'auto',
      },
      cors: {
        enabled: true,
        origins: ['https://example.com'],
      }
    }
  }]
})
```

## Benefits

- **Type Safety**: RouteContext helper for typed params
- **Streaming**: Support for AI and large data
- **Webhooks**: Signature verification and async processing
- **Flexibility**: Full control over HTTP methods
- **Caching**: Segment config for caching strategies
- **Validation**: FormData and JSON validation
