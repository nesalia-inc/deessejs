# Configuration

This is an internal document outlining the configuration system for DeesseJS.

## Main Configuration File

The core configuration is defined in `deesse.config.ts` at the root of the project. This file exports the main configuration using `defineConfig()`.

```typescript
export const config = defineConfig({
  // Configuration options
});
```

The `defineConfig()` function is the main entry point for configuring DeesseJS. It accepts an object that defines various aspects of the CMS behavior.

## Options

### `pages`

Defines the admin pages and sections structure using the internal DSL (see [Admin Dashboard](../admin-dashboard/README.md)).

```typescript
export const config = defineConfig({
  pages: [
    page({
      name: 'Home',
      content: () => <DashboardHome />,
    }),
    section({
      name: 'Settings',
      children: [
        page({
          name: 'General',
          content: () => <GeneralSettings />,
        }),
      ],
    }),
  ],
});
```
