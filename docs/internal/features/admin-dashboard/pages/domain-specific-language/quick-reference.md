# Quick Reference

## DSL Functions

| Function | Role |
|----------|------|
| `group()` | Labeled section with optional action |
| `menu()` | Menu container (no label) |
| `item()` | Sidebar entry + page content |
| `subMenu()` | Nested submenu with label |

## `item()` Discriminated Union

| Variant | Must have | Cannot have |
|---------|-----------|------------|
| `NavigationItem` | `href` | `action` |
| `ActionItem` | `action` | `href`, `content` |

## NavigationItem Properties

| Property | Type | Required |
|----------|------|----------|
| `name` | `string` | Yes |
| `icon` | `LucideIcon` | No |
| `badge` | `ReactNode \| (() => Promise<ReactNode>)` | No |
| `href` | `string` | Yes |
| `content` | `ReactNode \| null` | No |
| `children` | `SubMenu[]` | No |

## ActionItem Properties

| Property | Type | Required |
|----------|------|----------|
| `name` | `string` | Yes |
| `icon` | `LucideIcon` | No |
| `badge` | `ReactNode \| (() => Promise<ReactNode>)` | No |
| `action` | `() => void` | Yes |
| `children` | `SubMenu[]` | No |

## Content Types

| Function | Runs on | Parameters |
|----------|---------|------------|
| `serverPage(deesse => ...)` | Server | `deesse.auth`, `deesse.database` |
| `clientPage(client => ...)` | Browser | `client.auth` (React hooks) |
| `dynamicPage(params => ...)` | Server | URL params |
