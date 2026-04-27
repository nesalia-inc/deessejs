# Default Structure

Deesse provides these built-in pages. Custom pages are merged via `config.pages`.

```typescript
[
  menu({
    children: [
      item({ name: "Home", slug: "", href: "/admin" }),
      item({ name: "Users", href: "/admin/users" }),
      item({ name: "Database", href: "/admin/database" }),
    ],
  }),
  group({
    name: "Settings",
    bottom: true,
    children: [
      item({ name: "General", href: "/admin/settings" }),
      item({ name: "Plugins", href: "/admin/settings/plugins" }),
    ],
  }),
]
```

This generates the following routes:

| URL | Item |
|-----|------|
| `/admin` | Home |
| `/admin/users` | Users |
| `/admin/database` | Database |
| `/admin/settings` | Settings → General |
| `/admin/settings/plugins` | Settings → Plugins |
