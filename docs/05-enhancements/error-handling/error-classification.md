# Error Handling Enhancements for DeesseJS

## Overview

Recommendations for enhancing DeesseJS's error handling system using Next.js `notFound()` and advanced error management patterns.

## Current State Analysis

Based on documentation analysis, DeesseJS has:
- `docs\next\advanced-error-handling.md` - Basic error handling
- `docs\next\not-found-handling.md` - 404 handling
- `docs\next\auth-status-pages.md` - 401/403 handling

Current gaps:
- No centralized error logging
- Limited error recovery strategies
- No error analytics dashboard
- Missing error classification system

## Recommended Enhancements

### 1. Error Classification System

Create a comprehensive error classification system:

```typescript
// lib/errors/classification.ts
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  category: ErrorCategory
  severity: ErrorSeverity
  userMessage?: string
  technicalMessage?: string
  code?: string
  metadata?: Record<string, any>
  recoverable?: boolean
}

export class DeesseError extends Error {
  public readonly context: ErrorContext
  public readonly originalError?: Error
  public readonly timestamp: Date

  constructor(
    message: string,
    context: ErrorContext,
    originalError?: Error
  ) {
    super(message)
    this.name = 'DeesseError'
    this.context = context
    this.originalError = originalError
    this.timestamp = new Date()
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      ...(this.originalError && {
        originalError: {
          name: this.originalError.name,
          message: this.originalError.message,
          stack: this.originalError.stack,
        },
      }),
    }
  }
}

// Error factories
export class ErrorFactory {
  static notFound(
    resource: string,
    identifier?: string
  ): DeesseError {
    return new DeesseError(
      `${resource}${identifier ? ` (${identifier})` : ''} not found`,
      {
        category: ErrorCategory.NOT_FOUND,
        severity: ErrorSeverity.LOW,
        userMessage: `The requested ${resource.toLowerCase()} could not be found.`,
        code: 'NOT_FOUND',
        recoverable: false,
      }
    )
  }

  static unauthorized(
    action: string
  ): DeesseError {
    return new DeesseError(
      `Unauthorized: ${action}`,
      {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'You must be logged in to perform this action.',
        code: 'UNAUTHORIZED',
        recoverable: true,
      }
    )
  }

  static forbidden(
    resource: string,
    action: string
  ): DeesseError {
    return new DeesseError(
      `Forbidden: ${action} on ${resource}`,
      {
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        userMessage: 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
        recoverable: false,
      }
    )
  }

  static validation(
    field: string,
    message: string
  ): DeesseError {
    return new DeesseError(
      `Validation failed: ${field}`,
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        userMessage: `Invalid ${field}: ${message}`,
        code: 'VALIDATION_ERROR',
        metadata: { field },
        recoverable: true,
      }
    )
  }

  static conflict(
    resource: string,
    identifier: string
  ): DeesseError {
    return new DeesseError(
      `Conflict: ${resource} (${identifier}) already exists`,
      {
        category: ErrorCategory.CONFLICT,
        severity: ErrorSeverity.MEDIUM,
        userMessage: `This ${resource.toLowerCase()} already exists.`,
        code: 'CONFLICT',
        recoverable: true,
      }
    )
  }

  static rateLimit(
    limit: number,
    windowMs: number
  ): DeesseError {
    return new DeesseError(
      'Rate limit exceeded',
      {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        userMessage: `Too many requests. Please try again later.`,
        code: 'RATE_LIMIT_EXCEEDED',
        metadata: { limit, windowMs },
        recoverable: true,
      }
    )
  }

  static database(
    operation: string,
    originalError: Error
  ): DeesseError {
    return new DeesseError(
      `Database error during ${operation}`,
      {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        userMessage: 'A database error occurred. Please try again.',
        code: 'DATABASE_ERROR',
        recoverable: false,
      },
      originalError
    )
  }

  static externalService(
    service: string,
    originalError: Error
  ): DeesseError {
    return new DeesseError(
      `External service error: ${service}`,
      {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        userMessage: `An error occurred while communicating with ${service}.`,
        code: 'EXTERNAL_SERVICE_ERROR',
        metadata: { service },
        recoverable: true,
      },
      originalError
    )
  }
}
```

### 2. Error Logging & Tracking

Comprehensive error logging system:

```typescript
// lib/errors/logging.ts
import { DeesseError } from './classification'

export interface ErrorLog {
  id: string
  timestamp: Date
  error: DeesseError
  request: {
    url: string
    method: string
    headers: Record<string, string>
    body?: any
    userId?: string
    sessionId?: string
  }
  environment: {
    nodeEnv: string
    appVersion: string
    server: string
  }
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

class ErrorLogger {
  private logs: ErrorLog[] = []
  private maxLogs = 10000

  async log(error: DeesseError, request?: Request): Promise<string> {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      error,
      request: {
        url: request?.url || 'unknown',
        method: request ? (request as any).method : 'unknown',
        headers: request ? Object.fromEntries((request as any).headers.entries()) : {},
        userId: await this.getUserId(request),
        sessionId: await this.getSessionId(request),
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        appVersion: process.env.APP_VERSION || '0.0.0',
        server: process.env.HOSTNAME || 'localhost',
      },
      resolved: false,
    }

    this.logs.push(errorLog)

    // Prune old logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Send to external logging service
    await this.sendToLoggingService(errorLog)

    return errorLog.id
  }

  async resolve(errorId: string, resolvedBy: string) {
    const log = this.logs.find(l => l.id === errorId)
    if (log) {
      log.resolved = true
      log.resolvedAt = new Date()
      log.resolvedBy = resolvedBy
    }
  }

  async getErrors(filters?: {
    category?: string
    severity?: string
    userId?: string
    resolved?: boolean
    startDate?: Date
    endDate?: Date
  }): Promise<ErrorLog[]> {
    let filtered = [...this.logs]

    if (filters?.category) {
      filtered = filtered.filter(l => l.error.context.category === filters.category)
    }

    if (filters?.severity) {
      filtered = filtered.filter(l => l.error.context.severity === filters.severity)
    }

    if (filters?.userId) {
      filtered = filtered.filter(l => l.request.userId === filters.userId)
    }

    if (filters?.resolved !== undefined) {
      filtered = filtered.filter(l => l.resolved === filters.resolved)
    }

    if (filters?.startDate) {
      filtered = filtered.filter(l => l.timestamp >= filters.startDate!)
    }

    if (filters?.endDate) {
      filtered = filtered.filter(l => l.timestamp <= filters.endDate!)
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  async getErrorStats() {
    const total = this.logs.length
    const byCategory = this.groupBy(l => l.error.context.category)
    const bySeverity = this.groupBy(l => l.error.context.severity)
    const resolvedCount = this.logs.filter(l => l.resolved).length

    return {
      total,
      resolved: resolvedCount,
      unresolved: total - resolvedCount,
      resolutionRate: total > 0 ? (resolvedCount / total) * 100 : 0,
      byCategory,
      bySeverity,
    }
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = keyFn(item)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private async getUserId(request?: Request): Promise<string | undefined> {
    // Extract user ID from session/JWT
    return undefined // Implementation depends on auth system
  }

  private async getSessionId(request?: Request): Promise<string | undefined> {
    // Extract session ID from cookies
    return undefined // Implementation depends on auth system
  }

  private async sendToLoggingService(log: ErrorLog) {
    if (!process.env.LOGGING_ENDPOINT) {
      return
    }

    try {
      await fetch(process.env.LOGGING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
    } catch (error) {
      console.error('Failed to send error to logging service:', error)
    }
  }
}

export const errorLogger = new ErrorLogger()
```

### 3. Error Boundary Components

React error boundaries for graceful error handling:

```typescript
// components/error-boundary.tsx
'use client'

import React from 'react'
import { DeesseError } from '@/lib/errors/classification'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)

    // Log error
    console.error('Error caught by boundary:', error, errorInfo)

    // Send to error logging service
    if (error instanceof DeesseError) {
      errorLogger.log(error)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={retry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 4. Collection-Specific Error Handling

Auto-generated error handling for collections:

```typescript
// lib/errors/collection-handlers.ts
import { notFound } from 'next/navigation'
import { ErrorFactory } from './classification'
import { db } from '@deessejs/db'

export async function handleCollectionError(
  collection: string,
  error: unknown
): never {
  // Database not found
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
    notFound()
  }

  // Validation error
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2009') {
    throw ErrorFactory.validation(
      'query',
      error instanceof Error ? error.message : 'Invalid query'
    )
  }

  // Unique constraint violation
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    const target = (error as any).meta?.target || ['unknown']
    throw ErrorFactory.conflict(collection, target.join(', '))
  }

  // Foreign key constraint
  if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
    throw ErrorFactory.validation(
      'relation',
      'Referenced resource does not exist'
    )
  }

  // Default database error
  if (error instanceof Error) {
    throw ErrorFactory.database(`${collection} operation`, error)
  }

  throw error
}

export async function handleCollectionNotFound(
  collection: string,
  identifier: Record<string, any>
): never {
  throw ErrorFactory.notFound(collection, JSON.stringify(identifier))
}

// Usage in collection operations
export async function getPost(slug: string) {
  try {
    const post = await db.posts.findBySlug(slug)

    if (!post) {
      handleCollectionNotFound('posts', { slug })
    }

    return post
  } catch (error) {
    handleCollectionError('posts', error)
  }
}
```

### 5. Server Action Error Handling

Standardized error handling for server actions:

```typescript
// lib/errors/server-actions.ts
'use server'

import { DeesseError } from './classification'
import { redirect } from 'next/navigation'
import { errorLogger } from './logging'

export async function handleServerError(
  error: unknown,
  context?: {
    action?: string
    userId?: string
    metadata?: Record<string, any>
  }
): Promise<{ success: false; error: string; code?: string }> {
  console.error('Server action error:', error)

  // Log error
  if (error instanceof DeesseError) {
    await errorLogger.log(error)

    return {
      success: false,
      error: error.context.userMessage || error.message,
      code: error.context.code,
    }
  }

  // Unknown error
  const unknownError = new DeesseError(
    'Unknown server error',
    {
      category: 'server_error' as any,
      severity: 'high' as any,
      userMessage: 'An unexpected error occurred. Please try again.',
      code: 'SERVER_ERROR',
      recoverable: true,
      metadata: context?.metadata,
    },
    error instanceof Error ? error : undefined
  )

  await errorLogger.log(unknownError)

  return {
    success: false,
    error: unknownError.context.userMessage || unknownError.message,
    code: unknownError.context.code,
  }
}

export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options?: {
    redirectOnError?: string
    logErrors?: boolean
  }
): T {
  return (async (...args: any[]) => {
    try {
      return await action(...args)
    } catch (error) {
      const result = await handleServerError(error, {
        action: action.name,
      })

      if (options?.redirectOnError) {
        redirect(options.redirectOnError)
      }

      return result
    }
  }) as T
}

// Usage example
export const createPost = withErrorHandling(
  async (data: { title: string; content: string }) => {
    const post = await db.posts.create({ data })
    return { success: true, data: post }
  },
  {
    redirectOnError: '/posts/new?error=failed',
    logErrors: true,
  }
)
```

### 6. Error Analytics Dashboard

Admin dashboard for error monitoring:

```typescript
// app/@admin/analytics/errors/page.tsx
import { errorLogger } from '@/lib/errors/logging'
import { ErrorCategory, ErrorSeverity } from '@/lib/errors/classification'

export default async function ErrorAnalyticsPage() {
  const stats = await errorLogger.getErrorStats()
  const recentErrors = await errorLogger.getErrors({ resolved: false })

  return (
    <div>
      <h1>Error Analytics</h1>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Errors</h3>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Unresolved</h3>
          <p className="stat-value text-red-600">{stats.unresolved}</p>
        </div>
        <div className="stat-card">
          <h3>Resolution Rate</h3>
          <p className="stat-value">{stats.resolutionRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* By Category */}
      <div className="chart-container">
        <h2>Errors by Category</h2>
        <CategoryChart data={stats.byCategory} />
      </div>

      {/* By Severity */}
      <div className="chart-container">
        <h2>Errors by Severity</h2>
        <SeverityChart data={stats.bySeverity} />
      </div>

      {/* Recent Errors */}
      <div className="error-list">
        <h2>Recent Unresolved Errors</h2>
        <ErrorTable errors={recentErrors} />
      </div>
    </div>
  )
}
```

### 7. Alert System Integration

Integration with external alerting services:

```typescript
// lib/errors/alerts.ts
import { DeesseError } from './classification'

export interface AlertConfig {
  enabled: boolean
  service: 'sentry' | 'datadog' | 'pagerduty' | 'slack'
  severityThreshold: ErrorSeverity
  rateLimit: number // alerts per hour
  webhook?: string
}

export class AlertManager {
  private config: AlertConfig
  private alertCount: number = 0
  private resetTime: Date = new Date(Date.now() + 3600000) // 1 hour

  constructor(config: AlertConfig) {
    this.config = config
  }

  async sendAlert(error: DeesseError) {
    if (!this.config.enabled) {
      return
    }

    // Check severity threshold
    const severityLevels = {
      [ErrorSeverity.LOW]: 1,
      [ErrorSeverity.MEDIUM]: 2,
      [ErrorSeverity.HIGH]: 3,
      [ErrorSeverity.CRITICAL]: 4,
    }

    if (severityLevels[error.context.severity] < severityLevels[this.config.severityThreshold]) {
      return
    }

    // Rate limiting
    if (this.alertCount >= this.config.rateLimit) {
      console.warn('Alert rate limit exceeded')
      return
    }

    if (new Date() > this.resetTime) {
      this.alertCount = 0
      this.resetTime = new Date(Date.now() + 3600000)
    }

    this.alertCount++

    // Send to service
    switch (this.config.service) {
      case 'sentry':
        await this.sendToSentry(error)
        break
      case 'datadog':
        await this.sendToDatadog(error)
        break
      case 'slack':
        await this.sendToSlack(error)
        break
      case 'pagerduty':
        await this.sendToPagerDuty(error)
        break
    }
  }

  private async sendToSentry(error: DeesseError) {
    // Implementation depends on Sentry SDK
  }

  private async sendToDatadog(error: DeesseError) {
    // Implementation depends on Datadog SDK
  }

  private async sendToSlack(error: DeesseError) {
    if (!this.config.webhook) return

    await fetch(this.config.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *${error.context.severity.toUpperCase()}* Error: ${error.message}`,
        attachments: [{
          color: this.getColorForSeverity(error.context.severity),
          fields: [
            { title: 'Category', value: error.context.category, short: true },
            { title: 'Code', value: error.context.code || 'N/A', short: true },
            { title: 'Time', value: error.timestamp.toISOString(), short: true },
          ],
        }],
      }),
    })
  }

  private async sendToPagerDuty(error: DeesseError) {
    // Implementation depends on PagerDuty API
  }

  private getColorForSeverity(severity: ErrorSeverity): string {
    const colors = {
      [ErrorSeverity.LOW]: '#36a64f', // green
      [ErrorSeverity.MEDIUM]: '#ff9900', // orange
      [ErrorSeverity.HIGH]: '#ff0000', // red
      [ErrorSeverity.CRITICAL]: '#8b0000', // dark red
    }
    return colors[severity]
  }
}

export const alertManager = new AlertManager({
  enabled: process.env.NODE_ENV === 'production',
  service: 'slack',
  severityThreshold: ErrorSeverity.HIGH,
  rateLimit: 10,
  webhook: process.env.SLACK_WEBHOOK_URL,
})
```

## Implementation Priority

1. **High Priority**
   - Error classification system
   - Error logging & tracking
   - Collection-specific error handling

2. **Medium Priority**
   - Error boundary components
   - Server action error handling
   - Alert system integration

3. **Low Priority**
   - Error analytics dashboard
   - Advanced reporting features
   - Machine learning-based error prediction

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  errorHandling: {
    classification: {
      enabled: true,
      defaultSeverity: 'medium',
    },
    logging: {
      enabled: true,
      endpoint: process.env.LOGGING_ENDPOINT,
      maxLogs: 10000,
    },
    alerts: {
      enabled: process.env.NODE_ENV === 'production',
      service: 'slack',
      severityThreshold: 'high',
      rateLimit: 10,
    },
    collections: {
      autoNotFound: true,
      autoValidation: true,
      logAllErrors: true,
    },
  },
})
```
