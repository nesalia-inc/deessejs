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

## Types

### Input Parameter

The input to `defineConfig()` is a `ConfigInput` object:

```typescript
import { defineConfig } from '@deessejs/deesse';

export const config = defineConfig({
  database: /* database adapter */,
  auth: {
    api: {
      // Better-auth server configuration (database is auto-configured)
      emailAndPassword: { enabled: true },
      socialProviders: { /* ... */ },
    },
    client: {
      // Client-side configuration
      baseURL: 'http://localhost:3000',
    },
  },
  pages: [/* DSL pages and sections */],
  plugins: [/* plugins */],
});
```

### Return Type

The return type `Config` enriches the input with computed properties:

```typescript
// config.auth.api - Server-side auth methods
const { getSession, signIn, signUp, signOut } = config.auth.api;

// config.auth.client - Client-side auth (React hooks)
const { useSession, signIn, signOut } = config.auth.client;

// config.pages - Enriched page tree
config.pages.forEach(page => { /* ... */ });
```

### Type Definitions

```typescript
// Input type
type ConfigInput = {
  /** Database adapter configuration */
  database?: DatabaseAdapter;

  /** Authentication configuration */
  auth?: {
    /** Server-side Better-Auth configuration (database is auto-configured) */
    api: Omit<BetterAuthConfig, 'database'>;

    /** Client-side auth configuration */
    client?: AuthClientConfig;
  };

  /** Custom pages and sections (DSL) */
  pages?: (Page | Section)[];

  /** Plugins to register */
  plugins?: Plugin[];
};

// Output type (enriched)
type Config = ConfigInput & {
  /** Server-side auth API methods */
  auth: {
    api: AuthAPI;
    client: AuthClient;
  };

  /** Enriched page tree with slugs */
  pages: PageNode[];
};
```

### Database Adapter

```typescript
// Drizzle adapter example
import { defineConfig, drizzleAdapter } from '@deessejs/deesse';

export const config = defineConfig({
  database: drizzleAdapter({
    provider: 'sqlite',
    url: './data.db',
  }),
});
```

### Auth Configuration

```typescript
import { defineConfig } from '@deessejs/deesse';

export const config = defineConfig({
  auth: {
    api: {
      // database is auto-configured from the main database config
      emailAndPassword: { enabled: true },
      socialProviders: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      },
    },
    client: {
      baseURL: 'http://localhost:3000',
    },
  },
});
```

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
