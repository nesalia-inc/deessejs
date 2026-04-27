# Configuration

DeesseJS uses a three-entrypoint configuration system built on top of [better-auth](https://better-auth.com/) and Drizzle ORM.

## Entry Points

| Function | File | Purpose |
|----------|------|---------|
| `defineConfig()` | [config.md](./config.md) | Define and validate the full Deesse config |
| `getDeesse()` | [server.md](./server.md) | Access the server-side Deesse instance |
| `createClient()` | [client.md](./client.md) | Create a client-side auth client for React |

## Quick Reference

### Define Config

```typescript
// deesse.config.ts
import { defineConfig, drizzle } from "@deessejs/deesse";

export const config = defineConfig({
  name: "My App",
  database: drizzle({ connection: process.env.DATABASE_URL! }),
  secret: process.env.DEESSE_SECRET!,
  auth: {
    baseURL: "http://localhost:3000",
    emailAndPassword: { enabled: true },
  },
  pages: [page({ name: "Home", content: () => <Dashboard /> })],
});
```

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Human-readable app name displayed in the admin dashboard |
| `database` | `PostgresJsDatabase` | Drizzle database instance connected to PostgreSQL |
| `secret` | `string` | Secret key for signing sessions. Use `process.env.DEESSE_SECRET` (generate with `openssl rand -hex 32`) |
| `pages` | `PageTree[]` | Admin page tree defined with `page()` and `section()` DSL |
| `plugins` | `Plugin[]` | Deesse plugins for extending core functionality |
| `admin` | `object` | Admin dashboard configuration |

### `auth` — Authentication config

Type: `Omit<BetterAuthOptions, 'database'> & { baseURL: string; }`

Deesse wraps [better-auth](https://better-auth.com/). The `auth` object accepts all [better-auth options](https://better-auth.com/docs/authentication/email-password) except `database` (handled at the root level).

| Option | Type | Description |
|--------|------|-------------|
| `baseURL` | `string` | **Required.** Your app's origin (e.g. `http://localhost:3000`). Used for OAuth redirects and cookie domain |
| `emailAndPassword` | `object` | Email/password auth. Default: `{ enabled: true }` |
| `session` | `object` | Session behavior. Default: 7-day max age, 1-day update interval |
| `plugins` | `BetterAuthPlugin[]` | better-auth plugins (e.g. OAuth). The `admin()` plugin is included by default |
| `socialProviders` | `object` | OAuth providers (GitHub, Google, etc.) |
| `trustedOrigins` | `string[] \| function` | Additional origins allowed for cross-origin requests |

For the full list of options, see [better-auth documentation](https://better-auth.com/docs/authentication/email-password).

### Access Server Instance

Used in **API routes** and **Server Components** to validate sessions, query the database, and perform any server-side operations.

```typescript
// lib/deesse.ts
import { getDeesse } from "@deessejs/deesse";

export const deesse = await getDeesse();
export const { auth } = deesse;
```

`deesse` exposes:
- `auth` — the better-auth instance (`getSession`, `signIn`, `signOut`, `...`)
- `database` — the Drizzle database driver for querying

Because `getDeesse()` returns a **singleton**, the database pool is created once and reused across all requests. It survives hot module replacement during development.

```typescript
// In an API route
const session = await auth.getSession(request.headers);
if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
```

```typescript
// In a Server Component
const session = await auth.getSession();
if (!session) redirect("/login");
```

### Client-Side Auth

Used to interact with the auth API from any JavaScript environment — not just React. It is a thin HTTP wrapper around better-auth's REST API (`/api/auth/*`).

```typescript
// lib/client.ts
import { createClient } from "@deessejs/deesse";

export const client = createClient({
  auth: { baseURL: "/api/auth" },
});
```

The `baseURL` points to your auth API route. All communication happens over HTTP — no database access from the client.

**Works in:**
- React / Next.js components
- React Native / Expo mobile apps
- CLI tools
- Any JavaScript runtime

```typescript
// React component
const { data, isPending } = client.auth.useSession();

// CLI or mobile — raw API calls via fetch
const session = await client.auth.client.getSession();
```

When used in React, it provides hooks (`useSession`, `useUser`, `signIn`, `signOut`). In non-React environments, call the underlying client methods directly.

| Hook (React) | Raw method | Use case |
|-------------|-----------|----------|
| `useSession()` | `client.auth.getSession()` | Get current session |
| `useUser()` | `client.auth.getUser()` | Get current user profile |
| `signIn.trigger()` | `client.auth.signIn()` | Sign in with email/password or OAuth |
| `signOut.trigger()` | `client.auth.signOut()` | End the current session |

## Architecture

```
deesse.config.ts
    │
    ├── defineConfig() ──────► globalConfig (for getDeesse)
    │
    ├── getDeesse() ─────────► Deesse { auth, database }
    │                              │
    │                              ├── better-auth (via createDeesse)
    │                              └── drizzle-adapter
    │
    └── createClient() ───────► BetterAuthClient (React hooks)
```

## Config Export Convention

Config files **must** use named export:

```typescript
// Correct
export const config = defineConfig({ ... });

// Wrong
export default defineConfig({ ... });
```

### `@deesse-config` Alias

Project templates configure a TypeScript path alias that maps `@deesse-config` to `deesse.config.ts`. This allows importing the config from anywhere in the codebase without relative paths.

```typescript
// Anywhere in the app
import { config } from "@deesse-config";
```

The `client` is created separately in `lib/client.ts` and imported directly:

```typescript
import { client } from "@/lib/client";
```

The alias is set up in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@deesse-config": ["./src/deesse.config.ts"]
    }
  }
}
```

This pattern keeps the config centralized and ensures type-safe imports for the config object.
