# Deesse Object Architecture

## Overview

The deesse package provides two distinct auth object types: one for server-side operations (`Deesse`) and one for client-side operations (`DeesseClient`).

## Server-Side: `Deesse` Type

**Location:** `packages/deesse/src/server.ts`

```typescript
export type Deesse = {
  auth: Awaited<ReturnType<typeof betterAuth<{
    database: ReturnType<typeof drizzleAdapter>;
    baseURL: string;
    secret: string;
    plugins: BetterAuthPlugin[];
  }>>>;
  database: PostgresJsDatabase;
};
```

**Creation:** The `createDeesse(config: InternalConfig)` function creates a `betterAuth` instance with:
- Drizzle adapter connecting to PostgreSQL
- Base URL configuration
- Secret for cookie signing
- Plugins array (always includes `admin()` plugin)

## Singleton Pattern: `getDeesse()`

**Location:** `packages/deesse/src/index.ts` (lines 75-105)

The project uses a **singleton pattern** to persist the Deesse instance across HMR:

```typescript
const DEESSE_GLOBAL_KEY = Symbol.for("@deessejs/core.instance");

export const getDeesse = async (config: InternalConfig): Promise<Deesse> => {
  const cache = getGlobalCache();

  // Returns cached instance if config is semantically equal
  if (cache.instance && cache.config && isConfigEqual(cache.config, config)) {
    return cache.instance;
  }

  // Creates new instance only when needed
  const instance = createDeesse(config);
  cache.pool = extractPool(instance.database);
  cache.instance = instance;
  cache.config = config;

  return instance;
};
```

**Key Properties:**
- Config equality is checked via `isConfigEqual()` - compares `secret`, `name`, and `auth.baseURL`
- Pool is extracted and stored for graceful shutdown
- Signals `SIGINT` and `SIGTERM` for cleanup

## Client-Side: `DeesseClient` Type

**Location:** `packages/deesse/src/client.ts`

```typescript
export interface DeesseClientOptions {
  auth: BetterAuthClientOptions;
}

export interface DeesseClient {
  auth: AuthClient<BetterAuthClientOptions>;
}

export function createClient(options: DeesseClientOptions): DeesseClient {
  const auth = createAuthClient(options.auth) as unknown as AuthClient<BetterAuthClientOptions>;
  return { auth };
}
```

The `DeesseClient.auth` property exposes better-auth's `AuthClient` which provides:
- `useSession()` - React hook for session state
- `use list()`, `useSignOut()`, etc. from plugins

## Usage in Main App (Example)

**Location:** `examples/base/src/lib/deesse.ts`

```typescript
import { getDeesse } from "deesse";
import { config } from "../deesse.config";

export const deesse = await getDeesse(config);  // Top-level await - singleton
export const deesseAuth = deesse.auth;          // Extract auth for API routes
```

**Location:** `examples/base/src/lib/client.ts`

```typescript
import { createClient } from "deesse";

export const client = createClient({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
});
```

## Exports from Packages

**From `packages/deesse/src/index.ts`:**
```typescript
export { getDeesse, clearDeesseCache, shutdownDeesse }  // Server lifecycle
export type { Deesse }                                   // Server auth type
export { createClient }                                  // Client factory
export type { DeesseClient, DeesseClientOptions }       // Client types
export { defineConfig, type Config, type InternalConfig } // Config system
export { page, section, type PageTree }                  // Page DSL
```

**From `packages/next/src/index.ts`:**
```typescript
export { RootPage }        // Admin page renderer (Server Component)
export { RootLayout }      // Minimal HTML shell
export { LoginPage }       // Client Component login form
export { FirstAdminSetup } // Client Component initial admin creation
export { REST_GET, REST_POST }  // API route helpers
```

## Key Insight: Two Auth Objects

The deesse architecture distinguishes between:

| Aspect | Server (`deesseAuth`) | Client (`client.auth`) |
|--------|----------------------|------------------------|
| Created via | `getDeesse().auth` | `createClient().auth` |
| Type | `Auth` from better-auth | `AuthClient` from better-auth/react |
| Used in | API routes, RootPage | React components via hooks |
| Session check | Server-side with headers | Client-side hook |

Both share the same underlying cookie-based session mechanism.