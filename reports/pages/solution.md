# Page/Section System Solution

## Overview

Implement a typed page tree navigation system using `@deessejs/fp` functional programming types (`Option`, `Result`, `some`, `none`, `ok`, `err`, etc.).

---

## 1. Update `packages/deesse/src/config/page.ts`

Replace the current Page and Section types with discriminated union types using `_tag`.

```typescript
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Type aliases
export type Maybe<T> = T | null | undefined;

// === Slug type (validated string template) ===

type SlugBrand = { readonly __brand: unique symbol };
export type Slug = string & SlugBrand;

// Ensure slug is always lowercase with hyphen separators
const slugify = (name: string): Slug => {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return slug as Slug;
};

// Discriminated union using _tag
export type Page = {
  readonly _tag: "Page";
  name: string;
  slug: Slug;
  icon?: LucideIcon;
  content: ReactNode; // non-nullable
};

// SubPage is identical to Page (a subpage within a collapsible group)
export type SubPage = Page;

// CollapsibleGroup can have either a basePage or only subPages
export type CollapsibleGroup = {
  readonly _tag: "CollapsibleGroup";
  name: string;
  slug: Slug;
  icon?: LucideIcon;
  basePage?: Page;          // Optional base page (section header is also clickable)
  subPages: SubPage[];      // List of sub-pages within the group
};

export type Section = {
  readonly _tag: "Section";
  name: string;
  slug: Slug;
  position?: "header" | "footer"; // replaces bottom
  children: PageTree[];
};

export type PageTree = Page | Section | CollapsibleGroup;

// === Config types (input to factory functions) ===

export type PageConfig = {
  name: string;
  slug: Slug;
  icon?: LucideIcon;
  content: ReactNode;
};

export type SubPageConfig = PageConfig; // SubPage has same shape as Page

export type CollapsibleGroupConfig = {
  name: string;
  slug: Slug;
  icon?: LucideIcon;
  basePage?: PageConfig;    // Optional base page for the group
  subPages: SubPageConfig[]; // List of sub-pages
};

export type SectionConfig = {
  name: string;
  slug: Slug;
  position?: "header" | "footer";
  children: PageTree[];
};

// Breadcrumb support
export type BreadcrumbSegment = {
  name: string;
  slug: Slug;
};

// Traversal result returned by find()
export type TraversalResult = {
  page: Page;
  breadcrumbs: BreadcrumbSegment[];
};

// Factory functions (use config types)
const page = (config: PageConfig): Page => ({
  _tag: "Page",
  name: config.name,
  slug: config.slug,
  icon: config.icon,
  content: config.content,
});

const subPage = (config: SubPageConfig): SubPage => page(config);

const collapsibleGroup = (config: CollapsibleGroupConfig): CollapsibleGroup => ({
  _tag: "CollapsibleGroup",
  name: config.name,
  slug: config.slug,
  icon: config.icon,
  basePage: config.basePage ? page(config.basePage) : undefined,
  subPages: config.subPages.map(subPage),
});

const section = (config: SectionConfig): Section => ({
  _tag: "Section",
  name: config.name,
  slug: config.slug,
  position: config.position,
  children: config.children,
});
```

**Changes summary:**
- Replace `type: "page"` with `_tag: "Page"` discriminant
- Replace `type: "section"` with `_tag: "Section"` discriminant
- Add `position?: "header" | "footer"` to Section (removes `bottom`)
- Make `content` non-nullable (`ReactNode` instead of `ReactNode | null`)
- Add `BreadcrumbSegment` and `TraversalResult` types
- Add `PageConfig`, `SubPageConfig`, `CollapsibleGroupConfig`, and `SectionConfig` input types
- **Make `slug` required in PageConfig and SectionConfig** (no auto-generation)
- Add `Slug` branded type (string template) and `slugify()` function to enforce lowercase-hyphen format
- Add `CollapsibleGroup` type with `basePage` (optional) and `subPages[]`
- Add `collapsibleGroup()` and `subPage()` factory functions

---

## 2. Create `packages/deesse/src/lib/navigation.ts`

New file with functional navigation API using `@deessejs/fp`.

```typescript
import { some, none, type Option } from "@deessejs/fp";
import type { Page, Section, CollapsibleGroup, PageTree, BreadcrumbSegment, TraversalResult, Slug } from "../config/page.js";

/**
 * NavigationError types
 */
export type NavigationError =
  | { type: "SectionNotFound"; slug: Slug; path: string[] }
  | { type: "PageNotFound"; slug: Slug; path: string[] }
  | { type: "SlugCollision"; slug: Slug; count: number; locations: string[] }
  | { type: "NotAPage"; slug: Slug }
  | { type: "EmptyPath" };

/**
 * Find a page by path, returning breadcrumbs
 * @param tree The page tree to search
 * @param path Array of slugs from root to target page
 */
const find = (
  tree: PageTree[],
  path: string[]
): Option<TraversalResult> => {
  if (path.length === 0) {
    return none;
  }

  const breadcrumbs: BreadcrumbSegment[] = [];
  let current: PageTree[] = tree;
  const pathClone = [...path];

  while (pathClone.length > 0) {
    const segment = pathClone.shift()!;
    const found = current.find((item) => item.slug === segment);

    if (!found) {
      return none;
    }

    if (found._tag === "Page") {
      if (pathClone.length !== 0) {
        return none;
      }
      return some({ page: found, breadcrumbs });
    }

    if (found._tag === "CollapsibleGroup") {
      const group = found as CollapsibleGroup;
      // Check basePage first
      if (group.basePage && pathClone.length === 0) {
        return some({ page: group.basePage, breadcrumbs });
      }
      // Search in subPages
      const subPageFound = group.subPages.find(sp => sp.slug === segment);
      if (subPageFound) {
        if (pathClone.length !== 0) {
          return none;
        }
        return some({ page: subPageFound, breadcrumbs: [...breadcrumbs, { name: group.name, slug: group.slug }] });
      }
      // If not found in subPages and path not exhausted, fail
      if (pathClone.length > 0) {
        return none;
      }
      return none;
    }

    // found is a Section
    const section = found as Section;
    breadcrumbs.push({ name: section.name, slug: section.slug });
    current = section.children;
  }

  return none;
};

/**
 * Find a page by slug using flat search across all sections
 * @param tree The page tree to search
 * @param slug The slug to find
 */
const findBySlug = (tree: PageTree[], slug: Slug): Option<Page> => {
  const search = (nodes: PageTree[]): Option<Page> => {
    for (const item of nodes) {
      if (item._tag === "Page" && item.slug === slug) {
        return some(item);
      }
      if (item._tag === "CollapsibleGroup") {
        const group = item as CollapsibleGroup;
        // Check basePage
        if (group.basePage?.slug === slug) {
          return some(group.basePage);
        }
        // Search in subPages
        const subFound = group.subPages.find(sp => sp.slug === slug);
        if (subFound) {
          return some(subFound);
        }
      }
      if (item._tag === "Section") {
        const result = search(item.children);
        if (result._tag === "Some") {
          return result;
        }
      }
    }
    return none;
  };
  return search(tree);
};

/**
 * Validate the page tree for duplicate slugs
 * @param tree The page tree to validate
 * @returns Array of validation errors (empty if valid)
 */
const validate = (tree: PageTree[]): NavigationError[] => {
  const errors: NavigationError[] = [];
  const slugMap = new Map<string, string[]>();

  const collect = (nodes: PageTree[], path: string[]): void => {
    for (const item of nodes) {
      const currentPath = [...path, item.slug];

      if (item._tag === "Page") {
        const existing = slugMap.get(item.slug) ?? [];
        existing.push(currentPath.join("/"));
        slugMap.set(item.slug, existing);
      } else if (item._tag === "CollapsibleGroup") {
        const group = item as CollapsibleGroup;
        // Collect basePage slug
        if (group.basePage) {
          const existing = slugMap.get(group.basePage.slug) ?? [];
          existing.push([...currentPath, "basePage"].join("/"));
          slugMap.set(group.basePage.slug, existing);
        }
        // Collect subPages slugs
        for (const sp of group.subPages) {
          const existing = slugMap.get(sp.slug) ?? [];
          existing.push([...currentPath, sp.slug].join("/"));
          slugMap.set(sp.slug, existing);
        }
      } else {
        collect(item.children, currentPath);
      }
    }
  };

  collect(tree, []);

  for (const [slug, locations] of slugMap) {
    if (locations.length > 1) {
      errors.push({
        type: "SlugCollision",
        slug: slug as Slug,
        count: locations.length,
        locations,
      });
    }
  }

  return errors;
};

/**
 * pageTree namespace - functional navigation API
 */
export const pageTree = {
  find,
  findBySlug,
  validate,
};
```

**Key features:**
- `pageTree.find(tree, path)` returns `Option<TraversalResult>` with page and breadcrumbs
- `pageTree.findBySlug(tree, slug)` performs flat search across all sections
- `pageTree.validate(tree)` returns array of `NavigationError` for duplicate slugs
- All functions are pure, no class-based state

---

## 3. Update `packages/deesse/src/config/define.ts`

Add `validatePageTree()` call in `defineConfig()`.

```typescript
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BetterAuthPlugin } from "better-auth";
import type { Plugin } from "./plugin.js";
import type { PageTree } from "./page.js";
import { pageTree } from "../lib/navigation.js";
import { admin } from "better-auth/plugins";

export type Config = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: {
    baseURL: string;
  };
};

export type InternalConfig = Config & {
  auth: {
    baseURL: string;
    plugins: BetterAuthPlugin[];
  };
};

/**
 * Validate the page tree configuration
 * @param pages The page tree to validate
 * @throws Error containing all validation errors if invalid
 */
function validatePageTree(pages: PageTree[] | undefined): void {
  if (!pages || pages.length === 0) return;

  const errors = pageTree.validate(pages);

  if (errors.length > 0) {
    const messages = errors.map((e) => {
      if (e.type === "SlugCollision") {
        return `Duplicate slug "${e.slug}" at: ${e.locations.join(", ")}`;
      }
      return JSON.stringify(e);
    });
    throw new Error(`Page tree validation failed: ${messages.join("; ")}`);
  }
}

export function defineConfig(config: Config): InternalConfig {
  // Validate page tree at config time
  if (config.pages) {
    validatePageTree(config.pages);
  }

  const authPlugins: BetterAuthPlugin[] = [admin()];

  return {
    ...config,
    auth: {
      ...config.auth,
      plugins: authPlugins,
    },
  } as InternalConfig;
}
```

**Changes summary:**
- Import `pageTree` from `../lib/navigation.js`
- Add `validatePageTree()` function that walks the tree and throws on duplicate slugs
- Call `validatePageTree(config.pages)` at the start of `defineConfig()`

---

## 4. Update `packages/deesse/src/config/index.ts`

Export new types.

```typescript
export { defineConfig } from "./define.js";
export type { Config, InternalConfig } from "./define.js";
export { plugin } from "./plugin.js";
export type { Plugin } from "./plugin.js";
export { page, subPage, collapsibleGroup, section } from "./page.js";
export type { Page, SubPage, Section, CollapsibleGroup, PageTree, BreadcrumbSegment, TraversalResult, Maybe, Slug, PageConfig, SubPageConfig, CollapsibleGroupConfig, SectionConfig } from "./page.js";
```

---

## 5. Update `packages/deesse/src/index.ts`

Export from the navigation module.

```typescript
// ... existing exports ...

// Navigation
export { pageTree } from "./lib/navigation.js";
export type { NavigationError } from "./lib/navigation.js";
```

---

## 6. Update `packages/next/src/lib/find-page.ts`

Update to use the new `pageTree.find()` function.

```typescript
import { none, type Option } from "@deessejs/fp";
import type { Page, PageTree, BreadcrumbSegment, TraversalResult, Slug } from "deesse";
import { pageTree } from "deesse";

/**
 * Find a page by slug parts using pageTree.find
 * @param pages The page tree
 * @param slugParts Array of slug segments from URL
 */
const findPage = (
  pages: PageTree[] | undefined,
  slugParts: string[]
): Option<TraversalResult> => {
  if (!pages || pages.length === 0) {
    return none;
  }
  return pageTree.find(pages, slugParts);
};

/**
 * Find a page by a single slug (flat search across all sections)
 * @param pages The page tree
 * @param slug The slug to find
 */
const findPageBySlug = (
  pages: PageTree[] | undefined,
  slug: Slug
): Option<Page> => {
  if (!pages || pages.length === 0) {
    return none;
  }
  return pageTree.findBySlug(pages, slug);
};

const extractSlugParts = (params: Record<string, string | string[]>): string[] => {
  const slug = params["slug"];
  if (!slug) return [];
  return Array.isArray(slug) ? slug : [slug];
};
```

**Changes summary:**
- Remove `PageTree = Page | Section` (use from deesse)
- Replace recursive `findPage()` with `pageTree.find()` delegation
- Add `findPageBySlug()` for flat search
- Return `Option<TraversalResult>` instead of custom `FindPageResult`

---

## 7. Update `packages/deesse/package.json`

Add `@deessejs/fp` dependency.

```json
{
  "dependencies": {
    "@better-auth/drizzle-adapter": "^1.0.0",
    "@deessejs/fp": "workspace:*",
    "better-auth": "^1.0.0",
    "drizzle-orm": "^0.38.0",
    "lucide-react": "^0.468.0",
    "pg": "^8.13.0",
    "zod": "^3.23.0"
  }
}
```

---

## 8. Create Tests

Create `packages/deesse/src/lib/navigation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { page, section, type PageTree } from "../config/page.js";
import { pageTree } from "./navigation.js";

describe("pageTree", () => {
  const tree: PageTree[] = [
    section({
      name: "Admin",
      slug: "admin",
      children: [
        page({ name: "Dashboard", slug: "dashboard", content: <div>Dashboard</div> }),
        section({
          name: "Users",
          slug: "users",
          children: [
            page({ name: "List", slug: "list", content: <div>Users List</div> }),
            page({ name: "Edit", slug: "edit", content: <div>Edit User</div> }),
          ],
        }),
      ],
    }),
    section({
      name: "Settings",
      slug: "settings",
      children: [
        page({ name: "General", slug: "general", content: <div>Settings</div> }),
      ],
    }),
  ];

  describe("find()", () => {
    it("should find a page at root level", () => {
      const result = pageTree.find(tree, ["dashboard"]);
      expect(result._tag).toBe("Some");
    });

    it("should find a page in nested section", () => {
      const result = pageTree.find(tree, ["admin", "users", "list"]);
      expect(result._tag).toBe("Some");
    });

    it("should return none for invalid path", () => {
      const result = pageTree.find(tree, ["invalid", "path"]);
      expect(result._tag).toBe("None");
    });

    it("should return none for empty path", () => {
      const result = pageTree.find(tree, []);
      expect(result._tag).toBe("None");
    });

    it("should return breadcrumbs for found page", () => {
      const result = pageTree.find(tree, ["admin", "users", "list"]);
      expect(result._tag).toBe("Some");
      if (result._tag === "Some") {
        expect(result.value.breadcrumbs).toEqual([
          { name: "Admin", slug: "admin" },
          { name: "Users", slug: "users" },
        ]);
      }
    });
  });

  describe("findBySlug()", () => {
    it("should find page by slug across sections", () => {
      const result = pageTree.findBySlug(tree, "general");
      expect(result._tag).toBe("Some");
    });

    it("should return none for non-existent slug", () => {
      const result = pageTree.findBySlug(tree, "nonexistent");
      expect(result._tag).toBe("None");
    });
  });

  describe("validate()", () => {
    it("should return empty array for valid tree", () => {
      const errors = pageTree.validate(tree);
      expect(errors).toEqual([]);
    });

    it("should detect duplicate slugs", () => {
      const invalidTree: PageTree[] = [
        section({
          name: "Admin",
          slug: "admin",
          children: [
            page({ name: "Dashboard", slug: "dashboard", content: <div>Dashboard</div> }),
          ],
        }),
        section({
          name: "Users",
          slug: "users",
          children: [
            page({ name: "Dashboard", slug: "dashboard", content: <div>Another Dashboard</div> }),
          ],
        }),
      ];
      const errors = pageTree.validate(invalidTree);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe("SlugCollision");
    });
  });
});
```

---

## 9. Consumer API Example

```typescript
import { defineConfig, page, section, pageTree } from "deesse";
import { none } from "@deessejs/fp";

const config = defineConfig({
  secret: "...",
  database: db,
  auth: { baseURL: "http://localhost:3000" },
  pages: [
    section({
      name: "Admin",
      slug: "admin",
      children: [
        page({ name: "Dashboard", slug: "dashboard", content: <Dashboard /> }),
      ],
    }),
  ],
});

// In a page component:
const result = pageTree.find(config.pages ?? [], ["admin", "dashboard"]);

result.map(({ page, breadcrumbs }) => {
  console.log("Breadcrumbs:", breadcrumbs);
  return renderPage(page);
});

result.getOrElse(() => render404());
```

---

## Summary of File Changes

| File | Action |
|------|--------|
| `packages/deesse/src/config/page.ts` | Update types with `_tag` discriminant, add `position`, make `content` non-nullable |
| `packages/deesse/src/lib/navigation.ts` | **Create new file** with `pageTree` builder |
| `packages/deesse/src/config/define.ts` | Add `validatePageTree()` call |
| `packages/deesse/src/config/index.ts` | Export new types |
| `packages/deesse/src/index.ts` | Export from navigation module |
| `packages/deesse/src/lib/navigation.test.ts` | **Create new file** with tests |
| `packages/next/src/lib/find-page.ts` | Use new `pageTree.find()` |
| `packages/deesse/package.json` | Add `@deessejs/fp` dependency |
