# Admin Dashboard Header Extensibility Analysis

## Context

Allow users to add custom components to the right side of the admin dashboard header, either:
1. **At the component level**: Via props on `AdminDashboardLayout`
2. **At the config level**: Via DSL in `deesse.config.ts` using `admin: { header: { actions } }`

---

## Current Architecture

### Package Structure

| Package | Role | React Dependency |
|---------|------|------------------|
| `packages/deesse` | Core server-side logic | None (react is `devDependency` only) |
| `packages/admin` | Admin-specific types/logic | Yes (`react` in `dependencies`) |
| `packages/next` | Next.js React components | Yes (peer dependency) |

### Data Flow

```
deesse.config.ts
    │
    ▼
defineConfig({ ... })  ← packages/deesse/src/config/define.ts
    │
    ▼
InternalConfig
    │
    ▼
RootPage (packages/next) → AdminDashboardLayout → AppSidebar + AdminHeader
```

### Key Files

| Package | File | Role |
|---------|------|------|
| `@deessejs/deesse` | `src/config/define.ts` | `Config` type definition |
| `@deessejs/admin` | `src/config/define.ts` | `AdminConfig` type definition |
| `@deessejs/admin` | `src/lib/sidebar.ts` | `SidebarItem`, `SidebarPage`, `SidebarSection` types |
| `@deessejs/next` | `src/components/layouts/admin-shell.tsx` | `AdminDashboardLayout` component |
| `@deessejs/next` | `src/components/layouts/admin-header.tsx` | Header UI with breadcrumb |
| `@deessejs/next` | `src/components/ui/app-sidebar.tsx` | Sidebar with user menu |
| `@deessejs/next` | `src/components/ui/sidebar-nav.tsx` | Navigation items renderer |

### Current Config Types

**`packages/deesse/src/config/define.ts`:**
```ts
export type Config = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: { baseURL: string; };
};
```

**`packages/admin/src/config/define.ts`:**
```ts
export type AdminConfig = {
  database: unknown;
  secret: string;
  auth: { baseURL: string; };
  plugins?: Plugin[];
  pages?: PageTree[];
};
```

### Current Header Structure

**File:** `packages/next/src/components/layouts/admin-header.tsx`

```tsx
<header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 transition-[width,height] ease-linear">
  <div className="flex items-center gap-2">
    {/* Left side: SidebarTrigger + Breadcrumb */}
    <SidebarTrigger className="-ml-1" onClick={toggleSidebar} />
    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin">{name ?? "Admin"}</BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumb && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{breadcrumb.page || breadcrumb.section}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  </div>
  {/* Right side: EMPTY - no slot available */}
</header>
```

**Current state:** The header is a flex container with content only on the left. The right side is completely empty.

### How Admin Components Receive Data

**`packages/next/src/root-page.tsx`:**
```tsx
export async function RootPage({ config, params }: RootPageProps) {
  // ...
  return (
    <AdminDashboardLayout
      name={config.name}
      icon="/nesalia.svg"
      items={sidebarItems}
      user={user}
    >
      {result.page.content}
    </AdminDashboardLayout>
  );
}
```

Currently, `AdminDashboardLayout` only receives `name`, `icon`, `items`, `user`. The header actions are empty.

---

## Two-Level Approach

This analysis covers two complementary approaches:
1. **Props-based** (Component Level): Direct prop pass-through
2. **DSL-based** (Config Level): Declarative config in `deesse.config.ts`

---

## Approach 1: Props-based Slot (Component Level)

Add a `headerActions` prop to `AdminDashboardLayout` that renders on the right side of the header.

### Files to Modify

| File | Change |
|------|--------|
| `packages/next/src/components/layouts/admin-shell.tsx` | Add `headerActions?: React.ReactNode` to `AdminDashboardLayoutProps` and pass it to `AdminHeader` |
| `packages/next/src/components/layouts/admin-header.tsx` | Add `headerActions?: React.ReactNode` to `AdminHeaderProps`, render after left content |

### Proposed Changes

**admin-header.tsx:**

```tsx
interface AdminHeaderProps {
  name?: string;
  items: SidebarItem[];
  headerActions?: React.ReactNode; // NEW
}

// In the component, add before closing </header>:
{headerActions && (
  <div className="ml-auto flex items-center gap-2">
    {headerActions}
  </div>
)}
```

**admin-shell.tsx:**

```tsx
export interface AdminDashboardLayoutProps {
  name?: string;
  icon?: string;
  items: SidebarItem[];
  user?: AdminDashboardUser;
  headerActions?: React.ReactNode; // NEW
  children: React.ReactNode;
}
```

### Usage Example

```tsx
<AdminDashboardLayout
  name="My Admin"
  icon="/logo.png"
  items={items}
  headerActions={
    <>
      <Button variant="ghost" size="icon">
        <Bell className="size-4" />
      </Button>
      <ThemeToggle />
      <UserDropdown />
    </>
  }
>
  {children}
</AdminDashboardLayout>
```

---

## Approach 2: DSL-based Config (Config Level)

Add a DSL in `packages/admin` that allows configuring header components directly in the Deesse config using a nested `admin` object:

```ts
defineConfig({
  // ...existing config
  admin: {
    header: {
      actions: <HeaderComponent />
    }
  }
})
```

The `admin` object is designed to be extensible: future additions like `admin.sidebar`, `admin.footer`, or `admin.userMenu` would follow the same pattern.

### Recommended Design: Nested Admin Config

Use a nested structure: `admin: { header: { actions } }`. This allows future extensibility with `admin.sidebar`, `admin.footer`, etc.

**`packages/admin/src/config/header.ts` (NEW):**
```ts
import type { ReactNode } from "react";

export type AdminHeaderConfig = {
  actions?: ReactNode;
};
```

**`packages/admin/src/config/define.ts` (UPDATE):**
```ts
import type { AdminHeaderConfig } from "./header.js";

export type AdminConfig = {
  database: unknown;
  secret: string;
  auth: { baseURL: string; };
  plugins?: Plugin[];
  pages?: PageTree[];
  admin?: {
    header?: AdminHeaderConfig;
  };
};
```

**`packages/deesse/src/config/define.ts` (UPDATE):**
```ts
import type { AdminHeaderConfig } from "@deessejs/admin";

export type Config = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: { baseURL: string; };
  admin?: {
    header?: AdminHeaderConfig;
  };
};
```

**Usage:**
```ts
// deesse.config.ts
import { defineConfig } from "deesse";

export const config = defineConfig({
  secret: process.env.DEESSE_SECRET!,
  database: db,
  auth: { baseURL: process.env.NEXT_PUBLIC_BASE_URL! },
  admin: {
    header: {
      actions: <ThemeToggle />
    }
  }
});
```

**Flow:**
1. User calls `defineConfig({ admin: { header: { actions } } })`
2. `InternalConfig` contains the admin header config
3. `RootPage` extracts `config.admin?.header?.actions` and passes to `AdminDashboardLayout`
4. `AdminDashboardLayout` passes to `AdminHeader`
5. `AdminHeader` renders actions on the right side

**Pros:**
- Type-safe throughout
- Future-proof: easy to add `admin.sidebar`, `admin.footer`, etc.
- Single import from `deesse`
- Clean `admin.header.actions` naming (no duplication)

**Rejected Alternative: Flat `adminHeader` property**
- Less extensible: each new admin UI element needs a new top-level property
- Less consistent with `admin: { ... }` grouping

---

## Implementation Plan

### Relationship Between Approaches

The two approaches serve different use cases:

| Approach | Use Case | How it Works |
|----------|----------|--------------|
| **Props-based** | Custom components per-instance | Direct prop on `AdminDashboardLayout` |
| **DSL-based** | Global components via config | Config flows through `RootPage` to props |

**Key insight:** The DSL-based approach feeds into the props-based internally. `RootPage` reads `config.admin?.header?.actions` and passes it as `headerActions` prop to `AdminDashboardLayout`.

**Conflict resolution:** If both are used simultaneously, they cannot conflict since DSL is set at the app level and props are set per-instance. In practice, only one approach should be used.

### Files to Modify

| File | Change |
|------|--------|
| `packages/admin/src/config/header.ts` | **NEW** - Create `AdminHeaderConfig` type |
| `packages/admin/src/config/define.ts` | Add `admin?: { header?: AdminHeaderConfig }` to `AdminConfig` |
| `packages/admin/src/config/index.ts` | Export `AdminHeaderConfig` from `header.ts` |
| `packages/admin/src/index.ts` | Export `AdminHeaderConfig` |
| `packages/deesse/src/config/define.ts` | Add `admin?: { header?: AdminHeaderConfig }` to `Config` type |
| `packages/next/src/root-page.tsx` | Pass `config.admin?.header?.actions` to `AdminDashboardLayout` |
| `packages/next/src/components/layouts/admin-shell.tsx` | Add `headerActions?: React.ReactNode` prop, pass to `AdminHeader` |
| `packages/next/src/components/layouts/admin-header.tsx` | Add `headerActions?: React.ReactNode` prop, render on right side |

### Detailed Changes

**`packages/admin/src/config/header.ts` (NEW):**
```ts
import type { ReactNode } from "react";

export type AdminHeaderConfig = {
  actions?: ReactNode;
};
```

**`packages/admin/src/config/define.ts` (UPDATE):**
```ts
import type { AdminHeaderConfig } from "./header.js";

export type AdminConfig = {
  database: unknown;
  secret: string;
  auth: { baseURL: string; };
  plugins?: Plugin[];
  pages?: PageTree[];
  admin?: {
    header?: AdminHeaderConfig;
  };
};
```

**`packages/deesse/src/config/define.ts` (UPDATE):**
```ts
import type { AdminHeaderConfig } from "@deessejs/admin";

export type Config = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: { baseURL: string; };
  admin?: {
    header?: AdminHeaderConfig;
  };
};
```

**`packages/next/src/root-page.tsx` (UPDATE):**
```tsx
<AdminDashboardLayout
  name={config.name}
  icon="/nesalia.svg"
  items={sidebarItems}
  user={user}
  headerActions={config.admin?.header?.actions}
>
  {result.page.content}
</AdminDashboardLayout>
```

---

## Design Considerations

### Spacing and Alignment

The header uses:
- `h-12` (48px height)
- `items-center` for vertical centering
- `gap-2` for spacing between elements
- `px-4` horizontal padding

Any right-side content should follow the same pattern:
```tsx
<div className="ml-auto flex items-center gap-2">
  {/* actions here */}
</div>
```

- `ml-auto` pushes content to the right edge
- `flex items-center` aligns with the breadcrumb left content
- `gap-2` matches the existing spacing

### Component Isolation

Components passed as `headerActions` should be self-contained and handle their own:
- State management
- Click handlers
- Dropdown menus
- Loading states

### Type Safety

The `React.ReactNode` type accepts:
- React elements
- Strings
- Numbers
- Fragments
- Arrays of the above

This provides maximum flexibility while maintaining type safety.

---

## Alternative Approaches

### Context-based Slot (Rejected)

Create a `HeaderActionsContext` that any child component can use to register actions.

**Why rejected:** More complex, harder to debug, implicit behavior. The props + DSL combination covers all use cases without the complexity.

```tsx
// Provider wraps the app
<HeaderActionsProvider>
  <AdminDashboardLayout ... />
</HeaderActionsProvider>

// In any child component
useHeaderActions(<NotificationBell />)
```

### DSL in packages/next Only (Rejected)

Keep DSL entirely in `packages/next` to avoid any cross-package dependencies.

**Why rejected:** Users who use `deesse` directly (without `@deessejs/next`) couldn't configure header actions via config. The config should be framework-agnostic.

---

## Implementation Notes

1. **Keep the prop optional** - Existing code should continue to work without changes.

2. **Keep packages independent** - `packages/deesse` should not depend on React as a runtime dependency.

3. **Consider Fragment usage** - Users may want to pass multiple components. `React.ReactNode` handles this naturally.

4. **Avoid forcing a specific wrapper** - Let users choose their own component structure.

---

## Decision Points

### 1. Naming: `admin: { header: { actions } }`
**Status:** Decided. This structure allows future extensibility with `admin.sidebar`, `admin.footer`, etc.

### 2. Dependency Direction

**Issue:** `packages/deesse` needs `AdminHeaderConfig` type, but adding a dependency on `packages/admin` may be undesirable.

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| **A. Duplicate types in `packages/deesse`** | No new dependency | Type drift risk |
| **B. Import from `@deessejs/admin`** | Single source of truth | Creates package dependency |
| **C. Extract to `@deessejs/types`** | Clean separation | New package overhead |

**Recommendation:** Option B - import from `@deessejs/admin`. The dependency is already implied since `Config` already accepts `pages: PageTree[]` which comes from admin. Adding a type import is consistent.

### 3. Validation

**Issue:** `ReactNode` is unconstrained. What if someone passes invalid values?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| **A. No validation** | Simple, flexible | Runtime errors possible |
| **B. Zod schema** | Type-safe, documentable | More boilerplate |

**Recommendation:** Option A for now. `ReactNode` validation is complex and runtime errors are rare. Add validation if a real need emerges.

### 4. Extensibility Plan

Future additions using the same pattern:
- `admin.sidebar` - Sidebar customization
- `admin.footer` - Footer actions
- `admin.userMenu` - User menu customization

Each would follow the same pattern: `Admin<Area>Config` type with `actions?: ReactNode`.

### 5. Approach Priority

**Recommendation:** Implement both, but DSL feeds into props internally.

- **Props-based** is needed for `AdminDashboardLayout` used directly in custom pages
- **DSL-based** is needed for centralized config in `deesse.config.ts`
- They are not exclusive: DSL is just a convenient way to set the prop globally

### 6. Sidebar Extensibility (Future)

Currently `NavUser` is hardcoded in `AppSidebar.tsx`. Consider making it extensible via `admin.sidebar.userMenu` in a future iteration.

---

## Remaining Questions for User

1. **Do you approve the dependency direction (Option B - import from `@deessejs/admin`)?**

2. **Is there a need for sidebar extensibility in this iteration, or defer to future?**
