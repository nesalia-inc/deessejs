# @deessejs/ui Implementation Plan

## Overview

This document outlines the architecture and implementation plan for `@deessejs/ui`, a TypeScript package that provides UI components for the DeesseJS admin dashboard and enables the plugin ecosystem to function correctly.

**Status**: Planning phase - do not implement yet

---

## Problem Statement

### The Plugin Distribution Challenge

DeesseJS uses a plugin system where plugins are **npm packages** distributed independently. For example:

```typescript
// @my-org/deesse-plugin-seo - an npm package
import { Button, Card } from '@deessejs/ui';

const SeoOverview = () => (
  <Card>
    <Button onClick={refresh}>Refresh Stats</Button>
  </Card>
);
```

**The fundamental problem**: shadcn/ui uses a copy-paste model where components live in the user's project at `@/components/ui/`. An npm package cannot import from a user's local path alias.

```
┌─────────────────────────────────────────────────────────────────┐
│  User Project                    Plugin (npm package)           │
│                                                                  │
│  components/ui/               import { Button } from            │
│    └── button.tsx              '@deessejs/ui'  ← this works!  │
│                                                                  │
│  @/components/ui             import { Button } from            │
│    is user's local            '@/components/ui'  ← fails!     │
│    shadcn copy                 (path doesn't exist in plugin)  │
└─────────────────────────────────────────────────────────────────┘
```

### Why shadcn's Copy-Paste Model Doesn't Work Here

shadcn's core philosophy is **"copy-paste, not a component library"**:

| shadcn (copy-paste) | Traditional npm package |
|---------------------|------------------------|
| Source code in user's project | Source code in `node_modules` |
| Full control and editability | Limited to props/className |
| Updates via CLI with smart merge | Updates via npm semver |
| No lock-in | Potential lock-in |
| Works for apps, not libraries | Works for distributable packages |

For a **CMS framework with plugins**, we need packages that can be distributed and imported. Therefore, `@deessejs/ui` must be a proper npm package.

---

## Architecture Decision: Option C

### What Option C Means Here

`@deessejs/ui` is a **monorepo package** that:

1. Contains its own copy of shadcn-derived components
2. Provides admin-specific components that don't exist in shadcn
3. Ships as an npm package installable by both:
   - `@deessejs/next` (for the dashboard)
   - Plugin packages (for their UI needs)

### What This Package Is NOT

- Not a fork of shadcn/ui with major modifications
- Not a replacement for user's local shadcn components
- Not trying to replicate the copy-paste workflow

### What This Package IS

- A bridge between the shadcn design system and the plugin ecosystem
- A way to distribute admin shell components as npm packages
- The foundation for `@deessejs/next` to render the dashboard

---

## Package Structure

```
packages/ui/
├── src/
│   ├── utils/
│   │   └── cn.ts              # className utility (clsx + tailwind-merge)
│   ├── ui/                    # shadcn-derived components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── sheet.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   └── index.ts
│   ├── admin/                 # Deesse-specific admin components
│   │   ├── sidebar.tsx
│   │   ├── widget-container.tsx
│   │   ├── dashboard-layout.tsx
│   │   ├── plugin-page-wrapper.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── field-renderer.tsx
│   │   ├── collection-table.tsx
│   │   └── index.ts
│   └── index.ts
├── styles/
│   └── tokens.css             # Default CSS tokens (fallbacks)
├── package.json
└── tsconfig.json
```

---

## Component Categories

### 1. shadcn-Derived UI Components

These are based on shadcn components but maintained within this package for npm distribution.

**Full list** (initial release):
- `Button` - with variants (default, outline, ghost, destructive, link)
- `Card` - container with header, content, footer
- `Dialog` - modal dialog using Radix
- `Input` - text input field
- `Select` - dropdown select
- `Checkbox` - checkbox input
- `Table` - data table (table, thead, tbody, tr, th, td)
- `Badge` - label/badge component
- `Avatar` - user avatar with fallback
- `DropdownMenu` - dropdown menu using Radix
- `Sheet` - side panel using Radix
- `Tabs` - tab navigation
- `Tooltip` - tooltip using Radix

**Why this subset?**
- Used by default admin dashboard pages
- Required by official plugins (SEO, Blog, etc.)
- Sufficient for most plugin use cases

**What we intentionally exclude** (at first):
- Form components (Form, FormField, etc.) - will be handled by field-renderer
- Calendar, DatePicker - can be added later
- Navigation components - handled by our own admin components
- Specialized components (Command, Combobox, etc.) - can be added per-need

### 2. Admin-Specific Components

These components do not exist in shadcn and are specific to DeesseJS.

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Admin navigation with collapsible sections and pages |
| `DashboardLayout` | Full dashboard layout (header, sidebar, content area) |
| `WidgetContainer` | Container for drag-and-drop dashboard widgets |
| `PluginPageWrapper` | Wrapper component for plugin-defined pages |
| `NavigationMenu` | Admin navigation menu with active state |
| `FieldRenderer` | Dynamic field renderer based on schema |
| `CollectionTable` | Table component for displaying collection data |
| `StatusBadge` | Badge for displaying entity status |

### 3. CSS Tokens

The package includes default CSS tokens that serve as fallbacks:

```css
/* styles/tokens.css */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
  /* ... all shadcn tokens */
}
```

**How CSS inheritance works**:

```
User's globals.css           @deessejs/ui/tokens.css
┌─────────────────┐         ┌─────────────────┐
│ :root {         │         │ :root {         │
│   --primary:     │   CSS   │   --primary:    │
│     #000;      │ ←cascade │     oklch(...); │ ← fallback
│ }               │         │ }               │
└─────────────────┘         └─────────────────┘
         ↑                              ↑
         └── User's definition wins ────┘
              (if not defined, fallback used)
```

**The import order in user's `globals.css`**:
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@deessejs/ui/styles/tokens.css";  /* Our fallbacks last */

@theme inline {
  /* maps CSS vars to Tailwind utilities */
}
```

---

## Dependencies

### Peer Dependencies (must be installed by consumer)

```json
{
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "next": ">=14"
  }
}
```

### Regular Dependencies

```json
{
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "@radix-ui/react-slot": "^1.4.0",
    "@radix-ui/react-dialog": "^1.4.0",
    "@radix-ui/react-dropdown-menu": "^2.4.0",
    "@radix-ui/react-select": "^2.4.0",
    "@radix-ui/react-tabs": "^1.4.0",
    "@radix-ui/react-tooltip": "^1.4.0",
    "@radix-ui/react-avatar": "^1.4.0",
    "@radix-ui/react-checkbox": "^1.4.0",
    "lucide-react": "^1.6.0",
    "next-themes": "^0.4.6"
  }
}
```

**Note**: Radix UI packages are dependencies, not peer dependencies. This ensures consistent behavior within the package. If users have their own Radix versions, they may have conflicts - this is a known trade-off.

---

## Exports

### Main Export

```typescript
// @deessejs/ui
export { Button, Card, Dialog, Input, /* ... */ } from './ui';
export { Sidebar, DashboardLayout, WidgetContainer, /* ... */ } from './admin';
export { cn } from './utils/cn';
```

### Sub-path Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./ui/*": {
      "import": "./dist/ui/*.js",
      "types": "./dist/ui/*.d.ts"
    },
    "./admin/*": {
      "import": "./dist/admin/*.js",
      "types": "./dist/admin/*.d.ts"
    },
    "./styles/tokens.css": "./dist/styles/tokens.css"
  }
}
```

**Usage**:
```typescript
// Full import
import { Button } from '@deessejs/ui';

// Sub-path (tree-shaking friendly)
import { Button } from '@deessejs/ui/button';
import { Sidebar } from '@deessejs/ui/admin/sidebar';
```

---

## Integration with @deessejs/next

### RootPage Implementation

The `RootPage` component in `@deessejs/next` will use `@deessejs/ui`:

```typescript
// packages/next/src/root-page.tsx
import type { Config } from 'deesse';
import { DashboardLayout, Sidebar } from '@deessejs/ui';
import { use } from 'react';

export function RootPage({
  config,
  params,
  searchParams,
}: {
  config: Config;
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] }>;
}) {
  const { slug = [] } = use(params);

  // Find the page in config.pages tree
  const page = findPage(config.pages, slug);

  return (
    <DashboardLayout>
      <Sidebar pages={config.pages} currentSlug={slug} />
      <main className="flex-1 p-6">
        {page ? (
          <page.content />
        ) : (
          <div>Page not found</div>
        )}
      </main>
    </DashboardLayout>
  );
}
```

### Plugin Pages

Plugins define pages that are merged into `config.pages`:

```typescript
// Plugin definition
const seoPlugin = plugin({
  pages: [
    page({
      name: 'Overview',
      slug: 'seo/overview',
      content: () => <SeoOverview />,  // Uses @deessejs/ui components
    }),
  ],
});
```

The `content` component can freely use `@deessejs/ui` because it's an npm package.

---

## Maintenance Strategy

### Syncing with shadcn Upstream

Since we're distributing shadcn components as npm packages, we need a strategy to keep them updated:

1. **Initial fork**: Copy shadcn components from their source (v4.1.0 or current)
2. **Manual updates**: Periodically pull new shadcn releases and merge
3. **Versioning**: Use semver; breaking changes from shadcn may require major version bumps

**The burden**: This is real. When shadcn releases v5.0, we'll need to:
- Pull the new components
- Apply any custom modifications
- Test compatibility
- Publish new version

**Mitigation**: We don't need ALL shadcn components. Start with a curated subset and grow as needed.

### CSS Variable Conflicts

**Problem**: If user has their own `--primary` definition and we also define it, there can be confusion.

**Solution**:
1. `@deessejs/ui/tokens.css` provides **fallback values only**
2. User's `globals.css` is imported AFTER our tokens
3. CSS cascade means user's values take precedence
4. Document this clearly

**What if user doesn't define tokens?** Our fallbacks ensure components always look reasonable.

---

## Alternatives Considered

### Option D: Component Snippets + shadcn Guide

Instead of a package, provide documentation telling users to:
1. Run `npx shadcn@latest init`
2. Run `npx shadcn@latest add button card dialog`
3. Plugins show code snippets that users adapt

**Why rejected**:
- Plugins cannot work this way (npm packages can't reference user's local files)
- Poor developer experience - every plugin requires manual setup
- No way to ensure consistency across plugins

### Fumadocs-ui Model

Fumadocs (used for the documentation site) does something similar - wrapping Radix primitives. Their approach:
- Import Radix directly
- Provide styled components for docs-specific UI
- Alias shadcn CSS variables

**We follow a similar pattern** but with the added constraint that our components must work in distributed npm packages (plugins).

---

## Open Questions

1. **Which shadcn components to include initially?**
   - Propose: Button, Card, Dialog, Input, Select, Checkbox, Table, Badge, Avatar, DropdownMenu, Sheet, Tabs, Tooltip
   - Suggest additions based on official plugin requirements

2. **How to handle CSS token overrides?**
   - Current proposal: fallback tokens in our CSS, user's CSS loads after
   - Is this acceptable? Should we use CSS custom property aliases instead?

3. **cn() utility distribution?**
   - Should we export `cn()` from `@deessejs/ui/utils`?
   - Or require users to have their own via shadcn init?
   - Trade-off: consistency vs duplication

4. **Versioning strategy?**
   - Standard semver?
   - Version tied to shadcn (e.g., `1.0.0-shadcn-v4.1.0`)?
   - How to handle breaking changes from upstream?

5. **Components to add later?**
   - Form components (Form, FormField, Label, etc.)
   - Date/time pickers
   - Rich text editor
   - File upload

---

## Implementation Phases

### Phase 1: Core Package Setup
- Create `packages/ui` structure
- Set up build (tsx or tsup)
- Create `cn()` utility
- Set up CSS tokens file

### Phase 2: UI Components
- Implement Button, Card, Dialog
- Implement Input, Select, Checkbox
- Implement Table, Badge, Avatar
- Implement DropdownMenu, Sheet, Tabs, Tooltip
- Export from index.ts

### Phase 3: Admin Components
- Implement DashboardLayout
- Implement Sidebar with navigation
- Implement PluginPageWrapper
- Implement FieldRenderer
- Implement CollectionTable

### Phase 4: Integration
- Update `@deessejs/next` to use `@deessejs/ui`
- Test with plugins
- Verify CSS token inheritance

### Phase 5: Documentation
- Update docs/features/ui/README.md
- Document CSS token override pattern
- Document component usage

---

## Files to Create/Modify

```
packages/
└── ui/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts
    │   ├── utils/
    │   │   ├── cn.ts
    │   │   └── index.ts
    │   ├── ui/
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── input.tsx
    │   │   ├── select.tsx
    │   │   ├── checkbox.tsx
    │   │   ├── table.tsx
    │   │   ├── badge.tsx
    │   │   ├── avatar.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── sheet.tsx
    │   │   ├── tabs.tsx
    │   │   ├── tooltip.tsx
    │   │   └── index.ts
    │   ├── admin/
    │   │   ├── sidebar.tsx
    │   │   ├── dashboard-layout.tsx
    │   │   ├── widget-container.tsx
    │   │   ├── plugin-page-wrapper.tsx
    │   │   ├── navigation-menu.tsx
    │   │   ├── field-renderer.tsx
    │   │   ├── collection-table.tsx
    │   │   ├── status-badge.tsx
    │   │   └── index.ts
    │   └── styles/
    │       └── tokens.css
    └── dist/  (generated)

packages/next/
└── src/
    └── root-page.tsx  (update to use @deessejs/ui)

docs/features/ui/
└── README.md  (update with component docs)
```
