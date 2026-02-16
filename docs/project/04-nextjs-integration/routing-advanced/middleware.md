# Proxy Integration

## Overview

Proxy.js (formerly middleware) integration for authentication, logging, redirects, and request/response manipulation.

## Features

### Auto-Generated proxy.ts
- Authentication checks
- Logging and analytics
- CORS handling
- Locale detection
- Role-based routing
- Rate limiting

### Request/Response Manipulation
- Rewrite URLs
- Redirect requests
- Modify headers
- Set cookies
- Respond directly

### Matcher Configuration
- Path-based matching
- Negative matching
- Header/cookie-based conditions
- Complex routing rules

## Authentication Proxy

### Basic Auth Check
```typescript
// proxy.ts - Auto-generated
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@deessejs/auth'

export async function proxy(request: NextRequest) {
  // Check auth for protected routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await auth()

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
```

### Role-Based Access
```typescript
// proxy.ts
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await auth()

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check role
    if (session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return NextResponse.next()
}
```

## Logging & Analytics

### Request Logging
```typescript
// proxy.ts
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Log in background without blocking response
  event.waitUntil(
    fetch('https://analytics.example.com', {
      method: 'POST',
      body: JSON.stringify({
        pathname: request.nextUrl.pathname,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
      }),
    })
  )

  return NextResponse.next()
}
```

### Performance Monitoring
```typescript
// proxy.ts
export async function proxy(request: NextRequest) {
  const start = Date.now()

  const response = NextResponse.next()

  response.headers.set('X-Response-Time', `${Date.now() - start}ms`)

  return response
}
```

## CORS Handling

### CORS Configuration
```typescript
// deesse.config.ts
export const config = defineConfig({
  proxy: {
    cors: {
      enabled: true,
      allowedOrigins: ['https://example.com', 'https://app.example.com'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }
  }
})
```

### Auto-Generated CORS Proxy
```typescript
// proxy.ts - Auto-generated
const allowedOrigins = ['https://example.com']
const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? ''
  const isAllowedOrigin = allowedOrigins.includes(origin)

  // Handle preflight
  if (request.method === 'OPTIONS') {
    const preflightHeaders = {
      ...(isAllowedOrigin && { 'Access-Control-Allow-Origin': origin }),
      ...corsOptions,
    }
    return NextResponse.json({}, { headers: preflightHeaders })
  }

  const response = NextResponse.next()

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }

  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: '/api/:path*',
}
```

## Locale Detection

### i18n Proxy
```typescript
// proxy.ts
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Check if there is any supported locale in the pathname
  const pathnameIsMissingLocale = supportedLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getRequestLocale(request)
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    )
  }

  return NextResponse.next()
}
```

## Rewrites & Redirects

### Collection Rewrites
```typescript
// proxy.ts
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rewrite /posts/my-post to /posts?slug=my-post
  if (pathname.match(/^\/posts\/[^/]+$/)) {
    const slug = pathname.split('/')[2]
    const url = new URL(`/posts?slug=${slug}`, request.url)
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}
```

### Trailing Slash Redirects
```typescript
// proxy.ts
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Add trailing slash for specific paths
  if (pathname.match(/^\/blog\/[^/]+$/) && !pathname.endsWith('/')) {
    const url = new URL(`${pathname}/`, request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
```

## Configuration

### Full Proxy Config
```typescript
// deesse.config.ts
export const config = defineConfig({
  proxy: {
    authentication: {
      enabled: true,
      protectedPaths: ['/admin', '/dashboard'],
      publicPaths: ['/login', '/register', '/api/auth'],
      unauthorizedRedirect: '/login',
    },
    logging: {
      enabled: true,
      endpoint: 'https://analytics.example.com',
      includeUserAgent: true,
      includePath: true,
    },
    cors: {
      enabled: true,
      allowedOrigins: ['https://example.com'],
    },
    locale: {
      enabled: true,
      defaultLocale: 'en',
      supportedLocales: ['en', 'fr', 'de'],
      detectFrom: 'header', // header, cookie, query
    },
    rateLimit: {
      enabled: true,
      requestsPerMinute: 100,
    }
  }
})
```

### Custom Matcher
```typescript
// proxy.ts
export const config = {
  matcher: [
    // Exclude API routes, static files, images
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### Negative Matching
```typescript
// proxy.ts
export const config = {
  matcher: [
    // Include only specific paths
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'x-nextjs-data' },
      ],
    },
  ],
}
```

## Headers Manipulation

### Custom Request Headers
```typescript
// proxy.ts
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-deesse-version', '1.0.0')

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  return response
}
```

### Custom Response Headers
```typescript
// proxy.ts
export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}
```

## Cookie Management

### Reading Cookies
```typescript
// proxy.ts
export function proxy(request: NextRequest) {
  const session = request.cookies.get('session')
  const theme = request.cookies.get('theme')

  if (session) {
    // User is logged in
  }

  return NextResponse.next()
}
```

### Setting Cookies
```typescript
// proxy.ts
export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  response.cookies.set('theme', 'dark', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  })

  return response
}
```

## Benefits

- **Authentication**: Route protection made easy
- **Logging**: Request tracking without blocking
- **CORS**: Auto-generated CORS handling
- **i18n**: Locale detection and redirects
- **Flexibility**: Full request/response control
- **Performance**: Edge runtime support
- **Security**: Custom headers and cookies
