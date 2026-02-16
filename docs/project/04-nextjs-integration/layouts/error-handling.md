# Advanced Error Handling

## Overview

Comprehensive error handling system with Next.js error.js, forbidden.js, and digest tracking.

## Features

### Error Digest Tracking

- Automatic `error.digest` generation and tracking
- Correlate client and server errors
- Match client error reports to server logs
- Unique error identifiers
- Secure error reporting (no sensitive data in production)

### Auto-Generated Error Files

- `error.tsx` per route segment
- `global-error.tsx` for root errors
- `forbidden.tsx` for 403 errors
- Graceful fallbacks
- Styled error pages by default

### Error Boundaries per Collection

- Isolated error handling per collection route
- Custom error UI per collection
- Error recovery with `reset()` function
- Contextual error messages

### Graceful Degradation

- Show last successful SSR HTML on error
- Preserved state hydration
- Notification bar on error
- Better UX than blank error page

### Integration with Instrumentation

- `onRequestError` automatic reporting
- Error context (route type, render source)
- Error aggregation
- Performance impact tracking

## Error Types

### 403 Forbidden

Auto-generated `forbidden.tsx` for authentication errors:

```typescript
// app/forbidden.tsx
export default function Forbidden() {
  return (
    <div>
      <h2>Forbidden</h2>
      <p>You are not authorized to access this resource.</p>
    </div>
  )
}
```

### 404 Not Found

Auto-generated `not-found.tsx` per collection:

```typescript
// app/blog/[slug]/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Post not found</h2>
      <Link href="/blog">Back to blog</Link>
    </div>
  )
}
```

### 500 Error

Auto-generated `error.tsx` with digest tracking:

```typescript
// app/blog/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error with digest for correlation
    reportError({
      message: error.message,
      digest: error.digest,
      route: '/blog'
    })
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>Error ID: {error.digest}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Error Context

### onRequestError Integration

```typescript
// instrumentation.ts
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // Send to error tracking service
  await errorTracking.report({
    error: err,
    digest: err.digest,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
};
```

## Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  errorHandling: {
    showDetailsInDev: true,
    showDigestInProd: true,
    gracefulDegradation: true,
    tracking: {
      service: 'sentry',
      includeDigest: true,
      includeContext: true,
    },
  },
});
```

## Benefits

- **Security**: No sensitive data in production errors
- **Debugging**: Digest correlation between client/server
- **UX**: Graceful degradation preserves usable UI
- **Monitoring**: Automatic error tracking and reporting
- **Isolation**: Errors isolated per route segment
