# Plugins

This is an internal document outlining the plugin system for DeesseJS.

## Overview

DeesseJS supports a plugin system that allows developers to extend the functionality of the CMS. Plugins can be registered in the configuration file and are capable of adding new pages to the admin dashboard.

## Adding Plugins

Plugins are created using the `plugin()` function and added to the configuration:

```typescript
import { defineConfig, plugin, page, section } from '@deessejs/core';
import { z } from 'zod';

const myPlugin = plugin({
  args: z.object({
    trackedDomains: z.array(z.string()),
  }),
  settings: z.object({
    apiKey: z.string(),
    enabled: z.boolean().default(true),
  }),
  pages: [
    section({
      name: 'My Plugin',
      children: [
        page({
          name: 'Dashboard',
          content: () => <div>Plugin Dashboard</div>,
        }),
        page({
          name: 'Settings',
          content: () => <div>Plugin Settings</div>,
        }),
      ],
    }),
  ],
});

// When registering, pass the plugin's custom parameters
export const config = defineConfig({
  plugins: [myPlugin({ trackedDomains: ['example.com'] })],
});
```

### Settings

A plugin can define a Zod schema that represents the settings users can configure. These settings are persisted in the database and can be accessed by the plugin at runtime. This provides type-safe configuration and validation.

## Plugin Capabilities

A plugin can:
- **Add pages**: Register new admin pages that appear in the dashboard navigation
- **Add sections**: Group pages under sections in the navigation
- **Settings**: Define configurable settings persisted in the database
- Extend core functionality
- Add new features to the CMS

Plugins provide a way to modularize and share functionality across different DeesseJS projects.

## Example: SEO Plugin

A practical example of a plugin is an SEO plugin that adds a page to track and analyze page SEO:

```typescript
import { defineConfig, plugin, page, section } from '@deessejs/core';
import { z } from 'zod';

const seoPlugin = plugin({
  args: z.object({
    trackedDomains: z.array(z.string()),
  }),
  settings: z.object({
    apiKey: z.string(),
    enabled: z.boolean().default(true),
  }),
  pages: [
    section({
      name: 'SEO',
      children: [
        page({
          name: 'Overview',
          content: () => <SeoOverview />,
        }),
        page({
          name: 'Sitemap',
          content: () => <SeoSitemap />,
        }),
      ],
    }),
  ],
});

// When registering, pass the plugin's custom parameters
export const config = defineConfig({
  plugins: [seoPlugin({ trackedDomains: ['example.com'] })],
});
```

This plugin adds an "SEO" section with two pages (Overview and Sitemap) to the admin dashboard. The settings are persisted in the database.

## Database Schema (Provider-Agnostic)

Plugins can define database tables using **Standard Schema**. This allows the schema to work with any database provider (Drizzle, Prisma, SQL, etc.) without requiring provider-specific implementations.

### Why Standard Schema?

[Standard Schema](https://standard-schema.io/) is a set of interfaces that standardize schema definition across the TypeScript ecosystem. Libraries like **Zod**, **Valibot**, and **ArkType** implement `StandardSchemaV1`, making schemas portable across tools.

### Defining Schema

```typescript
import { plugin } from '@deessejs/core';
import { z } from 'zod';

const seoPlugin = plugin({
  settings: z.object({
    apiKey: z.string(),
  }),

  // Schema using Zod (implements StandardSchemaV1)
  schema: {
    seo_pages: z.object({
      id: z.string().uuid(),
      url: z.string().url(),
      score: z.number().min(0).max(100),
      createdAt: z.date(),
    }),
    seo_issues: z.object({
      id: z.string().uuid(),
      pageId: z.string(),
      issue: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    }),
  },
});
```

### Generating Database Schema

Run the CLI to generate the schema for your chosen provider:

```bash
npx deesse generate --provider drizzle
# or
npx deesse generate --provider prisma
```

The CLI reads Standard Schema definitions and generates:
- **Drizzle**: `schema.ts`
- **Prisma**: `schema.prisma`
- **SQL**: `schema.sql`

### Supported Libraries

Any library implementing `StandardSchemaV1` works:
- **Zod** (recommended)
- **Valibot**
- **ArkType**

### Using Settings

Plugin settings can be accessed at runtime:

```typescript
// Get settings
const settings = await plugin.getSettings();

// Update settings
await plugin.updateSettings({
  apiKey: 'new-key',
  enabled: true,
});
```
