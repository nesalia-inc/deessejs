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
  schema: z.object({
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

export const config = defineConfig({
  plugins: [myPlugin],
});
```

### Settings

A plugin can define a Zod schema that represents the settings users can configure. These settings are persisted in the database and can be accessed by the plugin at runtime. This provides type-safe configuration and validation.

## Plugin Capabilities

A plugin can:
- **Add pages**: Register new admin pages that appear in the dashboard navigation
- **Add sections**: Group pages under sections in the navigation
- **Provide methods**: Export functions that can be used throughout the application
- Extend core functionality
- Add new features to the CMS

Plugins provide a way to modularize and share functionality across different DeesseJS projects.

## Plugin Methods

When a plugin is distributed as a package, it can export methods that the application can use:

```typescript
// In the plugin package
export function useSeoAnalysis(pageUrl: string) {
  // SEO analysis logic
  return {
    score: 85,
    issues: ['Missing meta description'],
  };
}
```

```typescript
// In the application
import { useSeoAnalysis } from '@my-org/deessejs-plugin-seo';

const result = useSeoAnalysis('/blog/my-post');
```

## Example: SEO Plugin

A practical example of a plugin is an SEO plugin that adds a page to track and analyze page SEO:

```typescript
import { defineConfig, plugin, page, section } from '@deessejs/core';
import { z } from 'zod';

const seoPlugin = plugin({
  schema: z.object({
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
  methods: {
    analyzePage: async (url: string) => {
      // SEO analysis implementation
    },
    generateSitemap: async () => {
      // Sitemap generation
    },
  },
});
```

This plugin adds an "SEO" section with two pages (Overview and Sitemap) to the admin dashboard, and provides methods that can be used elsewhere in the application.
