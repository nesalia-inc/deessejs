# File-Level Analysis: Current State

## Source File Inventory

### `packages/deesse/src/config/page.ts`

```typescript
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;        // Standard React component type
  content: ReactNode | null; // Standard React type
};

export type Section = {
  type: "section";
  name: string;
  slug: string;
  bottom?: boolean;
  children: PageTree[];
};

export type PageTree = Page | Section;

export function page(config: { name: string; slug?: string; icon?: LucideIcon; content: ReactNode | null }): Page
export function section(config: { name: string; slug?: string; bottom?: boolean; children: PageTree[] }): Section
```

**Note:** This file uses standard React types. It stays in `deesse` or moves to `@deessejs/admin`. No changes needed - it's already React-appropriate.

---

### `packages/deesse/src/config/define.ts`

```typescript
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { BetterAuthPlugin } from 'better-auth';
import type { Plugin } from './plugin';
import type { PageTree } from './page';
import { admin } from 'better-auth/plugins';

export type Config = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];
  pages?: PageTree[];  // Admin-specific in core Config
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

export function defineConfig(config: Config): InternalConfig {
  const authPlugins: BetterAuthPlugin[] = [admin()]; // Hardcoded admin plugin
  return { ...config, auth: { ...config.auth, plugins: authPlugins } } as InternalConfig;
}
```

**Issues:**
- `pages` field is admin-specific, shouldn't be in core `Config`
- `admin()` plugin is hardcoded

**Solution:** Split Config:
- `BaseConfig` (in `deesse`): database, secret, auth.baseURL, plugins
- `AdminConfig` (in `@deessejs/admin`): pages, admin-specific settings, admin plugin injection

---

### `packages/deesse/src/lib/admin.ts`

Framework-agnostic (uses `better-auth` types only) - should move to `@deessejs/admin`:

```typescript
export async function isDatabaseEmpty(auth: Auth): Promise<boolean>
export async function requireDatabaseNotEmpty(auth: Auth): Promise<void>
export async function hasAdminUsers(auth: Auth): Promise<boolean>
export function validateAdminEmail(email: string, options?: EmailValidationOptions): { valid: boolean; error?: string }
export interface EmailValidationOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireOrganization?: boolean;
}
```

**No issues** - pure business logic, no Next.js/UI dependencies.

---

### `packages/deesse/src/lib/validation.ts`

Framework-agnostic - should move to `@deessejs/admin`:

```typescript
export const PUBLIC_EMAIL_DOMAINS = [...]
export function isPublicEmailDomain(email: string): boolean
export function getAllowedDomains(): string[]
export function isAllowedAdminEmail(email: string): boolean
export function validateAdminEmailDomain(email: string): { valid: true } | { valid: false; code: string; message: string; suggestion?: string }
```

**No issues** - pure utility, no framework dependencies.

---

### `packages/next/src/api/rest/admin/first-admin.ts`

Mixed concerns - business logic is React-agnostic but returns `NextResponse`:

```typescript
export async function handleFirstAdmin(
  auth: Auth<BetterAuthOptions>,
  request: Request
): Promise<NextResponse> {
  // Production guard (environment-specific check)
  if (process.env['NODE_ENV'] === "production") { ... }

  // Business logic (React-agnostic)
  const adminExists = await hasAdminUsers(auth as any);
  if (adminExists) { ... }

  const validation = validateAdminEmail(email);
  if (!validation.valid) { ... }

  const result = await (auth.api as any).createUser({ ... });

  return NextResponse.json({ ... }, { status: 201 });
}
```

**Issues:**
- Returns `NextResponse` - should return a result type and let adapter handle response
- Environment check is Next.js-specific

**Solution:** Extract business logic to `@deessejs/admin`:
```typescript
export type CreateFirstAdminResult =
  | { success: true; userId: string }
  | { success: false; code: string; message: string };

export async function createFirstAdmin(auth: Auth, input: CreateFirstAdminInput): Promise<CreateFirstAdminResult>
```

The Next.js adapter in `@deessejs/admin-next` would handle `NextResponse` conversion.

---

### `packages/next/src/lib/to-sidebar-items.ts`

React-agnostic - should move to `@deessejs/admin`:

```typescript
export interface SidebarPage {
  type: "page";
  name: string;
  slug: string;
  iconName?: string;  // Icon name as string
}

function getIconName(icon: unknown): string | undefined {
  const iconAny = icon as { displayName?: string; name?: string };
  return iconAny.displayName || iconAny.name || undefined;
}

export function toSidebarItems(pageTree: PageTree[]): SidebarItem[]
```

**No issues** - pure transformation logic, no Next.js dependencies.

---

### `packages/next/src/lib/find-page.ts`

React-agnostic - should move to `@deessejs/admin`:

```typescript
export type FindPageResult = { page: Extract<PageTree, { type: "page" }> } | null;

export function findPage(pages: PageTree[] | undefined, slugParts: string[]): FindPageResult
export function extractSlugParts(params: Record<string, string | string[]>): string[]
```

**No issues** - pure algorithm, no framework dependencies.

---

### `packages/next/src/lib/sidebar-items-context.tsx`

React context - should move to `@deessejs/admin`:

```typescript
export function SidebarItemsProvider({ items, children }: { items: SidebarItem[]; children: React.ReactNode })
export function useSidebarItems(): SidebarItem[]
```

**Note:** React context is fine for `@deessejs/admin` - it's not Next.js-specific.

---

### `packages/next/src/pages/default-pages.tsx`

Contains React content - stays in `@deessejs/admin-next`:

```typescript
export const defaultPages = [
  page({
    name: "Home",
    slug: "",
    icon: Home,           // LucideIcon
    content: <HomePage /> // React element
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
    ],
  }),
  // ...
];
```

**Note:** The page structure (`page()`, `section()` calls) could be in `@deessejs/admin`, but the actual `defaultPages` array with React content stays in `@deessejs/admin-next`.

---

### `packages/next/src/root-page.tsx`

Next.js page component - stays in `@deessejs/admin-next`:

```typescript
export async function RootPage({ config, auth, params }: RootPageProps) {
  const slugParts = extractSlugParts(params);

  // Check login page
  if (isLoginPage) return <LoginPage />;

  // Check session
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect("/admin/login");

  // Check admin exists
  const adminExists = await hasAdminUsers(auth as any);

  // Find page
  const result = findPage([...defaultPages, ...(config.pages ?? [])], slugParts);

  // Render with layout
  return (
    <SidebarItemsProvider items={sidebarItems}>
      <AdminDashboardLayout items={sidebarItems}>
        {showFirstAdminSetup && <FirstAdminSetup />}
        {result.page.content}
      </AdminDashboardLayout>
    </SidebarItemsProvider>
  );
}
```

**Note:** Uses Next.js-specific `redirect()` from `next/navigation` and `headers()` from `next/headers`. Stays in `admin-next`.

---

## Summary: Where Each File Goes

| File | Current Location | Target Package | Reason |
|------|-----------------|----------------|--------|
| `config/page.ts` | `deesse` | `@deessejs/admin` | Admin-specific, uses React types |
| `config/define.ts` | `deesse` | Split: `BaseConfig` → `deesse`, `AdminConfig` → `admin` | Config has admin-specific parts |
| `lib/admin.ts` | `deesse` | `@deessejs/admin` | Admin utilities, no Next.js deps |
| `lib/validation.ts` | `deesse` | `@deessejs/admin` | Admin utilities, no Next.js deps |
| `lib/to-sidebar-items.ts` | `next` | `@deessejs/admin` | React-agnostic transformation |
| `lib/find-page.ts` | `next` | `@deessejs/admin` | Pure algorithm, no deps |
| `lib/sidebar-items-context.tsx` | `next` | `@deessejs/admin` | React context, no Next.js deps |
| `api/rest/admin/first-admin.ts` | `next` | Split: logic → `admin`, adapter → `admin-next` | Next.js handler specific |
| `pages/default-pages.tsx` | `next` | `@deessejs/admin-next` | Contains React components |
| `root-page.tsx` | `next` | `@deessejs/admin-next` | Next.js page component |
| `root-layout.tsx` | `next` | `@deessejs/admin-next` | Next.js layout |
| `routes.ts` | `next` | `@deessejs/admin-next` | Next.js route handlers |
| `components/pages/*.tsx` | `next` | `@deessejs/admin-next` | React page components |
| `components/layouts/admin-shell.tsx` | `next` | `@deessejs/admin-next` | React component |
| `components/ui/app-sidebar.tsx` | `next` | `@deessejs/admin-next` | React component |