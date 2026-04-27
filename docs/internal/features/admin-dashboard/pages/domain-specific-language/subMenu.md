# `subMenu()`

A nested submenu with a label. Rendered as `SidebarMenuSub`.

```typescript
subMenu({
  name: string;
  icon?: LucideIcon;
  children: MenuItem[];
})
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Display name |
| `icon` | `LucideIcon` | No | Icon in sidebar |
| `children` | `MenuItem[]` | Yes | Items inside the submenu |

```typescript
subMenu({
  name: "Settings",
  icon: Settings,
  children: [
    item({ name: "Profile", href: "/admin/settings/profile" }),
    item({ name: "Security", href: "/admin/settings/security" }),
  ],
})
```
