# Dynamic Pages Implementation Analysis for DeesseJS Admin

## Current Architecture Analysis

### 1. How Next.js Dynamic Routes Work

The example app uses Next.js's catch-all route syntax with `[[...slug]]`:

```
examples/base/src/app/(deesse)/admin/[[...slug]]/page.tsx
```

**How it works:**
- `params.slug` is `string[]` (e.g., `[]` for `/admin`, `["users"]` for `/admin/users`, `["database", "my-table"]` for `/admin/database/my-table`)
- The route matches ALL admin paths since it's a catch-all
- **Current limitation**: The slug is treated as a flat array with no semantic structure

### 2. Current Slug Matching in `findPage()`

From `packages/admin/src/lib/navigation.ts`:

```typescript
export function findPage(
  pages: PageTree[] | undefined,
  slugParts: string[]
): FindPageResult {
  if (!pages) return null;

  // Handle empty slugParts: match pages with empty slug
  if (slugParts.length === 0) {
    for (const item of pages) {
      if (item.type === "page" && item.slug === "") {
        return { page: item };
      }
      // Search inside sections for orphan pages wrapped in "General"
      if (item.type === "section") {
        for (const child of item.children) {
          if (child.type === "page" && child.slug === "") {
            return { page: child };
          }
        }
      }
    }
    return null;
  }

  const [first, ...rest] = slugParts;

  for (const item of pages) {
    if (item.type === "section") {
      if (item.slug === first) {
        // If no more parts, return first child page if exists
        if (rest.length === 0) {
          for (const child of item.children) {
            if (child.type === "page") {
              return { page: child };
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

**Key characteristics:**
- **Exact slug matching only** - no pattern matching
- **Recursive tree traversal** - navigates sections recursively
- **Requires exact slug equality** - `"users"` only matches a page with `slug: "users"`
- **Two-way recursion**: `findPage(pages, slugParts)` recurses into sections with `rest`

### 3. How Params Flow

```
[[...slug]]/page.tsx receives params
        │
        ▼
RootPage({ config, params })  [packages/next/src/root-page.tsx]
        │
        ▼
createAuthContext({ config, params })  [packages/next/src/lib/auth-context.ts]
  - extractSlugParts(params) → string[]
        │
        ▼
findAdminPage(allPages, slugParts)  [packages/next/src/lib/page-finder.ts]
        │
        ▼
findPage(pages, slugParts)  [packages/admin/src/lib/navigation.ts]
```

### 4. Current Page Type System

From `packages/admin/src/config/page.ts`:

```typescript
export type Page = {
  type: "page";
  name: string;
  slug: string;           // Static string only
  icon?: LucideIcon;
  content: ReactNode | null;
};

export type Section = {
  type: "section";
  name: string;
  slug: string;           // Static string only
  bottom?: boolean;
  children: PageTree[];
};
```

**Problem**: `slug` is a plain `string` - no support for dynamic segments.

---

## Problem Statement

### The Challenge

You want to support URLs like `/admin/database/[table_slug]` where:
- `database` is a static section slug
- `[table_slug]` is a dynamic segment that captures the table name
- The page component needs to receive `table_slug` as a prop to query the correct table

### Current Limitations

1. **Exact matching only** - `findPage()` does `item.slug === first` which cannot handle `[table_slug]`
2. **No param extraction** - Dynamic segments like `[table_slug]` would be captured but not parsed
3. **No way to pass params to pages** - `Page.content` is `ReactNode | null`, no mechanism to pass extracted params
4. **Type safety gap** - No TypeScript type that describes which params a page expects

---

## Proposed Solutions

### Solution A: Segment-Based Route Matching (Recommended)

**Approach**: Introduce a route pattern system where slugs can contain named segments.

```typescript
// packages/admin/src/config/page.ts

export type SlugSegment =
  | { type: "static"; value: string }
  | { type: "dynamic"; name: string };

export type PageSlug = SlugSegment[];

// Example: "users" → [{ type: "static", value: "users" }]
// Example: "database/[table_slug]" → [
//   { type: "static", value: "database" },
//   { type: "dynamic", name: "table_slug" }
// ]
```

**Pattern matching in `findPage()`**:
- Static segments match exactly
- Dynamic segments match any string and capture it
- Return both the matched page AND extracted params

```typescript
// packages/admin/src/lib/navigation.ts

export interface FindPageResult {
  page: Extract<PageTree, { type: "page" }> | null;
  params: Record<string, string>;
}

export function findPage(
  pages: PageTree[] | undefined,
  slugParts: string[]
): FindPageResult {
  // ... existing traversal ...
  // But instead of item.slug === first, use:
  // - If segment.type === "static": check equality
  // - If segment.type === "dynamic": capture and continue
}
```

**Type-safe pages**: Create a `dynamicPage()` helper that types the params:

```typescript
// packages/admin/src/config/page.ts

export type DynamicPageConfig<TParams extends Record<string, string>> = {
  name: string;
  slug: string;  // Contains [param] patterns
  icon?: LucideIcon;
  content: (params: TParams) => ReactNode | null;
};

export function dynamicPage<TParams extends Record<string, string>>(
  config: DynamicPageConfig<TParams>
): Page & { paramsType: TParams } {
  // Parse slug into segments, extract param names

  return {
    type: "page",
    name: config.name,
    slug: config.slug,
    icon: config.icon,
    content: config.content as ReactNode,
    paramsType: {} as TParams,  // Phantom type for inference
  };
}
```

**Usage**:
```typescript
const DatabasePage = dynamicPage({
  name: "Database",
  slug: "database/[table_slug]",
  icon: Database,
  content: (params) => async (deesse) => {
    // params is typed as { table_slug: string }
    const { database } = deesse;
    const result = await database.execute(
      sql`SELECT * FROM ${unsafeRaw(params.table_slug)} LIMIT 100`
    );
    return <TableView data={result.rows} />;
  },
});
```

### Solution B: Regex-Based Matching

**Approach**: Allow pages to specify a regex pattern instead of a static slug.

```typescript
export type Page = {
  type: "page";
  name: string;
  slug: string | RegExp;  // Allow regex
  icon?: LucideIcon;
  content: ReactNode | null;
};
```

**Pros**: Flexible, familiar from Express.js
**Cons**:
- Regex complexity grows with multiple segments
- Type inference for params is harder (RegExp doesn't carry param names)
- Potential performance concern with many pages

### Solution C: Hierarchical Param Pages

**Approach**: Special "param pages" that sit at specific route levels.

```typescript
const DatabaseSection = section({
  name: "Database",
  slug: "database",
  children: [
    paramPage({
      name: "Table View",
      paramName: "table_slug",  // This becomes [table_slug]
      content: async (table_slug) => <TablePage table={table_slug} />,
    }),
  ],
});
```

**Pros**: Clear semantics, easy to understand
**Cons**: Only works for single-level params, harder to extend to multi-segment

### Solution D: Native Next.js Approach with Parallel Routes

**Approach**: Use Next.js's native dynamic routes more directly.

Current:
```
app/(deesse)/admin/[[...slug]]/page.tsx  → RootPage → findPage
```

Better structure for deeply dynamic pages:
```
app/(deesse)/admin/database/[table_slug]/page.tsx  → DatabaseTablePage
app/(deesse)/admin/[[...slug]]/page.tsx              → Fallback to findPage
```

**Pros**:
- Next.js handles routing natively
- Full TypeScript support for params
- Better performance (no manual matching)

**Cons**:
- Requires creating actual Next.js route files per dynamic section
- Mixes two systems (file-based and config-based routing)
- Plugin pages can't dynamically add routes

---

## Recommended Approach: Segment-Based with Type-Safe Params

**Why this is the best solution**:

1. **Maintains config-based routing** - Pages remain defined in config, preserving plugin system compatibility
2. **Provides type safety** - Param names and types are inferred through TypeScript generics
3. **Parses slug into segments at definition time** - No runtime regex parsing
4. **Backwards compatible** - Static slugs still work (they become single static segments)
5. **Plugin-friendly** - Plugins can define dynamic pages the same way as static pages

### Implementation Plan

#### Phase 1: Core Types and Parsing

**File**: `packages/admin/src/config/page.ts`

```typescript
/**
 * Represents a static slug segment (e.g., "users")
 */
export interface StaticSlugSegment {
  type: "static";
  value: string;
}

/**
 * Represents a dynamic slug segment (e.g., "[table_slug]")
 */
export interface DynamicSlugSegment {
  type: "dynamic";
  name: string;
}

export type SlugSegment = StaticSlugSegment | DynamicSlugSegment;

/**
 * Parse a slug string into segments.
 * "users" → [{ type: "static", value: "users" }]
 * "database/[table_slug]" → [
 *   { type: "static", value: "database" },
 *   { type: "dynamic", name: "table_slug" }
 * ]
 */
export function parseSlug(slug: string): SlugSegment[] {
  const segments: SlugSegment[] = [];
  const parts = slug.split("/");

  for (const part of parts) {
    const match = part.match(/^\[(.+)\]$/);
    if (match) {
      segments.push({ type: "dynamic", name: match[1] });
    } else {
      segments.push({ type: "static", value: part });
    }
  }

  return segments;
}

/**
 * Extract parameter names from a slug.
 * "database/[table_slug]/[view]" → ["table_slug", "view"]
 */
export function extractParamNames(slug: string): string[] {
  const matches = slug.matchAll(/\[([^\]]+)\]/g);
  return Array.from(matches, (m) => m[1]);
}

// Page type with optional dynamic slug support
export type Page = {
  type: "page";
  name: string;
  slug: string;  // Now accepts patterns like "database/[table_slug]"
  slugSegments?: SlugSegment[];  // Computed at parse time
  icon?: LucideIcon;
  content: ReactNode | null;
  // Phantom type for params inference
  paramsType?: Record<string, string>;
};
```

#### Phase 2: Updated `findPage()` with Param Extraction

**File**: `packages/admin/src/lib/navigation.ts`

```typescript
export interface MatchResult {
  page: Extract<PageTree, { type: "page" }> | null;
  params: Record<string, string>;
}

export function findPage(
  pages: PageTree[] | undefined,
  slugParts: string[]
): MatchResult {
  if (!pages) return { page: null, params: {} };

  // Handle empty slugParts
  if (slugParts.length === 0) {
    for (const item of pages) {
      if (item.type === "page" && item.slug === "") {
        return { page: item, params: {} };
      }
      if (item.type === "section") {
        for (const child of item.children) {
          if (child.type === "page" && child.slug === "") {
            return { page: child, params: {} };
          }
        }
      }
    }
    return { page: null, params: {} };
  }

  const [first, ...rest] = slugParts;

  for (const item of pages) {
    if (item.type === "section") {
      const sectionResult = matchSegment(item.slug, first);
      if (sectionResult.matched) {
        if (rest.length === 0) {
          // Return first child page
          for (const child of item.children) {
            if (child.type === "page") {
              return { page: child, params: sectionResult.params };
            }
          }
          return { page: null, params: {} };
        }
        const childResult = findPage(item.children, rest);
        if (childResult.page) {
          return {
            page: childResult.page,
            params: { ...sectionResult.params, ...childResult.params },
          };
        }
      }
    } else if (item.type === "page") {
      const pageResult = matchSegment(item.slug, first);
      if (pageResult.matched && rest.length === 0) {
        return { page: item, params: pageResult.params };
      }
    }
  }

  return { page: null, params: {} };
}

/**
 * Match a slug pattern against a URL segment.
 * Handles both static ("users") and dynamic ("[table_slug]") patterns.
 */
function matchSegment(
  slug: string,
  segment: string
): { matched: boolean; params: Record<string, string> } {
  // Check if slug has dynamic segments by looking for [ and ]
  if (!slug.includes("[")) {
    // Pure static match
    return {
      matched: slug === segment,
      params: {},
    };
  }

  // Parse into segments
  const slugSegments = parseSlug(slug);

  if (slugSegments.length !== 1) {
    // Multi-segment slugs must be matched by findPage recursively
    // This single-segment match is for top-level matching only
    return { matched: false, params: {} };
  }

  const slugSeg = slugSegments[0];

  if (slugSeg.type === "static") {
    return {
      matched: slugSeg.value === segment,
      params: {},
    };
  } else {
    // Dynamic segment - capture the value
    return {
      matched: true,  // Any string matches a dynamic segment
      params: { [slugSeg.name]: segment },
    };
  }
}
```

#### Phase 3: Type-Safe Dynamic Page Helper

```typescript
/**
 * Creates a page with dynamic segments and type-safe params.
 *
 * @example
 * const TablePage = dynamicPage({
 *   name: "Table View",
 *   slug: "database/[table_slug]",
 *   icon: Database,
 *   content: (params) => async (deesse) => {
 *     // params.table_slug is typed as string
 *     return <TableView name={params.table_slug} />;
 *   },
 * });
 */
export function dynamicPage<TParams extends Record<string, string>>(
  config: {
    name: string;
    slug: string;
    icon?: LucideIcon;
    content: (params: TParams) => ReactNode | null;
  }
): Page {
  const paramNames = extractParamNames(config.slug);

  // Create a type that enforces the param names
  type ParamType = Pick<TParams, typeof paramNames[number]>;

  return {
    type: "page",
    name: config.name,
    slug: config.slug,
    icon: config.icon,
    content: config.content as unknown as ReactNode,
    paramsType: {} as ParamType,
  };
}
```

#### Phase 4: Pass Params to Page Content

The `RootPage` needs to pass params to the page content:

```typescript
// packages/next/src/root-page.tsx

export const RootPage = async ({ config, params }: RootPageProps) => {
  // ... auth and setup ...

  const { result, sidebarItems } = findAdminPage(allPages, slugParts);

  if (!result) {
    return notFound();
  }

  // Pass extracted params to page content
  const content = result.page.content;

  // If content is a function that accepts params, call it
  const pageContent = typeof content === "function"
    ? content(result.params)  // Pass extracted params
    : content;

  return (
    <AdminDashboardLayout ...>
      {pageContent}
    </AdminDashboardLayout>
  );
};
```

**Issue**: Current `Page.content` is `ReactNode | null`, not a function. We need to update the type:

```typescript
export type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  // Content can be static ReactNode or a function that receives params
  content: ReactNode | null | ((params: Record<string, string>) => ReactNode | null);
};
```

---

## Type Definitions

### Final Type System

```typescript
// packages/admin/src/config/page.ts

// Slug parsing
export type SlugSegment =
  | { type: "static"; value: string }
  | { type: "dynamic"; name: string };

export function parseSlug(slug: string): SlugSegment[];
export function extractParamNames(slug: string): string[];

// Page with optional dynamic segments
export interface Page {
  type: "page";
  name: string;
  slug: string;
  slugSegments: SlugSegment[];
  icon?: LucideIcon;
  // Content can be static ReactNode or a function that receives params
  content: ReactNode | null | ((params: Record<string, string>) => ReactNode | null);
}

export interface Section {
  type: "section";
  name: string;
  slug: string;
  slugSegments: SlugSegment[];
  bottom?: boolean;
  children: PageTree[];
}

// Dynamic page creator
export function dynamicPage<TParams extends Record<string, string>>(
  config: DynamicPageConfig<TParams>
): Page;

// Navigation result with params
export interface FindPageResult {
  page: Extract<PageTree, { type: "page" }> | null;
  params: Record<string, string>;
}
```

---

## Security Considerations

### 1. Param Validation

Dynamic params extracted from URLs must be validated before use:

```typescript
// When using params.table_slug in database queries
const VALID_TABLES = ["users", "posts", "comments"]; // Whitelist

if (!VALID_TABLES.includes(params.table_slug)) {
  throw new Error("Invalid table name");
}

// OR use a regex whitelist
if (!/^[a-z_]+$/i.test(params.table_slug)) {
  throw new Error("Invalid table name format");
}
```

### 2. SQL Injection Prevention

**CRITICAL**: Never use params directly in SQL without parameterized queries:

```typescript
// BAD - SQL injection vulnerability
const result = await database.execute(
  sql`SELECT * FROM ${unsafeRaw(params.table_slug)}`
);

// GOOD - Whitelist + parameterized (Drizzle handles this)
if (!isValidTableName(params.table_slug)) {
  return notFound();
}
const result = await database.execute(
  sql`SELECT * FROM ${sql.identifier(params.table_slug)}`
);
```

### 3. Authorization Checks

Even with valid params, verify the user can access that specific resource:

```typescript
// In a server page
content: (params) => async (deesse) => {
  const { auth, database } = deesse;

  // Verify session is still valid
  const session = await auth.api.getSession();
  if (!session) redirect("/login");

  // Check if user can access this table
  const tableSlug = params.table_slug;
  if (!canAccessTable(session.user, tableSlug)) {
    return notFound();
  }

  // Proceed with query
  const data = await database.execute(...);
  return <TableView data={data} />;
}
```

### 4. Rate Limiting on Dynamic Pages

Dynamic routes that query databases should have rate limiting to prevent abuse:

```typescript
// In API routes that back dynamic client pages
import { ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function GET(req: Request) {
  const { success, remaining } = await ratelimit.limit(
    `table-view-${session.user.id}`
  );
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  // ...
}
```

---

## Migration Path from Current System

### Backwards Compatibility

1. **Static slugs continue to work**:
   ```typescript
   page({ name: "Users", slug: "users" })
   // Parsed as: [{ type: "static", value: "users" }]
   // Matches URL: /admin/users
   ```

2. **Empty slugs remain valid**:
   ```typescript
   page({ name: "Home", slug: "" })
   // Matches URL: /admin
   ```

3. **Section nesting unchanged**:
   ```typescript
   section({
     name: "Settings",
     slug: "settings",
     children: [page({ name: "General", slug: "" })]
   })
   // Matches URL: /admin/settings
   ```

### Migration Steps

**Step 1**: Update types (no breaking changes to existing APIs)

Add slug parsing without removing existing functionality. Existing pages with static slugs still work because `parseSlug("users")` returns `[{ type: "static", value: "users" }]`.

**Step 2**: Update `findPage()` to handle dynamic segments

The new matching logic is backwards-compatible because:
- Static slugs are matched exactly
- Dynamic segments only activate when slug contains `[...]`
- Old pages without `[...]` in their slug never trigger dynamic matching

**Step 3**: Add `dynamicPage()` helper

Provide new API while keeping `page()` functional. Users can migrate incrementally.

**Step 4**: Update `RootPage` to pass params

Minor type change - `content` can now be a function. Static content pages continue to work because `typeof staticNode === "function"` is false.

### Example Migration

**Before** (current system):
```typescript
const DatabasePage = page({
  name: "Database",
  slug: "database",
  content: <StaticDatabasePage />,
});
```

**After** (with dynamic support):
```typescript
// Option 1: Keep static, handle routing externally
const DatabasePage = page({
  name: "Database",
  slug: "database",
  content: <StaticDatabasePage />,
});

// Option 2: Use dynamic page for [table_slug]
const DatabaseTablePage = dynamicPage({
  name: "Table View",
  slug: "database/[table_slug]",
  content: (params) => async (deesse) => {
    return <TableView table={params.table_slug} />;
  },
});
```

---

## Summary

| Aspect | Current | Proposed |
|--------|---------|----------|
| Slug type | `string` (exact match only) | `string` with `[param]` patterns |
| Matching | Exact equality | Pattern matching with param extraction |
| Params to pages | None | Via function call `content(params)` |
| Type safety | None | `dynamicPage<TParams>()` with generic |
| Plugin compatibility | Full | Full (same API, extended capabilities) |
| Backwards compatibility | N/A | 100% (static slugs unchanged) |

The proposed solution provides a clean path to dynamic admin pages while maintaining full backwards compatibility and type safety.
