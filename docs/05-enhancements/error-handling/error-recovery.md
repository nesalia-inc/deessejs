# Error Handling & Rethrow Strategies for DeesseJS

## Overview

Recommendations for implementing advanced error handling using Next.js `unstable_rethrow()` and comprehensive error management patterns.

## Current State Analysis

Based on documentation analysis, DeesseJS has:
- `docs\next\advanced-error-handling.md` - Basic error handling
- `docs\next\error-handling-enhancements.md` - Error classification

Current gaps:
- No unstable_rethrow integration
- Limited error recovery patterns
- Missing error boundary composition
- No error aggregation

## Recommended Enhancements

### 1. Framework Error Handling

Proper handling of Next.js framework errors:

```typescript
// lib/errors/framework-handling.ts
import { unstable_rethrow } from 'next/navigation'
import { notFound, redirect, permanentRedirect } from 'next/navigation'

export type FrameworkError =
  | 'NOT_FOUND'
  | 'REDIRECT'
  | 'PERMANENT_REDIRECT'
  | 'DYNAMIC_ERROR'
  | 'AUTH_ERROR'

export function isFrameworkError(error: unknown): error is Error {
  const frameworkErrors = [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    'NEXT_PERMANENT_REDIRECT',
  ]

  return error instanceof Error &&
    frameworkErrors.some(name => error.message.includes(name))
}

export async function handleFrameworkError<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Re-throw framework errors to let Next.js handle them
    unstable_rethrow(error)

    // If not a framework error, handle normally
    throw error
  }
}

// Usage in Server Components
export async function fetchPost(slug: string) {
  return handleFrameworkError(async () => {
    const res = await fetch(`https://api.example.com/posts/${slug}`)

    if (res.status === 404) {
      notFound()
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.statusText}`)
    }

    return res.json()
  })
}

// Usage in try/catch blocks
export async function safeOperation() {
  try {
    const result = await someOperation()
    return result
  } catch (error) {
    unstable_rethrow(error)

    // Log non-framework errors
    console.error('Operation failed:', error)
    throw error
  }
}
```

### 2. Error Boundary Composition

Composable error boundaries:

```typescript
// components/error-boundaries/composable.tsx
'use client'

import React from 'react'
import { ErrorBoundary as BaseErrorBoundary } from './base'

interface ComposableErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: string[]
}

export function ErrorBoundary({
  children,
  fallback,
  onError,
  resetKeys,
}: ComposableErrorBoundaryProps) {
  const [key, setKey] = React.useState(0)

  const handleReset = () => {
    setKey(prev => prev + 1)
  }

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Error boundary caught:', error, errorInfo)
    onError?.(error, errorInfo)
  }

  return (
    <BaseErrorBoundary
      key={key}
      fallback={fallback}
      onError={handleError}
      onReset={handleReset}
      resetKeys={resetKeys}
    >
      {children}
    </BaseErrorBoundary>
  )
}

// Specialized error boundaries
export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <div className="query-error">
          <h3>Query Error</h3>
          <p>{error.message}</p>
          <button onClick={retry}>Retry</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

export function MutationErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <div className="mutation-error">
          <h3>Mutation Failed</h3>
          <p>{error.message}</p>
          <button onClick={retry}>Try Again</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

export function AuthenticationErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div className="auth-error">
          <h3>Authentication Error</h3>
          <p>{error.message}</p>
          <a href="/login">Login</a>
        </div>
      )}
      resetKeys={['auth-state']}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### 3. Error Aggregation

Aggregate multiple errors for batch operations:

```typescript
// lib/errors/aggregation.ts
import { DeesseError } from './classification'

export interface ErrorAggregator {
  errors: Map<string, DeesseError[]>
  add(error: DeesseError, key?: string): void
  getErrors(key?: string): DeesseError[]
  hasErrors(key?: string): boolean
  getAll(): Map<string, DeesseError[]>
  clear(key?: string): void
  flush(): ErrorBatch
}

export interface ErrorBatch {
  errors: Map<string, DeesseError[]>
  count: number
  byCategory: Record<string, DeesseError[]>
  bySeverity: Record<string, DeesseError[]>
}

export class ErrorAggregatorImpl implements ErrorAggregator {
  errors = new Map<string, DeesseError[]>()

  add(error: DeesseError, key?: string): void {
    const errorKey = key || 'default'

    if (!this.errors.has(errorKey)) {
      this.errors.set(errorKey, [])
    }

    this.errors.get(errorKey)!.push(error)
  }

  getErrors(key?: string): DeesseError[] {
    if (key) {
      return this.errors.get(key) || []
    }

    const all: DeesseError[] = []
    for (const errors of this.errors.values()) {
      all.push(...errors)
    }
    return all
  }

  hasErrors(key?: string): boolean {
    return this.getErrors(key).length > 0
  }

  getAll(): Map<string, DeesseError[]> {
    return new Map(this.errors)
  }

  clear(key?: string): void {
    if (key) {
      this.errors.delete(key)
    } else {
      this.errors.clear()
    }
  }

  flush(): ErrorBatch {
    const errors = this.errors

    // Calculate stats
    const allErrors = this.getErrors()
    const byCategory: Record<string, DeesseError[]> = {}
    const bySeverity: Record<string, DeesseError[]> = {}

    for (const error of allErrors) {
      const category = error.context.category
      const severity = error.context.severity

      if (!byCategory[category]) {
        byCategory[category] = []
      }
      byCategory[category].push(error)

      if (!bySeverity[severity]) {
        bySeverity[severity] = []
      }
      bySeverity[severity].push(error)
    }

    const batch: ErrorBatch = {
      errors,
      count: allErrors.length,
      byCategory,
      bySeverity,
    }

    this.clear()

    return batch
  }

  toJSON() {
    return {
      errors: Object.fromEntries(this.errors.entries()),
      count: this.getErrors().length,
    }
  }
}

export function createErrorAggregator(): ErrorAggregator {
  return new ErrorAggregatorImpl()
}

// Usage in batch operations
export async function batchCreatePosts(posts: Array<{ title: string; content: string }>) {
  const aggregator = createErrorAggregator()

  const results = await Promise.allSettled(
    posts.map(async (post) => {
      try {
        return await db.posts.create({ data: post })
      } catch (error) {
        aggregator.add(
          ErrorFactory.database('create post', error as Error),
          `post:${post.title}`
        )
        return null
      }
    })
  )

  if (aggregator.hasErrors()) {
    const batch = aggregator.flush()
    console.error('Batch operation had errors:', batch)
  }

  return results
}
```

### 4. Error Recovery Strategies

Smart error recovery mechanisms:

```typescript
// lib/errors/recovery.ts
import { DeesseError } from './classification'

export interface RecoveryStrategy {
  canRecover: (error: DeesseError) => boolean
  recover: (error: DeesseError) => Promise<any>
  maxRetries?: number
}

export class ErrorRecoveryManager {
  private strategies = new Map<string, RecoveryStrategy>()

  register(errorCode: string, strategy: RecoveryStrategy) {
    this.strategies.set(errorCode, strategy)
  }

  async attemptRecovery(error: DeesseError): Promise<{
    recovered: boolean
    result?: any
    attempts?: number
  }> {
    const strategy = this.strategies.get(error.context.code || 'default')

    if (!strategy || !strategy.canRecover(error)) {
      return { recovered: false }
    }

    const maxRetries = strategy.maxRetries || 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await strategy.recover(error)

        console.log(`Recovery successful after ${attempt} attempts`)

        return {
          recovered: true,
          result,
          attempts: attempt,
        }
      } catch (recoveryError) {
        if (attempt === maxRetries) {
          console.error(`Recovery failed after ${attempt} attempts`)
          return { recovered: false }
        }

        console.log(`Recovery attempt ${attempt} failed, retrying...`)
      }
    }

    return { recovered: false }
  }

  async handleError<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (!(error instanceof DeesseError)) {
        throw error
      }

      // Try to recover
      const { recovered, result } = await this.attemptRecovery(error)

      if (recovered) {
        return result as T
      }

      // Use fallback if available
      if (fallback) {
        console.log('Using fallback after recovery failed')
        return await fallback()
      }

      throw error
    }
  }
}

export const errorRecoveryManager = new ErrorRecoveryManager()

// Register recovery strategies
errorRecovery.register('DATABASE_ERROR', {
  canRecover: (error) => {
    // Can recover from transient database errors
    return error.originalError instanceof Error &&
           ['ECONNRESET', 'ETIMEDOUT', 'ESERVERDOWN'].includes(error.originalError.code)
  },
  recover: async (error) => {
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Retry the operation (implementation depends on context)
    return null
  },
  maxRetries: 3,
})

errorRecovery.register('RATE_LIMIT_EXCEEDED', {
  canRecover: (error) => {
    return error.context.category === 'rate_limit'
  },
  recover: async (error) => {
    // Wait for rate limit to reset
    const waitTime = error.metadata?.windowMs || 60000
    await new Promise(resolve => setTimeout(resolve, waitTime))

    return null
  },
  maxRetries: 1,
})
```

### 5. Error Context Enrichment

Add rich context to errors for debugging:

```typescript
// lib/errors/context.ts
import { headers, cookies } from 'next/headers'
import { DeesseError } from './classification'

export interface ErrorContext {
  timestamp: Date
  request: {
    url: string
    method: string
    headers: Record<string, string>
    userAgent?: string
    ip?: string
  }
  user?: {
    id: string
    role: string
  }
  environment: {
    nodeEnv: string
    appVersion: string
    server?: string
  }
  stack?: string
  cause?: Error
}

export async function enrichError(
  error: DeesseError,
  request?: Request
): Promise<DeesseError & { context: ErrorContext }> {
  const headersList = await headers()
  const cookieStore = await cookies()

  const context: ErrorContext = {
    timestamp: new Date(),
    request: {
      url: request?.url || 'unknown',
      method: request ? (request as any).method : 'unknown',
      headers: Object.fromEntries(headersList.entries()),
      userAgent: headersList.get('user-agent') || undefined,
      ip: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      appVersion: process.env.APP_VERSION || '0.0.0',
      server: process.env.HOSTNAME || 'localhost',
    },
    stack: error.stack,
    cause: error.originalError,
  }

  // Attach context to error
  ;(error as any).context = context

  return error as DeesseError & { context: ErrorContext }
}

// Usage in error handlers
export async function handleServerError(error: unknown, request?: Request) {
  let enrichedError: DeesseError & { context?: ErrorContext }

  if (error instanceof DeesseError) {
    enrichedError = await enrichError(error, request)
  } else {
    enrichedError = await enrichError(
      ErrorFactory.server_error('Unknown error occurred', error instanceof Error ? error : undefined),
      request
    )
  }

  // Log enriched error
  console.error('Enriched error:', JSON.stringify(enrichedError, null, 2))

  return enrichedError
}
```

### 6. Error Reporting & Alerting

Comprehensive error reporting:

```typescript
// lib/errors/reporting.ts
import { DeesseError } from './classification'
import { alertManager } from './alerts'

export interface ErrorReport {
  error: DeesseError & { context?: any }
  fingerprint: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  environment: string
  shouldAlert: boolean
}

export class ErrorReporter {
  private sentryEnabled: boolean
  private sentryDSN?: string

  constructor() {
    this.sentryEnabled = !!process.env.SENTRY_DSN
    this.sentryDSN = process.env.SENTRY_DSN
  }

  async report(error: DeesseError & { context?: any }): Promise<void> {
    const report = this.createReport(error)

    if (report.shouldAlert) {
      await this.sendAlert(report)
    }

    if (this.sentryEnabled) {
      await this.sendToSentry(report)
    }

    // Log internally
    this.logToConsole(report)
  }

  private createReport(error: DeesseError & { context?: any }): ErrorReport {
    const fingerprint = this.generateFingerprint(error)
    const severity = this.determineSeverity(error)

    return {
      error,
      fingerprint,
      severity,
      environment: process.env.NODE_ENV || 'development',
      shouldAlert: this.shouldAlert(error, severity),
    }
  }

  private generateFingerprint(error: DeesseError): string {
    // Create a stable fingerprint for the error
    const parts = [
      error.context.category,
      error.context.code || 'unknown',
      error.message,
    ]

    // Simple hash (use a proper hash function in production)
    return parts.join(':').replace(/[^a-zA-Z0-9:]/g, '-').toLowerCase()
  }

  private determineSeverity(error: DeesseError): 'low' | 'medium' | 'high' | 'critical' {
    switch (error.context.severity) {
      case 'critical':
        return 'critical'
      case 'high':
        return 'high'
      case 'medium':
        return 'medium'
      case 'low':
        return 'low'
      default:
        return 'medium'
    }
  }

  private shouldAlert(error: DeesseError, severity: string): boolean {
    // Alert in production for high/critical errors
    if (process.env.NODE_ENV === 'production') {
      return ['high', 'critical'].includes(severity)
    }

    // In development, only alert critical errors
    return severity === 'critical'
  }

  private async sendAlert(report: ErrorReport): Promise<void> {
    await alertManager.sendAlert(report.error)
  }

  private async sendToSentry(report: ErrorReport): Promise<void> {
    // Send to Sentry
    // Implementation depends on Sentry SDK
  }

  private logToConsole(report: ErrorReport): void {
    const logLevel = this.getLogLevel(report.severity)

    console[logLevel]('[Error Report]', {
      fingerprint: report.fingerprint,
      severity: report.severity,
      error: {
        message: report.error.message,
        category: report.error.context.category,
        code: report.error.context.code,
      },
      context: report.error.context,
    })
  }

  private getLogLevel(severity: string): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error'
      case 'medium':
        return 'warn'
      case 'low':
        return 'log'
      default:
        return 'log'
    }
  }
}

export const errorReporter = new ErrorReporter()

// Usage in error handlers
export async function reportError(error: unknown, request?: Request) {
  let enrichedError: DeesseError & { context?: any }

  if (error instanceof DeesseError) {
    enrichedError = await enrichError(error, request)
  } else {
    enrichedError = await enrichError(
      ErrorFactory.server_error('Unknown error', error instanceof Error ? error : undefined),
      request
    )
  }

  await errorReporter.report(enrichedError)
}
```

### 7. Error UI Components

User-friendly error display components:

```typescript
// components/errors/error-display.tsx
'use client'

import React from 'react'
import { DeesseError } from '@/lib/errors/classification'

interface ErrorDisplayProps {
  error: DeesseError
  onRetry?: () => void
  onDismiss?: () => void
  showDetails?: boolean
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
}: ErrorDisplayProps) {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false)

  const severityColors = {
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    high: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-300 text-red-900',
  }

  const colorClass = severityColors[error.context.severity] || severityColors.medium

  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">
            {error.context.category.replace(/_/g, ' ').toUpperCase()}
          </h3>
          <p className="text-sm opacity-90">
            {error.context.userMessage || error.message}
          </p>
        </div>

        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 text-sm font-medium bg-white/50 hover:bg-white/80 rounded"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-3 py-1 text-sm font-medium bg-white/50 hover:bg-white/80 rounded"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {(showDetails || showErrorDetails) && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium mb-2">
            Technical Details
          </summary>
          <div className="mt-2 text-xs opacity-75 space-y-1">
            <div>Code: {error.context.code || 'N/A'}</div>
            {error.context.metadata && (
              <div>
                Metadata: {JSON.stringify(error.context.metadata, null, 2)}
              </div>
            )}
            {error.stack && (
              <div>
                <pre className="mt-1 p-2 bg-black/5 rounded overflow-x-auto">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}

      {!showDetails && (
        <button
          onClick={() => setShowErrorDetails(true)}
          className="mt-2 text-xs underline hover:no-underline"
        >
          Show details
        </button>
      )}
    </div>
  )
}

// Usage in Server Components
export function ErrorPage({ error }: { error: DeesseError }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full mx-4">
        <ErrorDisplay error={error} />
      </div>
    </div>
  )
}
```

## Implementation Priority

1. **High Priority**
   - Framework error handling with unstable_rethrow
   - Error aggregation for batch operations
   - Error context enrichment

2. **Medium Priority**
   - Error boundary composition
   - Error recovery strategies
   - Error reporting & alerting

3. **Low Priority**
   - Error UI components
   - Advanced analytics
   - ML-based error prediction

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  errorHandling: {
    frameworkErrors: {
      handleNotFound: true,
      handleRedirects: true,
      handleAuth: true,
    },
    recovery: {
      enabled: true,
      strategies: {
        database: { maxRetries: 3, backoff: 'exponential' },
        rateLimit: { maxRetries: 1 },
      },
    },
    reporting: {
      sentry: {
        enabled: true,
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
      },
      alerts: {
        enabled: true,
        threshold: 'high',
      },
    },
    aggregation: {
      enabled: true,
      maxErrors: 100,
      flushInterval: 60000, // 1 minute
    },
    ui: {
      showDetails: true,
      allowRetry: true,
      allowDismiss: true,
    },
  },
})
```
