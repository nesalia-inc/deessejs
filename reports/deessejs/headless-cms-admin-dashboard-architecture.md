# Headless CMS Admin Dashboard Architecture Patterns

## Technical Research Report

**Date**: 2026-04-08
**Project**: DeesseJS
**Author**: Claude (AI Agent)

---

## Executive Summary

This report analyzes the architectural patterns used by leading headless CMSes (Payload CMS, Strapi, DatoCMS, Sanity) to build their admin dashboards. The research focuses on admin UI frameworks, dynamic page building, widget integration systems, and security patterns. Findings inform the design of DeesseJS's own admin dashboard architecture.

---

## 1. How Headless CMSes Structure Admin Dashboards

### 1.1 Common Architectural Patterns

All major headless CMSes share a common insight: **the admin panel is a content-specific Single Page Application (SPA) that consumes the same API it exposes**. This creates a clean separation between the content API and the management interface.

#### Payload CMS
- **Framework**: React + Next.js (admin is a React app embedded in Next.js)
- **Architecture**: Collections-based model where every content type is a "collection"
- **Key Pattern**: Uses a **configuration-driven UI** where collections and globals are defined declaratively
- **Admin Route**: `/admin/[...slug]` catch-all route that resolves against the page tree
- **Template System**: Pages choose their own layout template (default with sidebar vs. minimal for auth)

#### Strapi v5
- **Framework**: React SPA (admin is a separate React application)
- **Architecture**: Plugin-based where each feature is a plugin contributing React components
- **Key Pattern**: **Lifecycle-based plugin system** with `register()` and `bootstrap()` phases
- **State Management**: Redux store with plugin-contributed reducers
- **Injection Zones**: Components can be injected into predefined locations in the admin UI

#### Sanity Studio
- **Framework**: React (custom build, not Next.js by default)
- **Architecture**: **Schema-driven studio** where content types are defined as schema documents
- **Key Pattern**: **Desk structure** with panes that can be reordered and customized
- **Plugin System**: Plugins register schema types, document badges, tools, or custom panes
- **Navigation**: Sidebar driven by the desk structure configuration

#### DatoCMS
- **Framework**: Astro (documentation) with React-based admin
- **Architecture**: Plugin SDK for custom field types and dashboard extensions
- **Key Pattern**: **Visual editing** and **Plugin SDK** for extensibility
- **Navigation**: Sidebar-based hierarchical navigation structure

### 1.2 Shared Patterns

| Pattern | Description | CMSes Using It |
|---------|-------------|----------------|
| **Configuration-driven UI** | Declarative definitions produce the admin interface | Payload, Sanity |
| **Plugin architecture** | Extensibility through self-contained plugins | Strapi, Sanity, DatoCMS |
| **Route-based rendering** | Catch-all routes resolve against a page/config tree | Payload, DeesseJS |
| **Template selection** | Pages/routes decide which layout wrapper to use | Payload, DeesseJS |
| **Sidebar from config** | Navigation is derived from the page/section tree | All major CMSes |

---

## 2. Frameworks Used

### 2.1 React as the Dominant Choice

All major headless CMS admin panels are built with **React**:

- **Payload CMS**: React (admin UI), Next.js (framework)
- **Strapi v5**: React SPA
- **Sanity Studio**: React (custom studio)
- **DatoCMS**: React-based admin

### 2.2 Next.js as the Framework of Choice for New Projects

For CMS platforms built post-2020, **Next.js** is the preferred framework:

- **Payload CMS**: Next.js App Router with catch-all admin routes
- **DeesseJS**: Next.js App Router with `[[...slug]]` catch-all route

### 2.3 Why React + Next.js?

1. **Server Components**: Next.js RSC enables secure server-side data fetching for admin data
2. **Routing**: File-based routing with catch-all routes simplifies admin path resolution
3. **TypeScript**: Full type safety between admin config, server code, and API
4. **Ecosystem**: Massive React ecosystem for UI components (shadcn/ui, Radix, dnd-kit)

### 2.4 State Management Patterns

| CMS | State Management | Notes |
|-----|-----------------|-------|
| Strapi v5 | Redux | Plugin-contributed reducers + React Context |
| Payload | React Context + Hooks | Uses Payload's own hooks system |
| Sanity | React Context + Flux | Proprietary flux-based state |
| DeesseJS | React Context + Hooks | Auth context, theme context, config context |

---

## 3. Dynamic Page Building in Admin

### 3.1 The Page/Route Resolution Pattern

The core pattern for dynamic admin pages is **configuration-driven route resolution**:

```
URL: /admin/blog/posts/123
    ↓
Catch-all route extracts ["blog", "posts", "123"]
    ↓
Page tree lookup finds matching page definition
    ↓
Page component renders with matched content/config
```

#### Payload CMS Pattern
```typescript
// Route resolution in RootPage
const slugParts = extractSlugParts(params);
const result = findPage(config.pages, slugParts);

if (!result) {
  return <NotFoundPage />;
}

return <>{result.page.content}</>;
```

#### DeesseJS Pattern
The same pattern is implemented in DeesseJS:
- Catch-all route `[[...slug]]` deconstructs the URL
- `findPage()` traverses the page tree defined in `deesse.config.ts`
- Page's `content` React component is rendered

### 3.2 Internal DSL for Page Definition

Most modern CMSes use a **Domain Specific Language (DSL)** for defining admin pages:

#### DeesseJS DSL
```typescript
// deesse.config.ts
page({
  name: 'Dashboard',
  slug: 'dashboard',
  icon: Home,
  content: () => <DashboardContent />,
});

section({
  name: 'Settings',
  slug: 'settings',
  children: [
    page({ name: 'General', slug: 'general', content: <GeneralSettings /> }),
    page({ name: 'Security', slug: 'security', content: <SecuritySettings /> }),
  ],
});
```

#### Strapi Plugin DSL
```typescript
// Plugin: admin/src/index.js
export default {
  register(app) {
    app.addMenuLink({
      to: '/plugins/my-plugin',
      icon: Home,
      label: 'My Plugin',
    });
  },
  bootstrap(app) {
    app.addSettingsLink('plugin.my-plugin', {
      to: '/plugins/my-plugin/settings',
      label: 'Settings',
    });
  },
};
```

#### Sanity Desk Structure DSL
```javascript
// desk.js
export from () => [
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Blog')
        .child(
          S.documentList()
            .title('Posts')
            .filter('_type == "post"')
        ),
      S.divider(),
      S.documentTypeListItem('author'),
    ])
]
```

### 3.3 Dynamic Page Building from Plugins

Plugins contribute pages that are merged into the global page tree:

```
[Core pages from deesse.config.ts]
    ├── Home
    ├── Settings
    │   ├── General
    │   └── Security
    └── Plugins

[Plugin: blog contributes]
    └── Blog
        ├── Posts
        ├── Categories
        └── Tags

        ↓ Merge ↓

Final Page Tree:
├── Home
├── Settings
│   ├── General
│   └── Security
├── Plugins
│   ├── Browse
│   └── Installed
└── Blog
    ├── Posts
    ├── Categories
    └── Tags
```

---

## 4. Custom Widget Integration into Page Builder

### 4.1 Widget Registry Pattern

The widget system enables users to compose dashboard pages with drag-and-drop widgets:

```
┌─────────────────────────────────────────────────────────────┐
│                     Widget Registry                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  'stats'         → { component: StatsWidget, ... }   │   │
│  │  'quick-actions' → { component: QuickActionsWidget } │   │
│  │  'seo-overview'  → { component: SeoOverviewWidget }   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Widget Definition Schema

```typescript
type WidgetDefinition<TConfig = Record<string, unknown>> = {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultSize: Size;      // Grid dimensions
  minSize?: Size;
  maxSize?: Size;
  configSchema: ZodSchema<TConfig>;  // Type-safe configuration
  component: React.ComponentType<WidgetProps<TConfig>>;
};
```

### 4.3 Widget Instance vs Widget Definition

| Aspect | Widget Definition | Widget Instance |
|--------|-------------------|-----------------|
| **What** | The template/schema for a widget | A placed instance on a page |
| **Analogy** | Class | Object |
| **Persisted** | No (code-defined) | Yes (database) |
| **Contains** | Component, default size, config schema | Definition ID, position, user config |

### 4.4 Widget Component API

```typescript
type WidgetProps<TConfig = Record<string, unknown>> = {
  /** Unique instance ID for this widget placement */
  instanceId: string;
  /** User-configured settings for this instance */
  config: TConfig;
  /** Callback to update widget configuration */
  onConfigChange: (config: Partial<TConfig>) => void;
  /** Whether the widget is in edit mode */
  isEditMode: boolean;
  /** Callback when user requests widget removal */
  onRemove?: () => void;
  /** Ref to the widget's DOM element */
  elementRef?: React.RefObject<HTMLDivElement>;
};
```

### 4.5 Grid System Implementation

Most widget grids use a **12-column responsive grid**:

| Property | Value |
|----------|-------|
| Columns | 12 |
| Row height | 80px |
| Gap | 16px |
| Min widget width | 1 column |
| Max widget width | 12 columns |

#### Library Comparison

| Library | Pros | Cons | License |
|---------|------|------|---------|
| Gridstack | Mature, many features | Larger bundle (~100kb) | MIT |
| react-grid-layout | Popular, React-native | No built-in touch support | MIT |
| **dnd-kit** | Lightweight (~15kb), accessible, modern | Not grid-specific, requires custom grid logic | MIT |
| Custom CSS Grid | Zero bundle impact | Complex DND logic, no collision | None |

**Recommendation**: dnd-kit with custom grid logic provides the best balance of bundle size and capability.

### 4.6 Widget Edit Mode

The edit mode overlay provides:

1. **Drag handle**: Allows repositioning (dnd-kit sortable)
2. **Remove button**: Removes widget from page
3. **Configure icon**: Opens configuration panel
4. **Size indicator**: Shows current grid dimensions

```typescript
// WidgetContainer renders edit mode overlays
{isEditMode && (
  <>
    {/* Drag Handle */}
    <div className="absolute -top-3 -left-3 cursor-move ..." {...dragHandleProps}>
      <GripVertical className="h-4 w-4" />
    </div>

    {/* Remove Button */}
    <button className="absolute -top-3 -right-3 ..." onClick={onRemove}>
      <X className="h-4 w-4" />
    </button>
  </>
)}
```

---

## 5. Connection Between Admin UI and API/Storage

### 5.1 Pattern: Admin Consumes Same API as Content Delivery

```
┌─────────────────────────────────────────────────────────────┐
│                    Headless CMS                              │
│                                                              │
│  ┌─────────────────┐      ┌─────────────────┐              │
│  │   Admin SPA     │ ──── │   Content API   │ ──── Client  │
│  │  (React App)    │      │   (REST/GraphQL) │              │
│  └────────┬────────┘      └─────────────────┘              │
│           │                                                  │
│           │ (Uses same API, but with admin credentials)       │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │   Database      │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Authentication Connection

| CMS | Auth Strategy |
|-----|---------------|
| Payload | Session-based, uses Payload's own auth |
| Strapi | JWT tokens with role-based permissions |
| Sanity | API token-based, scoped to dataset |
| DeesseJS | better-auth with session management |

### 5.3 Admin-Only API Endpoints

Admin panels require endpoints that are not exposed to the content API:

- `/admin/collections/*` - CRUD for all collections
- `/admin/users/*` - User management
- `/admin/settings/*` - System configuration
- `/admin/plugins/*` - Plugin management

These are typically protected by:
1. **Session/Token validation**: Verify admin user
2. **Role-based access control**: Check permissions for the requested resource
3. **CSRF protection**: Prevent cross-site request forgery

---

## 6. Security Considerations for Admin Panels

### 6.1 Authentication Security

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| **Session-based** | Server-side session with secure cookie | DeesseJS (better-auth) |
| **JWT in httpOnly cookie** | Token stored server-side, sent automatically | Strapi |
| **API token** | Scoped token per client/application | Sanity |

### 6.2 Authorization Patterns

#### Role-Based Access Control (RBAC)
```
┌─────────────────────────────────────────────────────────────┐
│                      Roles                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Admin   │  │ Editor   │  │ Author   │  │ Viewer   │      │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘      │
│       │            │            │            │              │
│       ▼            ▼            ▼            ▼              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Full    │  │ Create/ │  │ Create  │  │ Read    │          │
│  │ Access  │  │ Edit/   │  │ Own/    │  │ Only    │          │
│  │         │  │ Delete  │  │ Edit    │  │         │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

#### Field-Level Permissions
```typescript
// Example: Field-level access control
access: {
  read: ({ user }) => user.role === 'admin' || user.role === 'editor',
  create: ({ user }) => user.role === 'admin' || user.role === 'author',
  update: ({ user }) => user.role === 'admin' || (user.role === 'author' && user.id === doc.authorId),
  delete: ({ user }) => user.role === 'admin',
}
```

### 6.3 Admin Route Protection

```typescript
// RootPage: All admin routes require authentication
export async function RootPage({ config, auth, params }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/admin/login");
  }

  // Session is authenticated, proceed
  const slugParts = extractSlugParts(params);
  const result = findPage(config.pages, slugParts);

  return <>{result.page.content}</>;
}
```

### 6.4 Input Validation

All admin inputs must be validated server-side:

1. **Zod schemas** for configuration validation
2. **Standard Schema** for database schema definitions
3. **Parameterized queries** for all database operations

### 6.5 CSRF Protection

```typescript
// CSRF token validation on all mutating admin endpoints
const csrfToken = request.headers.get('x-csrf-token');
if (!validateCsrfToken(csrfToken, session)) {
  return new Response('CSRF validation failed', { status: 403 });
}
```

### 6.6 Admin API Security Checklist

- [ ] Session/token validation on all admin routes
- [ ] Role-based access control for CRUD operations
- [ ] Field-level permissions where needed
- [ ] CSRF token validation on mutations
- [ ] Input validation with Zod/Standard Schema
- [ ] Audit logging for sensitive operations
- [ ] Rate limiting on authentication endpoints
- [ ] Secure cookie settings (httpOnly, secure, sameSite)

---

## 7. DeesseJS Admin Architecture

### 7.1 Architecture Overview

DeesseJS implements a **configuration-driven admin dashboard** with the following key components:

```
┌─────────────────────────────────────────────────────────────┐
│                    deesse.config.ts                           │
│                                                              │
│  defineConfig({                                              │
│    pages: [page(), section(), ...],     ← Page tree          │
│    plugins: [plugin(), ...],            ← Plugin registry    │
│    widgets: [widget(), ...],            ← Widget registry   │
│  })                                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              packages/next/src/                             │
│                                                              │
│  root-page.tsx          → Route resolver + auth check        │
│  layouts/                                                   │
│    default-layout.tsx → Sidebar + header wrapper            │
│    minimal-layout.tsx → Auth pages (login/logout)          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Template Selection Pattern                      │
│                                                              │
│  RootPage decides which template to use based on route:     │
│                                                              │
│  if (isAuthRoute) {                                          │
│    return <MinimalTemplate>{content}</MinimalTemplate>       │
│  }                                                          │
│  return <DefaultTemplate>{content}</DefaultTemplate>        │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Page Tree Structure

```typescript
type PageTree = (Page | Section)[];

type Page = {
  name: string;
  slug?: string;
  icon?: LucideIcon;
  content: React.ComponentType;
};

type Section = {
  name: string;
  slug?: string;
  children: PageTree;
};
```

### 7.3 Sidebar Generation

The sidebar is not a separate feature -- it is the **visual representation of the page/section tree**:

```typescript
// Sidebar renders the page tree recursively
<Sidebar pageTree={config.pages} currentSlug={slugParts} />

// Each page → SidebarMenuItem
// Each section → Collapsible with children
```

### 7.4 Widget System Status

The widget system is in the **planning phase** with detailed architecture defined in `docs/features/ui/WIDGET-SYSTEM.md`:

- Widget registry from plugins + built-in widgets
- 12-column grid with dnd-kit for drag-and-drop
- Per-user, per-page layout persistence
- Edit mode with drag handles, remove buttons, configuration panels

### 7.5 Security Implementation

```typescript
// In root-page.tsx
const session = await auth.api.getSession({ headers: await headers() });

if (!session) {
  redirect("/admin/login");  // MinimalTemplate renders this
}

// All authenticated pages use DefaultTemplate (sidebar + header)
```

---

## 8. Comparative Analysis

### 8.1 Architecture Comparison Table

| Feature | Payload CMS | Strapi v5 | Sanity | DeesseJS |
|---------|-------------|-----------|--------|----------|
| **Framework** | React + Next.js | React SPA | React | React + Next.js |
| **Route Pattern** | Catch-all `[[...slug]]` | Plugin-based | Custom desk | Catch-all `[[...slug]]` |
| **Page Definition** | Config + collections | Plugin lifecycle | Schema + desk | DSL (`page()`, `section()`) |
| **State Management** | React Context | Redux + Context | Flux | React Context |
| **Extensibility** | Hooks + custom components | Plugin system | Plugin system | Plugin system |
| **Widget System** | No (uses collections) | No | No | Yes (planned) |

### 8.2 Strengths and Weaknesses

#### Payload CMS
- **Strengths**: Type-safe, configuration-driven, excellent DX
- **Weaknesses**: Less flexible for completely custom admin pages

#### Strapi v5
- **Strengths**: Mature plugin ecosystem, Redux state
- **Weaknesses**: React SPA (not SSR), less modern stack

#### Sanity
- **Strengths**: Extremely flexible desk structure, great visual editing
- **Weaknesses**: Custom schema syntax, less traditional CMS feel

#### DeesseJS
- **Strengths**: Next.js App Router, widget system, DSL-based page tree
- **Weaknesses**: Early stage, no production users yet

---

## 9. Recommendations for DeesseJS

### 9.1 Immediate Implementation

1. **Template Selection**: Implement the `templateType` logic in `root-page.tsx` to support both `DefaultTemplate` (sidebar + header) and `MinimalTemplate` (auth pages)

2. **Sidebar Navigation**: Implement `AdminNav` component that traverses `config.pages` and renders sidebar items

3. **Admin Header**: Implement `AdminHeader` with breadcrumbs and user menu

4. **Plugin Page Contribution**: Ensure plugins can contribute pages via `plugin()` DSL that merge into the page tree

### 9.2 Medium-Term: Widget System

1. **Widget Registry**: Implement `widget()` DSL and registry that collects widgets from plugins + built-ins

2. **Grid Component**: Implement `DashboardGrid` using dnd-kit with 12-column CSS grid

3. **Edit Mode**: Implement edit mode bar with drag handles and remove buttons

4. **Persistence**: Design and implement widget layout persistence in database

### 9.3 Security

1. **Session Validation**: Ensure all `/admin/*` routes require valid session
2. **CSRF Protection**: Implement CSRF token validation
3. **RBAC**: Design and implement role-based access control for collections
4. **Audit Logging**: Log all admin mutations

---

## 10. Conclusion

Headless CMS admin dashboards share common architectural patterns despite their differences:

1. **Configuration-driven UI**: Declarative page definitions produce the admin interface
2. **Plugin architecture**: Extensibility through self-contained plugins that contribute pages/widgets
3. **Route resolution**: Catch-all routes resolve against a page tree defined in config
4. **Template selection**: Pages choose their layout wrapper (sidebar vs. minimal)
5. **React + Next.js**: Modern CMSes use React for UI components and Next.js for the framework

DeesseJS's architecture aligns with these patterns: using Next.js App Router, a DSL for page definition (`page()`, `section()`), and a planned widget system for dashboard customization. The key differentiator is the **widget-first approach** that allows users to compose dashboard pages with drag-and-drop widgets, a pattern not fully implemented in other open-source headless CMSes.

---

## Sources

- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Strapi v5 Admin Panel API Documentation](https://docs.strapi.io/dev-docs/plugins/admin-panel-api)
- [Sanity Studio Documentation](https://www.sanity.io/docs/studio-configuration)
- [DatoCMS Documentation](https://www.datocms.com/docs)
- [DeesseJS Admin Dashboard Documentation](./admin-dashboard/README.md)
- [DeesseJS Widget System Documentation](./ui/WIDGET-SYSTEM.md)
- [DeesseJS Plugin System Documentation](./plugins/README.md)
