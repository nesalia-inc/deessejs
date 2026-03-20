# Database

This is an internal document outlining the database system for DeesseJS.

## Overview

DeesseJS uses a database adapter architecture similar to Better-Auth. This allows developers to use any database provider while maintaining a consistent interface.

## Architecture: Database Adapter

DeesseJS uses `createAdapterFactory` to create database adapters. This approach allows you to focus on writing database logic without worrying about how the adapter works with the framework.

## Creating a Custom Adapter

Import `createAdapterFactory` and create your adapter:

```typescript
import { createAdapterFactory } from '@deessejs/adapter';

// Your custom adapter config options
interface CustomAdapterConfig {
  debugLogs?: boolean;
  usePlural?: boolean;
}

export const myAdapter = (config: CustomAdapterConfig = {}) =>
  createAdapterFactory({
    config: {
      adapterId: 'custom-adapter',
      adapterName: 'Custom Adapter',
      usePlural: config.usePlural ?? false,
      debugLogs: config.debugLogs ?? false,
      supportsJSON: false,
      supportsDates: true,
      supportsBooleans: true,
      supportsNumericIds: true,
    },
    adapter: ({}) => {
      return {
        create: async ({ data, model, select }) => {
          // Insert data into database
        },
        update: async ({ data, model, where }) => {
          // Update data in database
        },
        updateMany: async ({ data, model, where }) => {
          // Update multiple records
        },
        delete: async ({ model, where }) => {
          // Delete record from database
        },
        deleteMany: async ({ model, where }) => {
          // Delete multiple records
        },
        findOne: async ({ model, where, select }) => {
          // Find single record
        },
        findMany: async ({ model, where, limit, sortBy, offset }) => {
          // Find multiple records
        },
        count: async ({ model, where }) => {
          // Count records
        },
      };
    },
  });
```

## Supported Providers

- **Drizzle** - Lightweight and type-safe ORM
- **Prisma** - Popular ORM with great developer experience
- **Custom** - Implement your own database adapter

## Configuration

Configure your database provider in `deesse.config.ts`:

```typescript
import { defineConfig } from '@deessejs/core';
import { drizzle } from '@deessejs/drizzle';

export const config = defineConfig({
  database: drizzle({
    // drizzle configuration
  }),
});
```

## Adapter Config Options

- **`adapterId`** - Unique identifier for the adapter
- **`adapterName`** - Human-readable name
- **`supportsJSON`** - Whether the database supports JSON natively
- **`supportsDates`** - Whether the database supports date types
- **`supportsBooleans`** - Whether the database supports boolean types
- **`supportsNumericIds`** - Whether the database supports auto-incrementing numeric IDs
- **`usePlural`** - Whether table names are plural
- **`debugLogs`** - Enable debug logging
- **`transaction`** - Whether transactions are supported
