# Plugins

Plugins extend the admin dashboard by contributing pages, settings, and functionality. They are the primary way to add features to DeesseJS.

## Plugin Registry

Deesse maintains a **Plugin Registry API** at `plugins.deessejs.com` that lists all available official and community plugins.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/plugins` | List all available plugins |
| `GET` | `/api/v1/plugins/:name` | Get single plugin details |
| `GET` | `/api/v1/plugins/search?q=` | Search plugins by name/description |

### `GET /api/v1/plugins`

```json
{
  "plugins": [
    {
      "name": "seo",
      "displayName": "SEO",
      "description": "SEO optimization and monitoring",
      "version": "1.2.0",
      "npmPackage": "@deessejs/plugin-seo",
      "homepage": "https://deessejs.com/plugins/seo",
      "category": "marketing",
      "author": "DeesseJS Team"
    },
    {
      "name": "sitemap",
      "displayName": "Sitemap",
      "description": "Automatic sitemap generation",
      "version": "1.0.0",
      "npmPackage": "@deessejs/plugin-sitemap",
      "category": "seo",
      "author": "DeesseJS Team"
    }
  ],
  "total": 12
}
```

### `GET /api/v1/plugins/:name`

```json
{
  "name": "seo",
  "displayName": "SEO",
  "description": "SEO optimization and monitoring",
  "version": "1.2.0",
  "npmPackage": "@deessejs/plugin-seo",
  "homepage": "https://deessejs.com/plugins/seo",
  "category": "marketing",
  "author": "DeesseJS Team",
  "readme": "...",
  "changelog": "...",
  "dependencies": [],
  "peerDependencies": ["@deessejs/admin"]
}
```

### Error Responses

```json
// 404 - Plugin not found
{
  "error": "PLUGIN_NOT_FOUND",
  "message": "Plugin 'xyz' does not exist in the registry"
}

// 429 - Rate limited
{
  "error": "RATE_LIMITED",
  "message": "Too many requests",
  "retryAfter": 60
}
```

---

## Anatomy of a Plugin

A plugin is created with `plugin()` and can contribute:

- **`pages`** — sidebar navigation items (groups, menus, items, submenus)
- **`schema`** — database tables via Standard Schema

```typescript
import { plugin } from "deesse";
import { item, group, menu, subMenu, serverPage, clientPage } from "@deessejs/admin";
import { z } from "zod";

const myPlugin = plugin({
  name: "my-plugin",
  schema: {
    // Standard Schema tables (Zod, Valibot, etc.)
  },
  pages: [
    item({
      name: "Dashboard",
      icon: BarChart,
      href: "/admin/my-plugin",
      content: serverPage(async (deesse) => {
        return <PluginDashboard />;
      }),
    }),
  ],
});
```

Then registered in the app config:

```typescript
export const config = defineConfig({
  plugins: [myPlugin()],
});
```

Plugin pages are merged into the sidebar alongside built-in pages.

---

## Defining Pages

Plugins use the [Pages DSL](../admin-dashboard/pages/domain-specific-language/README.md) to define sidebar navigation and page content.

```typescript
import { item, group, menu, subMenu } from "@deessejs/admin";

const myPlugin = plugin({
  name: "analytics",
  pages: [
    group({
      name: "Analytics",
      children: [
        item({
          name: "Overview",
          icon: BarChart,
          href: "/admin/analytics",
          content: serverPage(async (deesse) => {
            const stats = await deesse.database.select().from(schema.analytics);
            return <AnalyticsDashboard stats={stats} />;
          }),
        }),
        item({
          name: "Reports",
          icon: FileText,
          href: "/admin/analytics/reports",
          content: clientPage(() => <ReportsPage />),
        }),
      ],
    }),
  ],
});
```

---

## Plugin with Settings

Plugins can define a Zod schema for user-configurable settings. Settings are persisted in the database.

```typescript
const analyticsPlugin = plugin({
  name: "analytics",
  schema: z.object({
    apiKey: z.string(),
    refreshInterval: z.number().default(60),
  }),
  pages: [
    item({
      name: "Settings",
      icon: Settings,
      href: "/admin/analytics/settings",
      content: clientPage((client) => <PluginSettings />),
    }),
  ],
});
```

---

## Complete Example: SEO Plugin

```typescript
// plugins/seo/index.ts
import { plugin } from "deesse";
import { item, group, serverPage, clientPage } from "@deessejs/admin";
import { z } from "zod";

export const seoPlugin = plugin({
  name: "seo",
  schema: z.object({
    apiKey: z.string(),
    trackedDomains: z.array(z.string()).default([]),
  }),

  pages: [
    group({
      name: "SEO",
      children: [
        item({
          name: "Overview",
          icon: BarChart,
          href: "/admin/seo",
          content: serverPage(async (deesse) => {
            const data = await deesse.database.select().from(schema.seoPages);
            return <SeoOverview data={data} />;
          }),
        }),
        item({
          name: "Sitemap",
          icon: FileText,
          href: "/admin/seo/sitemap",
          content: clientPage(() => <SitemapPage />),
        }),
        item({
          name: "Issues",
          icon: AlertTriangle,
          badge: async () => {
            const count = await fetchIssueCount();
            return <Badge>{count}</Badge>;
          },
          href: "/admin/seo/issues",
          content: clientPage(() => <SeoIssuesPage />),
        }),
      ],
    }),
  ],
});
```

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { seoPlugin } from "./plugins/seo";

export const config = defineConfig({
  plugins: [
    seoPlugin({ apiKey: process.env.SEO_API_KEY }),
  ],
});
```

This adds an "SEO" section with three pages to the sidebar: Overview, Sitemap, and Issues (with a dynamic badge showing the issue count).