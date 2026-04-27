# Page/Tree Module - Developer Experience

**Date:** 2026-04-10
**Purpose:** Document how developers consume the page/tree module (no implementation details)

---

## 1. Overview

The page/tree system provides a typed, hierarchical navigation structure for the deesse admin dashboard. Developers configure pages and sections in their `defineConfig()`, then use the navigation API to render pages and breadcrumbs at runtime.

---

## 2. Configuration

Developers define their page tree when calling `defineConfig()`:

```typescript
import { defineConfig, page, section, collapsibleGroup, sidebarAction } from "deesse";

const config = defineConfig({
  secret: "...",
  database: db,
  auth: { baseURL: "http://localhost:3000" },
  pages: [
    page({
      name: "Home",
      slug: "home",
      content: <HomePage />
    }),
    section({
      name: "Dashboard",
      slug: "dashboard",
      children: [
        page({
          name: "Overview",
          slug: "overview",
          icon: LayoutDashboard,
          content: <DashboardOverview />
        }),
        page({
          name: "Analytics",
          slug: "analytics",
          icon: BarChart3,
          content: <DashboardAnalytics />
        }),
      ],
    }),
    collapsibleGroup({
      name: "Settings",
      slug: "settings",
      icon: Settings,
      basePage: page({
        name: "Settings Home",
        slug: "settings-home",
        content: <SettingsHome />
      }),
      subPages: [
        page({
          name: "Profile",
          slug: "profile",
          content: <SettingsProfile />
        }),
        page({
          name: "Security",
          slug: "security",
          content: <SettingsSecurity />
        }),
      ],
    }),
  ],
});
```

---

## 3. Page Types

### Page

A leaf node in the tree. Has content rendered directly.

```typescript
page({
  name: "Dashboard",
  slug: "dashboard",
  icon: LayoutDashboard,
  content: <DashboardPage />
});
```

### Section

A container that groups related pages. Sections can be positioned as header or footer.

```typescript
section({
  name: "Admin",
  slug: "admin",
  position: "header", // or "footer"
  children: [
    page({ name: "Users", slug: "users", content: <UsersPage /> }),
    page({ name: "Roles", slug: "roles", content: <RolesPage /> }),
  ],
});
```

### CollapsibleGroup

A collapsible section with optional base page. Useful for complex navigation hierarchies.

```typescript
// With base page (group header is clickable)
collapsibleGroup({
  name: "Settings",
  slug: "settings",
  basePage: page({ name: "Settings", slug: "settings", content: <SettingsIndex /> }),
  subPages: [
    page({ name: "Profile", slug: "profile", content: <ProfilePage /> }),
    page({ name: "Security", slug: "security", content: <SecurityPage /> }),
  ],
});

// Without base page (just a container for sub-pages)
collapsibleGroup({
  name: "Reports",
  slug: "reports",
  subPages: [
    page({ name: "Sales", slug: "sales", content: <SalesReport /> }),
    page({ name: "Revenue", slug: "revenue", content: <RevenueReport /> }),
  ],
});
```

### SidebarAction

A sidebar button that opens a Dialog or Sheet overlay instead of navigating to a page. Useful for actions like "Add New User" or "Export Data" that don't have their own route.

```typescript
// Opens a Dialog
sidebarAction({
  name: "Add User",
  slug: "add-user",
  icon: Plus,
  actionType: "dialog",
  actionContent: <CreateUserDialog />,
  badge: "New",
});

// Opens a Sheet (slides from right)
sidebarAction({
  name: "Export",
  slug: "export",
  icon: Download,
  actionType: "sheet",
  actionContent: <ExportSheet />,
});
```

**Note:** `SidebarAction` nodes do not navigate - they trigger an overlay. The slug is used for identification only and does not correspond to a route.

---

## 4. Navigation API

### Finding a Page by Path

```typescript
import { pageTree } from "deesse";

// Path-based navigation
const result = pageTree.find(config.pages ?? [], ["dashboard", "analytics"]);

result.map(({ page, breadcrumbs }) => {
  // Render the found page
  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      {page.content}
    </div>
  );
});

result.getOrElse(() => <NotFoundPage />);
```

### Finding a Page by Slug

```typescript
// Flat search across all sections
const result = pageTree.findBySlug(config.pages ?? [], "profile");

result.map(page => {
  console.log("Found:", page.name, page.slug);
  return renderPage(page);
});

result.getOrElse(() => <NotFoundPage />);
```

### Path Format

- Root page: `["home"]`
- Nested in section: `["dashboard", "analytics"]`
- Inside collapsible group: `["settings", "profile"]`

### Return Value

`pageTree.find()` returns an `Option<TraversalResult>` containing:
- `page` - the found `Page` object
- `breadcrumbs` - array of `{ name, slug }` representing the path taken

---

## 5. Error Handling

The navigation returns `Option<T>` - no exceptions thrown for not found. Consumers handle the missing case explicitly.

```typescript
const result = pageTree.find(pages, ["dashboard", "nonexistent"]);

// Explicit handling
result.map(({ page }) => renderPage(page));
result.getOrElse(() => render404());

// Or with pattern matching
match(result, {
  Some: ({ page, breadcrumbs }) => <PageView page={page} breadcrumbs={breadcrumbs} />,
  None: () => <NotFoundPage />,
});
```

### Validation at Config Time

Duplicate slugs are caught at `defineConfig()` time:

```typescript
// This throws during defineConfig()
const config = defineConfig({
  pages: [
    section({ name: "Admin", slug: "admin", children: [...] }),
    section({ name: "Users", slug: "admin", children: [...] }), // ERROR: duplicate slug
  ],
});

// Error message:
// Page tree validation failed: Duplicate slug "admin" at: /admin, /users
```

---

## 6. Breadcrumbs

The navigation result includes breadcrumbs for free:

```typescript
const result = pageTree.find(pages, ["settings", "profile"]);

result.map(({ page, breadcrumbs }) => {
  // breadcrumbs = [{ name: "Settings", slug: "settings" }]
  // page = the Profile page
  return (
    <div>
      <nav aria-label="breadcrumb">
        {breadcrumbs.map(b => <a href={`/${b.slug}`}>{b.name}</a>)}
        <span>{page.name}</span>
      </nav>
      {page.content}
    </div>
  );
});
```

---

## 7. Sidebar Navigation

The same `PageTree` structure is used by `@deessejs/next` to render the admin sidebar. No extra configuration needed - the structure is self-describing.

```typescript
// In the next app, pages automatically appear in sidebar
// Section with position="header" appears at top
// Section with position="footer" appears at bottom
// CollapsibleGroup is rendered as collapsible section with expand/collapse
```

### Sidebar Grouping Rules

| Element | Sidebar Behavior |
|---------|-----------------|
| `Page` at root | Appears in "General" section at top |
| `Section` with `position: "header"` | Header section, always expanded |
| `Section` with `position: "footer"` | Footer section, pinned at bottom |
| `Section` (no position) | Body section, collapsible |
| `CollapsibleGroup` | Collapsible with expand/collapse toggle |
| `CollapsibleGroup` with `basePage` | Group header clickable, expands to show subPages |
| `CollapsibleGroup` without `basePage` | Expand to show subPages directly |
| `SidebarAction` | Button that opens Dialog or Sheet overlay |

---

## 8. Type Safety Benefits

### Slug as Branded Type

Slugs are validated at creation time - no invalid slug formats can exist:

```typescript
// This is valid
page({ name: "User Settings", slug: "user-settings", ... });

// This is also valid (explicit slug)
page({ name: "User Settings", slug: "MY-PAGE", ... }); // slug is whatever you provide

// Note: slug is required, no auto-generation
// Developer must consciously choose the URL segment
```

### Page Content is Always Present

```typescript
// content is non-nullable - no null checks needed at render time
page.content  // Always a ReactNode, never null
```

### Exhaustive Pattern Matching

The `_tag` discriminant ensures TypeScript catches missing cases:

```typescript
switch (item._tag) {
  case "Page": return renderPage(item);
  case "Section": return renderSection(item);
  case "CollapsibleGroup": return renderGroup(item);
  case "SidebarAction": return renderAction(item);
  // TypeScript error if any case missing
}
```

---

## 9. Common Patterns

### Render Page from URL Params

```typescript
function AdminPage({ params }: { params: { slug: string[] } }) {
  const result = pageTree.find(config.pages ?? [], params.slug);

  return (
    <Layout>
      {result.map(({ page, breadcrumbs }) => (
        <>
          <Breadcrumbs items={breadcrumbs} />
          <main>{page.content}</main>
        </>
      )).getOrElse(<NotFoundPage />)}
    </Layout>
  );
}
```

### Protected Page Access

```typescript
const result = pageTree.find(pages, ["admin", "users"]);

result
  .map(({ page }) => {
    if (!hasPermission(user, page)) {
      return <AccessDenied />;
    }
    return renderPage(page);
  })
  .getOrElse(() => <NotFoundPage />);
```

### Search by Slug

```typescript
// Find any page by its slug across all sections
const page = pageTree.findBySlug(allPages, "profile");

page.map(p => {
  // p is the Profile page regardless of where it's located
  return <Link to={p.slug}>{p.name}</Link>;
});
```

### 404 with Context

```typescript
const result = pageTree.find(pages, invalidPath);

if (result._tag === "None") {
  return (
    <ErrorPage
      code={404}
      message="Page not found"
      suggestion="Check the URL or navigate from the sidebar"
    />
  );
}
```

### Opening a Dialog/Sheet from Sidebar

```typescript
// sidebarAction is not found by pageTree.find() - it triggers an overlay
const action = pageTree.findBySlug(allPages, "add-user");

// When rendering the sidebar, SidebarAction items are handled separately:
// - action.actionType === "dialog" renders a Dialog with action.actionContent
// - action.actionType === "sheet" renders a Sheet with action.actionContent
```

---

---

## 10. What Developers Don't Need to Know

Internal details that consumers don't need to understand:

- How `find()` traverses the tree internally
- How `validate()` detects duplicate slugs
- The structure of `NavigationError` types
- How breadcrumbs are accumulated during traversal
- The difference between `PageTreeBuilder` class vs functional API
- Implementation of `slugify()` function
- How `SidebarAction` triggers Dialog/Sheet rendering in the UI layer

Consumers only need to know:
- How to configure pages in `defineConfig()`
- How to call `pageTree.find()` and handle the result
- How to render breadcrumbs from the result
- How to use `sidebarAction()` to add Dialog/Sheet triggers

---

*Document for developer experience reference. No implementation details included.*