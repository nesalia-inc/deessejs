# Admin Layout Architecture

This document describes the architecture of the admin dashboard layout system.

## The Key Insight

**`RootLayout` is ALWAYS the same** - it's just the HTML shell. The **page content** (via `RootPage`) decides whether it wants a sidebar or not by choosing a **Template**.

```
┌─────────────────────────────────────────────────────────────┐
│                      RootLayout                             │
│                   (HTML shell - ALWAYS)                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    RootPage                          │    │
│  │         (Chooses which template to use)              │    │
│  │                                                      │    │
│  │   ┌─────────────────┐  or  ┌─────────────────────┐   │    │
│  │   │ MinimalTemplate │      │  DefaultTemplate    │   │    │
│  │   │  (no sidebar)   │      │   (with sidebar)    │   │    │
│  │   │                 │      │                     │   │    │
│  │   │   {children}    │      │   <Nav />           │   │    │
│  │   │                 │      │   <AppHeader />     │   │    │
│  │   └─────────────────┘      │   {children}        │   │    │
│  │                              └─────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**The page controls the layout, not the layout controlling the page.**

## Component Hierarchy

### Full Hierarchy (DefaultTemplate)

```
<html>                                    ← RootLayout
  <body>
    <RootProvider>                      ← Global context (theme, i18n, auth)
      <ProgressBar />
      <NestProviders />                 ← Custom providers from config
      <DefaultTemplate>                  ← CHOSEN by RootPage for dashboard routes
        <CustomHeader />                ← Optional
        <NavHamburger />                ← Mobile nav toggle
        <Wrapper>
          <Nav />                       ← Sidebar navigation
          <div>
            <AppHeader />               ← Document header + actions
            {children}                  ← Page content from RootPage
          </div>
        </Wrapper>
      </DefaultTemplate>
    </RootProvider>
  </body>
</html>
```

### Minimal Hierarchy (MinimalTemplate)

```
<html>                                    ← RootLayout
  <body>
    <RootProvider>
      <ProgressBar />
      <MinimalTemplate>                  ← CHOSEN by RootPage for auth routes
        {children}                        ← Login/Logout page content
      </MinimalTemplate>
    </RootProvider>
  </body>
</html>
```

## RootLayout vs RootPage vs Template

### RootLayout

**Location**: `packages/next/src/layout/root-layout.tsx`

`RootLayout` is a **static shell** that wraps every page. It never changes.

Responsibilities:
- Renders `<html>`, `<head>`, `<body>`
- Provides global context via `RootProvider` (theme, locale, permissions, user)
- Renders custom providers from config
- Renders the `children` (which is `RootPage`'s output)

```typescript
// app/(deesse)/admin/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RootLayout config={config}>{children}</RootLayout>;
}
```

### RootPage

**Location**: `packages/next/src/root-page.tsx`

`RootPage` is a **page component** (not a layout). It resolves the URL and **chooses** which Template to use.

Responsibilities:
- Resolves the current URL slug against `config.pages`
- Finds the matching page in the page tree
- **Decides which Template to use** based on the route
- Renders the page content wrapped in the chosen Template

```typescript
// The page DECIDES which layout it wants
const pageContent = findPage(config.pages, slugParts)

if (isAuthRoute) {
  return <MinimalTemplate>{pageContent}</MinimalTemplate>
} else {
  return <DefaultTemplate>{pageContent}</DefaultTemplate>
}
```

### Templates

Templates are layout **wrappers** that provide the chrome around page content.

#### DefaultTemplate

Used for: Dashboard, Collections, Globals, Account, Settings

Contains:
- `<Nav />` - Sidebar with navigation
- `<AppHeader />` - Header with breadcrumbs and actions
- Wraps the `children` (page content)

#### MinimalTemplate

Used for: Login, Logout, Forgot Password, Reset Password

Contains:
- Just the `children` (no sidebar, no header)
- Clean, centered layout for auth flows

## How the Page Chooses Its Layout

In Payload CMS, `RootPage` uses `getRouteData()` to determine which template to use:

```typescript
// Simplified RootPage logic
const { templateType, viewType } = getRouteData({ segments, currentRoute })

switch (templateType) {
  case 'minimal':
    return <MinimalTemplate>{renderedView}</MinimalTemplate>

  case 'default':
    return (
      <DefaultTemplate
        collectionSlug={collectionConfig?.slug}
        viewType={viewType}
      >
        {renderedView}
      </DefaultTemplate>
    )

  default:
    return renderedView  // No wrapper at all
}
```

The `templateType` is determined by the route:

| Route | templateType | Example |
|-------|-------------|---------|
| `/admin` | `default` | Dashboard |
| `/admin/collections/posts` | `default` | Collection list |
| `/admin/collections/posts/123` | `default` | Document edit |
| `/admin/login` | `minimal` | Login page |
| `/admin/logout` | `minimal` | Logout page |

## Template System in DeesseJS

For DeesseJS, we will implement a similar pattern:

### Planned Types

```typescript
type TemplateType = 'default' | 'minimal' | undefined

type RouteResult = {
  templateType: TemplateType
  pageContent: React.ReactNode
  // ... other route data
}
```

### Planned RootPage Logic

```typescript
// packages/next/src/root-page.tsx
export function RootPage({ config, params, searchParams }) {
  const slugParts = resolveSlug(params.slug)
  const page = findPage(config.pages, slugParts)

  // Determine if this is an auth route
  const isMinimal = isAuthRoute(slugParts)

  if (isMinimal) {
    return (
      <MinimalLayout>
        {page.content}
      </MinimalLayout>
    )
  }

  return (
    <DefaultLayout
      currentSlug={slugParts.join('/')}
      config={config}
    >
      {page.content}
    </DefaultLayout>
  )
}
```

### DefaultLayout Structure

```typescript
// packages/next/src/layouts/default-layout.tsx
export function DefaultLayout({ children, currentSlug, config }) {
  return (
    <div className="admin-shell">
      <aside>
        <AdminNav pages={config.pages} currentSlug={currentSlug} />
      </aside>
      <div className="main-area">
        <AdminHeader currentSlug={currentSlug} />
        <main>{children}</main>
      </div>
    </div>
  )
}
```

### MinimalLayout Structure

```typescript
// packages/next/src/layouts/minimal-layout.tsx
export function MinimalLayout({ children }) {
  return (
    <div className="auth-container">
      {children}
    </div>
  )
}
```

## Summary

| Concept | Role | Changes per route? |
|---------|------|-------------------|
| `RootLayout` | HTML shell + providers | No (always the same) |
| `RootPage` | Resolves route, chooses template | Yes (but only to select template) |
| `DefaultTemplate` | Contains sidebar + header | No |
| `MinimalTemplate` | No chrome | No |
| Page content | What the user sees | Yes |

**The page is NOT inside the layout. The page CHOOSES and WRAPS ITSELF in the layout it wants.**

## File Structure (Planned)

```
packages/next/src/
├── layouts/
│   ├── root-layout.tsx       # HTML shell + providers
│   ├── default-layout.tsx    # Sidebar + header wrapper
│   └── minimal-layout.tsx    # Simple centered layout
├── views/
│   └── root-page.tsx         # Route resolver + template chooser
└── index.ts
```

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| RootLayout | Planned | HTML shell + providers |
| RootPage | Basic | Needs template selection logic |
| DefaultLayout | Planned | Sidebar + header |
| MinimalLayout | Planned | Simple auth layout |
| Template Selection | Planned | Route → template mapping |
| AdminNav | Planned | Sidebar navigation |
| AdminHeader | Planned | Breadcrumb + user menu |
