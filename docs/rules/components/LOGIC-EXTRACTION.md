# Logic Extraction Rule

## Rule

**Logic functions must never live inside component files.** Extract them to separate utility files.

## Why

Component files (`.tsx`) should contain only:
- JSX markup
- Hooks (`useState`, `useEffect`, etc.)
- Event handlers that directly manipulate UI state

Pure logic functions should be in `.ts` files in the same directory or a `lib/` subdirectory.

## Anti-Pattern (Bad)

```tsx
// components/admin-header.tsx

"use client";

import { usePathname } from "next/navigation";

import { Breadcrumb, ... } from "@deessejs/ui";
import { useSidebar } from "@deessejs/ui/sidebar";

import type { SidebarItem } from "@deessejs/admin";

function getBreadcrumbFromPathname(pathname: string, items: SidebarItem[]): { section: string; page: string } | null {
  // Logic inside component file - WRONG
  const slugParts = pathname.split("/").filter(Boolean).slice(1);
  // ... complex logic
}

export function AdminHeader({ name, items }: AdminHeaderProps) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumbFromPathname(pathname, items);
  // ...
}
```

## Correct Pattern (Good)

```tsx
// components/admin-header.tsx

"use client";

import { usePathname } from "next/navigation";

import { Breadcrumb, ... } from "@deessejs/ui";
import { useSidebar } from "@deessejs/ui/sidebar";

import type { SidebarItem } from "@deessejs/admin";

import { getBreadcrumbFromPathname } from "./lib/admin-header";

export function AdminHeader({ name, items }: AdminHeaderProps) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumbFromPathname(pathname, items);
  // ...
}
```

```ts
// components/lib/admin-header.ts

import type { SidebarItem } from "@deessejs/admin";

export function getBreadcrumbFromPathname(
  pathname: string,
  items: SidebarItem[]
): { section: string; page: string } | null {
  const slugParts = pathname.split("/").filter(Boolean).slice(1);

  if (slugParts.length === 0) {
    return { section: "Home", page: "" };
  }

  const [sectionSlug, ...pageSlugParts] = slugParts;
  const pageSlug = pageSlugParts.join("/") || "";

  for (const item of items) {
    if (item.type === "section" && item.slug === sectionSlug) {
      for (const child of item.children) {
        if (child.type === "page") {
          if (child.slug === pageSlug || (child.slug === "" && pageSlug === "")) {
            return { section: item.name, page: child.name };
          }
        } else if (child.type === "section") {
          for (const grandchild of child.children) {
            if (grandchild.type === "page" && grandchild.slug === pageSlug) {
              return { section: item.name, page: grandchild.name };
            }
          }
        }
      }
      return { section: item.name, page: "" };
    }
  }

  return null;
}
```

## What Counts as "Logic"

| Should Be Extracted | Can Stay in Component |
|---------------------|----------------------|
| Pure functions with no React dependencies | JSX markup |
| Data transformations | Hooks (useState, useEffect, etc.) |
| Business rules | Event handlers that call hooks |
| Utility functions | Inline simple conditionals in JSX |
| Data fetching logic | useCallback (if it wraps extracted logic) |
| Validation functions | useMemo (if it wraps extracted logic) |

## File Naming Convention

```
components/
├── lib/
│   ├── admin-header.ts        # Logic functions
│   ├── sidebar-utils.ts
│   └── user-helpers.ts
├── AdminHeader.tsx           # Component (only JSX + hooks)
├── SidebarNav.tsx
└── UserCard.tsx
```

## Benefits

1. **Testability** — Logic functions can be unit tested without rendering React
2. **Reusability** — Logic can be imported anywhere
3. **Readability** — Component files are shorter and focused on UI
4. **TypeScript** — Logic files have simpler TypeScript (no JSX type inference)

## Enforcement

This rule is checked during code reviews.
