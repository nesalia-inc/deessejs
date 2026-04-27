# Admin Package Separation Analysis

## Context

Goal: Decouple admin functionality from `deesse` and `next` packages into new packages:
- `@deessejs/admin` - Shared admin logic for React-based frameworks (Next.js, Tanstack, etc.)
- `@deessejs/admin-next` - Next.js specific implementation

"Framework-agnostic" in this context means **React-based frameworks**, not pure vanilla JS. The admin logic can be used with Next.js, Tanstack Query, Remix, etc., as long as they use React.

## Current State

### Packages Involved

| Package | Version | Purpose |
|---------|---------|---------|
| `deesse` | 0.2.11 | Core CMS (auth server, config, client) |
| `@deessejs/next` | 0.1.3 | Next.js admin components |
| `@deessejs/ui` | 0.3.2 | 50+ Radix UI + Tailwind components |

### Current Dependency Chain

```
@deessejs/ui
     ^
     |
@deessejs/next ───────► deesse
                            │
                            ▼
                      better-auth
                      drizzle-orm
```

### Files in `deesse/src/`

| File | Content | Admin-Specific? |
|------|---------|-----------------|
| `server.ts` | `Deesse`, `createDeesse()` - better-auth setup | No |
| `client.ts` | `createClient()` using `better-auth/react` | No (React-specific) |
| `cache.ts` | Caching utility | No |
| `config/define.ts` | `Config`, `InternalConfig`, `defineConfig()` | **YES** - forces admin plugin |
| `config/page.ts` | `Page`, `Section`, `PageTree`, `page()`, `section()` | **YES** |
| `config/plugin.ts` | `Plugin`, `plugin()` | No - generic |
| `lib/admin.ts` | `isDatabaseEmpty`, `hasAdminUsers`, `validateAdminEmail` | **YES** |
| `lib/validation.ts` | Email domain validation | **YES** |
| `index.ts` | Exports, singleton management | Partial |

### Files in `packages/next/src/`

| File | Content | Framework-Specific? |
|------|---------|-------------------|
| `root-page.tsx` | Main page component, session check, routing | **YES** - Next.js |
| `root-layout.tsx` | HTML shell | **YES** - Next.js |
| `routes.ts` | `REST_GET`, `REST_POST` using better-auth/next-js | **YES** - Next.js |
| `api/rest/admin/first-admin.ts` | First admin creation handler | **YES** - Next.js API routes |
| `lib/sidebar-items-context.tsx` | React context | NO - React-agnostic |
| `lib/to-sidebar-items.ts` | `SidebarItem` types, `toSidebarItems()` | NO - React-agnostic |
| `lib/find-page.ts` | `findPage()`, `extractSlugParts()` | NO - pure algorithm |
| `pages/default-pages.tsx` | Default admin menu with React components | **YES** - React components |
| `components/layouts/admin-shell.tsx` | Admin dashboard layout | **YES** - React |
| `components/ui/app-sidebar.tsx` | Sidebar component | **YES** - React |
| `components/pages/*.tsx` | Dashboard, Users, Settings, etc. | **YES** - React |

## Key Distinction

### Framework-Specific (go to `@deessejs/admin-next`)
- Next.js page components (`root-page.tsx`, `root-layout.tsx`)
- Next.js API routes (`api/rest/*`)
- React components with `use client` directives
- Imports from `next/server` or `next/navigation`

### React-Agnostic (go to `@deessejs/admin`)
- Page tree definition (`Page`, `Section`, `PageTree`)
- Sidebar context (React context is fine, just not Next.js-specific)
- Page finding/navigation logic
- Admin utilities (`hasAdminUsers`, etc.)
- Default pages structure (but NOT the React content components)

## Proposed Architecture

### Package: `@deessejs/admin` (NEW - React-agnostic admin logic)

**Purpose**: Shared admin logic that works with any React-based framework (Next.js, Tanstack, etc.).

```
packages/admin/src/
├── config/
│   ├── page.ts       # Page, Section, PageTree, page(), section()
│   │                  # Uses ReactNode and LucideIcon (React standard)
│   └── define.ts     # AdminConfig type and helpers
├── lib/
│   ├── admin.ts      # isDatabaseEmpty, hasAdminUsers
│   ├── validation.ts # Email domain validation
│   ├── first-admin.ts # createFirstAdmin() → Result
│   ├── sidebar.ts    # SidebarItem, SidebarSection, toSidebarItems()
│   └── navigation.ts # findPage(), extractSlugParts()
├── context/
│   └── sidebar-items-context.tsx  # React context (framework-agnostic)
├── default-pages.ts # Default admin pages structure
└── index.ts
```

### Package: `@deessejs/admin-next` (Next.js specific)

**Purpose**: Next.js-specific implementation using `@deessejs/admin`.

```
packages/admin-next/src/
├── api/
│   └── rest/
│       └── admin/
│           └── first-admin.ts  # Next.js API route handler
├── components/
│   ├── pages/       # React page components (HomePage, etc.)
│   ├── layouts/     # AdminDashboardLayout
│   └── ui/          # SidebarNav, AppSidebar
├── pages/
│   └── default-pages.tsx  # Default pages WITH React content
├── root-page.tsx    # Next.js page component
├── root-layout.tsx  # Next.js layout
└── routes.ts        # Next.js route handlers
```

### What Stays in `deesse`

| File | Reason |
|------|--------|
| `server.ts` | better-auth wrapper, no React |
| `client.ts` | React-specific by nature (hooks) |
| `config/plugin.ts` | Generic plugin system |
| `cache.ts` | Utility, no framework dependency |

## New Dependency Chain

```
deesse (core: server, client, plugin, cache)
    │
    └──► @deessejs/admin (React-agnostic: pages, sidebar, nav, validation)
              │
              └──► @deessejs/admin-next (Next.js bindings)
                        │
                        └──► @deessejs/ui
```

## Important: Keeping React Dependencies

Unlike a truly framework-agnostic package, `@deessejs/admin` **will keep React dependencies**:

- `Page.icon` can stay as `LucideIcon` (standard React component)
- `Page.content` can stay as `ReactNode` (standard React type)
- React context is fine to use

The goal is NOT to remove React dependencies, but to:
1. Separate Next.js-specific code (API routes, page components) from shared logic
2. Keep admin utilities in a reusable place
3. Enable potential use with other React frameworks (Tanstack, Remix, etc.)

## Implementation Phases

### Phase 1: Create `@deessejs/admin` package structure

1. Create `packages/admin/` directory with proper package.json
2. Move React-agnostic code from `deesse`:
   - `config/page.ts` (keep React dependencies)
   - `lib/admin.ts`
   - `lib/validation.ts`
3. Move React-agnostic code from `next`:
   - Create `lib/sidebar.ts` (from `to-sidebar-items.ts`)
   - Create `lib/navigation.ts` (from `find-page.ts`)
   - Create `lib/first-admin.ts` (from `first-admin.ts`, logic extracted)
   - Create `context/sidebar-items-context.tsx` (move from `next`)
   - Create `default-pages.ts` (from `default-pages.tsx`, without React content)
4. Update `packages/deesse` to import from `@deessejs/admin` or re-export

### Phase 2: Create `@deessejs/admin-next` package

1. Create `packages/admin-next/` based on current `packages/next`
2. Update imports to use `@deessejs/admin` for shared logic
3. Keep Next.js-specific code (routes, page components) in `admin-next`

### Phase 3: Clean up dependencies

1. Remove Next.js imports from `deesse` where possible
2. Update peer dependencies and exports

## Open Questions

1. **Config split**: Should `config/define.ts` be split between core config (stays in `deesse`) and admin config (goes to `admin`)?

2. **Plugin location**: Should the plugin system stay in `deesse` or move to `admin`?

3. **Backward compatibility**: Should `deesse` re-export admin utilities during transition period?

4. **Versioning**: Should the new packages start at 0.1.0 or inherit current version numbers?