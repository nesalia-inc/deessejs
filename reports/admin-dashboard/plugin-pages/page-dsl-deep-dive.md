# Page DSL Deep Dive

## Overview

The page DSL is defined in `packages/deesse/src/config/page.ts` and provides a declarative way to define the admin dashboard's navigation structure.

## Core Types

```typescript
type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: ReactNode | null;
};

type Section = {
  type: "section";
  name: string;
  slug: string;
  bottom?: boolean;
  children: PageTree[];
};

type PageTree = Page | Section;
```

## How `page()` and `section()` Work

**`page()` function:**
```typescript
function page(props: {
  name: string;
  slug?: string;  // Optional, auto-generated from name if not provided
  icon?: LucideIcon;
  content: ReactNode | null;
}): Page
```

- Creates a page node with `type: "page"`
- Slug is auto-generated from name if not provided (e.g., "My Page" → "my-page")
- Content is a ReactNode (can be a React component or JSX)

**`section()` function:**
```typescript
function section(props: {
  name: string;
  slug?: string;
  bottom?: boolean;  // If true, renders at bottom of sidebar
  children: PageTree[];
}): Section
```

- Creates a section that groups child pages
- Sections can be nested (sections can contain sections)
- The `bottom` property controls sidebar ordering

## How `findPage()` Works

**Location:** `packages/next/src/lib/find-page.ts`

The `findPage()` function traverses the `PageTree[]` recursively to match slug segments:

```typescript
type FindPageResult = {
  page: Page;
  section: Section | null;
} | null;

function findPage(pages: PageTree[], slugParts: string[]): FindPageResult
```

**Matching Logic:**

1. For **sections**: If slug matches section's slug, continue searching children with remaining segments
2. For **pages**: Match when page's slug equals current segment AND no remaining segments

**Example:**
```typescript
const pages = [
  page({ name: "Dashboard", slug: "dashboard", content: <Dashboard /> }),
  section({
    name: "Users",
    slug: "users",
    children: [
      page({ name: "List", slug: "list", content: <UserList /> }),
      page({ name: "Create", slug: "create", content: <UserCreate /> }),
    ],
  }),
];

// URL: /admin/users/list
// slugParts: ["users", "list"]
// Result: { page: UserList page, section: Users section }
```

## Slug Generation

From `packages/deesse/src/config/page.ts`:

```typescript
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
```

- "User Management" → "user-management"
- "Settings" → "settings"
- "API Keys" → "api-keys"

## How Pages Are Rendered

**Location:** `packages/next/src/root-page.tsx` (line 72)

```typescript
return <>{result.page.content}</>;
```

**Key observation:** Pages are rendered as plain ReactNode. **No props are passed to content.**

This means:
- Page content receives no data from the parent
- Page content must be self-contained or use client-side fetching
- Auth context is NOT passed to page content

## Current Page Structure Example

From `examples/base/src/deesse.pages.tsx`:

```typescript
export const deessePages = [
  page({
    name: "Home",
    slug: "",
    content: (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <h1 className="text-4xl font-bold mb-4">Deesse Admin</h1>
        <p className="text-xl text-muted-foreground">Welcome to your admin dashboard</p>
      </div>
    ),
  }),
  section({
    name: "Settings",
    slug: "settings",
    children: [
      page({
        name: "General",
        slug: "general",
        content: <p>General settings page</p>,
      }),
    ],
  }),
];
```

## Important Notes

1. **Pages are static**: The `content` is a static ReactNode evaluated at config creation time
2. **No props passed**: The RootPage doesn't pass session, auth, or params to page content
3. **Server Components**: Pages in deesse.pages.tsx have no "use client" directive, so they render as Server Components
4. **Client components within pages**: You can include client components inside page content (they'll be hydrated separately)