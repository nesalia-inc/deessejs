# Pages & Navigation DSL

Declarative API for defining the admin dashboard sidebar and page content.

## Complete Example

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { group, menu, item, subMenu, serverPage, clientPage } from "@deessejs/admin";
import { Home, Users, Database, Settings, Plus } from "lucide-react";

export const config = defineConfig({
  pages: [
    menu({
      children: [
        item({
          name: "Home",
          icon: Home,
          href: "/admin",
          content: serverPage(async (deesse) => {
            const stats = await deesse.database.select().from(schema.stats);
            return <Dashboard stats={stats} />;
          }),
        }),
        item({
          name: "Users",
          icon: Users,
          href: "/admin/users",
          content: clientPage(() => <UsersTable />),
        }),
        item({
          name: "Database",
          icon: Database,
          href: "/admin/database",
          content: clientPage(() => <DatabaseView />),
        }),
      ],
    }),

    group({
      name: "Settings",
      children: [
        subMenu({
          name: "General",
          children: [
            item({ name: "Profile", href: "/admin/settings/profile" }),
            item({ name: "Security", href: "/admin/settings/security" }),
          ],
        }),
        item({ name: "Plugins", href: "/admin/settings/plugins" }),
      ],
    }),
  ],
});
```

This produces:

```
┌──────────────────────────────────────────────────────┐
│  [logo]                                              │
├──────────────────────────────────────────────────────┤
│  Home                                                │
│  Users                                               │
│  Database                                            │
├──────────────────────────────────────────────────────┤
│  Settings                                            │
│    General ▸                                         │
│      Profile                                         │
│      Security                                        │
│    Plugins                                           │
└──────────────────────────────────────────────────────┘
```

## Topics

- [Overview](./overview.md) — Core concept, discriminated union, content types
- [`item()`](./item.md) — Navigation items and action items
- [`group()`](./group.md) — Labeled sidebar section
- [`menu()`](./menu.md) — Menu container
- [`subMenu()`](./subMenu.md) — Nested submenu
- [Content Types](./content-types.md) — `serverPage`, `clientPage`, `dynamicPage`
- [Default Structure](./default-structure.md) — Built-in pages
- [Quick Reference](./quick-reference.md) — Tables summary
