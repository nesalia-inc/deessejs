# Overview

One DSL — `item()` — defines both the sidebar entry and the page content. The sidebar shows the navigation, and clicking an item renders its `content`.

```
item({ name: "Users", href: "/admin/users", content: clientPage(...) })
       ├── sidebar entry (href)
       └── page content (content)
```

`href` makes the item clickable and routes to the page. `content` defines what renders.

---

## Discriminated Union

`item()` is a discriminated union — either a **NavigationItem** or an **ActionItem**:

| Variant | Must have | Cannot have |
|---------|-----------|------------|
| `NavigationItem` | `href` | `action` |
| `ActionItem` | `action` | `href`, `content` |

## Content Types

Use `serverPage`, `clientPage`, or `dynamicPage` as the `content`:

| Type | Runs on | Access |
|------|---------|--------|
| `serverPage` | Server | `deesse.auth`, `deesse.database` |
| `clientPage` | Browser | `client.auth` (React hooks) |
| `dynamicPage` | Server | Params from URL `[param]` |

## Package

All functions are exported from `@deessejs/admin`.

---

## Page Tree Merge

When multiple sources define pages (default pages, plugins, user config), they are merged in order:

```
[defaultPages, ...pluginPages, userConfigPages]
```

### Merge Rules

**Groups with same `name` merge** — children are combined:

```typescript
// Source A
group({ name: "Settings", children: [item({ name: "Profile", ... })] })

// Source B
group({ name: "Settings", children: [item({ name: "Security", ... })] })

// Result
group({ name: "Settings", children: [
  item({ name: "Profile", ... }),
  item({ name: "Security", ... })
] })
```

**Duplicate `href` is an error** — every URL must be unique across all sources:

```typescript
// Source A
item({ name: "Dashboard", href: "/admin" })

// Source B
item({ name: "Home", href: "/admin" })

// Error: Conflicting page href "/admin" for "Dashboard" and "Home"
```

**Duplicate `action` name is an error** — two action items cannot share the same name.

**SubMenus with same `name` merge** — same logic as groups.

**Menu menus append** — `menu()` has no name, so they are appended in order.

**Orphan items** (top-level pages without a parent group) are collected under an implicit "General" group.

### Conflict Detection

Conflicts are detected at config definition time. The merge fails with clear error messages:

```
Error: Conflicting page href "/admin" defined by multiple sources:
  - "Dashboard" in default pages
  - "Home" in my-plugin

Error: Conflicting action "Export" defined by multiple sources:
  - Source A
  - Source B
```

### Priority

User config pages come last, so they can override plugin pages. If a plugin and user both define a group with the same name, their children are merged. If they define an item with the same `href`, it is an error.
