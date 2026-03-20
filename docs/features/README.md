# Features

This directory contains internal documentation for DeesseJS features.

## Quick Start

Create a new DeesseJS project:

```bash
npx create-deesse-app@latest
# or
npm create deesse-app
```

The CLI will prompt you for:
1. **Project name** - Name of your project
2. **Template** - Choose a template (blank, with example pages, etc.)
3. **Database provider** - Choose your database (Drizzle, Prisma, or custom)

Then it will initialize the project with the chosen configuration.

The CLI generates a basic `deesse.config.ts`:

```typescript
import { defineConfig } from '@deessejs/core';

export const config = defineConfig({
  auth: {
    // better-auth configuration
  },
});
```

And sets up the admin dashboard route:

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
