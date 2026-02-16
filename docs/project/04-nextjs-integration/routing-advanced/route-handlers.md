# Route Handlers

## Overview

Automatic Next.js Route Handlers generation for DeesseJS collections with static and dynamic support.

## Features

### Auto-Generated API Routes
- Standard CRUD routes for each collection
- RESTful API design
- Type-safe requests and responses
- Automatic validation

### Static Route Handlers
- Build-time static route generation
- Pre-generated API responses
- CDN-cacheable JSON responses
- Faster response times

### Dynamic Route Handlers
- On-demand request handling
- Real-time data access
- Authentication and authorization
- Rate limiting

## Route Patterns

### Collection Routes
```
/api/posts                    → GET all, POST new
/api/posts/[id]              → GET one, PUT update, DELETE
/api/posts/[id]/publish       → POST action
/api/posts/[slug]/slug       → GET by slug
```

### Auto-Generated Routes

#### GET /api/posts
```typescript
// app/api/posts/route.ts
export async function GET(request: Request) {
  const posts = await db.posts.findMany()
  return Response.json(posts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const post = await db.posts.create({ data: body })
  return Response.json(post, { status: 201 })
}
```

#### GET /api/posts/[id]
```typescript
// app/api/posts/[id]/route.ts
export async function GET(
  request: Request,
  { params }: RouteContext<'/api/posts/[id]'>
) {
  const { id } = await params
  const post = await db.posts.findById(id)
  if (!post) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json(post)
}
```

### generateStaticParams for Routes
```typescript
// app/api/posts/[id]/route.ts
export async function generateStaticParams() {
  const posts = await db.posts.findMany({
    where: { status: 'published' }
  })
  return posts.map(post => ({ id: String(post.id) }))
}
```

## Route Customization

### Custom Routes
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    routes: {
      standard: true, // CRUD routes
      custom: [
        {
          path: '/api/posts/[id]/publish',
          method: 'POST',
          handler: 'publish', // db.posts.publish()
        },
        {
          path: '/api/posts/[slug]/slug',
          method: 'GET',
          handler: 'findBySlug',
        }
      ]
    }
  }]
})
```

### Custom Actions
```typescript
// Custom route handler
export async function POST(
  request: Request,
  { params }: RouteContext<'/api/posts/[id]/publish'>
) {
  const { id } = await params
  const post = await db.posts.publish({ id })
  return Response.json(post)
}
```

## HTTP Methods

### Supported Methods
- **GET**: Fetch one or many
- **POST**: Create new
- **PUT**: Full update
- **PATCH**: Partial update
- **DELETE**: Remove
- **OPTIONS**: CORS preflight

### Method Security
- Automatic CSRF protection
- CORS configuration
- Rate limiting per method
- Authentication required for mutations

## Validation

### Request Validation
```typescript
// Automatic Zod validation
export async function POST(request: Request) {
  const body = await request.json()
  // Validates against collection schema
  const post = await db.posts.create({ data: body })
  return Response.json(post)
}
```

### Error Responses
```typescript
// Automatic error handling
{
  "error": "Validation failed",
  "issues": [
    { "path": ["title"], "message": "Required" }
  ]
}
```

## Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  api: {
    baseUrl: '/api',
    version: 'v1',
    cors: {
      enabled: true,
      origins: ['https://example.com'],
    },
    rateLimit: {
      windowMs: 60000,
      max: 100,
    },
    routes: {
      standard: true, // Auto-generate CRUD
      static: true,   // Use generateStaticParams
    }
  }
})
```

## Headers & Metadata

### Auto-Generated Headers
```typescript
// app/api/posts/route.ts
export async function GET(request: Request) {
  const posts = await db.posts.findMany()

  return Response.json(posts, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'X-Total-Count': String(posts.length),
    }
  })
}
```

## Benefits

- **Zero Boilerplate**: No manual route creation
- **Type Safety**: End-to-end type checking
- **Performance**: Static routes for faster responses
- **Standards**: RESTful API design
- **Security**: Built-in validation and auth
- **Flexibility**: Custom routes when needed
