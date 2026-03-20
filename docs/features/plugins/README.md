# Plugins

This is an internal document outlining the plugin system for DeesseJS.

## Overview

DeesseJS supports a plugin system that allows developers to extend the functionality of the CMS. Plugins can be registered in the configuration file and are capable of adding new pages to the admin dashboard.

## Adding Plugins

Plugins are created using the `plugin()` function and added to the configuration:

```typescript
import { defineConfig, plugin, page, section } from '@deessejs/core';
import { z } from 'zod';

// plugin() returns a function that accepts parameters defined by the plugin
const myPlugin = plugin({
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

// Pass plugin parameters when registering
export const config = defineConfig({
  plugins: [myPlugin({ /* plugin parameters */ })],
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
