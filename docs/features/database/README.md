# Database

This is an internal document outlining the database system for DeesseJS.

## Overview

DeesseJS uses the same database adapter system as Better-Auth. This means DeesseJS directly uses Better-Auth's adapters, so you only need one database connection for both authentication and plugin settings.

## Why Better-Auth Adapters?

- Single database for auth + plugin settings
- Proven adapter system with many supported databases
- No need to maintain a separate adapter layer
- Seamless integration with Better-Auth

## Supported Providers

- **Drizzle** - Lightweight and type-safe ORM
- **Prisma** - Popular ORM with great developer experience
- **Custom** - Implement your own adapter using Better-Auth's `createAdapterFactory`

## Configuration

Configure your database provider in `deesse.config.ts`. The same database is used for both authentication and plugin settings:

```typescript
import { defineConfig } from '@deessejs/core';
import { drizzle } from '@deessejs/drizzle';

export const config = defineConfig({
  database: drizzle({
    // drizzle configuration
  }),
  auth: {
    // better-auth configuration
  },
});
```

The `database` config is passed directly to Better-Auth's adapter system.
