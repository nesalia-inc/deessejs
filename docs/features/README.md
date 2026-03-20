# Features

This directory contains internal documentation for DeesseJS features.

## Quick Start

Create a `deesse.config.ts` file in your project root:

```typescript
import { defineConfig, authProvider } from '@deessejs/core';

export const config = defineConfig({
  auth: {
    // better-auth configuration
  },
});
```

Then add the admin dashboard to your Next.js app:

```typescript
// app/(deesse)/admin/[[...slug]]/page.tsx
import { RootPage } from '@deessejs/next';
import { config } from '@deesse-config';

export default function AdminPage({ params, searchParams }: PageProps) {
  return <RootPage config={config} params={params} searchParams={searchParams} />;
}
```

## Overview

DeesseJS is a CMS for developers with the following core features:

- **[Admin Dashboard](./admin-dashboard/README.md)** - WordPress-like admin interface with DSL for pages and sections
- **[Authentication](./authentication/README.md)** - Built on better-auth for user management
- **[API](./api/README.md)** - Auto-generated REST API routes
- **[Configuration](./config/README.md)** - Centralized configuration via `deesse.config.ts`
- **[Plugins](./plugins/README.md)** - Extensible plugin system with pages, sections, and methods
- **[UI](./ui/README.md)** - UI system with widgets for dashboard customization

## Feature List

| Feature | Description |
|---------|-------------|
| Admin Dashboard | WordPress-like admin interface accessible at `/admin` |
| Authentication | User management using better-auth |
| API | Auto-generated REST API at `/api` |
| Configuration | Centralized config in `deesse.config.ts` |
| Plugins | Extensible plugin system |
| UI | Widget-based dashboard customization |
