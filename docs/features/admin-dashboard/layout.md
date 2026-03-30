# Admin Layout Architecture

This document describes the architecture of the admin dashboard layout system, which separates `RootLayout` (global shell) from `RootPage` (page content).

## Overview

The admin dashboard uses a two-tier layout system:

```
app/(deesse)/admin/
├── layout.tsx              # RootLayout - global admin shell
│   ├── AdminSidebar        # Navigation sidebar
│   ├── AdminHeader         # Breadcrumb + user menu
│   └── <page content>      # Children rendered here
│
└── [[...slug]]/page.tsx    # RootPage - individual page content
```

This separation ensures:
- **Consistent chrome**: Sidebar and header are rendered once per layout
- **Page isolation**: Each page only renders its specific content
- **Code splitting**: Page components load lazily via manifests

## RootLayout

`RootLayout` is the global shell of the admin dashboard. It wraps all admin pages and provides the persistent UI elements.

**Location**: `packages/next/src/layout/root-layout.tsx`

### Responsibilities

- Renders the admin sidebar with navigation from `config.pages`
- Renders the header with breadcrumbs based on current URL
- Manages sidebar state (collapsed/expanded)
- Highlights the active page in navigation
- Provides the content area where `children` (RootPage output) are rendered

### Usage

```typescript
// app/(deesse)/admin/layout.tsx
import { RootLayout } from "@deessejs/next";
import { config } from "@deesse-config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RootLayout config={config}>{children}</RootLayout>;
}
```

## RootPage

`RootPage` renders the content of a specific admin page. It is a page component, not a layout.

**Location**: `packages/next/src/root-page.tsx`

### Responsibilities

- Resolves the current URL slug against `config.pages`
- Finds the matching page in the page tree
- Renders only the page's `content` or `manifest` component
- Returns "Page not found" for invalid slugs

### Usage

```typescript
// app/(deesse)/admin/[[...slug]]/page.tsx
import { RootPage } from "@deessejs/next";
import { config } from "@deesse-config";

interface AdminPageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string: string | string[] | undefined }>;
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <RootPage
      config={config}
      params={resolvedParams}
      searchParams={resolvedSearchParams}
    />
  );
}
```

## Component Hierarchy

```
<AdminLayout>
  ├── <AdminSidebar>
  │   ├── Logo
  │   ├── NavItem (for each page/section)
  │   └── Collapsible sections
  │
  ├── <AdminHeader>
  │   ├── Breadcrumb
  │   └── User menu
  │
  └── <main>
      └── {children}  ← RootPage output
```

## AdminSidebar

The sidebar is generated dynamically from `config.pages`. It supports:

- **Sections**: Collapsible groups of pages
- **Active state**: Highlights current page based on URL
- **Nested navigation**: Supports nested sections (e.g., `/admin/settings/general`)

## AdminHeader

The header provides contextual information:

- **Breadcrumb**: Shows path to current page (e.g., `Settings > General`)
- **User menu**: Placeholder for future auth integration

## Payload CMS Architecture (Reference)

This section documents how Payload CMS implements their layout system, serving as a reference for DeesseJS architecture.

### Payload's Two-Tier System

Payload separates concerns similarly to DeesseJS:

1. **RootLayout** (`packages/next/src/layouts/Root/index.tsx`):
   - Wraps the entire HTML document (`<html>`, `<head>`, `<body>`)
   - Async Server Component that initializes request context
   - Provides global context via `RootProvider` (theme, locale, i18n, permissions, user)
   - Renders `ProgressBar` and custom providers
   - Handles HTML attributes (theme, dir, lang)

2. **RootPage** (`packages/next/src/views/Root/index.tsx`):
   - Receives `config`, `importMap`, `params`, `searchParams`
   - Resolves route segments to determine which view to render
   - Uses `getRouteData()` to determine view type, template, collection/global configs
   - Renders either `MinimalTemplate` or `DefaultTemplate` based on `templateType`

### Template System

Payload uses a template-based approach with two built-in templates:

#### DefaultTemplate

Full admin layout with sidebar, header, and actions:

```typescript
// packages/next/src/templates/Default/index.tsx
<DefaultTemplate>
  <CustomHeader />           {/* Optional custom header */}
  <NavHamburger />           {/* Mobile nav toggle */}
  <Wrapper>
    <Nav />                  {/* Sidebar navigation */}
    <div>
      <AppHeader />          {/* Document header with actions */}
      {children}             {/* Page content */}
    </div>
  </Wrapper>
</DefaultTemplate>
```

#### MinimalTemplate

Simple layout without sidebar, used for login/logout/auth pages:

```typescript
<MinimalTemplate className={className}>
  {children}
</MinimalTemplate>
```

### Request Initialization

Both `RootLayout` and `RootPage` use `initReq()` to initialize the request context:

```typescript
// packages/next/src/utilities/initReq.ts
const {
  cookies,
  headers,
  languageCode,
  permissions,
  req,
  req: {
    payload: { config },
  },
} = await initReq({ configPromise, importMap, key: 'RootLayout' });
```

This provides:
- **Authentication**: User session and permissions
- **i18n**: Language settings and translations
- **Database**: Initialized Payload instance
- **Preferences**: User-specific preferences (e.g., nav state)

### Server Functions

Payload uses a `serverFunction` wrapper for client↔server communication:

```typescript
// In layout.tsx
const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

// Passed to RootLayout
<RootLayout
  config={config}
  importMap={importMap}
  serverFunction={serverFunction}
>
  {children}
</RootLayout>
```

The `serverFunction` is then provided via `RootProvider` to all child components.

### Import Map (Code Splitting)

Payload uses an `importMap` for lazy loading custom components:

```javascript
// app/(payload)/admin/importMap.js
import { CustomView } from '../../CustomView/index.js'

export const importMap = {
  '/CustomView/index.js#CustomView': CustomView,
}
```

Custom views are registered in the config and resolved via the import map:

```typescript
// packages/next/src/views/Root/getCustomViewByRoute.ts
const customView = getCustomViewByRoute({ config, currentRoute })

// Rendered via RenderServerComponent
RenderServerComponent({
  Component: customView.payloadComponent,
  Fallback: customView.Component,
  importMap,
  serverProps,
})
```

### View Resolution

Payload uses `getRouteData()` to resolve URL segments to views:

```typescript
// packages/next/src/views/Root/getRouteData.ts
switch (segments.length) {
  case 0: {
    if (currentRoute === adminRoute) {
      return { Component: DashboardView, templateType: 'default' }
    }
    break
  }
  case 1: {
    // /collections, /globals, /account, /settings, etc.
    return { Component: ListView, templateType: 'default' }
  }
  case 2: {
    // /collections/:slug, /globals/:slug, etc.
    return { Component: DocumentView, templateType: 'default' }
  }
  // ... deeper nesting for edit, versions, etc.
}
```

The function returns:
- `DefaultView`: The component to render
- `templateType`: `'default'` | `'minimal'` | `undefined`
- `collectionConfig` / `globalConfig`: Resolved entity configs
- `viewType`: Type identifier (e.g., `'list'`, `'document'`, `'dashboard'`)

## Page Manifest (Planned)

Future versions will support lazy loading via page manifests:

```typescript
type PageManifest = {
  slug: string;
  label: string;
  component: () => Promise<React.ComponentType>;
};

page({
  name: 'Dashboard',
  manifest: {
    slug: 'dashboard',
    label: 'Dashboard',
    component: () => import('./pages/dashboard'),
  },
});
```

This enables code splitting, loading only the page component when needed.

## File Structure

| Package | File | Purpose |
|---------|------|---------|
| `packages/next` | `src/layout/root-layout.tsx` | Global admin shell |
| `packages/next` | `src/layout/admin-sidebar.tsx` | Navigation sidebar |
| `packages/next` | `src/layout/admin-header.tsx` | Breadcrumb + user menu |
| `packages/next` | `src/root-page.tsx` | Individual page renderer |
| `templates/default` | `app/(deesse)/admin/layout.tsx` | Layout usage example |
| `templates/default` | `app/(deesse)/admin/[[...slug]]/page.tsx` | Page usage example |

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| RootLayout | Planned | Needs `AdminSidebar`, `AdminHeader` |
| RootPage | Basic | Currently just renders content |
| Template System | Planned | Default/Minimal templates |
| Request Init | Planned | Auth, i18n, permissions |
| Server Functions | Planned | Client↔server communication |
| Import Map | Planned | Code splitting |
| View Resolution | Planned | Route-to-view mapping |
