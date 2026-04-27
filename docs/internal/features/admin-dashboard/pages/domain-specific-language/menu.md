# `menu()`

A `SidebarMenu` container. Groups items without a label.

```typescript
menu({ children: (MenuItem | SubMenu)[] })
```

```typescript
menu({
  children: [
    item({ name: "Home", icon: Home, href: "/admin" }),
    item({ name: "Users", icon: Users, href: "/admin/users" }),
    item({ name: "Database", icon: Database, href: "/admin/database" }),
  ],
})
```
