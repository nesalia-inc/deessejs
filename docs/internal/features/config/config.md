# `defineConfig()`

`defineConfig()` is the main entry point for configuring DeesseJS. It validates the user-provided config, applies defaults, and stores the result globally so that `getDeesse()` can be called without arguments.

## Function signature

```typescript
export const defineConfig = <TSchema extends Record<string, unknown>>(
  config: Config<TSchema>
): InternalConfig<TSchema>
```

## Config type

```typescript
type Config<TSchema> = {
  name?: string;
  database: PostgresJsDatabase<TSchema>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: Omit<BetterAuthOptions, 'database'> & { baseURL: string; };
  admin?: { header?: AdminHeaderConfig; };
  routes?: APIInstance;  // DRPC procedures from createPublicAPI()
};
```

Where `APIInstance` is:

```typescript
interface APIInstance<Ctx, TRoutes = Router<Ctx, any>> {
  readonly router: TRoutes;
  readonly ctx: Ctx;
  readonly plugins: Plugin<Ctx>[];
  readonly globalMiddleware: Middleware<Ctx>[];
  readonly eventEmitter?: EventEmitterAny;
}
```

## Default auth values

`defineConfig()` applies the following defaults when not specified by the user:

| Property | Default |
|---|---|
| `admin()` plugin | Always included first |
| `emailAndPassword` | `{ enabled: true }` |
| `session.maxAge` | `60 * 60 * 24 * 7` (7 days) |
| `trustedOrigins` | `[config.auth.baseURL]` |

### Plugin deduplication

Plugins are deduplicated by `id`, keeping the first occurrence. If the user provides an `admin()` plugin, a warning is logged suggesting it be removed, since it is already included by default.

## Usage example

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";

export const config = defineConfig({
  name: "My App",
  database: drizzle({ connection: process.env.DATABASE_URL! }),
  secret: process.env.DEESSE_SECRET!,
  auth: {
    baseURL: "http://localhost:3000",
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    },
  },
  pages: [page({ name: 'Home', content: () => <Dashboard /> })],
  plugins: [myPlugin()],
});
```

## Global storage

`defineConfig()` stores the config in a module-level `globalConfig` variable. This allows `getDeesse()` to be called without passing the config explicitly:

```typescript
import { getDeesse } from "deesse";

const { auth, database } = getDeesse(); // no arguments needed
```

If `getGlobalConfig()` is called before `defineConfig()`, it throws with a clear error message guiding the developer to call `defineConfig()` first.

## Custom API Procedures (routes)

You can extend Deesse with custom DRPC procedures by passing `routes` to defineConfig:

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { publicAPI } from "@/server";  // Your DRPC procedures

export const config = defineConfig({
  database: drizzle({ connection: process.env.DATABASE_URL! }),
  secret: process.env.DEESSE_SECRET!,
  auth: { baseURL: "http://localhost:3000" },
  routes: publicAPI,  // Merged into the route handler
});
```

The route handler then routes:
- `/api/auth/*` → better-auth
- `/api/first-admin` → first-admin creation
- `/api/users/list` → your `t.query()` procedures
- `/api/users/create` → your `t.mutation()` procedures