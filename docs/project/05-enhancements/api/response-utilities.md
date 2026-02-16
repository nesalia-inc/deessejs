# NextRequest & NextResponse Enhancements for DeesseJS

## Overview

Recommendations for enhancing DeesseJS's integration with NextRequest and NextResponse APIs for improved request/response handling, cookies, and redirection.

## Current State Analysis

Based on documentation analysis, DeesseJS has:

- `docs\next\route-handlers-advanced.md` - Covers cookies, headers, FormData
- `docs\next\cookies-sessions.md` - Basic cookie management
- `docs\next\proxy-integration.md` - Proxy patterns

## Recommended Enhancements

### 1. Type-Safe Cookie Management

Create a strongly-typed cookie system:

```typescript
// lib/cookies.ts
import { cookies } from 'next/headers';

export type CookieName = 'session' | 'theme' | 'language' | 'preferences' | 'consent';

export interface CookieConfig {
  name: CookieName;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
  priority?: 'low' | 'medium' | 'high';
}

export const cookieConfigs: Record<CookieName, CookieConfig> = {
  session: {
    name: 'session',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    priority: 'high',
  },
  theme: {
    name: 'theme',
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    priority: 'low',
  },
  language: {
    name: 'language',
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    priority: 'low',
  },
  preferences: {
    name: 'preferences',
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    priority: 'medium',
  },
  consent: {
    name: 'consent',
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    priority: 'high',
  },
};

export async function setCookie(
  name: CookieName,
  value: string,
  overrides?: Partial<CookieConfig>
) {
  const config = { ...cookieConfigs[name], ...overrides };
  const cookieStore = await cookies();

  cookieStore.set(name, value, {
    httpOnly: config.httpOnly,
    secure: config.secure,
    sameSite: config.sameSite,
    path: config.path,
    maxAge: config.maxAge,
    priority: config.priority,
  });
}

export async function getCookie<T extends CookieName>(name: T): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function deleteCookie(name: CookieName) {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}
```

### 2. Request Validation Middleware

Create reusable request validation middleware:

```typescript
// lib/request-validation.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' | 'both' = 'body'
): Promise<ValidationResult<T>> {
  try {
    let data: any = {};

    if (source === 'body' || source === 'both') {
      const cloned = request.clone();
      data = { ...data, ...(await cloned.json()) };
    }

    if (source === 'query' || source === 'both') {
      data = { ...data, ...Object.fromEntries(request.nextUrl.searchParams) };
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors: Record<string, string[]> = {};

      result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(error.message);
      });

      return { success: false, errors };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      errors: { _form: ['Invalid request format'] },
    };
  }
}

// Usage example
const postSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  published: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const validation = await validateRequest(request, postSchema);

  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  // Use validation.data
}
```

### 3. Enhanced Response Utilities

Create response utilities for common patterns:

```typescript
// lib/responses.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  revalidate?: number;
}

export class ApiResponse {
  static success<T>(data: T, message?: string, options?: ApiResponseOptions): NextResponse {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
      },
      {
        status: options?.status || 200,
        headers: options?.headers,
      }
    );
  }

  static error(message: string, code?: string, options?: ApiResponseOptions): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code,
      },
      {
        status: options?.status || 400,
        headers: options?.headers,
      }
    );
  }

  static validationError(
    errors: Record<string, string[]>,
    options?: ApiResponseOptions
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        errors,
      },
      {
        status: options?.status || 422,
        headers: options?.headers,
      }
    );
  }

  static notFound(resource: string, options?: ApiResponseOptions): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: `${resource} not found`,
        code: 'NOT_FOUND',
      },
      {
        status: options?.status || 404,
        headers: options?.headers,
      }
    );
  }

  static unauthorized(
    message = 'Authentication required',
    options?: ApiResponseOptions
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'UNAUTHORIZED',
      },
      {
        status: options?.status || 401,
        headers: options?.headers,
      }
    );
  }

  static forbidden(message = 'Access denied', options?: ApiResponseOptions): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'FORBIDDEN',
      },
      {
        status: options?.status || 403,
        headers: options?.headers,
      }
    );
  }

  static created<T>(
    data: T,
    message = 'Resource created successfully',
    options?: ApiResponseOptions
  ): NextResponse {
    return NextResponse.json(
      {
        success: true,
        data,
        message,
      },
      {
        status: options?.status || 201,
        headers: options?.headers,
      }
    );
  }

  static noContent(options?: ApiResponseOptions): NextResponse {
    return new NextResponse(null, {
      status: options?.status || 204,
      headers: options?.headers,
    });
  }
}
```

### 4. Cookie-Based Session Management

Enhanced session management with typed cookies:

```typescript
// lib/session.ts
import { cookies } from 'next/headers';
import { encrypt, decrypt } from '@/lib/crypto';

export interface SessionData {
  userId: string;
  role: string;
  expiresAt: Date;
  csrfToken: string;
}

const SESSION_COOKIE_NAME = 'session' as const;
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

export async function createSession(data: Omit<SessionData, 'expiresAt'>) {
  const sessionData: SessionData = {
    ...data,
    expiresAt: new Date(Date.now() + SESSION_DURATION * 1000),
  };

  const encrypted = await encrypt(JSON.stringify(sessionData));
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
    priority: 'high',
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  try {
    const decrypted = await decrypt(sessionCookie.value);
    const session = JSON.parse(decrypted) as SessionData;

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      await clearSession();
      return null;
    }

    return session;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function updateSession(updates: Partial<Omit<SessionData, 'expiresAt'>>) {
  const session = await getSession();

  if (!session) {
    throw new Error('No active session');
  }

  await createSession({
    ...session,
    ...updates,
  });
}
```

### 5. Request/Response Logging

Comprehensive logging for debugging:

```typescript
// lib/request-logger.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export interface RequestLog {
  timestamp: Date;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  headers: Record<string, string>;
  body?: any;
  duration?: number;
  status?: number;
}

const requestLogs: RequestLog[] = [];

export async function logRequest(request: NextRequest, response?: NextResponse, duration?: number) {
  const headersList = await headers();

  const log: RequestLog = {
    timestamp: new Date(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: headersList.get('x-forwarded-for') || undefined,
    headers: Object.fromEntries(request.headers.entries()),
    duration,
    status: response?.status,
  };

  requestLogs.push(log);

  // Keep only last 1000 logs in memory
  if (requestLogs.length > 1000) {
    requestLogs.shift();
  }

  // Send to logging service
  if (process.env.LOGGING_ENDPOINT) {
    fetch(process.env.LOGGING_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(log),
      headers: { 'Content-Type': 'application/json' },
    }).catch(console.error);
  }
}

export function getRequestLogs(limit = 100): RequestLog[] {
  return requestLogs.slice(-limit);
}

export function clearRequestLogs() {
  requestLogs.length = 0;
}
```

### 6. CORS Configuration Utility

Simplified CORS configuration:

```typescript
// lib/cors.ts
import { NextRequest, NextResponse } from 'next/server';

export interface CorsOptions {
  origins: string[];
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function handleCors(request: NextRequest, options: CorsOptions): NextResponse | null {
  const origin = request.headers.get('origin');
  const isAllowedOrigin = origin && options.origins.includes(origin);

  const corsHeaders = {
    ...(isAllowedOrigin && { 'Access-Control-Allow-Origin': origin }),
    'Access-Control-Allow-Methods':
      options.methods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      options.allowedHeaders?.join(', ') || 'Content-Type, Authorization',
    ...(options.credentials && { 'Access-Control-Allow-Credentials': 'true' }),
    ...(options.maxAge && { 'Access-Control-Max-Age': String(options.maxAge) }),
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }

  // Return null to continue with normal request handling
  return null;
}

export function addCorsHeaders(
  response: NextResponse,
  request: NextRequest,
  options: CorsOptions
): NextResponse {
  const origin = request.headers.get('origin');
  const isAllowedOrigin = origin && options.origins.includes(origin);

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    options.methods?.join(', ') || 'GET, POST, PUT, DELETE'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    options.allowedHeaders?.join(', ') || 'Content-Type, Authorization'
  );

  if (options.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}
```

### 7. Rate Limiting with Request Tracking

Implement rate limiting using request metadata:

```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export async function checkRateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; resetAt: Date; remaining: number }> {
  const headersList = await headers();
  const identifier =
    headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'anonymous';

  const now = new Date();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: new Date(now.getTime() + windowMs),
    };
    rateLimitStore.set(identifier, newEntry);

    return {
      allowed: true,
      resetAt: newEntry.resetAt,
      remaining: limit - 1,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      resetAt: entry.resetAt,
      remaining: 0,
    };
  }

  entry.count++;

  return {
    allowed: true,
    resetAt: entry.resetAt,
    remaining: limit - entry.count,
  };
}

export function addRateLimitHeaders(
  response: NextResponse,
  result: { allowed: boolean; resetAt: Date; remaining: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.remaining + (result.allowed ? 1 : 0)));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetAt.getTime() / 1000)));

  if (!result.allowed) {
    response.headers.set(
      'Retry-After',
      String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
    );
  }

  return response;
}
```

## Implementation Priority

1. **High Priority**
   - Type-safe cookie management
   - Enhanced response utilities
   - Request validation middleware

2. **Medium Priority**
   - Cookie-based session management
   - CORS configuration utility
   - Request/response logging

3. **Low Priority**
   - Rate limiting with request tracking
   - Advanced monitoring features

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  requestHandling: {
    cookies: {
      configs: cookieConfigs,
      secureDefaults: true,
    },
    cors: {
      enabled: true,
      origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    rateLimit: {
      enabled: true,
      defaultLimit: 100,
      windowMs: 60000,
    },
    validation: {
      strictMode: true,
      logErrors: true,
    },
  },
});
```
