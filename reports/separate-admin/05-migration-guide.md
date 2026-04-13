# Migration Guide

This document describes how to migrate from the current architecture to the new `@deessejs/admin` + `@deessejs/admin-next` structure.

**Note:** No backward compatibility needed - we're in development, not production. Breaking changes are acceptable.

## Migration Overview

**From:**
- `deesse` package (contains admin logic mixed with core)
- `@deessejs/next` package (Next.js admin components)

**To:**
- `deesse` package (core only: server, client, plugin, cache)
- `@deessejs/admin` package (React-agnostic admin logic)
- `@deessejs/admin-next` package (Next.js React components)

## File-by-File Migration

### `packages/deesse/src/index.ts`

**Before:**
```typescript
export { isDatabaseEmpty, requireDatabaseNotEmpty, hasAdminUsers, validateAdminEmail } from "./lib/admin.js";
export type { EmailValidationOptions } from "./lib/admin.js";
export { isPublicEmailDomain, isAllowedAdminEmail, getAllowedDomains, validateAdminEmailDomain, PUBLIC_EMAIL_DOMAINS } from "./lib/validation.js";
export { page, section } from "./config/index.js";
export type { Page, Section, PageTree } from "./config/index.js";
```

**After:**
```typescript
// Core exports only - admin utilities moved to @deessejs/admin
export { createDeesse } from "./server.js";
export type { Deesse } from "./server.js";
export { createClient } from "./client.js";
export type { DeesseClient, DeesseClientOptions } from "./client.js";
export { plugin } from "./config/index.js";
export type { Plugin } from "./config/index.js";
export { z } from "zod";
```

### `packages/next/src/root-page.tsx`

**Before:**
```typescript
import { hasAdminUsers } from "deesse";
import { extractSlugParts, findPage } from "./lib/find-page";
import { toSidebarItems } from "./lib/to-sidebar-items";
import { SidebarItemsProvider } from "./lib/sidebar-items-context";
import { defaultPages } from "./pages/default-pages";
```

**After:**
```typescript
import { hasAdminUsers, extractSlugParts, findPage, toSidebarItems, defaultPageStructure } from "@deessejs/admin";
import { SidebarItemsProvider } from "@deessejs/admin";
// defaultPages with React content is in @deessejs/admin-next
```

### `packages/next/src/api/rest/admin/first-admin.ts`

**Before:**
```typescript
import { hasAdminUsers, validateAdminEmail } from "deesse";

export async function handleFirstAdmin(...) {
  const adminExists = await hasAdminUsers(auth as any);
  const validation = validateAdminEmail(email);
  // ... business logic
}
```

**After:**
```typescript
import { createFirstAdmin } from "@deessejs/admin";

export async function handleFirstAdmin(...) {
  const result = await createFirstAdmin(auth, { name, email, password });

  if (!result.success) {
    return NextResponse.json({ code: result.code, message: result.message }, { status: 400 });
  }
  // ...
}
```

### `packages/next/src/pages/default-pages.tsx`

**Before:**
```typescript
import { page, section } from "deesse";
import { Home, Users } from "lucide-react";
import { HomePage } from "../components/pages/home-page";
import { UsersPage } from "../components/pages/users-page";

export const defaultPages = [
  page({ name: "Home", slug: "", icon: Home, content: <HomePage /> }),
  // ...
];
```

**After (in `@deessejs/admin-next`):**
```typescript
import { page, section } from "@deessejs/admin";
import { Home, Users } from "lucide-react";
import { HomePage } from "../components/pages/home-page";
import { UsersPage } from "../components/pages/users-page";

export const defaultPages = [
  page({ name: "Home", slug: "", icon: Home, content: <HomePage /> }),
  // ...
];
```

## Import Path Changes Summary

| Old Import | New Import |
|------------|------------|
| `import { hasAdminUsers } from "deesse"` | `import { hasAdminUsers } from "@deessejs/admin"` |
| `import { page, section } from "deesse"` | `import { page, section } from "@deessejs/admin"` |
| `import { findPage } from "./lib/find-page"` | `import { findPage } from "@deessejs/admin"` |
| `import { toSidebarItems } from "./lib/to-sidebar-items"` | `import { toSidebarItems } from "@deessejs/admin"` |
| `import { SidebarItemsProvider } from "./lib/sidebar-items-context"` | `import { SidebarItemsProvider } from "@deessejs/admin"` |
| `import { validateAdminEmail } from "deesse"` | Use `createFirstAdmin` from `@deessejs/admin` instead |
| `import { defaultPages } from "./pages/default-pages"` | `import { defaultPages } from "@deessejs/admin-next"` |

## API Surface Changes

### Removed from `deesse`

```typescript
// These types moved to @deessejs/admin
export { isDatabaseEmpty, hasAdminUsers, requireDatabaseNotEmpty }
export type { EmailValidationOptions }
export { isPublicEmailDomain, isAllowedAdminEmail, getAllowedDomains, validateAdminEmailDomain, PUBLIC_EMAIL_DOMAINS }
export { page, section }
export type { Page, Section, PageTree }

// These files removed from deesse:
// - src/lib/admin.ts
// - src/lib/validation.ts
// - src/config/page.ts
// - src/config/define.ts
```

### Added in `@deessejs/admin`

```typescript
export { defineAdminConfig }
export type { AdminConfig, InternalAdminConfig }
export { plugin }
export type { Plugin }
export { page, section }
export type { Page, Section, PageTree }
export { isDatabaseEmpty, requireDatabaseNotEmpty, hasAdminUsers }
export { PUBLIC_EMAIL_DOMAINS, isPublicEmailDomain, getAllowedDomains, isAllowedAdminEmail, validateAdminEmailDomain }
export { createFirstAdmin }
export type { FirstAdminInput, FirstAdminResult }
export { toSidebarItems }
export type { SidebarItem, SidebarPage, SidebarSection }
export { findPage, extractSlugParts }
export type { FindPageResult }
export { SidebarItemsProvider, useSidebarItems }
export { defaultPageStructure }
```

### Added in `@deessejs/admin-next`

```typescript
export { RootPage }
export { AdminDashboardLayout }
export type { AdminDashboardUser }
export { AppSidebar, SidebarNav }
export { HomePage, UsersPage, DatabasePage, SettingsPage, PluginsPage, LoginPage, FirstAdminSetup, NotFoundPage, AdminNotConfigured }
export { REST_GET, REST_POST }
export { handleFirstAdmin }
export { defaultPages }  // With React content
```

## Consumer Migration Steps

For projects using the current architecture:

1. **Update dependencies:**
   ```bash
   pnpm add @deessejs/admin @deessejs/admin-next
   ```

2. **Update imports** - find and replace all imports from `deesse` that are admin-related to use `@deessejs/admin`.

3. **Test all admin functionality:**
   - Login flow
   - First admin setup
   - Sidebar navigation
   - Page rendering

## Verification

After migration, verify:
- [ ] All admin pages render correctly
- [ ] Sidebar navigation works
- [ ] First admin setup works
- [ ] Authentication flow works
- [ ] No TypeScript errors
- [ ] No runtime errors in console