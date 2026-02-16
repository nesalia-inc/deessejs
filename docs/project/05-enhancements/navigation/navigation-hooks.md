# Server Actions & Cache Management for DeesseJS

## Overview

Recommendations for implementing comprehensive Server Actions and cache management using Next.js `updateTag()`, `refresh()`, and navigation hooks.

## Current State Analysis

Based on documentation analysis, DeesseJS has:
- `docs\next\cache-revalidation-enhancements.md` - Basic revalidation strategies
- `docs\next\auth-integration-enhancements.md` - Server Action auth handling

Current gaps:
- No `updateTag()` integration for read-your-own-writes
- Limited navigation hooks integration
- No performance monitoring with Web Vitals
- Missing link status feedback

## Recommended Enhancements

### 1. Read-Your-Own-Writes with updateTag

Implement instant UI updates for user actions:

```typescript
// lib/actions/collection-actions.ts
'use server'

import { updateTag, refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@deessejs/db'
import { requireAuth } from '@/lib/auth/hooks'

export async function createPost(formData: FormData) {
  const user = await requireAuth()

  const title = formData.get('title') as string
  const content = formData.get('content') as string

  // Create post
  const post = await db.posts.create({
    data: {
      title,
      content,
      authorId: user.id,
    },
  })

  // Update tags so user immediately sees their changes
  // This is read-your-own-writes - user should see their new post immediately
  updateTag('posts') // Invalidate list pages
  updateTag(`post-${post.id}`) // Invalidate detail page

  // Redirect to the new post
  redirect(`/posts/${post.id}`)
}

export async function updatePost(id: string, formData: FormData) {
  const user = await requireAuth()

  const title = formData.get('title') as string
  const content = formData.get('content') as string

  // Update post
  const post = await db.posts.update({
    where: { id },
    data: { title, content },
  })

  // Update tags for immediate UI refresh
  updateTag('posts')
  updateTag(`post-${id}`)

  // Refresh the router to show updated data
  refresh()

  return post
}

export async function deletePost(id: string) {
  const user = await requireAuth()

  // Delete post
  await db.posts.delete({
    where: { id },
  })

  // Update tags to remove from UI
  updateTag('posts')
  updateTag(`post-${id}`)

  // Redirect to posts list
  redirect('/posts')
}
```

### 2. Comprehensive Server Action Patterns

Standardized Server Action patterns for DeesseJS:

```typescript
// lib/actions/server-action-patterns.ts
'use server'

import { updateTag, refresh, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import { DeesseError } from '@/lib/errors/classification'
import { ErrorFactory } from '@/lib/errors/classification'
import { requireAuth, requirePermission } from '@/lib/auth/hooks'

export interface ServerActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export async function withErrorHandling<T>(
  action: () => Promise<T>,
  options?: {
    revalidateTags?: string[]
    revalidatePaths?: string[]
    redirect?: string
    refresh?: boolean
  }
): Promise<ServerActionResult<T>> {
  try {
    const result = await action()

    // Handle revalidation if specified
    if (options?.revalidateTags) {
      for (const tag of options.revalidateTags) {
        updateTag(tag)
      }
    }

    if (options?.revalidatePaths) {
      for (const path of options.revalidatePaths) {
        revalidatePath(path)
      }
    }

    if (options?.refresh) {
      refresh()
    }

    if (options?.redirect) {
      redirect(options.redirect)
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    if (error instanceof DeesseError) {
      return {
        success: false,
        error: error.context.userMessage || error.message,
        code: error.context.code,
      }
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unknown error occurred',
    }
  }
}

// Usage examples
export async function createProduct(formData: FormData) {
  return withErrorHandling(
    async () => {
      const user = await requireAuth()
      await requirePermission('products', 'write')

      const product = await db.products.create({
        data: {
          name: formData.get('name') as string,
          price: Number(formData.get('price')),
        },
      })

      return product
    },
    {
      revalidateTags: ['products'],
      revalidatePaths: ['/products', '/admin/products'],
      redirect: `/admin/products/${product.id}`,
      refresh: true,
    }
  )
}
```

### 3. Navigation Hooks Integration

Comprehensive navigation utilities for DeesseJS:

```typescript
// lib/navigation/hooks.ts
'use client'

import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation'
import { useLinkStatus } from 'next/link'
import { useEffect, useState } from 'react'

export function useDeesseNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const searchParams = useSearchParams()

  return {
    router,
    pathname,
    params,
    searchParams,
  }
}

// Smart navigation with loading states
export function useSmartNavigation() {
  const { router, pathname } = useDeesseNavigation()
  const [isLoading, setIsLoading] = useState(false)
  const [currentPath, setCurrentPath] = useState(pathname)

  useEffect(() => {
    if (pathname !== currentPath) {
      setIsLoading(true)
      setCurrentPath(pathname)

      // Reset loading after navigation
      const timer = setTimeout(() => setIsLoading(false), 500)
      return () => clearTimeout(timer)
    }
  }, [pathname, currentPath])

  const navigate = async (
    href: string,
    options?: { scroll?: boolean; prefetch?: boolean }
  ) => {
    setIsLoading(true)

    if (options?.prefetch) {
      router.prefetch(href)
    }

    router.push(href, { scroll: options?.scroll ?? true })
  }

  return {
    navigate,
    isLoading,
    router,
    pathname,
  }
}

// Collection-aware navigation
export function useCollectionNavigation(collection: string) {
  const { router, pathname } = useDeesseNavigation()
  const [isNavigating, setIsNavigating] = useState(false)

  const navigateToList = () => {
    setIsNavigating(true)
    router.push(`/${collection}`)
    setTimeout(() => setIsNavigating(false), 300)
  }

  const navigateToItem = (slugOrId: string) => {
    setIsNavigating(true)
    router.push(`/${collection}/${slugOrId}`)
    setTimeout(() => setIsNavigating(false), 300)
  }

  const navigateToEdit = (slugOrId: string) => {
    setIsNavigating(true)
    router.push(`/${collection}/${slugOrId}/edit`)
    setTimeout(() => setIsNavigating(false), 300)
  }

  const navigateToCreate = () => {
    setIsNavigating(true)
    router.push(`/${collection}/new`)
    setTimeout(() => setIsNavigating(false), 300)
  }

  return {
    navigateToList,
    navigateToItem,
    navigateToEdit,
    navigateToCreate,
    isNavigating,
  }
}
```

### 4. Link Status Components

Loading indicators for better UX:

```typescript
// components/navigation/link-with-status.tsx
'use client'

import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { useDeesseNavigation } from '@/lib/navigation/hooks'

interface LinkWithStatusProps {
  href: string
  children: React.ReactNode
  prefetch?: boolean
  className?: string
  disabled?: boolean
  showStatus?: boolean
}

export function LinkWithStatus({
  href,
  children,
  prefetch = false,
  className,
  disabled = false,
  showStatus = true,
}: LinkWithStatusProps) {
  const { pending } = useLinkStatus()
  const { navigate, isLoading } = useSmartNavigation()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    navigate(href, { prefetch: true })
  }

  const linkPending = (prefetch ? pending : isLoading) && !disabled

  return (
    <>
      <Link
        href={href}
        prefetch={prefetch}
        className={className}
        onClick={handleClick}
      >
        {children}
      </Link>

      {showStatus && linkPending && (
        <LinkStatusIndicator />
      )}
    </>
  )
}

function LinkStatusIndicator() {
  return (
    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-2 animate-pulse" />
  )
}

// Collection navigation bar
export function CollectionNav({ collection }: { collection: string }) {
  const { navigateToList, navigateToCreate, isNavigating } = useCollectionNavigation(collection)

  return (
    <nav className="flex items-center gap-4">
      <LinkWithStatus href={`/${collection}`}>
        {collection}
      </LinkWithStatus>

      <LinkWithStatus
        href={`/${collection}/new`}
        showStatus={isNavigating}
      >
        Add New
      </LinkWithStatus>
    </nav>
  )
}
```

### 5. Dynamic Params Handling

Smart handling of dynamic parameters across Server and Client:

```typescript
// lib/navigation/dynamic-params.ts
'use client'

import { useParams } from 'next/navigation'
import { use } from 'react'

interface UseTypedParamsOptions<T> {
  fallback?: T
}

export function useTypedParams<T extends Record<string, string | string[]>>(
  options?: UseTypedParamsOptions<T>
): T {
  const params = useParams<T>()
  const [clientParams, setClientParams] = useState<T | null>(null)

  // Sync params on client-side navigation
  useEffect(() => {
    setClientParams(params)
  }, [params])

  // Return params once synced
  const syncedParams = clientParams || params

  return options?.fallback ? { ...options.fallback, ...syncedParams } : syncedParams
}

// Server Component wrapper for type-safe params
export function withTypedParams<
  T extends Record<string, string | string[]>,
  P extends { params: Promise<T> }
>(Component: React.ComponentType<P>) {
  return async function WithTypedParamsWrapper(props: P) {
    const params = await props.params

    return <Component {...props} params={params} />
  }
}

// Usage example
// Server Component
export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const post = await db.posts.findBySlug(slug)

  return <BlogPostContent post={post} />
}

// Client Component
'use client'

export function BlogPostContent({ post }: { post: any }) {
  const params = useTypedParams<{ slug: string }>()

  return (
    <div>
      <h1>{post.title}</h1>
      <p>Slug: {params.slug}</p>
    </div>
  )
}
```

### 6. URL State Management

Sophisticated URL state management with collections:

```typescript
// lib/navigation/url-state.ts
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

interface URLState {
  page: number
  sort: string
  order: 'asc' | 'desc'
  filters: Record<string, string>
}

export function useCollectionURLState(
  defaultState: Partial<URLState> = {}
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parse current URL state
  const getState = (): URLState => ({
    page: parseInt(searchParams.get('page') || '1'),
    sort: searchParams.get('sort') || 'createdAt',
    order: (searchParams.get('order') || 'desc') as 'asc' | 'desc',
    filters: Object.fromEntries(searchParams.entries()),
  })

  const [state, setState] = useState<URLState>(() => getState())

  // Sync with URL changes
  useEffect(() => {
    setState(getState())
  }, [pathname, searchParams])

  // Update URL when state changes
  const setStateWithURL = (newState: Partial<URLState>) => {
    const mergedState = { ...state, ...newState }
    setState(mergedState)

    const params = new URLSearchParams()

    // Add page
    if (mergedState.page !== 1) {
      params.set('page', String(mergedState.page))
    }

    // Add sort and order
    if (mergedState.sort !== 'createdAt') {
      params.set('sort', mergedState.sort)
    }

    if (mergedState.order !== 'desc') {
      params.set('order', mergedState.order)
    }

    // Add filters
    for (const [key, value] of Object.entries(mergedState.filters)) {
      if (value) {
        params.set(key, value)
      }
    }

    // Update URL without full page reload
    router.replace(`${pathname}?${params}`)
  }

  // Specific state setters
  const setPage = (page: number) => setStateWithURL({ page })
  const setSort = (sort: string) => setStateWithURL({ sort })
  const setOrder = (order: 'asc' | 'desc') => setStateWithURL({ order })
  const setFilter = (key: string, value: string) => {
    setStateWithURL({
      page: 1, // Reset to first page when filtering
      filters: { ...state.filters, [key]: value },
    })
  }
  const clearFilters = () => {
    setStateWithURL({
      page: 1,
      filters: {},
    })
  }

  return {
    state,
    setPage,
    setSort,
    setOrder,
    setFilter,
    clearFilters,
  }
}

// Usage in a collection list component
export function PostList() {
  const { state, setPage, setSort, setOrder, setFilter } = useCollectionURLState({
    page: 1,
    sort: 'createdAt',
    order: 'desc',
    filters: {},
  })

  const posts = usePosts({
    page: state.page,
    sort: state.sort,
    order: state.order,
    filters: state.filters,
  })

  return (
    <div>
      <FilterBar
        sort={state.sort}
        order={state.order}
        filters={state.filters}
        onSortChange={setSort}
        onOrderChange={setOrder}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
      />

      <PostList posts={posts} />

      <Pagination
        currentPage={state.page}
        totalPages={posts.totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
```

### 7. Performance Monitoring with Web Vitals

Performance tracking integration:

```typescript
// lib/performance/web-vitals.tsx
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics service
    sendToAnalytics(metric)
  })

  return null
}

// Custom hook for Web Vitals tracking
export function useWebVitals() {
  return {
    trackNavigation: (url: string) => {
      // Track page navigation
      sendToAnalytics({
        name: 'navigation',
        value: 0,
        label: url,
      })
    },
    trackAction: (action: string, properties?: Record<string, any>) => {
      // Track user actions
      sendToAnalytics({
        name: 'action',
        value: 0,
        label: action,
        properties,
      })
    },
  }
}

// Analytics integration
function sendToAnalytics(metric: any) {
  // Send to your analytics service (Vercel Analytics, Plausible, PostHog, etc.)
  // Example with Vercel Analytics:
  if (window.va) {
    window.va('event', {
      name: metric.name,
      value: metric.value,
      label: metric.id,
      // Only include non-interactive events to avoid affecting bounce rate
      non_interaction: metric.name !== 'CLS' || metric.value < 0.1,
    })
  }

  // Or send to custom endpoint
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metric),
    keepalive: true,
  }).catch(console.error)
}

// Performance budget checker
export interface PerformanceBudget {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  inp: number // Interaction to Next Paint
}

export function checkPerformanceBudget(
  budget: PerformanceBudget
): { withinBudget: boolean; violations: string[] } {
  const violations: string[] = []

  if (budget.fcp > 2000) violations.push('FCP exceeded 2s')
  if (budget.lcp > 2500) violations.push('LCP exceeded 2.5s')
  if (budget.fid > 100) violations.push('FID exceeded 100ms')
  if (budget.cls > 0.1) violations.push('CLS exceeded 0.1')
  if (budget.inp > 200) violations.push('INP exceeded 200ms')

  return {
    withinBudget: violations.length === 0,
    violations,
  }
}
```

### 8. Advanced Router Utilities

Enhanced router utilities for DeesseJS:

```typescript
// lib/navigation/router-utils.ts
'use client'

import { useRouter } from 'next/navigation'
import { useDeesseNavigation } from '@/lib/navigation/hooks'

export function useDeesseRouter() {
  const { router } = useDeesseNavigation()

  return {
    ...router,

    // Collection-aware navigation
    navigateToCollection: (collection: string, action: 'list' | 'detail' | 'create' | 'edit') => {
      const pathMap = {
        list: `/${collection}`,
        detail: `/${collection}/[slug]`,
        create: `/${collection}/new`,
        edit: `/${collection}/[slug]/edit`,
      }

      switch (action) {
        case 'list':
          router.push(pathMap.list)
          break
        case 'create':
          router.push(pathMap.create)
          break
        default:
          // For detail/edit, you'll need to provide the slug
          console.warn('Please provide a slug for detail/edit navigation')
      }
    },

    // Navigation with automatic loading state
    navigateWithLoading: (href: string, options?: { scroll?: boolean }) => {
      router.push(href, { scroll: options?.scroll ?? true })
    },

    // Navigate back with confirmation
    navigateBackWithConfirmation: (message?: string) => {
      if (message && !confirm(message)) {
        return false
      }
      router.back()
      return true
    },

    // Navigate and refresh
    navigateAndRefresh: (href: string) => {
      router.push(href)
      router.refresh()
    },

    // Navigate with state preservation
    navigateWithState: <T>(href: string, state: T) => {
      router.push(href, { state })
    },
  }
}

// Safe navigation wrapper with error handling
export function useSafeNavigation() {
  const { navigateWithLoading, navigateBackWithConfirmation } = useDeesseRouter()

  return {
    navigateWithLoading,
    navigateBackWithConfirmation,

    // Safe navigate with error handling
    safeNavigate: async (href: string) => {
      try {
        navigateWithLoading(href)
        return true
      } catch (error) {
        console.error('Navigation failed:', error)
        return false
      }
    },
  }
}
```

## Implementation Priority

1. **High Priority**
   - Read-your-own-writes with updateTag
   - Comprehensive Server Action patterns
   - Navigation hooks integration

2. **Medium Priority**
   - Link status components
   - Dynamic params handling
   - URL state management

3. **Low Priority**
   - Performance monitoring with Web Vitals
   - Advanced router utilities

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  serverActions: {
    autoUpdateTags: true,
    autoRefresh: true,
    errorHandling: {
      useErrorHandling: true,
      revalidateOnSuccess: true,
    },
    navigation: {
      smartNavigation: true,
      loadingStates: true,
      preserveScroll: true,
    },
    webVitals: {
      enabled: true,
      reporting: 'vercel-analytics',
      budget: {
        fcp: 2000,
        lcp: 2500,
        fid: 100,
        cls: 0.1,
        inp: 200,
      },
    },
  },
})
```
