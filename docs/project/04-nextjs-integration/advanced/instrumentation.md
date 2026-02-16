# Instrumentation Integration

## Overview

Automatic server and client instrumentation for observability, performance monitoring, and error tracking.

## Features

### Server-Side Instrumentation

- Auto-generated `instrumentation.ts`
- OpenTelemetry integration (Vercel OTel)
- Server startup code execution
- Runtime-specific registration (Node.js vs Edge)

### Client-Side Instrumentation

- Auto-generated `instrumentation-client.ts`
- Pre-hydration analytics initialization
- Performance marks
- Navigation tracking
- Error boundary setup

### Error Tracking

- Automatic error reporting setup
- Client-side error listeners
- Server-side onRequestError hook
- Digest-based error correlation

### Performance Monitoring

- Time to Interactive tracking
- Navigation performance marks
- Component render timing
- Route transition tracking

## Server Instrumentation

### Auto-Generated instrumentation.ts

```typescript
// instrumentation.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel('next-app');
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // Report to error tracking service
  await errorTracking.report({
    digest: err.digest,
    message: err.message,
    path: request.path,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
};
```

### Runtime-Specific Registration

```typescript
// instrumentation.ts
export function register() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return require('./register.edge');
  } else {
    return require('./register.node');
  }
}
```

## Client Instrumentation

### Auto-Generated instrumentation-client.ts

```typescript
// instrumentation-client.ts
// Performance monitoring
performance.mark('app-init');

// Initialize analytics
analytics.init();

// Error tracking
window.addEventListener('error', (event) => {
  reportError(event.error);
});

export function onRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse'
) {
  // Track navigation
  analytics.track('page_navigation', { url, type: navigationType });

  // Performance marks
  performance.mark(`nav-start-${Date.now()}`);
}
```

## Navigation Breadcrumbs

### Track User Journey

```typescript
// instrumentation-client.ts
export function onRouterTransitionStart(url: string, type: string) {
  // Add breadcrumb for debugging
  debugging.addBreadcrumb({
    category: 'navigation',
    message: `Navigation to ${url}`,
    data: { type, timestamp: Date.now() },
  });
}
```

## Performance Monitoring

### Time to Interactive

```typescript
// instrumentation-client.ts
const startTime = performance.now();

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry instanceof PerformanceNavigationTiming) {
      const tti = entry.loadEventEnd - startTime;
      analytics.track('tti', { value: tti });
    }
  }
});

observer.observe({ entryTypes: ['navigation'] });
```

## Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  instrumentation: {
    server: {
      openTelemetry: true,
      errorTracking: 'sentry',
      performanceTracking: true,
    },
    client: {
      analytics: 'vercel-analytics',
      errorTracking: true,
      performanceTracking: true,
      navigationBreadcrumbs: true,
    },
  },
});
```

## Observability Providers

### Supported Providers

- **Vercel Analytics**: Auto-instrumented
- **Sentry**: Error tracking and performance
- **Datadog**: APM and error tracking
- **PostHog**: Product analytics
- **Plausible**: Privacy-friendly analytics
- **Custom**: Build your own

## Benefits

- **Zero Config**: Auto-generated instrumentation files
- **Observability**: Performance and error tracking out of the box
- **Debugging**: Navigation breadcrumbs for reproduction
- **Correlation**: Digest-based error tracking
- **Standards**: OpenTelemetry compatibility
