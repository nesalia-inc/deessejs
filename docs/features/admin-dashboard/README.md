# Admin Dashboard

This is an internal document outlining the architecture of the admin dashboard for this project.

## Overview

DeesseJS is a CMS for developers. The admin dashboard provides a WordPress-like interface for content management, accessible at `/admin/[...slug]/page.tsx`.

## Routing

- **Native routes**: Core admin functionality is provided by built-in routes
- **Plugin routes**: The majority of admin routes are dynamically loaded from plugins, allowing extensibility

This architecture enables developers to extend the admin dashboard through the plugin system while maintaining a solid core of native functionality.

## Implementation

The admin dashboard is implemented at `/app/(deesse)/admin/[[...slug]]/page.tsx`. This route renders the `RootPage` component from `@deessejs/next`.

The `RootPage` component receives:
- **`params`**: Route parameters
- **`searchParams`**: URL search parameters
- **`config`**: The configuration imported from `@deesse-config` (an alias for `deesse.config.ts`)

```typescript
// /app/(deesse)/admin/[[...slug]]/page.tsx
import { RootPage } from '@deessejs/next';
import { config } from '@deesse-config';

export default function AdminPage({ params, searchParams }: PageProps) {
  return <RootPage config={config} params={params} searchParams={searchParams} />;
}
```

## Internal DSL

The dashboard is built using an internal DSL that allows developers to programmatically define the dashboard structure. This provides a clean, declarative way to build admin interfaces.

### Core Functions

- **`page()`**: Defines a new admin page
  - **`name`**: The page display name
  - **`children`**: Can be nested under a `section()`
  - **`content`**: A React component that renders the page content

```typescript
const MyPage = page({
  name: 'My Page',
  content: () => <div>Hello World</div>,
});
```

- **`section()`**: Creates a section within a page

```typescript
const MySection = section({
  name: 'Settings',
  children: [MyPage],
});
```

These functions will be explored in detail to define the dashboard structure.

## Default Pages

The admin dashboard comes with the following native pages:

- **Home**: The dashboard landing page
- **Settings**: A section containing general settings
- **Plugins**: Page to manage plugins
- **Appearance** (optional): Page to manage the dashboard appearance
