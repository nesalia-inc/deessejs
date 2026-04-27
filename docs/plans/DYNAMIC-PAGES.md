# Plan: Dynamic Pages Implementation for DeesseJS Admin

## Status

- **Created**: 2026-04-22
- **Status**: Not Started
- **Branch**: `refactor/simplify-root-page`
- **Related Report**: `reports/admin/dasboard/pages/DYNAMIC-PAGES.md`

## Overview

Implement support for dynamic admin pages with URL patterns like `/admin/database/[table_slug]`. This allows the admin dashboard to have pages that capture URL segments as parameters and pass them to page components.

## Goals

1. Support URLs like `/admin/database/[table_slug]` where `[table_slug]` is captured
2. Extract dynamic segments from URLs and pass them to page components
3. Provide type-safe API for defining dynamic pages
4. Maintain 100% backwards compatibility with existing static pages
5. **Implement database table explorer** - dynamic routes for browsing table data (e.g., `/admin/database/users` displays the `users` table)

## Non-Goals

- Implementing catch-all routes (`[...catchall]`) - out of scope
- Parallel file-based routing alongside config-based routing
- Server-side validation of dynamic params (delegated to page components)
- Editing table data (read-only view only)

## Implementation Steps

### Phase 1: Slug Parsing Utilities

**Files to modify:**
- `packages/admin/src/config/page.ts`

**Changes:**
1. Add `SlugSegment` type:
   ```typescript
   export type SlugSegment =
     | { type: "static"; value: string }
     | { type: "dynamic"; name: string };
   ```

2. Add `parseSlug()` function:
   ```typescript
   export function parseSlug(slug: string): SlugSegment[];
   // "users" → [{ type: "static", value: "users" }]
   // "database/[table_slug]" → [
   //   { type: "static", value: "database" },
   //   { type: "dynamic", name: "table_slug" }
   // ]
   ```

3. Add `extractParamNames()` function:
   ```typescript
   export function extractParamNames(slug: string): string[];
   // "database/[table_slug]/[view]" → ["table_slug", "view"]
   ```

**Deliverables:**
- [ ] `parseSlug()` function with tests
- [ ] `extractParamNames()` function with tests

---

### Phase 2: Update `findPage()` with Param Extraction

**Files to modify:**
- `packages/admin/src/lib/navigation.ts`

**Changes:**
1. Update `FindPageResult` interface:
   ```typescript
   export interface FindPageResult {
     page: Extract<PageTree, { type: "page" }> | null;
     params: Record<string, string>;
   }
   ```

2. Add segment matching logic:
   ```typescript
   function matchSegment(
     slug: string,
     segment: string
   ): { matched: boolean; params: Record<string, string> }
   ```

3. Update `findPage()` to:
   - Parse slugs into segments when checking matches
   - Capture dynamic segment values into params
   - Return params along with matched page

4. Update `extractSlugParts()` to handle params flow

**Deliverables:**
- [ ] Updated `FindPageResult` type
- [ ] `matchSegment()` helper function
- [ ] Updated `findPage()` with param extraction
- [ ] Existing `findPage()` tests pass
- [ ] New tests for dynamic segment matching

---

### Phase 3: Type-Safe `dynamicPage()` Helper

**Files to modify:**
- `packages/admin/src/config/page.ts`

**Changes:**
1. Add `DynamicPageConfig` type:
   ```typescript
   export type DynamicPageConfig<TParams extends Record<string, string>> = {
     name: string;
     slug: string;
     icon?: LucideIcon;
     content: (params: TParams) => ReactNode | null;
   };
   ```

2. Add `dynamicPage()` function:
   ```typescript
   export function dynamicPage<TParams extends Record<string, string>>(
     config: DynamicPageConfig<TParams>
   ): Page
   ```

**Deliverables:**
- [ ] `DynamicPageConfig` type
- [ ] `dynamicPage<TParams>()` function
- [ ] Type inference works correctly for params

---

### Phase 4: Update `RootPage` to Pass Params

**Files to modify:**
- `packages/next/src/root-page.tsx`

**Changes:**
1. Update `Page` content type to allow function:
   ```typescript
   content: ReactNode | null | ((params: Record<string, string>) => ReactNode | null);
   ```

2. Modify page rendering to call content function with params:
   ```typescript
   const content = result.page.content;
   const pageContent = typeof content === "function"
     ? content(result.params)
     : content;
   ```

3. Update `findAdminPage()` return type handling

**Deliverables:**
- [ ] Updated page content rendering to support function form
- [ ] Params passed correctly to dynamic pages
- [ ] Static pages continue to work

---

### Phase 5: Documentation

**Files to modify:**
- `reports/admin/dasboard/pages/README.md`

**Changes:**
1. Document dynamic page creation with `dynamicPage()`
2. Add usage examples
3. Document migration from static to dynamic pages
4. Add security considerations for SQL injection prevention

**Deliverables:**
- [ ] Updated README with dynamic page documentation
- [ ] Security warnings about param validation

---

### Phase 6: Database Table Explorer Implementation

**Files to modify:**
- `packages/next/src/lib/database.ts` (new)
- `packages/next/src/components/pages/table-view-page.tsx` (new)
- `packages/next/src/pages/default-pages.tsx`

**Changes:**
1. Create `database.ts` helper with:
   - `getValidTables(db)` - returns list of valid table names
   - `getTableSchema(db, tableName)` - returns column info

2. Create `TableViewPage` component:
   - Displays table data in a grid
   - Shows column headers
   - Handles empty state and loading

3. Update `default-pages.tsx`:
   - Add dynamic page for `database/[table_slug]`
   - Wire up table explorer

**Deliverables:**
- [ ] `getValidTables()` helper
- [ ] `getTableSchema()` helper
- [ ] `TableViewPage` component
- [ ] Integration with default pages

---

## API Design

### Before (Static Pages)
```typescript
page({
  name: "Database",
  slug: "database",
  content: <StaticDatabasePage />
})
```

### After (Static + Dynamic)
```typescript
// Static page (unchanged)
page({
  name: "Database",
  slug: "database",
  content: <StaticDatabasePage />
})

// Dynamic page (new)
dynamicPage({
  name: "Table View",
  slug: "database/[table_slug]",
  icon: Database,
  content: (params) => async (deesse) => {
    // params.table_slug is typed as string
    const { database } = deesse;
    const result = await database.execute(
      sql`SELECT * FROM ${sql.identifier(params.table_slug)} LIMIT 100`
    );
    return <TableView data={result.rows} />;
  }
})
```

---

## Security Considerations

1. **Param Validation**: Pages must validate params before use
2. **SQL Injection**: Use `sql.identifier()` for table names, never string interpolation
3. **Authorization**: Verify user can access the specific resource

Example with validation:
```typescript
dynamicPage({
  name: "Table View",
  slug: "database/[table_slug]",
  content: (params) => async (deesse) => {
    const allowedTables = ["users", "posts", "comments"];
    if (!allowedTables.includes(params.table_slug)) {
      return notFound();
    }
    // Safe to use in query
  }
})
```

---

## Testing Plan

### Unit Tests
- `parseSlug()`: static, dynamic, mixed slugs
- `extractParamNames()`: single, multiple, no params
- `matchSegment()`: static match, static no match, dynamic match
- `findPage()`: existing tests + dynamic segment matching

### Integration Tests
- End-to-end navigation to dynamic page
- Params correctly extracted and passed
- 404 when no page matches

### Database Table Explorer Tests
- Valid table name passes validation
- Invalid table name returns 404
- SQL injection attempts are blocked
- Empty table shows empty state
- Table with data displays rows correctly
- Column names are displayed

---

## Migration Path

### Backwards Compatibility
- `page()` helper unchanged - continues to work with static slugs
- `findPage()` returns empty params `{}` for static pages
- No breaking changes to existing code

### Incremental Migration
1. Existing static pages work unchanged
2. Add `dynamicPage()` for new dynamic pages
3. Migrate static pages to dynamic if needed

---

## Files Summary

| File | Change |
|------|--------|
| `packages/admin/src/config/page.ts` | Add slug parsing, `dynamicPage()` |
| `packages/admin/src/lib/navigation.ts` | Update `findPage()` with param extraction |
| `packages/next/src/root-page.tsx` | Pass params to page content |
| `packages/next/src/lib/database.ts` | Database helpers (new) |
| `packages/next/src/components/pages/table-view-page.tsx` | Table view component (new) |
| `packages/next/src/pages/default-pages.tsx` | Add dynamic table page |
| `reports/admin/dasboard/pages/README.md` | Document dynamic pages |

---

## Timeline

This implementation can be done incrementally. Each phase is independent and can be reviewed separately.

---

## Use Case: Database Table Explorer

The primary use case for dynamic pages is the **Database Table Explorer** - a read-only interface to browse table data.

### Routes

| URL | Description |
|-----|-------------|
| `/admin/database` | List all tables (existing static page) |
| `/admin/database/[table_slug]` | Display all rows from a specific table |

### Implementation

1. **Dynamic Page Definition**:
   ```typescript
   // In deesse.config.ts or default-pages.tsx
   page({
     name: "Database",
     slug: "database",
     icon: Database,
     content: serverPage(async (deesse) => {
       // Static: list all tables
       return <DatabaseListPage />;
     }),
   }),

   // Dynamic route for table detail
   page({
     name: "Table View",
     slug: "database/[table_slug]",
     icon: Table,
     content: dynamicPage({
       name: "Table",
       slug: "database/[table_slug]",
       content: (params) => serverPage(async (deesse) => {
         const { database } = deesse;
         // Validate table exists
         const validTables = await getValidTables(database);
         if (!validTables.includes(params.table_slug)) {
           return notFound();
         }
         // Query table data
         const result = await database.execute(
           sql`SELECT * FROM ${sql.identifier(params.table_slug)} LIMIT 100`
         );
         return <TableViewPage
           tableName={params.table_slug}
           rows={result.rows}
           columns={result.fields}
         />;
       }),
     }),
   })
   ```

2. **Database Helper** (`packages/next/src/lib/database.ts`):
   ```typescript
   // Validate table exists in public schema
   export async function getValidTables(db: Database): Promise<string[]>

   // Get table schema (column names and types)
   export async function getTableSchema(db: Database, tableName: string): Promise<ColumnInfo[]>
   ```

3. **Table View Component** (`packages/next/src/components/pages/table-view-page.tsx`):
   ```typescript
   type TableViewPageProps = {
     tableName: string;
     rows: Record<string, unknown>[];
     columns: { name: string; type: string }[];
   };
   ```

### Security: Table Name Validation

**Critical**: Table names from URLs must be validated against `information_schema.tables` before querying to prevent SQL injection.

```typescript
// GOOD - validates against whitelist
const VALID_TABLES = await db.execute(
  sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
);
const tableNames = VALID_TABLES.rows.map(r => r.table_name);
if (!tableNames.includes(params.table_slug)) {
  return notFound();
}
const data = await db.execute(
  sql`SELECT * FROM ${sql.identifier(params.table_slug)}`
);

// BAD - SQL injection vulnerability
const data = await db.execute(
  sql`SELECT * FROM ${unsafeRaw(params.table_slug)}`  // NEVER DO THIS
);
```

### Features

- [ ] List all tables in sidebar (static)
- [ ] Navigate to `/admin/database/[table_slug]`
- [ ] Display table rows in a data grid
- [ ] Show column names and types
- [ ] Validate table names against `information_schema`
- [ ] Handle empty tables
- [ ] Handle "table not found" (404)
- [ ] Pagination for large tables (future enhancement)

## Open Questions

1. Should we add pagination for tables with many rows?
2. Should we allow sorting by column?
3. Should we allow filtering/searching?
4. Should we cache table schemas in memory?
