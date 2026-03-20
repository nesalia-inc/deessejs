# Database

This is an internal document outlining the database system for DeesseJS.

## Overview

DeesseJS is database-agnostic and supports multiple database providers. This allows developers to choose the database solution that best fits their needs.

## Supported Providers

- **Drizzle** - Lightweight and type-safe ORM
- **Prisma** - Popular ORM with great developer experience
- **Custom** - Implement your own database provider

## Configuration

Configure your database provider in `deesse.config.ts`:

```typescript
import { defineConfig } from '@deessejs/core';

export const config = defineConfig({
  database: {
    provider: 'drizzle',
    // provider-specific configuration
  },
});
```

## Why Multiple Providers?

- Different projects have different needs
- Existing codebases may already use a specific ORM
- Flexibility for teams with different preferences
