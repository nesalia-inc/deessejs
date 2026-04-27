# deessePlugin Design

This document describes how to implement the `deessePlugin` that integrates better-auth + drizzle-orm into `@deessejs/server`'s plugin system.

## Goal

The `deessePlugin` should:

1. Accept a `deesse.Config` object
2. Provide `ctx.auth` (BetterAuth instance) to all handlers
3. Provide `ctx.db` (Drizzle database instance) to all handlers
4. Be used via `deessePlugin({ config })` in `defineContext()`

## Interface

```typescript
// In @deessejs/server/plugins
import { plugin } from "@deessejs/server";
import type { InternalConfig } from "deesse";

export const deessePlugin = plugin("deesse", (ctx) => ({
  // Properties to merge into context
}), {
  // Optional router for plugin-exposed routes
  // Optional hooks
});
```

## Plugin Signature

From the Plugin System docs, a plugin is created with:

```typescript
plugin<Ctx>(name: string, extend: (ctx: Ctx) => Partial<Ctx>)
```

The `deessePlugin` needs to:
1. Define the extended context type (what `ctx` will contain)
2. Create the BetterAuth instance from config
3. Provide `ctx.auth` and `ctx.db` to handlers

## Context Type

```typescript
// What handlers will receive
type DeesseContext = {
  auth: Auth;                    // BetterAuth instance
  db: PostgresJsDatabase;         // Drizzle database
  // Plus any other base context from defineContext()
};
```

## Implementation Sketch

```typescript
// packages/server/src/plugins/deesse.ts
import { plugin } from "@deessejs/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { InternalConfig } from "deesse";
import type { Auth } from "better-auth";

type Ctx = {
  db: unknown;  // Will be PostgresJsDatabase
  auth: Auth;   // Will be BetterAuth instance
};

export const deessePlugin = (config: InternalConfig) => {
  return plugin<Ctx>("deesse", (ctx) => {
    // Create auth instance (or reuse from singleton)
    const auth = betterAuth({
      database: drizzleAdapter(config.database, { provider: "pg" }),
      baseURL: config.auth.baseURL,
      secret: config.secret,
      emailAndPassword: { enabled: true },
      trustedOrigins: [config.auth.baseURL],
      plugins: config.auth.plugins,
    });

    return {
      auth: auth as Auth,
      db: config.database,
    };
  });
};
```

## But Wait - Singleton Issue

The current `deesse` package has `getDeesse()` which is a singleton that:
- Caches the auth instance across HMR
- Handles hot-reload by comparing config
- Closes the old pool before creating a new instance

The plugin approach creates a NEW auth instance per `defineContext()` call, which is inefficient and could cause connection pool issues.

### Solution: Plugin Should Use Singleton

The `deessePlugin` should NOT create its own auth instance. Instead, it should leverage the existing singleton:

```typescript
// packages/server/src/plugins/deesse.ts
import { plugin } from "@deessejs/server";
import { getDeesse } from "deesse";
import type { InternalConfig } from "deesse";

type Ctx = {
  auth: unknown;  // BetterAuth
  db: unknown;    // Drizzle database
};

export const deessePlugin = plugin<Ctx>("deesse", async (ctx) => {
  // Get the singleton instance
  const deesse = await getDeesse(config);

  return {
    auth: deesse.auth,
    db: deesse.database,
  };
});
```

### But Plugin extend() is Sync?

Looking at the Plugin System docs:

```typescript
const myPlugin = plugin<Ctx>("myPlugin", (ctx) => ({
  myProperty: "value",
  myHelper: () => { ... }
}))
```

The `extend()` function appears to be synchronous. But `getDeesse()` is async.

**Options:**

1. **Make extend async** - Check if the plugin system supports async extend
2. **Initialize auth eagerly** - Create auth at plugin creation time, not per-request
3. **Use a lazy initialization pattern** - Store a promise, await it on first use

### Option 2: Eager Initialization

```typescript
import { plugin } from "@deessejs/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { InternalConfig } from "deesse";

type Ctx = {
  auth: unknown;
  db: unknown;
};

// Create auth at plugin creation time (not per-request)
function createAuth(config: InternalConfig) {
  return betterAuth({
    database: drizzleAdapter(config.database, { provider: "pg" }),
    baseURL: config.auth.baseURL,
    secret: config.secret,
    emailAndPassword: { enabled: true },
    trustedOrigins: [config.auth.baseURL],
    plugins: config.auth.plugins,
  });
}

export const deessePlugin = (config: InternalConfig) => {
  // Eagerly create auth instance
  const auth = createAuth(config);

  return plugin<Ctx>("deesse", () => ({
    auth,
    db: config.database,
  }));
};
```

This is efficient but creates a new auth instance. The singleton in `deesse/index.ts` handles HMR by closing old pools.

### Option 3: Check Plugin System for Async Support

Looking at the lifecycle hooks which ARE async:

```typescript
hooks: {
  onInvoke: async (ctx, args) => { ... },
  onSuccess: async (ctx, args, result) => { ... },
}
```

If hooks support async, perhaps `extend()` can too. We'd need to check the actual `@deessejs/server` implementation.

## Revised Implementation (Eager Auth)

```typescript
// packages/server/src/plugins/deesse.ts
import { plugin } from "@deessejs/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { InternalConfig } from "deesse";
import type { Auth } from "better-auth";

type Ctx = {
  auth: Auth;
  db: unknown;  // PostgresJsDatabase - type imported from drizzle-orm
};

export const deessePlugin = (config: InternalConfig) => {
  // Create auth instance eagerly (once per plugin creation)
  const auth = betterAuth({
    database: drizzleAdapter(config.database, { provider: "pg" }),
    baseURL: config.auth.baseURL,
    secret: config.secret,
    emailAndPassword: { enabled: true },
    trustedOrigins: [config.auth.baseURL],
    plugins: config.auth.plugins,
  });

  return plugin<Ctx>("deesse", () => ({
    auth: auth as Auth,
    db: config.database,
  }));
};
```

## Usage

```typescript
// src/server/index.ts
import { defineContext, createAPI, createPublicAPI, t } from "@deessejs/server";
import { deessePlugin } from "@deessejs/server/plugins";
import { config } from "@deesse-config";

const { createAPI: mkAPI } = defineContext({
  plugins: [
    deessePlugin({ config }),
  ],
});

const appRouter = t.router({
  admin: {
    users: {
      list: t.query({
        handler: async (ctx, args) => {
          // ctx.auth is available!
          // ctx.db is available!
          const users = await ctx.db.query.users.findMany();
          return ok(users);
        },
      }),
    },
  },
});

export const api = mkAPI({ router: appRouter });
export const client = createPublicAPI(api);
export type AppRouter = typeof appRouter;
```

## TypeScript Types

Need to properly type the context:

```typescript
// packages/server/src/plugins/deesse.ts
import { plugin } from "@deessejs/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { InternalConfig } from "deesse";
import type { Auth } from "better-auth";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DeesseCtx = {
  auth: Auth;
  db: PostgresJsDatabase<any>;
};

export const deessePlugin = (config: InternalConfig) => {
  const auth = betterAuth({
    database: drizzleAdapter(config.database, { provider: "pg" }),
    baseURL: config.auth.baseURL,
    secret: config.secret,
    emailAndPassword: { enabled: true },
    trustedOrigins: [config.auth.baseURL],
    plugins: config.auth.plugins,
  });

  return plugin<DeesseCtx>("deesse", () => ({
    auth,
    db: config.database,
  }));
};
```

## Open Questions

1. **Should deessePlugin reuse the singleton from `deesse/index.ts`?** If yes, how to access it from `@deessejs/server` without creating a circular dependency?

2. **Is `extend()` synchronous or can it be async?** If async, we could use `getDeesse()` directly.

3. **Plugin order when combined with other plugins?** The `deessePlugin` should probably be first since other plugins might depend on `ctx.auth`.

4. **Should we expose the BetterAuth instance directly, or wrap it?** The current `deesse` package returns the raw `better-auth` result. Maybe we should do the same.

## Alternative: Return deesse Object Directly

Instead of creating a new auth instance or wrapping, we can simply return the `deesse` singleton object:

```typescript
// packages/server/src/plugins/deesse.ts
import { plugin } from "@deessejs/server";
import { getDeesse } from "deesse";
import type { InternalConfig } from "deesse";

type Ctx = {
  deesse: {
    auth: Auth;
    database: PostgresJsDatabase;
  };
};

export const deessePlugin = (config: InternalConfig) => {
  return plugin<Ctx>("deesse", async () => {
    const deesse = await getDeesse(config);
    return { deesse };
  });
};
```

Then in handlers:
```typescript
ctx.deesse.auth      // BetterAuth instance
ctx.deesse.database // Drizzle database
```

But we can also destructure for convenience:

```typescript
// Or expose auth and database directly at ctx level
type Ctx = {
  auth: Auth;
  db: PostgresJsDatabase;
};

export const deessePlugin = (config: InternalConfig) => {
  return plugin<Ctx>("deesse", async () => {
    const deesse = await getDeesse(config);
    return {
      auth: deesse.auth,
      db: deesse.database,
    };
  });
};
```

## Final Implementation

```typescript
// packages/server/src/plugins/deesse.ts
import { plugin } from "@deessejs/server";
import { getDeesse } from "deesse";
import type { InternalConfig } from "deesse";
import type { Auth } from "better-auth";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DeesseCtx = {
  auth: Auth;
  db: PostgresJsDatabase<any>;
};

export const deessePlugin = (config: InternalConfig) => {
  return plugin<DeesseCtx>("deesse", async () => {
    const deesse = await getDeesse(config);
    return {
      auth: deesse.auth,
      db: deesse.database,
    };
  });
};
```

## Usage

```typescript
// src/server/index.ts
import { defineContext, createAPI, createPublicAPI, t } from "@deessejs/server";
import { deessePlugin } from "@deessejs/server/plugins";
import { config } from "@deesse-config";

const { createAPI: mkAPI } = defineContext({
  plugins: [
    deessePlugin({ config }),
  ],
});

const appRouter = t.router({
  admin: {
    users: {
      list: t.query({
        handler: async (ctx, args) => {
          // ctx.auth and ctx.db available!
          const users = await ctx.db.query.users.findMany();
          return ok(users);
        },
      }),
      get: t.internalQuery({
        handler: async (ctx, args) => {
          const user = await ctx.auth.$context.internalAdapter.listUsers(100);
          return ok(user);
        },
      }),
    },
  },
});

export const api = mkAPI({ router: appRouter });
export const client = createPublicAPI(api);
export type AppRouter = typeof appRouter;
```

## Benefits

1. **Reuses singleton** - `getDeesse()` handles caching and HMR
2. **Single auth instance** - No duplicate BetterAuth instances
3. **Simple** - Just pass through the existing object
4. **async extend()** - Works because `getDeesse()` is async

## Open Questions

1. **Plugin order** - Should `deessePlugin` be first since other plugins might depend on `ctx.auth`?

2. **Naming** - `ctx.auth` and `ctx.db` vs `ctx.deesse.auth` and `ctx.deesse.database`?

3. **Type exports** - Should `@deessejs/server/plugins` re-export types from `deesse`?
