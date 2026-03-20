# Plugins

This is an internal document outlining the plugin system for DeesseJS.

## Overview

DeesseJS supports a plugin system that allows developers to extend the functionality of the CMS. Plugins can be registered in the configuration file and are capable of adding new pages to the admin dashboard.

## Adding Plugins

Plugins are created using the `plugin()` function and added to the configuration:

```typescript
import { defineConfig, plugin } from '@deessejs/core';
import { z } from 'zod';

const myPlugin = plugin({
  schema: z.object({
    apiKey: z.string(),
    enabled: z.boolean().default(true),
  }),
  // plugin configuration
});

export const config = defineConfig({
  plugins: [myPlugin],
});
```

### Schema

A plugin can define a Zod schema that represents the parameters users can pass when configuring the plugin. This provides type-safe configuration and validation.

## Plugin Capabilities

A plugin can:
- **Add pages**: Register new admin pages that appear in the dashboard navigation
- Extend core functionality
- Add new features to the CMS

Plugins provide a way to modularize and share functionality across different DeesseJS projects.
