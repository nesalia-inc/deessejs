# Pages and Sections

This document explains how to create custom admin pages and sections using the internal DSL.

## Overview

The admin dashboard uses a declarative DSL (Domain Specific Language) to define pages and sections. This allows you to programmatically build the navigation structure.

## Creating Pages

### Basic Page

Use the `page()` function to create a new admin page:

```typescript
import { page } from '@deessejs/deesse';

const MyPage = page({
  name: 'My Page',
  content: () => <div>Hello World</div>,
});
```

### Page Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Display name in navigation |
| `slug` | `string` | No | URL slug (auto-generated from name if omitted) |
| `icon` | `LucideIcon` | No | Lucide icon displayed in sidebar |
| `content` | `() => React.ReactNode` | Yes | React component that renders the page |

### Page with Icon

```typescript
import { Home, Settings } from "lucide-react";

const HomePage = page({
  name: "Home",
  icon: Home,              // Lucide icon
  content: () => <Dashboard />,
});

const SettingsPage = page({
  name: "Settings",
  icon: Settings,           // Lucide icon
  content: () => <SettingsForm />,
});
```

### Page with Custom Slug

```typescript
const SettingsPage = page({
  name: 'Settings',
  slug: 'settings',
  content: () => <div>Settings content</div>,
});
```

## Creating Sections

### Basic Section

Use the `section()` function to group pages:

```typescript
import { page, section } from '@deessejs/deesse';

const GeneralPage = page({
  name: 'General',
  content: () => <div>General settings</div>,
});

const SecurityPage = page({
  name: 'Security',
  content: () => <div>Security settings</div>,
});

const SettingsSection = section({
  name: 'Settings',
  children: [GeneralPage, SecurityPage],
});
```

### Section Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Display name in navigation |
| `slug` | `string` | No | URL slug (auto-generated from name if omitted) |
| `children` | `(Page \| Section)[]` | Yes | Array of pages or nested sections |

### Nested Sections

Sections can be nested to create deeper hierarchies:

```typescript
const AdvancedPage = page({
  name: 'Advanced',
  content: () => <div>Advanced settings</div>,
});

const SettingsSection = section({
  name: 'Settings',
  children: [
    GeneralPage,
    SecurityPage,
    section({
      name: 'Advanced',
      children: [AdvancedPage],
    }),
  ],
});
```

## Using in Config

Add pages and sections to your `deesse.config.ts`:

```typescript
import { defineConfig, page, section } from '@deessejs/deesse';
import { Home, Settings, Shield } from 'lucide-react';

const DashboardHome = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">Welcome</h1>
    <p>Dashboard home page</p>
  </div>
);

const GeneralSettings = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">General Settings</h1>
    {/* Settings form */}
  </div>
);

const SecuritySettings = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">Security Settings</h1>
    {/* Security form */}
  </div>
);

export const config = defineConfig({
  pages: [
    page({
      name: 'Home',
      icon: Home,
      content: DashboardHome,
    }),
    section({
      name: 'Settings',
      icon: Settings,
      children: [
        page({
          name: 'General',
          icon: Settings,
          content: GeneralSettings,
        }),
        page({
          name: 'Security',
          icon: Shield,
          content: SecuritySettings,
        }),
      ],
    }),
  ],
});
```

## URL Structure

The DSL generates a URL structure based on the page/section hierarchy:

| Structure | URL |
|-----------|-----|
| `page({ name: 'Home' })` | `/admin/home` |
| `section({ name: 'Settings', children: [...] })` | `/admin/settings` |
| `page({ name: 'General' })` in Settings section | `/admin/settings/general` |
| Nested section | `/admin/settings/advanced/general` |

## Default Pages

The admin dashboard includes built-in pages that cannot be modified:

- **Home** - Dashboard landing page (`/admin`)
- **Users** - User management (`/admin/users`)
- **Settings** - General settings (`/admin/settings`)

Custom pages are appended to the navigation after the default pages.

## Best Practices

1. **Use descriptive names** - Names appear in the navigation
2. **Group related pages** - Use sections to organize related functionality
3. **Keep content simple** - Pages should focus on a single responsibility
4. **Use theme variables** - Always use shadcn CSS variables for styling

```typescript
// Good
const MyPage = page({
  name: 'User Management',
  content: () => (
    <div className="p-6 bg-background text-foreground">
      <h1>Users</h1>
    </div>
  ),
});

// Avoid
const MyPage = page({
  name: 'Users',
  content: () => (
    <div style={{ backgroundColor: '#fff', padding: '24px' }}>
      <h1>Users</h1>
    </div>
  ),
});
```
