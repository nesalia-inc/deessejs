# Plugins

This is an internal document outlining the plugin system for DeesseJS.

## Overview

DeesseJS supports a plugin system that allows developers to extend the functionality of the CMS. Plugins can be registered in the configuration file and are capable of adding new pages to the admin dashboard.

## Adding Plugins

Plugins are added to the configuration using the `plugin()` function in `deesse.config.ts`:

```typescript
import { defineConfig } from '@deessejs/core';
import myPlugin from './plugins/my-plugin';

export const config = defineConfig({
  plugins: [
    plugin(myPlugin),
  ],
});
```

## Plugin Capabilities

A plugin can:
- **Add pages**: Register new admin pages that appear in the dashboard navigation
- Extend core functionality
- Add new features to the CMS

Plugins provide a way to modularize and share functionality across different DeesseJS projects.
