# Deesse Page/Section System: Deep Analysis & Monadic Redesign

**Date:** 2026-04-10
**Status:** Analysis Only - No Implementation
**Rating:** Current system: 1-2/10

---

## Executive Summary

The `PageTree` recursive model in `packages/deesse/src/config/page.ts` combined with the navigation logic in `packages/next/src/lib/find-page.ts` represents a fundamentally broken approach to hierarchical page navigation. The system suffers from: nullable chaos (`content: ReactNode | null`), asymmetric types (the `bottom` flag on Section only), implicit grouping behavior (orphan pages → "General" section), and a non-monadic `findPage` that returns `| null` forcing callers into defensive null-checks everywhere.

This report proposes a monadic redesign using `Option<T>` patterns that would elevate the system to a 8-9/10 rating.

---

## Table of Contents

1. [Pillar 1: Current System Analysis](#pillar-1-current-system-analysis)
2. [Pillar 2: Monadic Navigation Patterns](#pillar-2-monadic-navigation-patterns)
3. [Pillar 3: Admin Dashboard Navigation Best Practices](#pillar-3-admin-dashboard-navigation-best-practices)
4. [Pillar 4: Type-Safety & Developer Ergonomics](#pillar-4-type-safety--developer-ergonomics)
5. [Pillar 6: Duplicate Name/Slug Handling](#pillar-6-duplicate-name-slug-handling)
6. [Pillar 5: Implementation Recommendations](#pillar-5-implementation-recommendations)
7. [Conclusion](#conclusion)

---

## Pillar 1: Current System Analysis

### 1.1 The Recursive PageTree Model

**Location:** `packages/deesse/src/config/page.ts:4-20`

```typescript
export type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: ReactNode | null;
};

export type Section = {
  type: "section";
  name: string;
  slug: string;
  bottom?: boolean;  // <-- Design smell: asymmetry
  children: PageTree[];
};

export type PageTree = Page | Section;
```

**Problems:**

1. **`type` discriminant is repetitive** - Every node carries `type` but this information is already encoded in which properties exist (Page has `content`, Section has `children`)

2. **Structural duplication** - Both types have `name` and `slug`. This could be extracted to a base type but the union approach prevents inheritance.

3. **No path accumulation** - The model stores only `slug`, not the full path. Navigation must reconstruct paths by traversing upward.

### 1.2 The `bottom` Flag Design Smell

**Location:** `packages/deesse/src/config/page.ts:16`

Section has `bottom?: boolean` but Page does not. This asymmetry reveals that the model conflates **content structure** (Section containing Pages) with **layout positioning** (footer vs header).

This is a **single responsibility principle violation** - the Section type is doing double duty as both a navigation container AND a layout position indicator.

**Consequences:**
- A section can only be footer if it's at the root level of `PageTree[]`
- Nested footer sections have ambiguous semantics
- Render logic must check `bottom` on every section traversal

### 1.3 The `content: ReactNode | null` Null Bomb

**Location:** `packages/deesse/src/config/page.ts:9`

```typescript
content: ReactNode | null;
```

Every consumer of a Page must handle the `null` case:

```typescript
// In admin-shell.tsx or wherever pages are rendered:
const content = page.content ?? <EmptyState />;
```

**Problems:**
- `null` is not `undefined` - it signals intentional absence, not "not yet set"
- No distinction between "content deliberately empty" vs "content missing/bug"
- Forces defensive coding on every render path

**Better model:** Either:
- `content: ReactNode` only (always required)
- Or a `Maybe<ReactNode>` wrapper from a Result/Option type

### 1.4 findPage() - A 1/10 Implementation

**Location:** `packages/next/src/lib/find-page.ts:5-42`

```typescript
export function findPage(pages: PageTree[] | undefined, slugParts: string[]): FindPageResult {
  if (!pages) return null;

  if (slugParts.length === 0) {
    for (const item of pages) {
      if (item.type === "page" && item.slug === "") {
        return { page: item };
      }
    }
    return null;
  }

  const [first, ...rest] = slugParts;

  for (const item of pages) {
    if (item.type === "section") {
      if (item.slug === first) {
        if (rest.length === 0) {
          for (const child of item.children) {
            if (child.type === "page") {
              return { page: child };  // <-- Confusing auto-descend
            }
          }
          return null;
        }
        return findPage(item.children, rest);
      }
    } else if (item.type === "page") {
      if (item.slug === first && rest.length === 0) {
        return { page: item };
      }
    }
  }

  return null;
}
```

**Problems:**

1. **Confusing auto-descend behavior** (line 24-29): When a section slug matches but `rest.length === 0`, the function returns the **first child page**, not the section itself. This means you can't ever navigate to a section directly - you always get its first page.

2. **No path accumulation**: The function returns only the found `Page`, not the path (breadcrumb) that led to it. Consumers can't render breadcrumbs without re-traversing.

3. **Odd return wrapper** (line 3): `FindPageResult = { page: Page } | null` instead of simply `Page | null`. Callers must destructure:
   ```typescript
   const result = findPage(pages, slug);
   if (result) {
     const { page } = result;  // Extra destructuring step
     // use page
   }
   ```

4. **Slug collision is silent**: If two sections at different levels share a slug, the first match wins. No error, no warning.

5. **Empty slug edge case** (lines 9-16): Special-cased handling for `slugParts.length === 0` that searches for `item.slug === ""`. This magic string assumption is fragile.

### 1.5 toSidebarItems() - Implicit Grouping

**Location:** `packages/next/src/lib/to-sidebar-items.ts:46-72`

```typescript
export function toSidebarItems(pageTree: PageTree[]): SidebarItem[] {
  const orphanPages = pageTree.filter(/* ... */);
  const sections = pageTree.filter(/* ... */);

  if (orphanPages.length > 0) {
    items.push({
      type: "section",
      name: "General",  // <-- Synthetic section
      slug: "general",
      children: orphanPages.map(toSidebarItem),
    });
  }
  // ...
}
```

**Problem:** Pages without a parent section are grouped into a synthetic "General" section. This behavior is:
- Implicit, not explicit in the model
- Magic string "General" could conflict with user-defined sections
- Only works at the top level - nested orphans aren't handled differently

---

## Pillar 2: Monadic Navigation Patterns

### 2.1 Why Monadic Navigation?

Traditional navigation returns `T | null`. This forces callers into this pattern:

```typescript
const page = findPage(pages, slug);
if (page !== null) {
  // use page
} else {
  // handle not found - but what kind of not found?
}
```

The problem is that `null` carries no information about **why** navigation failed. Was the section missing? The page? Was the slug malformed?

A monadic approach using `Option<T>` or `Result<T, E>` preserves the failure reason, enabling:
- Precise error messages for debugging
- Different UI for different failure types
- Composable operations via `map`, `flatMap`, `andThen`

### 2.2 Option Type Pattern (from @deessejs/fp)

An `Option<T>` represents a value that may or may not exist. Uses `@deessejs/fp`:

```typescript
import { some, none, type Option, map, flatMap, getOrElse } from '@deessejs/fp';
```

**Navigation with Option:**

```typescript
function findPage(pages: PageTree[], path: string[]): Option<Page> {
  if (path.length === 0) {
    // Return first page at root level
    return pages.find(p => p._tag === 'Page') ?? none();
  }

  const [head, ...tail] = path;

  const section = pages.find(
    (item): item is Section => item._tag === 'Section' && item.slug === head
  );

  if (section) {
    return tail.length === 0
      ? none() // Reached section but no page specified
      : findPage(section.children, tail);
  }

  return none();
}

// Usage - clean and expressive
const page = findPage(config.pages, slugParts)
  .map(renderPage)
  .getOrElse(render404);
```

### 2.3 Result/Either Pattern for Rich Errors

A `Result<T, E>` carries either a success value or an error:

**Navigation with Result (from @deessejs/fp):**

```typescript
import { ok, err, type Result, type Ok, type Err } from '@deessejs/fp';

function findPage(pages: PageTree[], path: string[]): Result<Page, NavigationError> {
  if (path.length === 0) {
    return err({ type: 'EmptyPath' });
  }

  const [head, ...tail] = path;

  const section = pages.find(item => item._tag === 'Section' && item.slug === head);
  const page = pages.find(item => item._tag === 'Page' && item.slug === head);

  if (section && page) {
    return err({ type: 'SlugCollision', slug: head, occurrences: 2 });
  }

  if (section) {
    return tail.length === 0
      ? err({ type: 'NotAPage', slug: head, actualType: 'section' })
      : findPage(section.children, tail);
  }

  if (page && tail.length === 0) {
    return ok(page);
  }

  return err({ type: 'PageNotFound', slug: head, path });
}
```

### 2.4 Path Accumulation Pattern

Monadic traversal naturally accumulates the path (breadcrumb trail):

```typescript
function traverseWithPath(
  pages: PageTree[],
  path: string[],
  accumulated: string[] = []
): Result<Page, NavigationError> {
  if (path.length === 0) {
    return err({ type: 'EmptyPath' });
  }

  const [head, ...tail] = path;
  const currentPath = [...accumulated, head];

  const section = pages.find(item => item.type === 'section' && item.slug === head);
  const page = pages.find(item => item.type === 'page' && item.slug === head);

  if (section) {
    if (tail.length === 0) {
      return err({ type: 'SectionHasNoChildren', path: currentPath });
    }
    return traverseWithPath(section.children, tail, currentPath);
  }

  if (page) {
    return ok(page);
  }

  return err({ type: 'NotFound', slug: head, path: currentPath });
}
```

### 2.5 Composability Example

```typescript
// Chain multiple operations fail-fast
const result = findPage(pages, ['settings', 'security'])
  .flatMap(page => validateAccess(page, user))
  .map(page => renderPage(page))
  .mapErr(error => logNavigationError(error));

// Pattern matching on errors
match(result, {
  Ok: (page) => <PageComponent page={page} />,
  Err: (error) => {
    switch (error.type) {
      case 'SectionNotFound':
        return <MissingSection slug={error.slug} path={error.path} />;
      case 'SlugCollision':
        return <AmbiguousSlugWarning slug={error.slug} />;
      default:
        return <NotFound />;
    }
  }
});
```

---

## Pillar 3: Admin Dashboard Navigation Best Practices

### 3.1 Industry Pattern Analysis

**Payload CMS** uses a flat array of localized "config" objects:
- Each page has `slug`, `label`, `blocks[]`
- Navigation is derived from page relationships, not a tree structure
- Sections are virtual groupings, not a distinct type

**Strapi** uses a hierarchical component system:
- Nested `sections[]` with `pages[]` inside
- Explicit `name` and `visible` flags
- Slugs are auto-generated, not user-defined

**Django Admin** uses a simple `app` → `model` → `changeform` hierarchy:
- Flat URL structure, not nested
- Navigation is derived from ModelAdmin registration order

### 3.2 Key Insights from Industry

1. **Explicit > Implicit** - Best systems define section membership explicitly, not derived from orphan detection

2. **Slug Collision Detection** - Payload warns on duplicate slugs at the same level; Strapi enforces uniqueness

3. **URL as First-Class Citizen** - Pages are defined by their URL path first, content second

4. **No Magic Grouping** - Orphan pages don't get a synthetic "General" section; they either appear at root level or explicitly belong to a section

5. **Footer as Separate Concept** - Rather than a `bottom` flag, footer sections are often defined in a separate `footerNavigation` config key

### 3.3 Recommended Model Adjustments

```typescript
// Explicit sections, no bottom flag
type Section = {
  type: "section";
  name: string;
  slug: string;
  children: PageTree[];
};

// Page without content (content loaded separately)
type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
};

// Separate footer configuration
type FooterSection = {
  name: string;
  slug: string;
  children: PageTree[];
};

// Config updated
type Config = {
  // ...
  pages?: PageTree[];          // Header/main navigation
  footerPages?: PageTree[];     // Explicit footer navigation
};

// Or alternatively, sections have a `position` field:
type Section = {
  type: "section";
  name: string;
  slug: string;
  position: 'header' | 'footer';  // Explicit positioning
  children: PageTree[];
};
```

---

## Pillar 4: Type-Safety & Developer Ergonomics

### 4.1 Discriminated Union Issues

Current approach:

```typescript
type PageTree = Page | Section;

// Type guard required everywhere
function processNode(node: PageTree) {
  if (node.type === 'section') {
    // node.children is accessible
  } else {
    // node.content is accessible
  }
}
```

**Problem:** The discriminant is a string literal (`"page"` / `"section"`) that exists on both types identically. This is redundant.

**Better approach - Nominal typing with exhaustiveness:**

```typescript
interface PageNode {
  readonly _tag: 'Page';
  readonly name: string;
  readonly slug: string;
  readonly icon?: LucideIcon;
  readonly content: ReactNode;
}

interface SectionNode {
  readonly _tag: 'Section';
  readonly name: string;
  readonly slug: string;
  readonly children: PageTree[];
}

// Type-safe match function
function matchPageTree<T>(
  node: PageTree,
  handlers: {
    onPage: (page: Page) => T;
    onSection: (section: Section) => T;
  }
): T {
  switch (node._tag) {
    case 'Page': return handlers.onPage(node);
    case 'Section': return handlers.onSection(node);
  }
}
```

### 4.2 Return Type Issues

**Current (line 3 in find-page.ts):**
```typescript
type FindPageResult = { page: Page } | null;

// Usage
const result = findPage(pages, slug);
if (result) {
  const { page } = result;  // Extra destructuring
  render(page);
}
```

**Better - Option type (from @deessejs/fp):**
```typescript
import { some, none, type Option } from '@deessejs/fp';

function findPage(pages: PageTree[], slug: string[]): Option<Page> {
  // ... implementation
  return some(page);  // or none()
}

// Usage - cleaner
findPage(pages, slug)
  .map(render)
  .getOrElse(render404);
```

### 4.3 Slug Parts Typing

**Current (line 44-48):**
```typescript
function extractSlugParts(params: Record<string, string | string[]>): string[] {
  const slug = params["slug"];
  if (!slug) return [];
  return Array.isArray(slug) ? slug : [slug];
}
```

**Issues:**
- No type safety on slug format
- `Record<string, string | string[]>` is too loose
- Returns `string[]` with no guarantee of valid slug segments

**Better - Branded types:**
```typescript
type Brand<K, T> = K & { __brand: T };

type SlugSegment = Brand<string, 'SlugSegment'>;
type PagePath = Brand<SlugSegment[], 'PagePath'>;

function parseSlugParam(param: string | string[]): PagePath {
  const segments = Array.isArray(param) ? param : [param];
  return segments.map(seg => seg as SlugSegment) as PagePath;
}
```

### 4.4 Icon Serialization Fragility

**Current (to-sidebar-items.ts:20-25):**
```typescript
function getIconName(icon: unknown): string | undefined {
  const iconAny = icon as { displayName?: string; name?: string };
  return iconAny.displayName || iconAny.name || undefined;
}
```

**Problems:**
- Runtime reflection on component internals
- `displayName` and `name` are conventions, not contracts
- No validation that the result is a valid Lucide icon name

**Better - Explicit serialization:**
```typescript
// In page.ts, icon stored as string name, not component
type Page = {
  // ...
  iconName?: string;  // e.g., "House", "Settings"
};

// Factory validates icon
import { icons } from 'lucide-react';

function page(config: {
  name: string;
  icon?: string;  // Pass icon name, not component
}): Page {
  if (config.icon && !(config.icon in icons)) {
    throw new Error(`Unknown icon: ${config.icon}`);
  }
  return { /* ... */ };
}
```

### 4.5 Content Null Problem

**Current:**
```typescript
content: ReactNode | null;

// Every consumer must:
const body = page.content ?? <EmptyState />;
```

**Better - Two options:**

Option A: Content is always required
```typescript
content: ReactNode;  // No null
```

Option B: Use `Maybe<ReactNode>` from Option type
```typescript
type MaybeReactNode = Option<ReactNode>;

// Usage
page.content
  .map(render)
  .getOrElse(null)  // explicit fallback
```

---

## Pillar 6: Duplicate Name/Slug Handling

### 6.1 Overview

The current system has **no validation** for duplicate names or slugs at definition time. This creates critical runtime failures where navigation becomes ambiguous or silently returns the wrong page. This pillar analyzes all collision scenarios and proposes a comprehensive solution using `Result` types with rich error context.

### 6.2 Collision Scenarios

There are four distinct collision types in a `PageTree[]`:

| Scenario | Example | Severity |
|----------|---------|----------|
| **Sibling pages with same slug** | Two pages under same section with `slug: "settings"` | Critical |
| **Sibling sections with same slug** | Two sections at same level with `slug: "admin"` | Critical |
| **Sibling pages with same name** | Two pages with `name: "Settings"` (auto-generates same slug) | High |
| **Sibling sections with same name** | Two sections with `name: "Admin"` (auto-generates same slug) | High |

### 6.3 Current Behavior (Silent Failure)

**Location:** `packages/next/src/lib/find-page.ts:18-39`

```typescript
for (const item of pages) {
  if (item.type === "section") {
    if (item.slug === first) {
      // First match wins - no collision detection
      return findPage(item.children, rest);
    }
  } else if (item.type === "page") {
    if (item.slug === first && rest.length === 0) {
      return { page: item };  // First match wins
    }
  }
}
return null;
```

**Problems:**
1. **First match wins** - No error, no warning, just silently returns the wrong page if duplicates exist
2. **No name collision detection** - `toSlug()` converts "Admin" and "admin" to the same slug, but this is never flagged
3. **No sibling uniqueness validation** - Duplicates at the same level are never caught

### 6.4 Example Failure Scenarios

**Scenario A: Duplicate Page Slugs**
```typescript
const pages: PageTree[] = [
  section({
    name: "Settings",
    slug: "settings",
    children: [
      page({ name: "Profile", slug: "profile", content: <div /> }),
      page({ name: "User Profile", slug: "profile", content: <div /> }), // Collision!
    ],
  }),
];

// findPage(pages, ["settings", "profile"]) returns FIRST match
// User intended "User Profile" but gets "Profile" - silent, no error
```

**Scenario B: Duplicate Section Slugs**
```typescript
const pages: PageTree[] = [
  section({ name: "Admin", slug: "admin", children: [...] }),
  section({ name: "Administration", slug: "admin", children: [...] }), // Collision!
];

// findPage(pages, ["admin", "users"]) - ambiguous, first section wins
// The second section ("Administration") is silently unreachable
```

**Scenario C: Name Collision (Auto-generated Slug)**
```typescript
const pages: PageTree[] = [
  page({ name: "User Settings", content: <div /> }),  // slug: "user-settings"
  page({ name: "User-Settings", content: <div /> }),   // slug: "user-settings" (collision!)
];

// Both have slug = "user-settings" but never explicitly declared
// The system does not detect this at config time
```

**Scenario D: Nested Collision**
```typescript
const pages: PageTree[] = [
  section({
    name: "Dashboard",
    slug: "dashboard",
    children: [
      page({ name: "Overview", slug: "overview", content: <div /> }),
      page({ name: "Overview", slug: "overview", content: <div /> }), // Duplicate!
    ],
  }),
];
// findPage(pages, ["dashboard", "overview"]) - ambiguous at nested level
// Only detected if path reaches the collision point
```

### 6.5 Why Slug is the Collision Point, Not Name

The URL uses slugs, not names. Two pages with the same name but different slugs are valid:

```typescript
// Valid: Same name, different slugs
page({ name: "Settings", slug: "user-settings", ... })
page({ name: "Settings", slug: "system-settings", ... })
// URLs: /user-settings, /system-settings - distinct, no collision
```

But two pages with the same slug are always a collision regardless of name:

```typescript
// Invalid: Different names, same slug
page({ name: "User Settings", slug: "settings", ... })
page({ name: "System Settings", slug: "settings", ... })
// Both URL: /settings - collision!
```

**Name collision is only a problem when it auto-generates a colliding slug.**

### 6.6 Detection Strategies

#### Strategy A: Build-time Validation (Recommended)

Validate at config creation time using a recursive validator:

```typescript
type ValidationError =
  | { type: 'DuplicateSlug'; slug: string; locations: string[] }
  | { type: 'DuplicateName'; name: string; autoSlug: string; locations: string[] };

type ValidationResult = ValidationError[];  // Empty = valid

function validatePageTree(pages: PageTree[]): ValidationResult {
  const errors: ValidationError[] = [];
  const slugIndex = new Map<string, string[]>();  // slug -> path[]
  const nameIndex = new Map<string, string[]>();  // name -> path[]

  function walk(nodes: PageTree[], path: string[]) {
    for (const node of nodes) {
      const currentPath = [...path, node.slug];

      if (node.type === 'page') {
        // Check slug collision
        const existing = slugIndex.get(node.slug) ?? [];
        slugIndex.set(node.slug, [...existing, currentPath.join('/')]);

        // Check name collision (potential slug collision)
        const autoSlug = toSlug(node.name);
        const nameKey = `${currentPath.slice(0, -1).join('/')}/${autoSlug}`;
        const nameExisting = nameIndex.get(node.name) ?? [];
        nameIndex.set(node.name, [...nameExisting, currentPath.join('/')]);
      } else {
        // Check section slug collision
        const existing = slugIndex.get(node.slug) ?? [];
        slugIndex.set(node.slug, [...existing, currentPath.join('/')]);

        // Recurse into children
        walk(node.children, currentPath);
      }
    }
  }

  walk(pages, []);

  // Generate errors
  for (const [slug, locations] of slugIndex) {
    if (locations.length > 1) {
      errors.push({
        type: 'DuplicateSlug',
        slug,
        locations,
      });
    }
  }

  return errors;
}

// Usage at defineConfig time
const errors = validatePageTree(config.pages ?? []);
if (errors.length > 0) {
  throw new Error(
    `PageTree validation failed:\n${
      errors.map(e => `  - ${e.type}: "${e.slug}" at ${e.locations.join(', ')}`).join('\n')
    }`
  );
}
```

#### Strategy B: Runtime Result with Collision Info

Return `Result<Page, NavigationError>` with `SlugCollision` error:

```typescript
type NavigationError =
  | { type: 'SlugCollision'; slug: string; path: string[]; candidates: string[] }
  | { type: 'PageNotFound'; slug: string; path: string[] }
  // ... other errors

function findPageWithCollisionDetection(
  pages: PageTree[],
  path: string[]
): Result<Page, NavigationError> {
  // ... (see implementation in Pillar 2)
}
```

### 6.7 Handling Multiple Matches

When a slug appears multiple times, the system must decide what to return:

**Option 1: First Match (Current - Silent Wrong)**
```typescript
// DON'T USE - silently returns wrong page
const match = pages.find(p => p.slug === target);
return match ?? null;
```

**Option 2: Error with All Locations**
```typescript
// RECOMMENDED - explicit error with disambiguation info
type SlugCollision = {
  type: 'SlugCollision';
  slug: string;
  candidates: Array<{
    page: Page;
    path: string[];
  }>;
};

return {
  _tag: 'Err',
  error: {
    type: 'SlugCollision',
    slug: 'settings',
    candidates: [
      { page: userSettingsPage, path: ['admin', 'settings'] },
      { page: systemSettingsPage, path: ['system', 'settings'] },
    ],
  },
};
```

**Option 3: Disambiguation Index**
For backward compatibility, add a numeric suffix for disambiguation:

```typescript
// When collision detected at build time, suggest:
// slug: "settings" -> slug: "settings-0", slug: "settings-1"
// This is explicit but ugly for URLs
```

### 6.8 Design: Validation at Definition Time

**Principle:** Fail fast at config creation. Do not let invalid configs reach runtime.

**Proposed factory functions with built-in validation:**

```typescript
// packages/deesse/src/config/page.ts

// Unique slug registry for a page tree
class SlugRegistry {
  private slugs = new Map<string, { name: string; path: string }>();

  register(slug: string, name: string, path: string): void {
    const existing = this.slugs.get(slug);
    if (existing) {
      throw new Error(
        `Duplicate slug "${slug}" in page tree:\n` +
        `  First: "${existing.name}" at ${existing.path}\n` +
        `  Second: "${name}" at ${path}`
      );
    }
    this.slugs.set(slug, { name, path });
  }
}

const globalRegistry = new SlugRegistry();

function page(config: {
  name: string;
  slug?: string;
  icon?: LucideIcon;
  content: ReactNode;
}): Page {
  const slug = config.slug ?? toSlug(config.name);

  // Validate uniqueness at creation time
  globalRegistry.register(slug, config.name, `/${slug}`);

  return {
    _tag: 'Page',
    name: config.name,
    slug,
    icon: config.icon,
    content: config.content,
  };
}

function section(config: {
  name: string;
  slug?: string;
  variant?: 'header' | 'footer';
  children: PageTree[];
}): Section {
  const slug = config.slug ?? toSlug(config.name);

  // Validate section slug uniqueness
  globalRegistry.register(slug, config.name, `/${slug}`);

  return {
    _tag: 'Section',
    name: config.name,
    slug,
    variant: config.variant,
    children: config.children,
  };
}
```

**Problem with global state:** The registry persists across hot reloads and tests. Better to validate at config level, not factory level.

### 6.9 Design: Config-Level Validation

**Recommended approach - validate the entire tree at `defineConfig`:**

```typescript
// packages/deesse/src/config/define.ts

export function defineConfig(config: Config): InternalConfig {
  // Validate page tree for duplicates BEFORE creating the config
  if (config.pages) {
    const errors = validatePageTree(config.pages);
    if (errors.length > 0) {
      const messages = errors.map(e => {
        if (e.type === 'DuplicateSlug') {
          return `  - Slug "${e.slug}" used ${e.locations.length} times at: ${e.locations.join(', ')}`;
        }
        if (e.type === 'DuplicateName') {
          return `  - Name "${e.name}" auto-generates slug "${e.autoSlug}" used ${e.locations.length} times at: ${e.locations.join(', ')}`;
        }
      }).join('\n');

      throw new Error(`PageTree validation failed:\n${messages}`);
    }
  }

  // ... rest of defineConfig
}
```

### 6.10 Navigation with Collision Awareness

**Enhanced navigation using @deessejs/fp with an Ambiguous variant:**

```typescript
import { ok, err, some, none, type Option, type Result } from '@deessejs/fp';
import { some, none, type Option } from '@deessejs/fp';

export type FindPageResult =
  | { _tag: 'Ok'; page: Page; breadcrumbs: BreadcrumbSegment[] }
  | { _tag: 'Err'; error: NavigationError }
  | { _tag: 'Ambiguous'; slug: string; candidates: Array<{ page: Page; path: string[] }> };

export function findPage(pages: PageTree[], path: string[]): FindPageResult {
  if (path.length === 0) {
    return { _tag: 'Err', error: { type: 'EmptyPath' } };
  }

  const [head, ...tail] = path;

  // Collect all matches at this level
  const matches: Array<{ type: 'page' | 'section'; node: PageTree; path: string[] }> = [];

  for (const node of pages) {
    if (node.slug === head) {
      matches.push({ type: node._tag === 'Page' ? 'page' : 'section', node, path: [head] });
    }
  }

  if (matches.length === 0) {
    return { _tag: 'Err', error: { type: 'NotFound', slug: head, path } };
  }

  if (matches.length > 1) {
    // Collision detected - return ambiguous with all candidates
    const pageMatches = matches
      .filter(m => m.type === 'page')
      .map(m => ({ page: m.node as Page, path: m.path }));

    return {
      _tag: 'Ambiguous',
      slug: head,
      candidates: pageMatches,
    };
  }

  const match = matches[0];

  if (match.type === 'section') {
    if (tail.length === 0) {
      return { _tag: 'Err', error: { type: 'NotAPage', slug: head } };
    }
    const result = findPage((match.node as Section).children, tail);
    if (result._tag === 'Ok') {
      return {
        _tag: 'Ok',
        page: result.page,
        breadcrumbs: [{ name: match.node.name, slug: head, type: 'section' }, ...result.breadcrumbs],
      };
    }
    return result;
  }

  if (match.type === 'page' && tail.length === 0) {
    return {
      _tag: 'Ok',
      page: match.node as Page,
      breadcrumbs: [],
    };
  }

  return { _tag: 'Err', error: { type: 'NotFound', slug: head, path } };
}
```

### 6.11 Consumer Handling of Ambiguous Results

```typescript
function renderPageFromResult(result: FindPageResult) {
  switch (result._tag) {
    case 'Ok':
      return <PageComponent page={result.page} breadcrumbs={result.breadcrumbs} />;

    case 'Err':
      switch (result.error.type) {
        case 'EmptyPath':
          return <HomePage />;
        case 'NotAPage':
          return <SectionIndex section={result.error.slug} />;
        case 'NotFound':
          return <NotFoundPage missingSlug={result.error.slug} />;
        default:
          return <ErrorPage error={result.error} />;
      }

    case 'Ambiguous':
      return (
        <DisambiguationPage
          slug={result.slug}
          candidates={result.candidates}
        />
      );
  }
}
```

### 6.12 Sidebar Implications

When sidebar renders from `PageTree[]`, duplicate slugs cause visual ambiguity:

```typescript
// Current: toSidebarItems.ts just filters and renders
// Duplicate slugs cause:
// - First section/page in list wins
// - Later duplicates silently omitted
// - User sees incomplete sidebar with no warning
```

**Proposed sidebar behavior with collision detection:**

```typescript
export function toSidebarItems(pageTree: PageTree[]): SidebarItem[] {
  // Validate first - fail fast
  const errors = validatePageTree(pageTree);
  if (errors.length > 0) {
    console.error('Sidebar: PageTree has duplicate slugs', errors);
    // Option: render warning indicator in sidebar instead of crashing
  }

  // ... existing transformation
}
```

### 6.13 Summary: Duplicate Handling Matrix

| Scenario | Detection Point | Error Type | Resolution |
|----------|-----------------|------------|------------|
| Sibling pages same slug | `defineConfig` | `DuplicateSlug` | Must rename one |
| Sibling sections same slug | `defineConfig` | `DuplicateSlug` | Must rename one |
| Page name auto-generates colliding slug | `defineConfig` | `DuplicateName` | Must specify explicit slug |
| Path resolves to ambiguous slug | `findPage` | `Ambiguous` | Return all candidates |
| Nested duplicate slug | `defineConfig` | `DuplicateSlug` | Must rename one |

### 6.14 Recommended Implementation

1. **At config creation (`defineConfig`):**
   - Validate entire `PageTree[]` recursively
   - Collect all slugs with their locations
   - If any slug appears more than once, throw with full paths
   - If any name would auto-generate a colliding slug, warn

2. **At navigation time (`findPage`):**
   - If path resolves to multiple candidates, return `Ambiguous` result
   - Include all candidate paths for disambiguation UI

3. **At sidebar rendering (`toSidebarItems`):**
   - Log warning if duplicates detected (after fix is applied)
   - Render first match, skip duplicates silently

4. **At build time (CI):**
   - Add `--validate-page-tree` flag to CLI
   - Fail build if validation errors exist

---

## Pillar 5: Implementation Recommendations

### 5.1 Proposed Type Changes

**File: `packages/deesse/src/config/page.ts`**

```typescript
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// === Base Types ===

interface BaseNode {
  readonly name: string;
  readonly slug: string;
}

// === Page and Section Types ===

interface Page {
  readonly _tag: 'Page';
  readonly name: string;
  readonly slug: string;
  readonly icon?: LucideIcon;
  readonly content: ReactNode;  // No longer nullable
}

interface Section {
  readonly _tag: 'Section';
  readonly name: string;
  readonly slug: string;
  readonly position: 'header' | 'footer';  // Explicit positioning
  readonly children: PageTree[];
}

type PageTree = Page | Section;

// === Option Type (from @deessejs/fp) ===

import { some, none, type Option, map, flatMap, getOrElse } from '@deessejs/fp';

// === Navigation Errors ===

type NavigationError =
  | { readonly type: 'SectionNotFound'; readonly slug: string; readonly path: string[] }
  | { readonly type: 'PageNotFound'; readonly slug: string; readonly path: string[] }
  | { readonly type: 'SlugCollision'; readonly slug: string; readonly count: number }
  | { readonly type: 'NotAPage'; readonly slug: string }
  | { readonly type: 'EmptyPath' };

// === Factory Functions ===

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function page(config: {
  name: string;
  slug?: string;
  icon?: LucideIcon;
  content: ReactNode;
}): Page {
  return {
    _tag: 'Page',
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    icon: config.icon,
    content: config.content,
  };
}

function section(config: {
  name: string;
  slug?: string;
  position?: 'header' | 'footer';
  children: PageTree[];
}): Section {
  return {
    _tag: 'Section',
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    position: config.position ?? 'header',
    children: config.children,
  };
}
```

### 5.2 New Navigation Module

**File: `packages/deesse/src/lib/navigation.ts` (new)**

```typescript
import type { PageTree, Page, Option } from "../config/page";
import { Some, None, option } from "../config/page";

export type { NavigationError } from "../config/page";
export type { Option } from "../config/page";

/**
 * Result type for navigation operations
 */
export type NavigationResult = Result<{ page: Page; breadcrumbs: BreadcrumbSegment[] }, NavigationError>;

/**
 * Find a page by path segments.
 * Returns Option<Page> for fail-fast navigation.
 */
export function findPage(pages: PageTree[], path: string[]): Option<Page> {
  if (path.length === 0) {
    // Return the first page at root level if no path specified
    const firstPage = pages.find((p): p is Page => p._tag === 'Page');
    return firstPage ? some(firstPage) : none();
  }

  const [head, ...tail] = path;

  for (const node of pages) {
    if (node._tag === 'Section' && node.slug === head) {
      if (tail.length === 0) {
        // Path ends at section - no page to return
        return none();
      }
      return findPage(node.children, tail);
    }

    if (node._tag === 'Page' && node.slug === head && tail.length === 0) {
      return some(node);
    }
  }

  return none();
}

/**
 * Find a page with rich error information.
 * Use this when you need to distinguish between different failure modes.
 */
export function findPageWithError(pages: PageTree[], path: string[]): NavigationResult {
  if (path.length === 0) {
    return err({ type: 'EmptyPath' });
  }

  const [head, ...tail] = path;
  let sectionCount = 0;
  let matchingPage: Page | null = null;

  for (const node of pages) {
    if (node._tag === 'Section' && node.slug === head) {
      sectionCount++;
    }
    if (node._tag === 'Page' && node.slug === head) {
      matchingPage = node;
    }
  }

  if (sectionCount > 1) {
    return {
      _tag: 'Err',
      error: { type: 'SlugCollision', slug: head, count: sectionCount },
      path,
    };
  }

  for (const node of pages) {
    if (node._tag === 'Section' && node.slug === head) {
      if (tail.length === 0) {
        return err({ type: 'NotAPage', slug: head });
      }
      return findPageWithError(node.children, tail);
    }

    if (node._tag === 'Page' && node.slug === head && tail.length === 0) {
      return ok({ page: node, breadcrumbs: [] });
    }
  }

  return err({ type: 'PageNotFound', slug: head, path });
}

/**
 * Extract slug parts from Next.js route params.
 * Returns PagePath (branded string array) for type safety.
 */
export function extractSlugParts(params: Record<string, string | string[] | undefined>): string[] {
  const slug = params["slug"];
  if (!slug) return [];
  return Array.isArray(slug) ? slug : [slug];
}

/**
 * Get all pages flattened from the tree.
 * Useful for search or sitemap generation.
 */
export function flattenPages(pages: PageTree[]): Page[] {
  const result: Page[] = [];

  function walk(nodes: PageTree[]) {
    for (const node of nodes) {
      if (node._tag === 'Page') {
        result.push(node);
      } else {
        walk(node.children);
      }
    }
  }

  walk(pages);
  return result;
}

/**
 * Get all sections that match a position.
 */
export function getSectionsByPosition(
  pages: PageTree[],
  position: 'header' | 'footer'
): PageTree[] {
  return pages.filter(
    (node): node is PageTree =>
      node._tag === 'Section' && node.position === position
  );
}
```

### 5.3 Updated Config Type

**File: `packages/deesse/src/config/define.ts`**

```typescript
import type { PageTree } from "./page";

export type Config = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];
  pages?: PageTree[];           // Header/main navigation
  footerPages?: PageTree[];     // Explicit footer navigation
  secret: string;
  auth: {
    baseURL: string;
  };
};
```

### 5.4 Alternative: pageTree Builder with Native find()

Instead of having a separate `findPage(pages, path)` function, the `pageTree` builder could encapsulate navigation directly, making the API more ergonomic and co-locating data with behavior.

**Design:**

```typescript
import { some, none, type Option } from '@deessejs/fp';

// pageTree creates a self-contained tree with built-in navigation
function pageTree(children: PageTree[]): PageTreeBuilder {
  return new PageTreeBuilderImpl(children);
}

class PageTreeBuilderImpl {
  constructor(private children: PageTree[]) {}

  // Native find method - no need to pass pages around
  find(path: string[]): Option<{ page: Page; breadcrumbs: BreadcrumbSegment[] }> {
    return this.traverse(this.children, path, []);
  }

  // Also expose flat search for convenience
  findBySlug(slug: string): Option<Page> {
    const result = this.flatSearch(this.children, slug);
    return result ? some(result) : none();
  }

  private traverse(
    nodes: PageTree[],
    path: string[],
    breadcrumbs: BreadcrumbSegment[]
  ): Option<{ page: Page; breadcrumbs: BreadcrumbSegment[] }> {
    if (path.length === 0) {
      const page = nodes.find((n): n is Page => n._tag === 'Page' && n.slug === '');
      return page ? some({ page, breadcrumbs }) : none();
    }

    const [head, ...tail] = path;

    for (const node of nodes) {
      if (node.slug === head) {
        if (node._tag === 'Section') {
          if (tail.length === 0) {
            return none(); // Path ends at section, no page
          }
          return this.traverse(node.children, tail, [
            ...breadcrumbs,
            { name: node.name, slug: node.slug, type: 'section' }
          ]);
        }
        if (node._tag === 'Page' && tail.length === 0) {
          return some({ page: node, breadcrumbs });
        }
      }
    }

    return none();
  }

  private flatSearch(nodes: PageTree[], target: string): Page | null {
    for (const node of nodes) {
      if (node.slug === target && node._tag === 'Page') {
        return node;
      }
      if (node._tag === 'Section') {
        const found = this.flatSearch(node.children, target);
        if (found) return found;
      }
    }
    return null;
  }

  // Validate the tree for duplicate slugs
  validate(): ValidationError[] {
    return validatePageTree(this.children);
  }
}
```

**Usage:**

```typescript
// Instead of: findPage(pages, ['admin', 'users'])
// With pageTree:
const tree = pageTree([
  section({ name: 'Admin', slug: 'admin', children: [
    page({ name: 'Users', slug: 'users', content: <UsersPage /> }),
  ]}),
]);

// Native find - no external function needed
const result = tree.find(['admin', 'users']);
result.map(({ page, breadcrumbs }) => renderPage(page, breadcrumbs));
result.getOrElse(() => render404());
```

**Benefits:**
1. **Encapsulation** - Tree and navigation are one concept
2. **No parameter passing** - `find` is a method, not a separate function
3. **Self-validating** - Builder can validate on construction
4. **Composable** - `pageTree` can be used as a value, passed around, nested
5. **Type-safe** - Return type is `Option<T>` from @deessejs/fp

**Integration with Config:**

```typescript
// defineConfig receives pageTree, not raw array
const config = defineConfig({
  // ...
  pages: pageTree([
    section({ name: 'Dashboard', slug: 'dashboard', children: [...] }),
  ]),
});

// Later, findPage is called on the pageTree instance
const result = config.pages.find(['dashboard', 'overview']);
```

### 5.5 Migration Path

**Phase 1: Types Only (no behavior change)**
- Add `_tag` fields to Page and Section
- Add `position` field to Section
- Keep `content: ReactNode | null` during transition

**Phase 2: Navigation Module**
- Create `packages/deesse/src/lib/navigation.ts`
- Implement `findPage` returning `Option<Page>`
- Keep old `find-page.ts` as thin wrapper calling new module

**Phase 3: Remove Legacy**
- Delete old `find-page.ts`
- Update consumers to use `navigation.findPage`
- Change `content` to non-nullable

**Phase 4: Strict Mode**
- Enable strict discriminated union checking
- Remove `bottom` property entirely (replaced by `position`)

### 5.6 Testing Strategy

```typescript
// navigation.test.ts

describe('findPage', () => {
  const pages: PageTree[] = [
    section({
      name: 'Dashboard',
      slug: 'dashboard',
      children: [
        page({ name: 'Overview', slug: 'overview', content: <div /> }),
        page({ name: 'Analytics', slug: 'analytics', content: <div /> }),
      ],
    }),
    section({
      name: 'Settings',
      slug: 'settings',
      position: 'footer',
      children: [
        page({ name: 'Profile', slug: 'profile', content: <div /> }),
      ],
    }),
  ];

  it('finds nested page by path', () => {
    const result = findPage(pages, ['dashboard', 'overview']);
    expect(result._tag).toBe('Some');
    expect(result.value.name).toBe('Overview');
  });

  it('returns None for invalid path', () => {
    const result = findPage(pages, ['invalid', 'path']);
    expect(result._tag).toBe('None');
  });

  it('returns None when path ends at section', () => {
    const result = findPage(pages, ['dashboard']);
    expect(result._tag).toBe('None');
  });
});

describe('findPageWithError', () => {
  it('reports SlugCollision when duplicate slugs exist', () => {
    const pages: PageTree[] = [
      section({ name: 'A', slug: 'same', children: [] }),
      section({ name: 'B', slug: 'same', children: [] }),
    ];
    const result = findPageWithError(pages, ['same']);
    expect(result._tag).toBe('Err');
    expect(result.error.type).toBe('SlugCollision');
  });
});
```

---

## Conclusion

### Summary of Problems

| Issue | Current State | Impact |
|-------|---------------|--------|
| Nullable content | `content: ReactNode \| null` | Runtime errors, defensive coding |
| Asymmetric types | `bottom` flag only on Section | Layout knowledge leaked into data model |
| Non-monadic find | Returns `Page \| null` | No error context, no composability |
| No path accumulation | Search doesn't track breadcrumbs | Extra traversal needed for UI |
| Slug collision silent | First match wins | Hard to debug navigation issues |
| Synthetic grouping | Orphans → "General" section | Magic behavior, potential conflicts |
| **Duplicate slug/name** | No validation | Silent wrong page, unreachable sections |
| **Ambiguous path** | No detection at navigation | Returns first match, no disambiguation |

### Recommended Rating After Changes

| Aspect | Current | Target |
|--------|---------|--------|
| Type safety | 3/10 | 9/10 |
| Error handling | 2/10 | 9/10 |
| Composability | 1/10 | 9/10 |
| Developer experience | 2/10 | 8/10 |
| Overall | 1-2/10 | 8-9/10 |

### Next Steps

1. **Approve this report** - Confirm the direction is correct
2. **Phase 1 implementation** - Add `_tag` discriminants, `position` field
3. **Phase 2 implementation** - Create navigation module with Option types
4. **Phase 3 migration** - Update consumers, remove legacy code
5. **Phase 4 strictness** - Enforce non-nullable content, remove `bottom`

---

*Report generated by deep-analysis skill. No implementation performed.*