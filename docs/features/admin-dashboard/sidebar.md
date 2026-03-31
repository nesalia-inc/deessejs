# Admin Sidebar

This document outlines how the admin sidebar is generated from the page and section tree structure.

## Overview

The sidebar is **not** a separate feature. It is the visual representation of the page/section tree defined in `deesse.config.ts` and plugin configurations.

When you define:

```typescript
import { Home, Settings, Shield } from "lucide-react";

// deesse.config.ts
page({
  name: "Dashboard",
  slug: "dashboard",
  icon: Home,
  content: <DashboardContent />,
});
section({
  name: "Settings",
  slug: "settings",
  icon: Settings,
  children: [
    page({ name: "General", slug: "general", icon: Settings, content: <GeneralSettings /> }),
    page({ name: "Security", slug: "security", icon: Shield, content: <SecuritySettings /> }),
  ],
});
```

The sidebar automatically renders these as:

```
├── Dashboard
└── Settings
    ├── General
    └── Security
```

## How It Works

### Page → Sidebar Item

A `page()` definition becomes a clickable item in the sidebar:

```typescript
import { FileText } from "lucide-react";

page({
  name: "Posts",           // Displayed label
  slug: "posts",           // URL segment: /admin/posts
  icon: FileText,          // Lucide icon component
  content: <PostsPage />,  // React content
})
```

Renders as:

```
┌─────────────────────┐
│ 📄 Posts            │  ← Clickable sidebar item with icon
└─────────────────────┘
```

### Section → Sidebar Group

A `section()` definition creates a collapsible group containing child items:

```typescript
import { Book, FileText, Folder } from "lucide-react";

section({
  name: "Blog",            // Group label
  slug: "blog",            // URL prefix: /admin/blog/*
  icon: Book,             // Lucide icon
  children: [
    page({ name: "Posts", slug: "posts", icon: FileText, content: <Posts /> }),
    page({ name: "Categories", slug: "categories", icon: Folder, content: <Categories /> }),
  ],
})
```

Renders as:

```
┌───────────────────────────┐
│ 📁 Blog                   │  ← Collapsible section header with icon
│   ├── 📄 Posts           │
│   └── 📄 Categories      │
└───────────────────────────┘
```

## Default Structure

The admin dashboard provides default pages and sections:

### Home (Root Level Page)

```typescript
import { Home } from "lucide-react";

// Built into @deessejs/core
page({
  name: "Home",
  slug: "",              // Root /admin URL
  icon: Home,
  content: <DashboardWidgets />,
})
```

### Settings (Section with Default Items)

```typescript
import { Settings, Shield } from "lucide-react";

section({
  name: "Settings",
  slug: "settings",
  icon: Settings,
  children: [
    page({ name: "General", slug: "general", icon: Settings, content: <GeneralSettings /> }),
    page({ name: "Security", slug: "security", icon: Shield, content: <SecuritySettings /> }),
  ],
})
```

### Plugins (Section)

```typescript
import { Puzzle, Download, Package } from "lucide-react";

section({
  name: "Plugins",
  slug: "plugins",
  icon: Puzzle,
  children: [
    page({ name: "Browse", slug: "browse", icon: Download, content: <PluginBrowser /> }),
    page({ name: "Installed", slug: "installed", icon: Package, content: <InstalledPlugins /> }),
  ],
})
```

## Plugin Contribution

Plugins contribute to the sidebar by defining their own `page()` and `section()` entries:

```typescript
import { Book, FileText, Folder, Tag } from "lucide-react";

// Plugin: blog
export const blogPlugin = plugin({
  name: "blog",
  pages: [
    section({
      name: "Blog",
      slug: "blog",
      icon: Book,
      children: [
        page({ name: "Posts", slug: "posts", icon: FileText, content: <PostsManager /> }),
        page({ name: "Categories", slug: "categories", icon: Folder, content: <CategoriesManager /> }),
        page({ name: "Tags", slug: "tags", icon: Tag, content: <TagsManager /> }),
      ],
    }),
  ],
});
```

When this plugin is registered in `deesse.config.ts`, its pages and sections are merged into the global page tree.

## URL Routing

The sidebar URLs are derived from the page tree structure:

| Definition | URL |
|------------|-----|
| `page({ slug: "dashboard" })` | `/admin/dashboard` |
| `section + page({ slug: "posts" })` | `/admin/blog/posts` |
| Nested sections | `/admin/a/b/c` |

### Catch-All Route

The admin uses a catch-all route `[[...slug]]` that deconstructs the URL to match against the page tree:

```
/admin/blog/posts → slug = ["blog", "posts"] → matches section "blog" → matches page "posts"
```

## Rendering

The `Sidebar` component traverses the page tree and renders it recursively:

```typescript
interface SidebarProps {
  pageTree: PageTree;      // Root pages and sections
  currentSlug: string[];   // Active route segments
}
```

### Active State

The active item is determined by matching `currentSlug` against page slugs:

```typescript
const isActive = (pageSlug: string) => {
  return currentSlug.join("/") === pageSlug ||
         `/${currentSlug.join("/")}` === pageSlug;
};
```

## Configuration Merge

At build time, all plugin page trees are merged into a single tree:

```
[deesse.config.ts pages]
        │
        ├── [home page]
        ├── [settings section]
        │       ├── [general page]
        │       └── [security page]
        └── [plugins section]

[Plugin: blog]
        │
        └── [blog section]
                ├── [posts page]
                └── [categories page]

          ↓ Merge ↓

Final Tree:
├── Home
├── Settings
│   ├── General
│   └── Security
├── Plugins
│   ├── Browse
│   └── Installed
└── Blog
    ├── Posts
    └── Categories
```

## Order

Pages and sections are rendered in the order they are defined. Use array ordering in `deesse.config.ts`:

```typescript
export default defineConfig({
  // Settings section appears before Plugins section
  pages: [
    homePage,
    settingsSection,      // order: 100
    pluginsSection,        // order: 110
    blogSection,           // order: 120 (from plugin)
  ],
});
```

## Implementation

The sidebar is implemented using `@deessejs/ui` components, specifically the [Sidebar](../../ui/README.md) component which provides:

- Collapsible section support via `Collapsible`
- Navigation items via `SidebarMenuItem`
- Nested menu structure via `SidebarMenu`
- Active state styling based on current route

## Related

- [Pages](./pages.md) - Page and section DSL
- [Layout](./layout.md) - Admin layout architecture
- [Plugins](../../plugins/README.md) - Plugin system
