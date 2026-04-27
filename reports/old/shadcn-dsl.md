# Shadcn Sidebar DSL Design Specification

## Overview

This document outlines a complete Domain Specific Language (DSL) for defining shadcn/ui sidebar-compatible page trees in the `@deessejs/core` package. The DSL provides a declarative, type-safe way to configure sidebar navigation by mapping user-facing factory functions to shadcn sidebar components.

---

## 1. Background

### 1.1 Shadcn Sidebar Architecture

The shadcn/ui sidebar is a composable component system built on Radix UI primitives. Its hierarchy is:

```
SidebarProvider          -- Context provider (wraps entire app)
├── Sidebar              -- Root sidebar component
│   ├── SidebarHeader    -- Fixed header area (branding, titles)
│   ├── SidebarContent   -- Scrollable content area
│   │   ├── SidebarGroup -- Groups related navigation
│   │   │   ├── SidebarGroupLabel
│   │   │   ├── SidebarGroupAction
│   │   │   ├── SidebarGroupContent
│   │   │   └── SidebarMenu
│   │   │       ├── SidebarMenuItem
│   │   │       │   ├── SidebarMenuButton
│   │   │       │   ├── SidebarMenuAction
│   │   │       │   └── SidebarMenuBadge
│   │   │       └── SidebarMenuItem
│   │   │           ├── SidebarMenuButton
│   │   │           └── SidebarMenuSub
│   │   └── SidebarGroup
│   ├── SidebarFooter    -- Fixed footer area (user menu, settings)
│   └── SidebarRail      -- Resize handle
├── SidebarInset         -- Main content wrapper (when using inset variant)
└── SidebarTrigger       -- Toggle button
```

### 1.2 Current Implementation

The current `deesse` package provides two factory functions exported from `packages/deesse/src/config/page.ts`:

**`page()`** - Creates a leaf page node:
```typescript
export function page(config: {
  name: string;
  slug?: string;
  icon?: LucideIcon;
  content: ReactNode | null;
}): Page
```

**`section()`** - Creates a group of pages:
```typescript
export function section(config: {
  name: string;
  slug?: string;
  bottom?: boolean;
  children: PageTree[];
}): Section
```

The `@deessejs/next` package transforms `PageTree[]` into `SidebarItem[]` via `toSidebarItems()`, then renders them using `SidebarNav` which maps:

- `SidebarSection` -> shadcn `SidebarGroup` + `SidebarMenu`
- `SidebarPage` -> shadcn `SidebarMenuItem` + `SidebarMenuButton`

### 1.3 Current Gaps

The current implementation does not expose all shadcn sidebar components, preventing developers from:

1. Adding `SidebarMenuBadge` for status indicators
2. Adding `SidebarMenuAction` for action buttons (e.g., "Add new", "Refresh")
3. Creating collapsible groups with `SidebarGroupLabel` as `CollapsibleTrigger`
4. Using `SidebarMenuSkeleton` for loading states
5. Adding `SidebarSeparator` for visual dividers
6. Using `SidebarRail` for resize functionality
7. Programmatically controlling collapse state via `useSidebar` hook
8. Creating sub-menus with `SidebarMenuSub`
9. Setting initial expanded/collapsed state per group

---

## 2. Design Principles

### 2.1 Zero Runtime Overhead

The DSL produces a static data structure (the `PageTree` type) that is serializable and can be analyzed, transformed, or introspected without executing any component code. This enables tooling support (e.g., code generation, documentation) and keeps the runtime lean.

### 2.2 Incrementally Adoptable

All new factory functions are optional. Existing `page()` and `section()` calls continue to work exactly as before. The new API surface is purely additive.

### 2.3 Type-Safe

Every factory function, prop, and type is fully typed. Consumers get autocomplete and compile-time safety without runtime validation.

### 2.4 shadcn- Idiomatic

The DSL maps directly to shadcn sidebar concepts. A developer familiar with the shadcn sidebar API will immediately recognize the DSL constructs. Where shadcn uses `SidebarMenuButton asChild isActive`, the DSL exposes `isActive` as a prop on the button factory.

### 2.5 Composable

Factory functions are regular functions that return plain objects. They can be composed, conditionalized, and looped over using standard JavaScript/TypeScript patterns.

---

## 3. Type Definitions

### 3.1 Base Types

```typescript
import type { ReactNode, ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

// Marker types for discriminated unions
export type PageType = "page";
export type SectionType = "section";
export type CollapsibleGroupType = "collapsible-group";
export type SeparatorType = "separator";
export type DividerType = "divider"; // Alias for separator in UI context
```

### 3.2 Core Node Types

```typescript
/**
 * A leaf page node. Maps to SidebarMenuItem > SidebarMenuButton.
 */
export interface Page {
  type: PageType;
  /** Display name shown in the sidebar */
  name: string;
  /** URL slug segment(s). Multiple segments allowed (e.g., "users/settings"). */
  slug: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Page content rendered in the main area */
  content: ReactNode | null;
  /** Optional badge shown next to the name */
  badge?: string | number | { label: string | number; variant?: "default" | "secondary" | "outline" | "destructive" };
  /** URL to an external link. When set, renders an <a> tag instead of Next.js <Link>. */
  href?: string;
  /** Whether this page is disabled */
  disabled?: boolean;
  /** Class name for the SidebarMenuButton */
  className?: string;
}

/**
 * A non-collapsible group of pages. Maps to SidebarGroup > SidebarMenu.
 */
export interface Section {
  type: SectionType;
  /** Display name shown as SidebarGroupLabel */
  name: string;
  /** URL slug segment prefix for all children */
  slug: string;
  /** If true, this section renders in the SidebarFooter area */
  bottom?: boolean;
  /** Child nodes (pages or nested sections) */
  children: PageTree[];
  /** Class name for the SidebarGroup */
  className?: string;
}

/**
 * A collapsible group of pages. Maps to Collapsible > SidebarGroup.
 * Uses SidebarGroupLabel as the CollapsibleTrigger with a ChevronDown icon.
 */
export interface CollapsibleGroup {
  type: CollapsibleGroupType;
  /** Display name shown as SidebarGroupLabel */
  name: string;
  /** URL slug segment prefix for all children */
  slug: string;
  /** Initial expanded state (default: true) */
  defaultExpanded?: boolean;
  /** Controlled expanded state (implies controlled mode) */
  expanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Child nodes (pages or nested collapsible groups) */
  children: PageTree[];
  /** Class name for the SidebarGroup */
  className?: string;
}

/**
 * A visual separator. Maps to SidebarSeparator.
 * Renders as a horizontal divider line.
 */
export interface Separator {
  type: SeparatorType;
  /** Optional class name */
  className?: string;
}
```

### 3.3 Union Type

```typescript
/**
 * All valid node types in the page tree.
 */
export type PageTree = Page | Section | CollapsibleGroup | Separator;
```

---

## 4. Factory Functions

### 4.1 `page()`

Existing. Creates a leaf page node.

```typescript
function page(config: {
  name: string;
  slug?: string;
  icon?: LucideIcon;
  content: ReactNode | null;
  badge?: string | number | { label: string | number; variant?: "default" | "secondary" | "outline" | "destructive" };
  href?: string;
  disabled?: boolean;
  className?: string;
}): Page
```

**Usage:**
```typescript
page({
  name: "Users",
  slug: "users",
  icon: Users,
  content: <UsersPage />,
  badge: 3,                          // Shows a badge with "3"
  badge: { label: "New", variant: "default" },
  href: "https://example.com",       // External link (renders <a> not <Link>)
  disabled: false,
  className: "text-sidebar-foreground",
})
```

### 4.2 `section()`

Existing. Creates a non-collapsible group.

```typescript
function section(config: {
  name: string;
  slug?: string;
  bottom?: boolean;
  children: PageTree[];
  className?: string;
}): Section
```

**Usage:**
```typescript
section({
  name: "Settings",
  slug: "settings",
  bottom: false,  // false = renders in SidebarContent (default), true = renders in SidebarFooter
  children: [
    page({ name: "General", slug: "", icon: Settings, content: <SettingsPage /> }),
    page({ name: "Plugins", slug: "plugins", icon: Puzzle, content: <PluginsPage /> }),
  ],
})
```

### 4.3 `collapsibleGroup()`

New. Creates a collapsible group.

```typescript
function collapsibleGroup(config: {
  name: string;
  slug?: string;
  defaultExpanded?: boolean;  // default: true
  expanded?: boolean;          // controlled mode
  onExpandedChange?: (expanded: boolean) => void;
  children: PageTree[];
  className?: string;
}): CollapsibleGroup
```

**Usage:**
```typescript
collapsibleGroup({
  name: "Help",
  slug: "help",
  defaultExpanded: false,  // Starts collapsed
  children: [
    page({ name: "Documentation", slug: "docs", icon: BookOpen, content: <DocsPage /> }),
    page({ name: "FAQ", slug: "faq", icon: HelpCircle, content: <FaqPage /> }),
  ],
})
```

**Controlled mode:**
```typescript
const [expanded, setExpanded] = useState(true);

collapsibleGroup({
  name: "Help",
  slug: "help",
  expanded,          // Controlled - use expanded prop
  onExpandedChange: setExpanded,
  children: [...],
})
```

### 4.4 `separator()`

New. Creates a visual divider.

```typescript
function separator(config?: {
  className?: string;
}): Separator
```

**Usage:**
```typescript
separator()
// or with custom styling
separator({ className: "my-custom-separator" })
```

### 4.5 `action()` (New: SidebarMenuAction)

New. Creates a menu action button, commonly used for "Add", "Refresh", etc.

```typescript
function action(config: {
  icon: LucideIcon;
  /** aria-label for accessibility */
  label: string;
  /** onClick handler */
  onClick?: () => void;
  /** Tooltip text shown when sidebar is collapsed */
  tooltip?: string;
  className?: string;
}): SidebarMenuAction
```

**Note:** In the shadcn sidebar, `SidebarMenuAction` is a sibling of `SidebarMenuButton` within a `SidebarMenuItem`, not a standalone top-level node. In the DSL, this would typically be added as an action attached to a page via a `page()` option, or as a standalone action node within a section. The exact API design for this needs further discussion (see Section 6.5).

---

## 5. Mapping: DSL Types to shadcn Components

### 5.1 Direct Mapping Table

| DSL Type | shadcn Component(s) | Notes |
|---|---|---|
| `Page` | `SidebarMenuItem` + `SidebarMenuButton` | Renders `SidebarMenuButton` with `asChild` wrapping `Link` or `<a>`. `isActive` determined by current route. |
| `Section` | `SidebarGroup` + `SidebarMenu` | Label rendered as plain text (not a trigger). Children become `SidebarMenuItem`s. |
| `CollapsibleGroup` | `Collapsible` + `SidebarGroup` + `SidebarGroupLabel` as `CollapsibleTrigger` | Label is a `button` with `ChevronDown` that rotates when open. |
| `Separator` | `SidebarSeparator` | Rendered as `<hr>` with appropriate styling. |
| `Page.badge` | `SidebarMenuBadge` | Placed after `SidebarMenuButton` in the `SidebarMenuItem`. |
| `Page.icon` | Lucide icon in `SidebarMenuButton` | Rendered before the label text. |
| `Page.href` | `<a href={href}>` instead of `<Link href>` | Signals external link, opens in same tab. |

### 5.2 Rendering Rules

#### Page rendering:
```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild isActive={isActive} disabled={disabled}>
    {page.href ? (
      <a href={page.href} target="_blank" rel="noopener noreferrer">
        {page.icon && <page.icon className="size-4" />}
        <span>{page.name}</span>
        {page.badge && <SidebarMenuBadge>{page.badge}</SidebarMenuBadge>}
      </a>
    ) : (
      <Link href={buildHref(page.slug)}>
        {page.icon && <page.icon className="size-4" />}
        <span>{page.name}</span>
        {page.badge && <SidebarMenuBadge>{page.badge}</SidebarMenuBadge>}
      </Link>
    )}
  </SidebarMenuButton>
</SidebarMenuItem>
```

#### Section rendering:
```tsx
<SidebarGroup className={section.className}>
  <SidebarGroupLabel>{section.name}</SidebarGroupLabel>
  <SidebarMenu>
    {section.children.map(renderNode)}
  </SidebarMenu>
</SidebarGroup>
```

#### CollapsibleGroup rendering:
```tsx
<Collapsible defaultOpen={collapsibleGroup.defaultExpanded} className="group/collapsible">
  <SidebarGroup className={collapsibleGroup.className}>
    <SidebarGroupLabel asChild>
      <CollapsibleTrigger>
        {collapsibleGroup.name}
        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
      </CollapsibleTrigger>
    </SidebarGroupLabel>
    <CollapsibleContent>
      <SidebarGroupContent>
        <SidebarMenu>
          {collapsibleGroup.children.map(renderNode)}
        </SidebarMenu>
      </SidebarGroupContent>
    </CollapsibleContent>
  </SidebarGroup>
</Collapsible>
```

#### Separator rendering:
```tsx
<SidebarSeparator className={separator.className} />
```

### 5.3 `bottom` Section Placement

In `toSidebarItems()`, the `bottom: true` flag is already used to sort sections so they render in `SidebarFooter` instead of `SidebarContent`. This behavior is preserved:

```tsx
// In the next package's rendering layer:
{
  section.isFooter ? (
    // Render inside SidebarFooter
    <SidebarFooter>
      <SidebarGroup className={section.className}>
        ...
      </SidebarGroup>
    </SidebarFooter>
  ) : (
    // Render inside SidebarContent
    <SidebarContent>
      <SidebarGroup className={section.className}>
        ...
      </SidebarGroup>
    </SidebarContent>
  )
}
```

---

## 6. Consumer API

### 6.1 Basic Usage

```typescript
import { defineConfig, page, section, collapsibleGroup, separator } from "deesse";

export default defineConfig({
  // ... other config
  pages: [
    page({
      name: "Dashboard",
      slug: "",
      icon: LayoutDashboard,
      content: <DashboardPage />,
    }),
    section({
      name: "Users",
      slug: "users",
      children: [
        page({
          name: "List",
          slug: "",
          icon: Users,
          content: <UsersPage />,
        }),
        page({
          name: "Create",
          slug: "create",
          icon: UserPlus,
          content: <CreateUserPage />,
          badge: { label: "New", variant: "default" },
        }),
      ],
    }),
    separator(),
    collapsibleGroup({
      name: "Reports",
      slug: "reports",
      defaultExpanded: true,
      children: [
        page({ name: "Analytics", slug: "analytics", icon: BarChart, content: <AnalyticsPage /> }),
        page({ name: "Exports", slug: "exports", icon: Download, content: <ExportsPage /> }),
      ],
    }),
    section({
      name: "Settings",
      slug: "settings",
      bottom: true,  // Goes to SidebarFooter
      children: [
        page({ name: "General", slug: "", icon: Settings, content: <SettingsPage /> }),
      ],
    }),
  ],
});
```

### 6.2 Using the `useSidebar` Hook

The `useSidebar` hook is available from `@deessejs/next` (which re-exports from the shadcn sidebar component) for consumers who need programmatic control:

```typescript
import { useSidebar } from "@deessejs/next/sidebar";

function CustomToggle() {
  const { state, toggleSidebar, setOpen, isMobile } = useSidebar();

  return (
    <div>
      <span>Sidebar is {state}</span>
      <button onClick={toggleSidebar}>Toggle</button>
      <button onClick={() => setOpen(false)}>Close</button>
      <span>{isMobile ? "Mobile" : "Desktop"}</span>
    </div>
  );
}
```

### 6.3 SidebarTrigger

`SidebarTrigger` is a shadcn component that renders a button triggering `toggleSidebar()`. It can be used anywhere in the app:

```tsx
import { SidebarTrigger } from "@deessejs/next/sidebar";

function TopBar() {
  return (
    <header>
      <SidebarTrigger />
      <h1>My App</h1>
    </header>
  );
}
```

---

## 7. Type Definitions for DSL Implementation

### 7.1 Full Type Export List

The `deesse` package should export:

```typescript
// From packages/deesse/src/config/page.ts
export { page, section } from "./page.js";
export type { Page, Section, PageTree } from "./page.js";

// New exports (to be added)
export { collapsibleGroup, separator } from "./page.js";
export type { CollapsibleGroup, CollapsibleGroupType, Separator, SeparatorType, DividerType } from "./page.js";

// Re-export LucideIcon for consumer convenience
export type { LucideIcon } from "lucide-react";
```

### 7.2 Updated `page.ts` Implementation Sketch

```typescript
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// --- Types ---

export type PageType = "page";
export type SectionType = "section";
export type CollapsibleGroupType = "collapsible-group";
export type SeparatorType = "separator";

export interface Page {
  type: PageType;
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: ReactNode | null;
  badge?: string | number | { label: string | number; variant?: "default" | "secondary" | "outline" | "destructive" };
  href?: string;
  disabled?: boolean;
  className?: string;
}

export interface Section {
  type: SectionType;
  name: string;
  slug: string;
  bottom?: boolean;
  children: PageTree[];
  className?: string;
}

export interface CollapsibleGroup {
  type: CollapsibleGroupType;
  name: string;
  slug: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  children: PageTree[];
  className?: string;
}

export interface Separator {
  type: SeparatorType;
  className?: string;
}

export type PageTree = Page | Section | CollapsibleGroup | Separator;

// --- Helpers ---

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// --- Factory Functions ---

export function page(config: {
  name: string;
  slug?: string;
  icon?: LucideIcon;
  content: ReactNode | null;
  badge?: string | number | { label: string | number; variant?: "default" | "secondary" | "outline" | "destructive" };
  href?: string;
  disabled?: boolean;
  className?: string;
}): Page {
  return {
    type: "page",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    icon: config.icon,
    content: config.content,
    badge: config.badge,
    href: config.href,
    disabled: config.disabled,
    className: config.className,
  };
}

export function section(config: {
  name: string;
  slug?: string;
  bottom?: boolean;
  children: PageTree[];
  className?: string;
}): Section {
  return {
    type: "section",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    bottom: config.bottom,
    children: config.children,
    className: config.className,
  };
}

export function collapsibleGroup(config: {
  name: string;
  slug?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  children: PageTree[];
  className?: string;
}): CollapsibleGroup {
  return {
    type: "collapsible-group",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    defaultExpanded: config.defaultExpanded ?? true,
    expanded: config.expanded,
    onExpandedChange: config.onExpandedChange,
    children: config.children,
    className: config.className,
  };
}

export function separator(config?: {
  className?: string;
}): Separator {
  return {
    type: "separator",
    className: config?.className,
  };
}
```

---

## 8. Open Questions and Design Decisions

### 8.1 `action()` / `sidebarAction()` Factory (Dialog/Sheet Triggers)

`SidebarMenuAction` is not a top-level node in shadcn -- it is a sibling inside `SidebarMenuItem` alongside `SidebarMenuButton`. The current implementation does not have a pattern for sibling nodes.

However, there is a clear need for sidebar buttons that open Dialog or Sheet overlays without navigating to a page (e.g., "Add New User", "Export Data").

**Solution:** The `SidebarAction` type (defined in `reports/pages/solution.md`) provides this functionality:

```typescript
sidebarAction({
  name: "Add User",
  slug: "add-user",
  icon: Plus,
  actionType: "dialog",  // or "sheet"
  actionContent: <CreateUserDialog />,
  badge: "New",
});
```

This is a top-level node type in `PageTree` that renders as a `SidebarMenuItem` with `SidebarMenuButton` that triggers an overlay when clicked (via shadcn Dialog or Sheet component).

**Mapping to shadcn:**
- `SidebarAction` -> `SidebarMenuItem` + `SidebarMenuButton` + `Dialog` or `Sheet`
- When clicked, opens the overlay containing `actionContent`

### 8.2 `SidebarMenuSkeleton` for Loading States

There is currently no pattern for loading states in the DSL. One option: add a `loading?: boolean` prop to `Page`, which would render `SidebarMenuSkeleton` instead of `SidebarMenuButton` when true. This is straightforward for the common case but may not cover all loading UI needs.

### 8.3 `defaultExpanded` vs `expanded` (Controlled vs Uncontrolled)

The shadcn `Collapsible` component supports both uncontrolled (`defaultOpen`) and controlled (`open`) modes. The DSL should mirror this with `defaultExpanded` (uncontrolled) and `expanded` (controlled). If both are provided, `expanded` takes precedence and `onExpandedChange` MUST be provided.

### 8.4 Deeply Nested Sub-Menus

Shadcn supports `SidebarMenuSub` for nested menus (sub-menus within a `SidebarMenuItem`). The current DSL does not model this. If deeply nested navigation is needed, `PageTree` could gain a `children?: PageTree[]` field for page nodes (making them able to contain child pages that render as a sub-menu). However, this adds complexity. Defer until a real use case emerges.

### 8.5 Custom Class Names

All components accept an optional `className` for custom styling. This is passed through to the underlying shadcn component. Consumers can also use CSS variables via `style` props where needed.

### 8.6 `SidebarRail`

`SidebarRail` is rendered automatically by the `AppSidebar` component in the next package and does not need DSL configuration. It is always present at the sidebar edge for resize functionality. No DSL factory needed.

### 8.7 `SidebarHeader` and `SidebarFooter`

These are typically fixed app chrome (logo, user menu) and not part of the user-defined page tree. The next package's `AppSidebar` component handles them separately. No DSL factory needed.

### 8.8 `SidebarGroupAction`

Shadcn's `SidebarGroupAction` is a small action button in the top-right of a `SidebarGroup`. This could be exposed as an `action` prop on `Section` and `CollapsibleGroup`:

```typescript
section({
  name: "Users",
  slug: "users",
  action: { icon: Plus, label: "Add User" },  // Renders SidebarGroupAction
  children: [...],
})
```

**Recommendation:** Add this if there is a use case. Defer for now.

### 8.9 URL Resolution

The current implementation in `sidebar-nav.tsx` resolves slugs by concatenating parent slugs:

```typescript
const fullPath = basePath ? `${basePath}/${page.slug}` : page.slug;
const href = `/admin/${fullPath}`.replace(/\/$/, "") || "/admin";
```

This works for `page()` nodes where `slug` is a simple string. For `CollapsibleGroup`, the `slug` acts as a prefix. This same logic should apply to the DSL rendering. The next package's rendering layer handles this, not the DSL itself.

### 8.10 Icon Name Extraction (Compatibility Layer)

The current `to-sidebar-items.ts` converts Lucide icons to icon names (strings) to pass through the context without serializing React components:

```typescript
function getIconName(icon: unknown): string | undefined {
  const iconAny = icon as { displayName?: string; name?: string };
  return iconAny.displayName || iconAny.name || undefined;
}
```

This is a workaround since `PageTree` nodes are plain objects but React components cannot be serialized through React context easily. The new DSL should keep the same pattern -- `Page.icon` accepts a `LucideIcon` component type, and the next package's rendering layer extracts the name for context-passing purposes. The type system should reflect that icons are Components, not serialized strings.

---

## 9. Summary: All DSL Factory Functions

| Factory | Description | shadcn mapping |
|---|---|---|
| `page()` | Leaf page node | `SidebarMenuItem` + `SidebarMenuButton` + optional `SidebarMenuBadge` |
| `section()` | Non-collapsible group | `SidebarGroup` + `SidebarMenu` + `SidebarGroupLabel` |
| `collapsibleGroup()` | Collapsible group | `Collapsible` + `SidebarGroup` + `SidebarGroupLabel` as `CollapsibleTrigger` |
| `separator()` | Visual divider | `SidebarSeparator` |

---

## 10. Example: Complete Sidebar Configuration

```typescript
import { defineConfig, page, section, collapsibleGroup, separator } from "deesse";
import { Home, Users, Database, Settings, Puzzle, HelpCircle, BookOpen, BarChart, Download, Shield } from "lucide-react";

export default defineConfig({
  name: "My Admin",
  secret: process.env.DEESSE_SECRET!,
  // ...
  pages: [
    page({
      name: "Dashboard",
      slug: "",
      icon: Home,
      content: <DashboardPage />,
    }),
    section({
      name: "Users",
      slug: "users",
      children: [
        page({
          name: "All Users",
          slug: "",
          icon: Users,
          content: <UsersPage />,
          badge: 12,
        }),
        page({
          name: "Admins",
          slug: "admins",
          icon: Shield,
          content: <AdminsPage />,
          badge: { label: "2", variant: "destructive" },
        }),
      ],
    }),
    separator(),
    collapsibleGroup({
      name: "Reports",
      slug: "reports",
      defaultExpanded: false,
      children: [
        page({ name: "Analytics", slug: "analytics", icon: BarChart, content: <AnalyticsPage /> }),
        page({ name: "Exports", slug: "exports", icon: Download, content: <ExportsPage /> }),
      ],
    }),
    section({
      name: "Database",
      slug: "database",
      children: [
        page({
          name: "Schema",
          slug: "",
          icon: Database,
          content: <DatabasePage />,
        }),
        page({
          name: "Migrations",
          slug: "migrations",
          icon: Database,
          content: <MigrationsPage />,
        }),
      ],
    }),
    separator(),
    collapsibleGroup({
      name: "Help",
      slug: "help",
      defaultExpanded: false,
      children: [
        page({ name: "Documentation", slug: "docs", icon: BookOpen, content: <DocsPage /> }),
        page({ name: "FAQ", slug: "faq", icon: HelpCircle, content: <FaqPage /> }),
      ],
    }),
    section({
      name: "Settings",
      slug: "settings",
      bottom: true,
      children: [
        page({
          name: "General",
          slug: "",
          icon: Settings,
          content: <SettingsPage />,
        }),
        page({
          name: "Plugins",
          slug: "plugins",
          icon: Puzzle,
          content: <PluginsPage />,
        }),
      ],
    }),
  ],
});
```

This configuration would render as:

```
+------------------------------------------------------+
| [Logo] My Admin                              [rail]  |
+------------------------------------------------------+
|                    SidebarContent                    |
| +--------------------------------------------------+ |
| | Dashboard                            [icon]       | |
| +--------------------------------------------------+ |
| | Users                                            | |
| |   [icon] All Users                      [badge:12]| |
| |   [icon] Admins                     [badge:2]    | |
| +--------------------------------------------------+ |
| -------------------------------------------------- |  <- separator
| | Reports                              [chevron]  | |
| |   [icon] Analytics                               | |
| |   [icon] Exports                                 | |
| +--------------------------------------------------+ |
| | Database                                          | |
| |   [icon] Schema                                   | |
| |   [icon] Migrations                               | |
| +--------------------------------------------------+ |
| -------------------------------------------------- |  <- separator
| | Help                                  [chevron]  | |
| +--------------------------------------------------+ |
|                    SidebarFooter                    |
| +--------------------------------------------------+ |
| | Settings                                          | |
| |   [icon] General                                  | |
| |   [icon] Plugins                                  | |
| +--------------------------------------------------+ |
|                           [toggle]                   |
+------------------------------------------------------+
```
