# Navigation, Search Params & User Agent Enhancements for DeesseJS

## Overview

Recommendations for implementing advanced URL state management, navigation awareness, and device detection using Next.js `useSearchParams`, `useSelectedLayoutSegment`, `useSelectedLayoutSegments`, and `userAgent`.

## Current State Analysis

Based on documentation analysis, DeesseJS has:

- `docs\next\route-segment-config.md` - Basic route configuration
- `docs\next\parallel-routes-advanced.md` - Parallel route handling

Current gaps:

- No type-safe search params management
- Limited active state detection for navigation
- Missing breadcrumb generation
- No device detection for adaptive UI
- Missing bot detection for SEO optimization

## Recommended Enhancements

### 1. Type-Safe Search Params Management

Create a comprehensive, type-safe system for managing URL search parameters:

```typescript
// lib/navigation/search-params.ts
'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useCallback } from 'react'

// Type-safe search parameter definitions
export interface SearchParamSchema<T = any> {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'date'
  required?: boolean
  defaultValue?: T
  validate?: (value: T) => boolean
  transform?: (value: string) => T
}

export interface CollectionSearchParams {
  // Pagination
  page?: number
  limit?: number
  // Sorting
  sort?: string
  order?: 'asc' | 'desc'
  // Filtering
  search?: string
  category?: string
  tags?: string[]
  status?: 'draft' | 'published' | 'archived'
  // Date ranges
  from?: string
  to?: string
  // Custom filters
  [key: string]: any
}

// Type-safe search params manager
export function useTypedSearchParams<T extends Record<string, SearchParamSchema>>(
  schema: T
) {
  const searchParams = useSearchParams()

  // Parse and validate search params according to schema
  const params = useMemo(() => {
    const result: any = {}

    for (const [key, config] of Object.entries(schema)) {
      const value = searchParams.get(key)

      if (value === null) {
        result[key] = config.defaultValue
        continue
      }

      try {
        switch (config.type) {
          case 'string':
            result[key] = value
            break
          case 'number':
            result[key] = config.transform ? config.transform(value) : parseFloat(value)
            break
          case 'boolean':
            result[key] = value === 'true'
            break
          case 'array':
            result[key] = searchParams.getAll(key)
            break
          case 'date':
            result[key] = new Date(value)
            break
          default:
            result[key] = value
        }

        // Validate if validator provided
        if (config.validate && !config.validate(result[key])) {
          result[key] = config.defaultValue
        }
      } catch (error) {
        console.warn(`Failed to parse search param "${key}":`, error)
        result[key] = config.defaultValue
      }
    }

    return result as {
      [K in keyof T]: T[K] extends SearchParamSchema<infer V> ? V : never
    }
  }, [searchParams, schema])

  // Create query string from params
  const createQueryString = useCallback((updates: Partial<{ [K in keyof T]: any }>) => {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null) {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.delete(key)
        value.forEach(v => params.append(key, String(v)))
      } else {
        params.set(key, String(value))
      }
    }

    return params.toString()
  }, [searchParams])

  // Update specific params
  const setParams = useCallback((updates: Partial<{ [K in keyof T]: any }>) => {
    return createQueryString(updates)
  }, [createQueryString])

  // Clear specific params
  const clearParams = useCallback((keys: (keyof T)[]) => {
    const params = new URLSearchParams(searchParams.toString())
    keys.forEach(key => params.delete(String(key)))
    return params.toString()
  }, [searchParams])

  // Reset to defaults
  const resetParams = useCallback(() => {
    const defaults = Object.entries(schema)
      .filter(([_, config]) => config.defaultValue !== undefined)
      .reduce((acc, [key, config]) => ({ ...acc, [key]: config.defaultValue }), {})

    return createQueryString(defaults)
  }, [schema, createQueryString])

  return {
    params,
    setParams,
    clearParams,
    resetParams,
    hasParam: (key: keyof T) => searchParams.has(String(key)),
    getParam: (key: keyof T) => params[key],
    queryString: searchParams.toString(),
  }
}

// Collection-specific search params hook
export function useCollectionSearchParams(
  collection: string,
  customSchema?: Record<string, SearchParamSchema>
) {
  const defaultSchema: Record<string, SearchParamSchema> = {
    page: { name: 'page', type: 'number', defaultValue: 1 },
    limit: { name: 'limit', type: 'number', defaultValue: 10 },
    sort: { name: 'sort', type: 'string', defaultValue: 'createdAt' },
    order: { name: 'order', type: 'string', defaultValue: 'desc' },
    search: { name: 'search', type: 'string', defaultValue: '' },
    tags: { name: 'tags', type: 'array', defaultValue: [] },
  }

  const schema = { ...defaultSchema, ...customSchema }

  return useTypedSearchParams(schema)
}

// Usage example
export function PostList() {
  const { params, setParams, clearParams } = useCollectionSearchParams('posts', {
    category: { name: 'category', type: 'string', defaultValue: 'all' },
    status: { name: 'status', type: 'string', defaultValue: 'published' },
  })

  const posts = usePosts({
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    order: params.order,
    search: params.search,
    category: params.category,
    tags: params.tags,
  })

  return (
    <div>
      <Filters
        currentFilters={params}
        onFilterChange={(filters) => {
          const queryString = setParams(filters)
          router.push(`${pathname}?${queryString}`)
        }}
      />

      <PostList posts={posts} />

      <Pagination
        page={params.page}
        limit={params.limit}
        total={posts.total}
        onPageChange={(page) => {
          const queryString = setParams({ page })
          router.push(`${pathname}?${queryString}`)
        }}
      />
    </div>
  )
}
```

### 2. Search Params Validation & Sanitization

Server-side validation and sanitization for search parameters:

```typescript
// lib/navigation/search-params-validation.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'

// Validation schemas for common search params
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export const sortSchema = z.object({
  sort: z.string().min(1).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const searchSchema = z.object({
  search: z.string().max(200).optional(),
})

// Collection-specific validation schema
export function createCollectionSearchSchema<T extends z.ZodTypeAny>(
  collection: string,
  customSchema?: T
) {
  const baseSchema = paginationSchema.merge(sortSchema).merge(searchSchema)

  if (customSchema) {
    return baseSchema.merge(customSchema)
  }

  return baseSchema
}

// Validate search params from request
export async function validateSearchParams<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams)

  try {
    const validated = await schema.parseAsync(searchParams)
    return validated
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('Invalid search params:', error.errors)
      // Return defaults for invalid params
      return schema.parse({})
    }
    throw error
  }
}

// Sanitize search params to prevent XSS and injection
export function sanitizeSearchParams(searchParams: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      // Remove HTML tags and potential script injections
      sanitized[key] = value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim()
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v =>
        typeof v === 'string'
          ? v.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]*>/g, '').trim()
          : v
      )
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

// Usage in Server Components
export default async function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string; limit?: string; category?: string }
}) {
  // Define schema
  const blogSchema = createCollectionSearchSchema('posts', z.object({
    category: z.string().optional(),
  }))

  // Validate and sanitize
  const validated = await validateSearchParams(
    { nextUrl: { searchParams: new URLSearchParams(searchParams) } } as any,
    blogSchema
  )

  const sanitized = sanitizeSearchParams(validated)

  // Fetch with validated params
  const posts = await db.posts.findMany({
    skip: (sanitized.page - 1) * sanitized.limit,
    take: sanitized.limit,
    where: sanitized.category ? { category: sanitized.category } : undefined,
    orderBy: { [sanitized.sort]: sanitized.order },
  })

  return <PostList posts={posts} />
}
```

### 3. Search Params Persistence

Share and restore search states across sessions:

```typescript
// lib/navigation/search-params-persistence.ts
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const STORAGE_PREFIX = 'deesse_search_'

// Save search params to localStorage
export function saveSearchParamsState(key: string, searchParams: URLSearchParams) {
  try {
    const state = {
      params: searchParams.toString(),
      timestamp: Date.now(),
    }
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save search params:', error)
  }
}

// Load search params from localStorage
export function loadSearchParamsState(key: string): string | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!stored) return null

    const state = JSON.parse(stored)

    // Check if state is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000
    if (Date.now() - state.timestamp > maxAge) {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
      return null
    }

    return state.params
  } catch (error) {
    console.warn('Failed to load search params:', error)
    return null
  }
}

// Clear saved search params
export function clearSearchParamsState(key: string) {
  localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
}

// Hook for persistent search params
export function usePersistentSearchParams(
  key: string,
  options?: {
    persist?: boolean
    restore?: boolean
    maxAge?: number // milliseconds
  }
) {
  const searchParams = useSearchParams()
  const [isRestored, setIsRestored] = useState(false)

  const persist = options?.persist !== false
  const restore = options?.restore !== false
  const maxAge = options?.maxAge || 24 * 60 * 60 * 1000 // 24 hours default

  // Save search params when they change
  useEffect(() => {
    if (!persist) return

    saveSearchParamsState(key, searchParams)
  }, [searchParams, key, persist])

  // Restore search params on mount
  useEffect(() => {
    if (!restore || isRestored) return

    const savedParams = loadSearchParamsState(key)
    if (savedParams) {
      // Trigger navigation with saved params
      const currentParams = searchParams.toString()
      if (currentParams === '' || currentParams !== savedParams) {
        window.history.replaceState(null, '', `?${savedParams}`)
      }
    }

    setIsRestored(true)
  }, [key, restore, searchParams, isRestored])

  return {
    isRestored,
    clearState: () => clearSearchParamsState(key),
  }
}

// Share search state via URL (for sharing filters/views)
export function shareSearchParamsState(searchParams: URLSearchParams): string {
  const url = new URL(window.location.href)
  url.search = searchParams.toString()
  return url.toString()
}

// Usage example
export function ProductList() {
  const { params, setParams } = useCollectionSearchParams('products')
  const { isRestored } = usePersistentSearchParams('products', {
    persist: true,
    restore: true,
  })

  // Share button
  const handleShare = () => {
    const url = shareSearchParamsState(new URLSearchParams(window.location.search))
    navigator.clipboard.writeText(url)
    alert('Filter URL copied to clipboard!')
  }

  return (
    <div>
      <button onClick={handleShare}>Share Filters</button>
      {/* ... rest of component */}
    </div>
  )
}
```

### 4. Active Navigation State

Create smart navigation components with active state detection:

```typescript
// lib/navigation/active-state.tsx
'use client'

import { useSelectedLayoutSegment, useSelectedLayoutSegments, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ReactNode } from 'react'

// Active link component
export function ActiveLink({
  href,
  children,
  activeClassName = 'active',
  inactiveClassName = '',
  exact = false,
  ...props
}: {
  href: string
  children: ReactNode
  activeClassName?: string
  inactiveClassName?: string
  exact?: boolean
  [key: string]: any
}) {
  const pathname = usePathname()
  const segment = useSelectedLayoutSegment()

  const isActive = exact
    ? pathname === href
    : pathname.startsWith(href) || segment === href.replace(/^\//, '')

  const className = `${props.className || ''} ${isActive ? activeClassName : inactiveClassName}`.trim()

  return (
    <Link href={href} {...props} className={className}>
      {children}
    </Link>
  )
}

// Multi-level active link (for nested navigation)
export function NestedActiveLink({
  href,
  children,
  depth = 1,
  ...props
}: {
  href: string
  children: ReactNode
  depth?: number
  [key: string]: any
}) {
  const segments = useSelectedLayoutSegments()
  const hrefSegments = href.split('/').filter(Boolean)

  // Check if the current path segments match the href segments up to the specified depth
  const isActive = hrefSegments.every((segment, index) => {
    if (index >= depth) return true
    return segments[index] === segment
  })

  const className = isActive ? 'font-bold text-blue-600' : 'text-gray-600'

  return (
    <Link href={href} {...props} className={className}>
      {children}
    </Link>
  )
}

// Navigation tabs component
export function NavigationTabs({
  tabs,
  parallelRoutesKey,
}: {
  tabs: Array<{ label: string; href: string; icon?: ReactNode }>
  parallelRoutesKey?: string
}) {
  const segment = useSelectedLayoutSegment(parallelRoutesKey)

  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = segment === tab.href.replace(/^\//, '').split('/')[0]

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              px-4 py-2 font-medium transition-colors
              ${isActive
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

// Breadcrumb component
export function Breadcrumbs({
  home = 'Home',
  separator = '/',
  className = '',
}: {
  home?: string
  separator?: string
  className?: string
}) {
  const segments = useSelectedLayoutSegments()
  const pathname = usePathname()

  // Filter out route groups (segments starting with parentheses)
  const visibleSegments = segments.filter(s => !s.startsWith('('))

  const breadcrumbs = [
    { label: home, href: '/' },
    ...visibleSegments.map((segment, index) => {
      const href = '/' + visibleSegments.slice(0, index + 1).join('/')
      return {
        label: segment,
        href,
      }
    }),
  ]

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`}>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center">
          {index > 0 && <span className="mx-2 text-gray-400">{separator}</span>}

          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-gray-900">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

// Sidebar navigation with active states
export function SidebarNavigation({
  items,
  title,
}: {
  items: Array<{
    label: string
    href: string
    icon?: ReactNode
    badge?: number | string
    children?: Array<{ label: string; href: string }>
  }>
  title?: string
}) {
  const segments = useSelectedLayoutSegments()
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="space-y-6">
      {title && <h3 className="text-xs font-semibold text-gray-500 uppercase">{title}</h3>}

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`
                flex items-center px-3 py-2 rounded-md transition-colors
                ${isActive(item.href)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {item.icon && <span className="mr-3">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">
                  {item.badge}
                </span>
              )}
            </Link>

            {item.children && isActive(item.href) && (
              <ul className="mt-1 ml-8 space-y-1">
                {item.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className={`
                        block px-3 py-1 rounded-md text-sm transition-colors
                        ${pathname === child.href
                          ? 'text-blue-700 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                        }
                      `}
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

### 5. Collection-Aware Navigation

Navigation components specialized for DeesseJS collections:

```typescript
// lib/navigation/collection-nav.tsx
'use client'

import { useSelectedLayoutSegment, useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useCallback } from 'react'

// Collection navigation hook
export function useCollectionNavigation(collection: string) {
  const segment = useSelectedLayoutSegment()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isActive = segment === collection

  const navigateToList = useCallback(() => {
    router.push(`/${collection}`)
  }, [router, collection])

  const navigateToDetail = useCallback((idOrSlug: string) => {
    router.push(`/${collection}/${idOrSlug}`)
  }, [router, collection])

  const navigateToCreate = useCallback(() => {
    router.push(`/${collection}/new`)
  }, [router, collection])

  const navigateToEdit = useCallback((idOrSlug: string) => {
    router.push(`/${collection}/${idOrSlug}/edit`)
  }, [router, collection])

  const navigateWithFilters = useCallback((filters: Record<string, any>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        params.delete(key)
      } else if (Array.isArray(value)) {
        params.delete(key)
        value.forEach(v => params.append(key, String(v)))
      } else {
        params.set(key, String(value))
      }
    })
    router.push(`/${collection}?${params.toString()}`)
  }, [router, collection, searchParams])

  return {
    isActive,
    navigateToList,
    navigateToDetail,
    navigateToCreate,
    navigateToEdit,
    navigateWithFilters,
  }
}

// Collection navigation bar component
export function CollectionNavbar({
  collection,
  views,
}: {
  collection: string
  views?: Array<{ label: string; value: string; icon?: ReactNode }>
}) {
  const segment = useSelectedLayoutSegment()
  const searchParams = useSearchParams()

  const currentView = searchParams.get('view') || 'all'

  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold capitalize">{collection}</h1>

          {views && views.length > 0 && (
            <div className="flex items-center space-x-2 ml-8">
              {views.map((view) => (
                <Link
                  key={view.value}
                  href={`?view=${view.value}`}
                  className={`
                    px-3 py-1 rounded-md text-sm font-medium transition-colors
                    ${currentView === view.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  {view.icon && <span className="mr-2">{view.icon}</span>}
                  {view.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <CollectionSearch collection={collection} />
          <CollectionActions collection={collection} />
        </div>
      </div>
    </div>
  )
}

// Collection search component
function CollectionSearch({ collection }: { collection: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const search = searchParams.get('search') || ''

  const handleSearchChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [searchParams, router, pathname])

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={`Search ${collection}...`}
        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <svg
        className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  )
}

// Collection actions component
function CollectionActions({ collection }: { collection: string }) {
  const { navigateToCreate } = useCollectionNavigation(collection)

  return (
    <button
      onClick={navigateToCreate}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
    >
      Add New
    </button>
  )
}
```

### 6. Device Detection & Adaptive UI

Use `userAgent` for responsive design and device-specific features:

```typescript
// lib/device/detection.ts
import { userAgent } from 'next/server';
import { NextRequest } from 'next/server';

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'console' | 'smarttv' | 'wearable' | 'embedded';
  isBot: boolean;
  browser?: {
    name: string;
    version: string;
  };
  os?: {
    name: string;
    version: string;
  };
  engine?: {
    name: string;
    version: string;
  };
  cpu?: {
    architecture: string;
  };
}

// Get device info from request
export function getDeviceInfo(request: NextRequest): DeviceInfo {
  const ua = userAgent(request);

  return {
    type: ua.device.type || 'desktop',
    isBot: ua.isBot,
    browser:
      ua.browser.name && ua.browser.version
        ? { name: ua.browser.name, version: ua.browser.version }
        : undefined,
    os: ua.os.name && ua.os.version ? { name: ua.os.name, version: ua.os.version } : undefined,
    engine:
      ua.engine.name && ua.engine.version
        ? { name: ua.engine.name, version: ua.engine.version }
        : undefined,
    cpu: ua.cpu.architecture ? { architecture: ua.cpu.architecture } : undefined,
  };
}

// Check if request is from a mobile device
export function isMobile(request: NextRequest): boolean {
  const ua = userAgent(request);
  return ua.device.type === 'mobile';
}

// Check if request is from a tablet
export function isTablet(request: NextRequest): boolean {
  const ua = userAgent(request);
  return ua.device.type === 'tablet';
}

// Check if request is from a bot
export function isBot(request: NextRequest): boolean {
  const ua = userAgent(request);
  return ua.isBot;
}

// Get viewport size hint for SSR
export function getViewportHint(request: NextRequest): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent(request);

  if (ua.device.type === 'mobile') return 'mobile';
  if (ua.device.type === 'tablet') return 'tablet';
  return 'desktop';
}

// Device-specific middleware
export function withDeviceInfo<T>(
  handler: (request: NextRequest, device: DeviceInfo) => Promise<T> | T
) {
  return async (request: NextRequest) => {
    const device = getDeviceInfo(request);
    return handler(request, device);
  };
}
```

### 7. Adaptive Components

Components that adapt based on device type:

```typescript
// components/device/adaptive.tsx
'use client'

import { useDeviceInfo } from '@/lib/device/client-hooks'

// Responsive component with SSR support
export function AdaptiveLayout({
  children,
  mobile,
  tablet,
  desktop,
}: {
  children?: ReactNode
  mobile?: ReactNode
  tablet?: ReactNode
  desktop?: ReactNode
}) {
  const device = useDeviceInfo()

  if (device.type === 'mobile' && mobile) return <>{mobile}</>
  if (device.type === 'tablet' && tablet) return <>{tablet}</>
  if (device.type === 'desktop' && desktop) return <>{desktop}</>
  return <>{children}</>
}

// Image with device-specific loading
export function AdaptiveImage({
  mobile,
  tablet,
  desktop,
  alt,
  ...props
}: {
  mobile: string
  tablet?: string
  desktop: string
  alt: string
  [key: string]: any
}) {
  const device = useDeviceInfo()

  const src = device.type === 'mobile' ? mobile : device.type === 'tablet' ? tablet || desktop : desktop

  return <img src={src} alt={alt} {...props} />
}

// Lazy load on mobile, eager on desktop
export function AdaptiveLoad({
  children,
  threshold = 'mobile',
}: {
  children: ReactNode
  threshold?: 'mobile' | 'tablet'
}) {
  const device = useDeviceInfo()

  const shouldLazy = threshold === 'mobile'
    ? device.type === 'mobile'
    : device.type === 'mobile' || device.type === 'tablet'

  return <>{shouldLazy ? <>{children}</> : <>{children}</>}
}

// Device-aware grid
export function AdaptiveGrid({
  children,
  mobileCols = 1,
  tabletCols = 2,
  desktopCols = 3,
  gap = 4,
}: {
  children: ReactNode
  mobileCols?: number
  tabletCols?: number
  desktopCols?: number
  gap?: number
}) {
  const device = useDeviceInfo()

  const cols = device.type === 'mobile' ? mobileCols : device.type === 'tablet' ? tabletCols : desktopCols

  return (
    <div
      className={`grid gap-${gap}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  )
}
```

### 8. Bot Detection & SEO Optimization

Handle bots differently for better SEO:

```typescript
// lib/seo/bot-handling.ts
import { NextRequest, NextResponse } from 'next/server';
import { userAgent, isBot } from 'next/server';

// Bot detection middleware
export function botDetectionMiddleware(request: NextRequest) {
  const ua = userAgent(request);

  if (ua.isBot) {
    // Log bot access
    console.log(`Bot detected: ${request.headers.get('user-agent')}`);

    // Add bot-specific headers
    const response = NextResponse.next();
    response.headers.set('X-Bot-Detected', 'true');
    response.headers.set('X-Bot-Name', ua.browser.name || 'unknown');

    return response;
  }

  return NextResponse.next();
}

// Disable indexing for certain routes (e.g., admin, drafts)
export function noIndexResponse(request: NextRequest, response: NextResponse) {
  const ua = userAgent(request);

  if (ua.isBot) {
    // Add noindex header
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

// Generate bot-friendly metadata
export function generateBotMetadata(type: 'website' | 'article' | 'product', data: any) {
  const base = {
    openGraph: {
      type,
      locale: 'en_US',
    },
  };

  switch (type) {
    case 'article':
      return {
        ...base,
        openGraph: {
          ...base.openGraph,
          title: data.title,
          description: data.excerpt,
          images: [data.featuredImage],
          publishedTime: data.publishedAt,
          authors: [data.author.name],
        },
        twitter: {
          card: 'summary_large_image',
          title: data.title,
          description: data.excerpt,
          images: [data.featuredImage],
        },
      };

    case 'product':
      return {
        ...base,
        openGraph: {
          ...base.openGraph,
          title: data.name,
          description: data.description,
          images: data.images,
          price: data.price,
          currency: data.currency,
        },
      };

    default:
      return base;
  }
}

// Prerender important pages for bots
export async function prerenderForBots(path: string) {
  // Trigger build-time static generation for important pages
  // This would typically be done during the build process
  const importantPaths = ['/', '/about', '/contact', '/blog', '/products'];

  return importantPaths.includes(path);
}
```

### 9. Client-Side Device Detection Hook

Client-side complement to server-side detection:

```typescript
// lib/device/client-hooks.ts
'use client';

import { useEffect, useState } from 'react';

export interface ClientDeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  viewport: { width: number; height: number };
  isBot: boolean;
  touch: boolean;
}

export function useDeviceInfo() {
  const [device, setDevice] = useState<ClientDeviceInfo>({
    type: 'desktop',
    viewport: { width: 1920, height: 1080 },
    isBot: false,
    touch: false,
  });

  useEffect(() => {
    // Detect device type from viewport and user agent
    const ua = navigator.userAgent;
    const width = window.innerWidth;
    const height = window.innerHeight;

    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (width < 768) {
      type = 'mobile';
    } else if (width < 1024) {
      type = 'tablet';
    }

    // Detect touch capability
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    setDevice({
      type,
      viewport: { width, height },
      isBot: /bot|crawler|spider/i.test(ua),
      touch,
    });

    // Update on resize
    const handleResize = () => {
      const width = window.innerWidth;
      let newType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (width < 768) {
        newType = 'mobile';
      } else if (width < 1024) {
        newType = 'tablet';
      }

      setDevice((prev) => ({
        ...prev,
        type: newType,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return device;
}

// Media query hook
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Orientation hook
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
}
```

### 10. Analytics & Tracking

Track device and search params for analytics:

```typescript
// lib/analytics/tracking.ts
import { NextRequest } from 'next/server';
import { getDeviceInfo } from '@/lib/device/detection';

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  device?: DeviceInfo;
  timestamp: number;
}

// Track page views with device info
export function trackPageView(request: NextRequest, properties: Record<string, any> = {}) {
  const device = getDeviceInfo(request);
  const pathname = request.nextUrl.pathname;
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);

  const event: AnalyticsEvent = {
    event: 'page_view',
    properties: {
      pathname,
      searchParams,
      ...properties,
    },
    device,
    timestamp: Date.now(),
  };

  // Send to analytics service
  sendToAnalytics(event);
}

// Track search filter usage
export function trackSearchFilters(
  request: NextRequest,
  collection: string,
  filters: Record<string, any>
) {
  const device = getDeviceInfo(request);

  const event: AnalyticsEvent = {
    event: 'search_filters',
    properties: {
      collection,
      filters,
      filterCount: Object.keys(filters).length,
    },
    device,
    timestamp: Date.now(),
  };

  sendToAnalytics(event);
}

// Track navigation patterns
export function trackNavigation(request: NextRequest, from: string, to: string) {
  const device = getDeviceInfo(request);

  const event: AnalyticsEvent = {
    event: 'navigation',
    properties: {
      from,
      to,
    },
    device,
    timestamp: Date.now(),
  };

  sendToAnalytics(event);
}

// Send events to analytics service
function sendToAnalytics(event: AnalyticsEvent) {
  // Integrate with your analytics service (Vercel Analytics, Plausible, PostHog, etc.)
  if (typeof window !== 'undefined' && (window as any).va) {
    // Vercel Analytics
    (window as any).va('event', event.event, event.properties);
  }

  // Or send to your own endpoint
  if (typeof window === 'undefined') {
    // Server-side: send to analytics API
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(console.error);
  }
}
```

## Implementation Priority

1. **High Priority**
   - Type-safe search params management
   - Search params validation & sanitization
   - Active navigation state components
   - Collection-aware navigation

2. **Medium Priority**
   - Search params persistence
   - Device detection utilities
   - Bot detection & SEO optimization
   - Client-side device hooks

3. **Low Priority**
   - Adaptive UI components
   - Analytics & tracking
   - Advanced breadcrumb customization
   - Orientation detection

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  navigation: {
    searchParams: {
      validation: {
        enabled: true,
        strict: true,
        sanitize: true,
      },
      persistence: {
        enabled: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
      sharing: {
        enabled: true,
      },
    },
    activeState: {
      enabled: true,
      autoHighlight: true,
    },
    breadcrumbs: {
      enabled: true,
      filterRouteGroups: true,
      separator: '/',
      homeLabel: 'Home',
    },
    collections: {
      posts: {
        views: [
          { label: 'All', value: 'all' },
          { label: 'Published', value: 'published' },
          { label: 'Drafts', value: 'drafts' },
        ],
      },
    },
  },
  device: {
    detection: {
      enabled: true,
      botDetection: true,
    },
    adaptive: {
      enabled: true,
      mobileFirst: true,
    },
  },
  seo: {
    botOptimization: {
      enabled: true,
      noindexRoutes: ['/admin', '/drafts'],
    },
  },
  analytics: {
    tracking: {
      enabled: true,
      pageViews: true,
      searchFilters: true,
      navigation: true,
      deviceInfo: true,
    },
  },
});
```
