# Page/Tree Navigation Package Extraction Analysis

**Date:** 2026-04-10
**Author:** Senior Software Architect (via Claude Code subagent)

---

## 1. Executive Recommendation

**Do not extract into a separate external package at this time.** Keep it as an internal module within `@deessejs/deesse`.

The page/tree system, in its current form and even in the proposed `reports/pages/solution.md` design, is not sufficiently generic to justify the overhead of a separate npm package. It has fundamental dependencies on `React` (via `ReactNode` content) and `lucide-react` (via the `icon` property), which anchor it firmly to a React-based ecosystem. The coupling is architectural, not incidental.

However, the code **should be structured** so that extraction is trivial if the need arises later. The proposed `packages/deesse/src/lib/navigation.ts` pattern (pure functions, `Option`-based returns, no side effects) is exactly right for this. Build that structure now; extract when a consumer actually exists.

---

## 2. Current Architecture Assessment

### Current State (`packages/deesse/src/config/page.ts`)

```typescript
// 54 lines, 2 types, 2 factory functions
export type Page = { type: "page"; name: string; slug: string; icon?: LucideIcon; content: ReactNode | null }
export type Section = { type: "section"; name: string; slug: string; bottom?: boolean; children: PageTree[] }
export type PageTree = Page | Section

export function page(config): Page
export function section(config): Section
```

The current implementation is extremely lean. There is no `lib/navigation.ts` yet -- the proposed design in `solution.md` is aspirational.

### Proposed State (from `reports/pages/solution.md`)

The solution proposes:
- **New types:** `SubPage`, `CollapsibleGroup`, `BreadcrumbSegment`, `TraversalResult`, `PageConfig`, `SectionConfig`, `Slug` (branded), `NavigationError`
- **New factory functions:** `subPage()`, `collapsibleGroup()`
- **New navigation module:** `packages/deesse/src/lib/navigation.ts` with `pageTree.find()`, `pageTree.findBySlug()`, `pageTree.validate()`
- **Dependency:** `@deessejs/fp` (which does not yet exist as a workspace package)

This is a meaningful expansion, but it still lives within `packages/deesse/`.

### Coupling Analysis

The proposed design has these hard dependencies:

| Dependency | From | Purpose | Can be externalized? |
|---|---|---|---|
| `ReactNode` | `react` | Page `content` field | No -- intrinsic to any React-based CMS |
| `LucideIcon` | `lucide-react` | Page `icon` field | No -- intrinsic to any React navigation UI |
| `Option<T>` | `@deessejs/fp` | Return types for navigation functions | Yes -- this IS the candidate for extraction |
| `Slug` (branded type) | Internal | Type-safe slug validation | No -- trivial, no external dependency |

The parts that are CMS-agnostic (slug validation, tree traversal, breadcrumb computation) are already decoupled from `Config`, `Database`, and `Auth`. The parts that are not CMS-agnostic (`ReactNode`, `LucideIcon`) are intrinsic UI concerns that cannot be externalized without gutting the system's purpose.

**Conclusion:** The navigation logic (find, findBySlug, validate) is structurally isolated. The types (Page, Section, content) are not.

---

## 3. Industry Patterns Comparison

### Payload CMS

Payload CMS does NOT ship page/tree as a separate npm package. Page management is a built-in collection type. Navigation is handled via a `nav` field property. The page tree is tightly coupled to the Payload's collection/document model.

### Strapi

Strapi uses a plugin-based architecture, but its page/tree navigation is not a separate npm package. Content types are managed through Strapi's admin UI, not through a separate navigation package. Navigation is typically handled by the `@strapi/plugin-navigation` official plugin, which IS a separate package but is Strapi-specific (depends on Strapi's plugin architecture, admin panel, and service layer).

### Sanity

Sanity handles navigation via their desk tool and structure builder, which is part of the core Sanity studio -- not a separate npm package. Navigation schemas are portable GROQ queries, but the tree UI itself is tightly coupled to the Sanity studio.

### Pattern Conclusion

None of the major headless CMSes extract their page/tree navigation into a generic, backend-agnostic npm package. Page trees are always either:
1. **Built into the core CMS** (Payload, Strapi, Sanity)
2. **CMS-specific plugins** (Strapi navigation plugin)
3. **UI-layer components** (the rendering side) that consumers implement

The abstraction boundary is at the **content model** level (what fields a page has), not at the **navigation structure** level (how pages are organized into a tree).

---

## 4. Benefits and Drawbacks Analysis

### Benefits of Extraction (Theoretical)

1. **Reusability** -- A consumer could theoretically use `pageTree.find()` with a custom tree structure they define.
2. **Separate versioning** -- Page tree could evolve independently from the rest of deesse.
3. **Focused testing** -- Navigation logic could be tested in isolation without the full deesse stack.
4. **Marketing narrative** -- "Modular architecture" sounds appealing for a headless CMS.

### Drawbacks of Extraction (Practical)

1. **React dependency remains** -- `Page.content: ReactNode` cannot be removed. The package would still require `react` as a peer dependency. The "standalone" promise is hollow.
2. **Lucide-react dependency remains** -- `Page.icon?: LucideIcon` cannot be removed. Icon abstraction would require a separate interface or generic.
3. **No demonstrated need** -- There is no external consumer that needs this. Building for hypothetical future consumers creates YAGNI debt.
4. **Monorepo complexity** -- Another package means another `tsconfig.json`, another `package.json`, another CI entry, another changeset. For what?
5. **Sync overhead** -- Keeping types in sync between packages when both evolve is non-trivial. The `Slug` branded type would need to be identical in both.
6. **Monorepo-native design** -- In a pnpm monorepo, internal packages (not published to npm) are the equivalent of separate packages without the publishing overhead. The correct pattern here is `@deessejs/deesse` internal modules, not a separate package.

---

## 5. What the Package Would Look Like (If Extracted)

If extraction were warranted in the future, the package structure would be:

```
packages/page-tree/
  src/
    types.ts        -- Page, Section, SubPage, CollapsibleGroup, Slug, BreadcrumbSegment, TraversalResult, PageTree (without ReactNode for LucideIcon content -- those would be generics/interfaces)
    config.ts       -- PageConfig, SectionConfig, factory functions
    navigation.ts   -- pageTree.find, findBySlug, validate
    navigation.test.ts
  package.json
  tsconfig.json
```

**Dependencies:**
- `react` (peer dependency -- for `ReactNode`)
- `@deessejs/fp` (workspace dependency for `Option`)

**Public API:**
```typescript
export type { Page, Section, SubPage, CollapsibleGroup, PageTree, Slug, BreadcrumbSegment, TraversalResult, NavigationError }
export type { PageConfig, SectionConfig, SubPageConfig, CollapsibleGroupConfig }
export { page, section, subPage, collapsibleGroup, slugify }
export { pageTree }
```

**Not exported** (would remain in `deesse`):
- `Config` type (database, auth)
- Any database operations
- Any auth operations
- React rendering components (SidebarNav, etc.)

This is essentially the current design in `packages/deesse/src/config/page.ts` and `packages/deesse/src/lib/navigation.ts` (proposed), separated by import path.

---

## 6. Coupling Deep Dive

### What Binds Page Tree to Deesse

1. **`Config.pages?: PageTree[]`** -- The page tree is a field on the deesse config. This is the primary coupling point. However, `Config` is in `define.ts` which already imports `PageTree` from `page.ts`. The coupling is at the config level, not the type system level.

2. **`pageTree.validate()` called in `defineConfig()`** -- Validation is wired into config initialization. This is appropriate -- you want validation at config time. Moving it out would not reduce coupling, it would just move the call site.

3. **`packages/next` consumes `PageTree`** -- The next package imports `PageTree` from `deesse` and uses it in `find-page.ts`. This is expected and appropriate. The next package is a consumer of the deesse package.

### What Does NOT Bind Page Tree to Deesse

1. **No database access** -- `PageTree` types and navigation functions have no database calls.
2. **No auth access** -- No auth checks in navigation logic.
3. **No config runtime access** -- Navigation functions are pure data transformations.
4. **No plugin system coupling** -- The `Plugin` type in `plugin.ts` is separate.

The navigation logic (`pageTree.find`, `findBySlug`, `validate`) is genuinely decoupled. The types (`Page`, `Section`, `content: ReactNode`) are the coupling point, and that coupling is unavoidable for a React-based CMS.

---

## 7. The `@deessejs/fp` Question

The solution.md references `@deessejs/fp` for `Option<T>`. This package does not currently exist in the workspace (no `packages/fp/` directory exists). The `deesse` package.json does not list it as a dependency.

This suggests the solution.md design is aspirational and not yet implemented. If `@deessejs/fp` were created, it would be the correct candidate for extraction -- it is the only truly generic, CMS-agnostic piece of this system.

**However**, even `Option<T>` is not necessary to extract. The navigation functions could return `T | undefined | null` or use a simple custom Result type without creating a separate package. The `Option` type from `@deessejs/fp` is valuable for consistency across the monorepo, but it does not require a separate package -- it could live as an internal module at `packages/deesse/src/lib/option.ts` or similar until there is a demonstrated need for sharing it across packages.

---

## 8. Recommendation

### Short Term (Now)

1. **Implement the `solution.md` design as internal modules** within `packages/deesse/src/`. This is good engineering regardless of extraction decisions. The separation of `config/page.ts` (types + factories) from `lib/navigation.ts` (pure functions) is the correct architecture.

2. **Keep `@deessejs/fp` as an aspirational workspace package** but do not create it until there is a second package that actually needs it. The first candidate would be extracting `Option`/`Result` types for sharing across `deesse` and `next`.

3. **Do NOT create `@deessejs/page-tree`** -- It would be a package in name only, since it would still require `react` and `lucide-react` as peer dependencies. The "headless" promise would be compromised.

### Long Term (When to Reconsider)

Extract a separate package if:
- A second consumer (outside `deesse` and `next`) wants to use the page tree types and navigation
- The `react` and `lucide-react` dependencies can be abstracted via generics or interface injection
- There is a demonstrated versioning need (page tree evolves on a different release cycle than the rest of deesse)

Until then, the internal module structure (`config/page.ts` + `lib/navigation.ts`) provides the same architectural benefits without the publishing and sync overhead.

### Architectural Principle to Apply

**Build for extraction, don't extract prematurely.** The solution.md design achieves this by structuring the code so that the navigation logic is already separated. Extraction becomes a file move + package.json update. That is the correct approach.

---

## 9. Summary

| Criterion | Assessment |
|---|---|
| Headless CMS principle alignment | Partial. Navigation logic is CMS-agnostic; types are not. |
| Package independence viability | Low. React and lucide-react dependencies prevent true independence. |
| Coupling level | Moderate. Navigation is decoupled; types are coupled to React. |
| Industry pattern support | Confirmed. No major CMS extracts page/tree as a generic package. |
| Benefits of extraction | Low value-add given current scope. |
| Drawbacks of extraction | High complexity for no demonstrated benefit. |
| **Final recommendation** | **Keep internal; implement solution.md as structured internal modules.** |

The current `PageTree` design is a domain-specific structure for a React-based headless CMS admin. It is not a generic data structure that can stand alone. The right abstraction is internal module separation (which the solution.md already envisions), not package extraction.

---

*Analysis produced by Claude Code subagent. No modifications made to codebase.*