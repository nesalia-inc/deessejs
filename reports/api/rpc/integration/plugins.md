# Plugin System for deesse + RPC Integration

This document describes the plugin architecture that bridges `deesse`/`admin` config plugins with `@deessejs/server` RPC plugins, allowing user-defined routes.

## Desired Developer Experience

### 1. Creating a Plugin with Routes

```typescript
// plugins/my-plugin.ts
import { plugin } from "deesse";
import { z } from "zod";

export const myPlugin = plugin({
  name: "myPlugin",
  schema: z.object({ featureFlag: z.boolean() }),
  router: (t) => ({
    getData: t.query({
      args: z.object({ id: z.string() }),
      handler: async (ctx, args) => {
        const data = await ctx.db.query.data.find(args.id);
        return ok(data);
      },
    }),
    createData: t.mutation({
      args: z.object({ name: z.string() }),
      handler: async (ctx, args) => {
        return ok(await ctx.db.insert(data).values(args));
      },
    }),
  }),
});
```

### 2. Registering Plugins in Config

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { myPlugin } from "./plugins/my-plugin";
import { analyticsPlugin } from "./plugins/analytics";

export default defineConfig({
  database: DATABASE_URL,
  secret: process.env.AUTH_SECRET,
  auth: { baseURL: "http://localhost:3000" },
  plugins: [
    myPlugin({ featureFlag: true }),
    analyticsPlugin(),
  ],
});
```

### 3. Accessing Routes from Client

```typescript
// In React components
import { client } from "@/client";

const { data } = client.myPlugin.getData.useQuery({ id: "123" });
await client.myPlugin.createData.useMutation({ name: "test" });
await client.analytics.trackEvent.useMutation({ event: "page_view" });
```

### 4. Server-Side Full Access

```typescript
// In server components - internal operations available
const data = await api.myPlugin.getData({ id: "123" });
await api.myPlugin.createData({ name: "test" });
await api.analytics.trackEvent({ event: "page_view" });
```

### 5. Final Router Structure

```
api / client
├── deesse         (auth, db - from deessePlugin)
├── myPlugin       (getData, createData)
├── analytics      (trackEvent, getStats)
└── admin          (dashboard, users, settings)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      deesse.config.ts                          │
│                                                                  │
│  plugins: [                                                      │
│    myPlugin({ featureFlag: true }),   ← Config Plugin (deesse)  │
│    analyticsPlugin(),                  ← Config Plugin (deesse)  │
│  ]                                                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    deessePlugin                                 │
│  (from @deessejs/server/plugins)                               │
│                                                                  │
│  1. Receives config with plugins array                         │
│  2. Has access to t via defineContext()                        │
│  3. Creates routers from plugin router functions               │
│  4. Merges all plugin routers into main router                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    @deessejs/server                             │
│                                                                  │
│  defineContext({                                                │
│    plugins: [deessePlugin({ config, plugins })],                │
│  })                                                              │
│                            │                                     │
│                            ▼                                     │
│  Final Router:                                                  │
│  ├── deesse         (auth, db)                                 │
│  ├── myPlugin       (getData, createData)                      │
│  ├── analytics      (trackEvent, getStats)                     │
│  └── appRouter      (admin.dashboard, etc.)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Two Plugin Types

There are two plugin systems that work together:

### 1. Config Plugins (deesse/admin)

These are defined in `packages/deesse/src/config/plugin.ts` and used in `deesse.config.ts`:

```typescript
// Current state - plugins only have a name
export type Plugin = {
  name: string;
};

export type PluginConfig<TParams = never> = {
  name: string;
  schema?: ZodSchema<TParams>;
};
```

### 2. RPC Plugins (@deessejs/server)

These are defined in `@deessejs/server` and can expose routes:

```typescript
// @deessejs/server plugin - can expose router
export type Plugin<TCtx = any> = {
  name: string;
  router?: Router<TCtx>;      // Routes
  hooks?: PluginHooks<TCtx>;   // Lifecycle hooks
  extend?: (ctx: TCtx) => Partial<TCtx>;  // Context extension
};
```

## Current Config Plugin Type

```typescript
// packages/deesse/src/config/plugin.ts
export type Plugin = {
  name: string;
};

export type PluginConfig<TParams = never> = {
  name: string;
  schema?: ZodSchema<TParams>;
};

export function plugin<TParams = never>(
  config: PluginConfig<TParams>
): (params: TParams) => Plugin {
  return (params) => {
    if (config.schema) {
      config.schema.parse(params);
    }
    return { name: config.name };
  };
}
```

**Current limitation:** Plugins only have a `name`. No way to add routes.

### Where Config is Used

```typescript
// packages/deesse/src/config/define.ts
export type Config = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];      // <-- plugins array
  pages?: PageTree[];
  secret: string;
  auth: { baseURL: string };
  admin?: { header?: AdminHeaderConfig };
};
```

## Goal: Plugin-Defined Routes

Allow config plugins to expose routes that integrate into the deesse RPC system.

### Proposed Extended Config Plugin Type

```typescript
// Extended Plugin type for deesse config
export type Plugin<TCtx = any> = {
  name: string;
  // Optional router exposed by this plugin
  router?: (t: QueryBuilder<TCtx>) => Router<TCtx>;
  // Optional hooks
  hooks?: PluginHooks<TCtx>;
};

export type PluginConfig<TParams = never, TCtx = any> = {
  name: string;
  schema?: ZodSchema<TParams>;
  router?: (t: QueryBuilder<TCtx>) => Router<TCtx>;
  hooks?: PluginHooks<TCtx>;
};

export function plugin<TParams = never, TCtx = any>(
  config: PluginConfig<TParams, TCtx>
): (params: TParams) => Plugin<TCtx>;
```

## Usage

### Creating a Config Plugin with Routes

```typescript
// plugins/my-plugin.ts
import { plugin } from "deesse";
import { z } from "zod";

export const myPlugin = plugin({
  name: "myPlugin",
  schema: z.object({ featureFlag: z.boolean() }),
  router: (t) => ({
    getData: t.query({
      args: z.object({ id: z.string() }),
      handler: async (ctx, args) => {
        // ctx has auth, db from deessePlugin
        const data = await ctx.db.query.data.find(args.id);
        return ok(data);
      },
    }),
    createData: t.mutation({
      args: z.object({ name: z.string() }),
      handler: async (ctx, args) => {
        const result = await ctx.db.insert(data).values(args);
        return ok(result);
      },
    }),
  }),
  hooks: {
    onInvoke: (ctx, args) => {
      console.log("myPlugin invoked");
    },
  },
});
```

### Using Plugins in deesse.config.ts

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { myPlugin } from "./plugins/my-plugin";
import { analyticsPlugin } from "./plugins/analytics";

export default defineConfig({
  database: DATABASE_URL,
  secret: process.env.AUTH_SECRET,
  name: "My App",
  auth: { baseURL: "http://localhost:3000" },
  plugins: [
    myPlugin({ featureFlag: true }),
    analyticsPlugin(),
  ],
});
```

## The Challenge: Where t Comes From

The problem is that `t` (QueryBuilder) is created by `defineContext()` from `@deessejs/server`. But `defineConfig()` is from `deesse` and runs first.

**The solution: deessePlugin handles the bridging**

```typescript
// deessePlugin in @deessejs/server/plugins
const deessePlugin = (config: InternalConfig & { plugins?: Plugin[] }) => {
  return plugin("deesse", async (ctx) => {
    const deesse = await getDeesse(config);
    return {
      auth: deesse.auth,
      db: deesse.database,
    };
  }, {
    // This is where t is available!
    router: (t) => {
      // For each config plugin with a router, call it with t
      const pluginRouters = config.plugins?.map((p) => {
        if (p.router) {
          return p.router(t);  // t is available here
        }
        return {};
      }) ?? [];

      // Merge all plugin routers
      return mergeRouters(pluginRouters);
    },
  });
};
```

## Complete Setup

### 1. Server Setup with Plugin Merging

```typescript
// src/server/index.ts
import { defineContext, createAPI, createPublicAPI, t } from "@deessejs/server";
import { deessePlugin } from "@deessejs/server/plugins";
import { config } from "@deesse-config";
import { myPlugin } from "@/plugins/my-plugin";
import { analyticsPlugin } from "@/plugins/analytics";

const { createAPI: mkAPI } = defineContext({
  plugins: [
    deessePlugin({
      config,
      // Config plugins passed here for router merging
      plugins: [
        myPlugin({ featureFlag: true }),
        analyticsPlugin(),
      ],
    }),
  ],
});

const appRouter = t.router({
  admin: {
    dashboard: t.query({ handler: async (ctx) => ok({}) }),
  },
});

export const api = mkAPI({ router: appRouter });
export const client = createPublicAPI(api);
export type AppRouter = typeof api;
```

### 2. Client Access

```typescript
// src/client.ts
import { createClient, fetchTransport } from "deesse/client";
import type { AppRouter } from "@/server";

export const client = createClient<AppRouter>({ transport: fetchTransport("/api") });
```

```typescript
// In React components
const { data } = useQuery(client.myPlugin.getData, { id: "123" });
useMutation(client.myPlugin.createData);
useMutation(client.analytics.trackEvent);
```

## Router Merging

The routers from all plugins are merged into the main router:

```
Final Router:
├── deesse         (from deessePlugin - auth, db)
├── myPlugin       (from myPlugin config plugin)
│   ├── getData
│   └── createData
├── analytics      (from analyticsPlugin config plugin)
│   ├── trackEvent
│   └── getStats
└── admin          (from appRouter)
    └── dashboard
```

## Plugin Lifecycle Hooks

Plugins can define lifecycle hooks:

```typescript
const loggingPlugin = plugin({
  name: "logging",
  router: (t) => ({
    log: t.mutation({
      args: z.object({ message: z.string() }),
      handler: async (ctx, args) => {
        console.log(args.message);
        return ok({ success: true });
      },
    }),
  }),
  hooks: {
    onInvoke: (ctx, args) => {
      console.log("Before log:", args);
    },
    onSuccess: (ctx, args, result) => {
      console.log("After log:", result);
    },
    onError: (ctx, args, error) => {
      console.error("Log failed:", error);
    },
  },
});
```

## Plugin Order

Plugin order matters when plugins depend on each other:

```typescript
const { createAPI } = defineContext({
  plugins: [
    // First: deessePlugin provides auth and db
    deessePlugin({ config }),

    // Second: authPlugin depends on ctx.auth
    authPlugin,

    // Third: business plugins
    usersPlugin,
    postsPlugin,
  ],
});
```

Each plugin's `extend()` is called in order, so later plugins can access properties added by earlier plugins.

## Limitations

1. **Plugin routes are public by default** - Use `t.internalQuery()` / `t.internalMutation()` if server-only
2. **Context access order** - Plugins that depend on other plugins must be ordered after them
3. **No route removal** - Plugins can only add routes, not remove existing ones
4. **Type inference** - Complex nested routers may need explicit type annotations

## See Also

- [RPC Integration](./integration.md) - How deesse integrates with @deessejs/server
- [deessePlugin Design](./plugin.md) - The plugin that bridges config to RPC
- [@deessejs/server Plugin System](../../deesse-rpc/features/plugin-system.md) - Full RPC plugin documentation
- [Router](../../deesse-rpc/features/router.md) - Router organization
