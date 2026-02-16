# Cache Revalidation Enhancements for DeesseJS

## Overview

Recommendations for enhancing DeesseJS's cache revalidation system using Next.js `refresh()`, `revalidatePath()`, and `revalidateTag()` functions.

## Current State Analysis

Based on documentation analysis, DeesseJS has:
- `docs\next\cache-management.md` - Basic cacheLife and cacheTag
- `docs\next\fetch-caching.md` - Fetch API caching
- `docs\next\suspense-cache-patterns.md` - Suspense integration

Current gaps:
- No intelligent auto-refresh strategies
- Limited collection-aware revalidation
- No revalidation scheduling
- Missing cache dependency tracking

## Recommended Enhancements

### 1. Smart Auto-Refresh System

Intelligent refresh that only updates affected components:

```typescript
// lib/cache/smart-refresh.ts
import { refresh } from 'next/cache'
import { revalidatePath } from 'next/cache'

export interface RefreshContext {
  collection: string
  operation: 'create' | 'update' | 'delete'
  id?: string
  data?: any
}

export class SmartRefreshManager {
  private refreshRegistry = new Map<string, Set<string>>()

  // Register paths that depend on a collection
  registerDependency(collection: string, path: string) {
    if (!this.refreshRegistry.has(collection)) {
      this.refreshRegistry.set(collection, new Set())
    }
    this.refreshRegistry.get(collection)!.add(path)
  }

  // Smart refresh after mutations
  async afterMutation(context: RefreshContext) {
    const { collection, operation, id } = context

    // Get dependent paths
    const dependentPaths = this.refreshRegistry.get(collection) || new Set()

    // Invalidate all dependent paths
    for (const path of dependentPaths) {
      revalidatePath(path)
    }

    // Refresh client-side router cache
    refresh()

    // Trigger collection-specific revalidation
    await this.revalidateCollectionTags(context)
  }

  private async revalidateCollectionTags(context: RefreshContext) {
    const { collection, operation } = context

    // Revalidate collection tag
    revalidateTag(collection, 'max')

    // Revalidate item-specific tag if we have an ID
    if (context.id) {
      revalidateTag(`${collection}:${context.id}`, 'max')
    }

    // Revalidate related collections
    const relatedCollections = this.getRelatedCollections(collection)
    for (const related of relatedCollections) {
      revalidateTag(related, 'max')
    }
  }

  private getRelatedCollections(collection: string): string[] {
    // Define collection relationships
    const relationships: Record<string, string[]> = {
      posts: ['users', 'categories', 'tags'],
      products: ['categories', 'reviews'],
      comments: ['posts', 'users'],
    }

    return relationships[collection] || []
  }
}

export const smartRefreshManager = new SmartRefreshManager()
```

### 2. Collection-Aware Revalidation

Auto-generate revalidation logic for collections:

```typescript
// lib/cache/collection-revalidation.ts
import { revalidatePath, revalidateTag } from 'next/cache'

export interface CollectionRevalidationConfig {
  collection: string
  paths: {
    list: string
    detail: string // pattern with [id] or [slug]
    admin?: string
  }
  tags: {
    collection: string
    items: string // pattern for item tags
  }
  dependencies: string[] // Related collections
  revalidationStrategy: 'aggressive' | 'lazy' | 'smart'
}

export async function revalidateCollection(
  config: CollectionRevalidationConfig,
  operation: 'create' | 'update' | 'delete' | 'publish',
  item?: { id: string; slug?: string }
) {
  switch (operation) {
    case 'create':
      await revalidateCreate(config, item)
      break
    case 'update':
      await revalidateUpdate(config, item)
      break
    case 'delete':
      await revalidateDelete(config, item)
      break
    case 'publish':
      await revalidatePublish(config, item)
      break
  }
}

async function revalidateCreate(config: CollectionRevalidationConfig, item?: any) {
  // Invalidate list pages
  revalidatePath(config.paths.list)

  // Invalidate collection tag
  revalidateTag(config.tags.collection, 'max')

  // Invalidate dependencies
  for (const dep of config.dependencies) {
    revalidateTag(dep, 'max')
  }
}

async function revalidateUpdate(config: CollectionRevalidationConfig, item?: any) {
  if (!item) return

  // Invalidate specific item page
  if (item.slug) {
    const detailPath = config.paths.detail.replace('[slug]', item.slug)
    revalidatePath(detailPath)
  } else if (item.id) {
    const detailPath = config.paths.detail.replace('[id]', item.id)
    revalidatePath(detailPath)
  }

  // Invalidate list pages (if strategy is aggressive)
  if (config.revalidationStrategy === 'aggressive') {
    revalidatePath(config.paths.list)
  }

  // Invalidate admin pages
  if (config.paths.admin) {
    revalidatePath(config.paths.admin)
  }

  // Invalidate item-specific tag
  revalidateTag(`${config.tags.items}:${item.id}`, 'max')

  // Invalidate collection tag for list pages
  revalidateTag(config.tags.collection, 'max')
}

async function revalidateDelete(config: CollectionRevalidationConfig, item?: any) {
  if (!item) return

  // Invalidate the specific item page
  if (item.slug) {
    const detailPath = config.paths.detail.replace('[slug]', item.slug)
    revalidatePath(detailPath)
  }

  // Invalidate list pages
  revalidatePath(config.paths.list)

  // Invalidate admin pages
  if (config.paths.admin) {
    revalidatePath(config.paths.admin)
  }

  // Invalidate item-specific tag
  revalidateTag(`${config.tags.items}:${item.id}`, 'max')

  // Invalidate collection tag
  revalidateTag(config.tags.collection, 'max')
}

async function revalidatePublish(config: CollectionRevalidationConfig, item?: any) {
  // Similar to update but also invalidate home page if featured
  await revalidateUpdate(config, item)
  revalidatePath('/', 'layout')
}
```

### 3. Scheduled Revalidation

Cron-based revalidation for time-based content:

```typescript
// lib/cache/scheduled-revalidation.ts
import { revalidateTag, revalidatePath } from 'next/cache'

export interface ScheduledRevalidation {
  id: string
  schedule: string // Cron expression
  paths?: string[]
  tags?: string[]
  collections?: string[]
  enabled: boolean
}

class ScheduledRevalidationManager {
  private schedules: Map<string, ScheduledRevalidation> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  register(schedule: ScheduledRevalidation) {
    this.schedules.set(schedule.id, schedule)

    if (schedule.enabled) {
      this.startTimer(schedule.id)
    }
  }

  private startTimer(scheduleId: string) {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) return

    // Calculate next execution time based on cron
    const nextExecution = this.getNextExecution(schedule.schedule)

    const timer = setTimeout(async () => {
      await this.executeRevalidation(schedule)
      this.startTimer(scheduleId) // Schedule next execution
    }, nextExecution - Date.now())

    this.timers.set(scheduleId, timer)
  }

  private async executeRevalidation(schedule: ScheduledRevalidation) {
    // Revalidate paths
    if (schedule.paths) {
      for (const path of schedule.paths) {
        revalidatePath(path)
      }
    }

    // Revalidate tags
    if (schedule.tags) {
      for (const tag of schedule.tags) {
        revalidateTag(tag, 'max')
      }
    }

    // Revalidate collections
    if (schedule.collections) {
      for (const collection of schedule.collections) {
        revalidateTag(collection, 'max')
      }
    }
  }

  private getNextExecution(cron: string): number {
    // Simple cron parser (you'd want to use a proper cron library)
    const [minute, hour, day, month, dayOfWeek] = cron.split(' ')

    const now = new Date()
    const next = new Date(now)

    // This is simplified - use a proper cron library in production
    if (minute !== '*') {
      next.setMinutes(parseInt(minute))
    }

    if (hour !== '*') {
      next.setHours(parseInt(hour))
    }

    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }

    return next.getTime()
  }

  stop(scheduleId: string) {
    const timer = this.timers.get(scheduleId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(scheduleId)
    }
  }

  stopAll() {
    for (const [id] of this.timers) {
      this.stop(id)
    }
  }
}

export const scheduledRevalidationManager = new ScheduledRevalidationManager()

// Default schedules
scheduledRevalidationManager.register({
  id: 'homepage',
  schedule: '0 * * * *', // Every hour
  paths: ['/'],
  tags: ['homepage'],
  enabled: true,
})

scheduledRevalidationManager.register({
  id: 'sitemaps',
  schedule: '0 0 * * *', // Daily at midnight
  paths: ['/sitemap.xml'],
  tags: ['sitemap'],
  enabled: true,
})
```

### 4. Dependency-Aware Revalidation

Track and invalidate dependent caches:

```typescript
// lib/cache/dependency-tracking.ts
import { revalidateTag, revalidatePath } from 'next/cache'

export interface CacheDependency {
  source: {
    type: 'collection' | 'path' | 'tag'
    identifier: string
  }
  dependents: Array<{
    type: 'collection' | 'path' | 'tag'
    identifier: string
    invalidationDelay?: number // milliseconds
  }>
}

class CacheDependencyTracker {
  private dependencies = new Map<string, CacheDependency[]>()

  addDependency(dependency: CacheDependency) {
    const key = this.getSourceKey(dependency.source)

    if (!this.dependencies.has(key)) {
      this.dependencies.set(key, [])
    }

    this.dependencies.get(key)!.push(dependency)
  }

  async invalidateSource(source: { type: string; identifier: string }) {
    const key = this.getSourceKey(source)
    const dependencies = this.dependencies.get(key) || []

    for (const dep of dependencies) {
      // Add delay if specified
      if (dep.invalidationDelay) {
        setTimeout(() => {
          this.invalidateDependent(dep)
        }, dep.invalidationDelay)
      } else {
        await this.invalidateDependent(dep)
      }
    }
  }

  private async invalidateDependent(dependent: CacheDependency['dependents'][0]) {
    switch (dependent.type) {
      case 'collection':
        revalidateTag(dependent.identifier, 'max')
        break
      case 'path':
        revalidatePath(dependent.identifier)
        break
      case 'tag':
        revalidateTag(dependent.identifier, 'max')
        break
    }
  }

  private getSourceKey(source: CacheDependency['source']): string {
    return `${source.type}:${source.identifier}`
  }
}

export const cacheDependencyTracker = new CacheDependencyTracker()

// Example: Homepage depends on posts collection
cacheDependencyTracker.addDependency({
  source: {
    type: 'collection',
    identifier: 'posts',
  },
  dependents: [
    {
      type: 'path',
      identifier: '/',
      invalidationDelay: 1000, // Wait 1 second before invalidating homepage
    },
  ],
})
```

### 5. Incremental Static Revalidation (ISR)

Enhanced ISR with fine-grained control:

```typescript
// lib/cache/isr.ts
import { revalidatePath } from 'next/cache'

export interface ISRConfig {
  path: string
  revalidate: number // seconds
  staleWhileRevalidate?: boolean
  maxAge?: number // browser cache
}

export class ISRManager {
  private isrCache = new Map<string, ISRConfig>()

  configure(config: ISRConfig) {
    this.isrCache.set(config.path, config)
  }

  getHeaders(path: string): HeadersInit {
    const config = this.isrCache.get(path)

    if (!config) {
      return {}
    }

    const headers: HeadersInit = {}

    // Set revalidation header
    headers['Cache-Control'] = `s-maxage=${config.revalidate}, stale-while-revalidate=${config.staleWhileRevalidate ? config.revalidate * 2 : 600}`

    // Set browser cache if specified
    if (config.maxAge) {
      headers['Cache-Control'] = `max-age=${config.maxAge}, ${headers['Cache-Control']}`
    }

    return headers
  }

  async revalidate(path: string) {
    const config = this.isrCache.get(path)

    if (config) {
      revalidatePath(path)

      // Log revalidation
      console.log(`[ISR] Revalidated ${path} (every ${config.revalidate}s)`)
    }
  }

  getStats() {
    return {
      total: this.isrCache.size,
      paths: Array.from(this.isrCache.keys()),
      averageRevalidateTime: Array.from(this.isrCache.values())
        .reduce((sum, config) => sum + config.revalidate, 0) / this.isrCache.size,
    }
  }
}

export const isrManager = new ISRManager()

// Configure ISR for collections
isrManager.configure({
  path: '/blog',
  revalidate: 3600, // 1 hour
  staleWhileRevalidate: true,
  maxAge: 300, // 5 minutes browser cache
})

isrManager.configure({
  path: '/products',
  revalidate: 1800, // 30 minutes
  staleWhileRevalidate: true,
})
```

### 6. On-Demand Revalidation API

Webhook-based revalidation for external services:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/webhooks'

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const signature = request.headers.get('x-webhook-signature')
  if (!signature || !verifyWebhookSignature(await request.text(), signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = await request.json()
  const { type, path, tag, secret } = body

  // Verify secret for security
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
  }

  try {
    switch (type) {
      case 'path':
        revalidatePath(path)
        break
      case 'tag':
        revalidateTag(tag, 'max')
        break
      case 'collection':
        revalidatePath(path)
        revalidateTag(tag, 'max')
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Revalidation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

### 7. Cache Warming

Pre-populate cache for better performance:

```typescript
// lib/cache/cache-warming.ts
import { revalidatePath } from 'next/cache'

export interface CacheWarmupConfig {
  paths: string[]
  priority: 'high' | 'medium' | 'low'
  concurrency?: number
  delayBetweenRequests?: number
}

class CacheWarmer {
  async warmup(config: CacheWarmupConfig) {
    const { paths, concurrency = 5, delayBetweenRequests = 100 } = config

    // Process paths in batches
    for (let i = 0; i < paths.length; i += concurrency) {
      const batch = paths.slice(i, i + concurrency)

      await Promise.all(
        batch.map(async (path, index) => {
          // Add delay between requests to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, index * delayBetweenRequests))

          await this.warmPath(path)
        })
      )
    }
  }

  private async warmPath(path: string) {
    try {
      const response = await fetch(`${process.env.APP_URL}${path}`, {
        method: 'HEAD',
        cache: 'no-store',
      })

      if (response.ok) {
        console.log(`[Cache Warmer] Warmed up ${path}`)
      } else {
        console.error(`[Cache Warmer] Failed to warm up ${path}: ${response.status}`)
      }
    } catch (error) {
      console.error(`[Cache Warmer] Error warming up ${path}:`, error)
    }
  }

  async warmupAfterDeploy() {
    // Common paths to warm up after deployment
    await this.warmup({
      paths: [
        '/',
        '/blog',
        '/products',
        '/about',
        '/contact',
        '/api/health',
      ],
      priority: 'high',
      concurrency: 3,
      delayBetweenRequests: 200,
    })
  }

  async warmupScheduledContent() {
    // Warm up content scheduled to be published soon
    const scheduledContent = await this.getScheduledContent()

    const paths = scheduledContent.map(item => `/${item.collection}/${item.slug}`)

    await this.warmup({
      paths,
      priority: 'medium',
      concurrency: 2,
    })
  }

  private async getScheduledContent(): Promise<Array<{ collection: string; slug: string }>> {
    // Fetch content scheduled to be published within the next hour
    // This would query your database for scheduled posts
    return []
  }
}

export const cacheWarmer = new CacheWarmer()
```

### 8. Revalidation Queue

Queue system for controlled revalidation:

```typescript
// lib/cache/revalidation-queue.ts
import { revalidatePath, revalidateTag } from 'next/cache'

export interface RevalidationJob {
  id: string
  type: 'path' | 'tag' | 'collection'
  target: string
  priority: number
  scheduledFor?: Date
  retries: number
  maxRetries: number
}

class RevalidationQueue {
  private queue: RevalidationJob[] = []
  private processing = false
  private concurrency = 5

  add(job: Omit<RevalidationJob, 'id' | 'retries'>) {
    const fullJob: RevalidationJob = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      retries: 0,
    }

    this.queue.push(fullJob)
    this.queue.sort((a, b) => b.priority - a.priority)

    setImmediate(() => this.process())
  }

  private async process() {
    if (this.processing) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const jobs = this.queue.splice(0, this.concurrency)

      await Promise.allSettled(
        jobs.map(job => this.processJob(job))
      )
    }

    this.processing = false
  }

  private async processJob(job: RevalidationJob) {
    try {
      switch (job.type) {
        case 'path':
          revalidatePath(job.target)
          break
        case 'tag':
          revalidateTag(job.target, 'max')
          break
        case 'collection':
          revalidatePath(job.target)
          revalidateTag(job.target, 'max')
          break
      }

      console.log(`[Revalidation Queue] Completed ${job.id}`)
    } catch (error) {
      console.error(`[Revalidation Queue] Failed ${job.id}:`, error)

      // Retry if limit not reached
      if (job.retries < job.maxRetries) {
        job.retries++
        this.queue.push(job)
      }
    }
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      jobs: this.queue.map(job => ({
        id: job.id,
        type: job.type,
        target: job.target,
        priority: job.priority,
        retries: job.retries,
      })),
    }
  }

  clear() {
    this.queue = []
  }
}

export const revalidationQueue = new RevalidationQueue()
```

## Implementation Priority

1. **High Priority**
   - Smart auto-refresh system
   - Collection-aware revalidation
   - Dependency-aware revalidation

2. **Medium Priority**
   - Scheduled revalidation
   - Incremental Static Revalidation
   - On-Demand revalidation API

3. **Low Priority**
   - Cache warming
   - Revalidation queue
   - Advanced analytics

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  cacheRevalidation: {
    smartRefresh: {
      enabled: true,
      trackDependencies: true,
    },
    collections: {
      posts: {
        paths: {
          list: '/blog',
          detail: '/blog/[slug]',
          admin: '/admin/posts',
        },
        tags: {
          collection: 'posts',
          items: 'post',
        },
        dependencies: ['users', 'categories'],
        revalidationStrategy: 'smart',
      },
    },
    scheduled: [
      {
        id: 'homepage',
        schedule: '0 * * * *',
        paths: ['/'],
        enabled: true,
      },
    ],
    isr: {
      '/blog': { revalidate: 3600 },
      '/products': { revalidate: 1800 },
    },
    queue: {
      enabled: true,
      concurrency: 5,
      maxRetries: 3,
    },
    warming: {
      enabled: true,
      afterDeploy: true,
      scheduledContent: true,
    },
  },
})
```
