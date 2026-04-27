# `group()`

A labeled section in the sidebar. Renders a `SidebarGroup` with a label and a `SidebarMenu` container.

```typescript
group({
  name: string;
  action?: ReactNode;
  children: (MenuItem | SubMenu)[];
})
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Display name in sidebar |
| `action` | `ReactNode` | No | Button rendered in the group header |
| `children` | `(MenuItem \| SubMenu)[]` | Yes | Items and submenus |

```typescript
group({
  name: "Settings",
  children: [
    item({ name: "General", href: "/admin/settings" }),
    item({ name: "Plugins", href: "/admin/settings/plugins" }),
  ],
})
```
