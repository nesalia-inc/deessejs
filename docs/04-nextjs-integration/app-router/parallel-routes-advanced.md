# Parallel Routes - Advanced

## Overview

Advanced parallel routing patterns for dashboards, conditional routes, and independent slot management.

## Features

### Named Slots
- @analytics, @team, @auth, etc.
- Passed as props to parent layout
- Independent navigation per slot
- URL structure unaffected by slots

### Independent Loading/Error States
- Each slot has its own loading state
- Independent error boundaries
- Streaming support per slot
- Non-blocking rendering

### Conditional Routing
- Role-based slot rendering
- Auth-dependent layouts
- User-type specific dashboards
- Dynamic slot selection

## Slot Architecture

### Basic Parallel Routes
```typescript
// app/layout.tsx
export default function Layout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <>
      <nav>Main Nav</nav>
      <main>{children}</main>
      <aside>{analytics}</aside>
      <aside>{team}</aside>
    </>
  )
}
```

### File Structure
```
app/
  @analytics/
    page.tsx
    loading.tsx
    error.tsx
  @team/
    page.tsx
    settings/
      page.tsx
  layout.tsx
  page.tsx
```

## Admin Dashboard Parallel Routes

### Dashboard Structure
```typescript
// app/@admin/layout.tsx
export default function AdminLayout(props: LayoutProps<'/@admin'>) {
  return (
    <div className="admin-dashboard">
      <AdminNav />
      <div className="flex">
        <main className="flex-1">
          {props.children}
        </main>
        {props.analytics && (
          <aside className="w-80">
            {props.analytics}
          </aside>
        )}
        {props.settings && (
          <aside className="w-80">
            {props.settings}
          </aside>
        )}
      </div>
    </div>
  )
}
```

### Auto-Generated Admin Slots
```typescript
// deesse.config.ts
export const config = defineConfig({
  admin: {
    parallelRoutes: {
      slots: ['analytics', 'settings', 'team'],
      default: {
        analytics: 'DashboardAnalytics',
        settings: 'DashboardSettings',
        team: 'TeamManagement',
      }
    }
  }
})
```

### Tab Groups
```typescript
// app/@analytics/layout.tsx
import Link from 'next/link'

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav className="analytics-tabs">
        <Link href="/analytics/page-views">Page Views</Link>
        <Link href="/analytics/visitors">Visitors</Link>
        <Link href="/analytics/conversions">Conversions</Link>
      </nav>
      <div>{children}</div>
    </>
  )
}
```

## Conditional Routes

### Role-Based Dashboard
```typescript
// app/dashboard/layout.tsx
import { checkUserRole } from '@deessejs/auth'

export default function DashboardLayout({
  user,
  admin,
}: {
  user: React.ReactNode
  admin: React.ReactNode
}) {
  const role = checkUserRole()

  // Render different slot based on role
  return role === 'admin' ? admin : user
}
```

### Auth-Dependent Layouts
```typescript
// app/layout.tsx
import { getServerSession } from '@deessejs/auth'

export default async function RootLayout(props: LayoutProps<'/'>) {
  const session = await getServerSession()

  return (
    <html>
      <body>
        {session ? (
          <>
            <DashboardNav />
            {props.children}
          </>
        ) : (
          <>
            <PublicNav />
            {props.children}
          </>
        )}
      </body>
    </html>
  )
}
```

### Collection-Based Slots
```typescript
// app/@content/layout.tsx
export default async function ContentLayout(props: LayoutProps<'/@content'>) {
  const user = await getCurrentUser()

  if (user.role === 'editor') {
    return <EditorDashboard>{props.children}</EditorDashboard>
  }

  if (user.role === 'author') {
    return <AuthorDashboard>{props.children}</AuthorDashboard>
  }

  return <ViewerDashboard>{props.children}</ViewerDashboard>
}
```

## Independent State Management

### useSelectedLayoutSegment
```typescript
// app/ui/nav.tsx
'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import Link from 'next/link'

export function SlotNav({ slot }: { slot: string }) {
  const segment = useSelectedLayoutSegment(slot)
  // segment gives the active route in that slot

  return (
    <nav>
      <Link href={`/${slot}/overview`}
        className={segment === 'overview' ? 'active' : ''}
      >
        Overview
      </Link>
      <Link href={`/${slot}/settings`}
        className={segment === 'settings' ? 'active' : ''}
      >
        Settings
      </Link>
    </nav>
  )
}
```

### Multiple Slot Segments
```typescript
'use client'

import { useSelectedLayoutSegments } from 'next/navigation'

export function DebugSlots() {
  const segments = useSelectedLayoutSegments()

  return (
    <div>
      {segments.map(([slot, segment]) => (
        <div key={slot}>
          {slot}: {segment}
        </div>
      ))}
    </div>
  )
}
```

## Independent Loading States

### Per-Slot Loading
```typescript
// app/@analytics/loading.tsx
export default function AnalyticsLoading() {
  return <AnalyticsSkeleton />
}

// app/@team/loading.tsx
export default function TeamLoading() {
  return <TeamSkeleton />
}
```

### Streaming Independent Slots
```typescript
// app/dashboard/layout.tsx
import { Suspense } from 'react'

export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <div>
      <Suspense fallback={<div>Loading main...</div>}>
        {children}
      </Suspense>
      <Suspense fallback={<div>Loading analytics...</div>}>
        {analytics}
      </Suspense>
      <Suspense fallback={<div>Loading team...</div>}>
        {team}
      </Suspense>
    </div>
  )
}
```

## Independent Error States

### Per-Slot Error Boundaries
```typescript
// app/@analytics/error.tsx
'use client'

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Analytics Error</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  )
}
```

## Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  parallelRoutes: {
    admin: {
      slots: {
        analytics: {
          path: '/@admin/analytics',
          layout: 'AnalyticsTabLayout',
        },
        settings: {
          path: '/@admin/settings',
          layout: 'SettingsTabLayout',
        },
      },
      conditional: {
        role: {
          admin: '@admin',
          user: '@user',
        }
      }
    }
  }
})
```

## Benefits

- **Independent Navigation**: Each slot navigates independently
- **Conditional Rendering**: Role-based or auth-dependent layouts
- **Performance**: Independent loading states
- **Resilience**: Isolated error boundaries
- **Flexible**: Complex dashboard layouts
- **Type-Safe**: LayoutProps auto-generated
