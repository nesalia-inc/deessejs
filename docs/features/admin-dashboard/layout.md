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
