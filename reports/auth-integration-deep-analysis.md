# Auth Integration Deep Analysis

**Date**: 2026-04-16
**Author**: Claude Code (Deep Analysis Skill)
**Branch**: refactor/simplify-root-page

---

## Executive Summary

This document analyzes how to properly integrate `better-auth` with DeesseJS. The analysis was conducted through 4 specialized sub-agents and web research, covering schema integration, API routes, client session management, and plugin architecture.

**Key Finding**: DeesseJS already has a working better-auth integration, but it has significant architectural limitations. The schema is correctly aligned but not explicitly passed to the adapter. The plugin system exists but is unused.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pillar 1: Schema & Adapter Integration](#2-pillar-1--schema--adapter-integration)
3. [Pillar 2: API Route Integration](#3-pillar-2--api-route-integration)
4. [Pillar 3: Client Session Management](#4-pillar-3--client-session-management)
5. [Pillar 4: Plugin Architecture](#5-pillar-4--plugin-architecture)
6. [Implementation Plan](#6-implementation-plan)
7. [Files Impacted](#7-files-impacted)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User App                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │  RootLayout  │   │ Header + Auth │   │  Route Handlers     │ │
│  │  (providers) │   │  Buttons      │   │  /api/auth/[...all] │ │
│  └──────────────┘   └──────────────┘   └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     packages/deesse                               │
│                                                                  │
│  defineConfig()         createDeesse()        createClient()   │
│  ┌─────────────┐        ┌─────────────┐       ┌─────────────┐ │
│  │ Config      │──────▶ │ Deesse {    │       │ DeesseClient │ │
│  │ - database  │        │   auth      │       │ - useSession │ │
│  │ - secret    │        │   database  │       │ - signIn     │ │
│  │ - auth      │        │ }           │       │ - signOut    │ │
│  │ - plugins ──┼────────│──────────────│       └─────────────┘ │
│  └─────────────┘        │              │                        │
│                         │ better-auth  │                        │
│                         │ + admin()   │                        │
│                         │ + plugins   │                        │
│                         └─────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Database (PostgreSQL)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │    user      │  │   session    │  │   account     │        │
│  │  (auth+app) │  │  (sessions)  │  │  (OAuth)     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Pillar 1: Schema & Adapter Integration

### Current State

DeesseJS uses a **split-brain schema pattern**:
- **Drizzle schema** in `src/db/schema/auth-schema.ts` - for application queries
- **better-auth schema** - auto-generated from the same Drizzle schema via drizzle-adapter

### Required Tables

| Table | Required Fields | Notes |
|-------|-----------------|-------|
| `user` | id, name, email, emailVerified, createdAt, updatedAt | + admin plugin: role, banned, banReason, banExpires |
| `session` | id, userId, expiresAt, token, createdAt, updatedAt | + admin plugin: impersonatedBy |
| `account` | id, accountId, providerId, userId, accessToken, refreshToken, etc. | OAuth accounts |
| `verification` | id, identifier, value, expiresAt, createdAt, updatedAt | Email verification, password reset |

### DrizzleAdapterConfig Options

```typescript
drizzleAdapter(config.database, {
  provider: "pg",        // "pg" | "mysql" | "sqlite"
  schema?: Record<string, any>,  // NOT passed currently - ISSUE
  usePlural?: boolean,          // default: false (singular table names)
  camelCase?: boolean,          // default: false (snake_case columns)
  transaction?: boolean,        // default: false
})
```

### Issue Found

**Schema not explicitly passed** to `drizzleAdapter` in `packages/deesse/src/server.ts`:

```typescript
const auth = betterAuth({
  database: drizzleAdapter(config.database, {
    provider: "pg",
    // schema is NOT passed!
  }),
  // ...
});
```

This falls back to `db._.fullSchema`, which works only if the database was created with the schema explicitly passed.

### Schema Alignment Status

| Table | DeesseJS Field | better-auth Expected | Match? |
|-------|----------------|---------------------|--------|
| user | All fields present | All required fields | ✅ Yes |
| session | All fields present | All required fields | ✅ Yes |
| account | All fields present | All required fields | ✅ Yes |
| verification | All fields present | All required fields | ✅ Yes |

**Conclusion**: Schema is fully aligned. Only fix needed: pass schema explicitly.

---

## 3. Pillar 2: API Route Integration

### DeesseJS Route Pattern

DeesseJS uses a catch-all slug route at `app/(deesse)/api/[...slug]/route.ts`:

```typescript
// app/(deesse)/api/[...slug]/route.ts
import { deesseAuth } from "@/lib/deesse";
import { REST_GET, REST_POST } from "@deessejs/next/routes";

export const GET = REST_GET({ auth: deesseAuth });
export const POST = REST_POST({ auth: deesseAuth });
```

This single route handles all better-auth endpoints via the `[...slug]` catch-all:
- `GET /api/sign-in/email` - sign in page
- `POST /api/sign-in/email` - email sign in action
- `POST /api/sign-up/email` - email sign up action
- `POST /api/sign-out` - sign out action
- `GET /api/get-session` - get current session
- `POST /api/callback/[provider]` - OAuth callbacks
- `POST /api/first-admin` - DeesseJS admin setup (intercepted)
- `GET|POST /api/admin/*` - admin endpoints (13 total)

### DeesseJS REST Handlers

The `REST_GET` and `REST_POST` functions from `@deessejs/next/routes` are DeesseJS wrappers around `toNextJsHandler` from `better-auth/next-js`:

```typescript
// packages/next/src/api/rest/index.ts

export function REST_GET(config) {
  return toNextJsHandler(config.auth).GET;
}

export function REST_POST(config) {
  const betterAuthHandler = toNextJsHandler(config.auth).POST;
  return async (request: Request) => {
    const pathname = new URL(request.url).pathname;
    // DeesseJS intercepts /api/first-admin
    if (pathname === "/api/first-admin" || pathname.endsWith("/first-admin")) {
      return handleFirstAdmin(config.auth, request);
    }
    return betterAuthHandler(request);
  };
}
```

**Key DeesseJS interception**: `REST_POST` intercepts `/api/first-admin` before delegating to better-auth. This endpoint creates the initial admin user and is only available in development mode.

### First-Admin Handler

```typescript
// packages/next/src/api/rest/admin/first-admin.ts
export async function handleFirstAdmin(auth: Auth, request: Request): Promise<NextResponse> {
  if (process.env['NODE_ENV'] === "production") {
    return NextResponse.json({ message: "..." }, { status: 403 });
  }
  const { name, email, password } = await request.json();
  const result = await createFirstAdmin(auth, { name, email, password });
  if (result.success) {
    return NextResponse.json({ message: "Admin user created", userId: result.userId }, { status: 201 });
  }
  return NextResponse.json({ code: result.code, message: result.message }, { status: 400 });
}
```

### Deesse Singleton (`lib/deesse.ts`)

The `deesseAuth` import comes from a singleton created in `src/lib/deesse.ts`:

```typescript
// src/lib/deesse.ts
import { getDeesse } from "@deessejs/next";
import { deesseConfig } from "@/deesse.config";

const deesse = await getDeesse(deesseConfig);
export const deesseAuth = deesse.auth;
```

This leverages the `getDeesse()` function which caches the Deesse instance globally to survive HMR.

### nextCookies Plugin

**Critical**: The `nextCookies()` plugin from `better-auth/next-js` must be the **last plugin** in the plugins array. It handles cookie synchronization between better-auth and Next.js.

In DeesseJS, plugins are configured via `defineConfig()` and automatically include `admin()`. The `nextCookies()` plugin should be appended at the end:

```typescript
// packages/deesse/src/config/define.ts
const authPlugins: BetterAuthPlugin[] = [admin() /*, nextCookies() should be added at end */];
```

Note: `nextCookies()` is currently not in the default plugin list - this is a gap that needs addressing.

### Cookie Configuration

| Setting | Default | Notes |
|---------|---------|-------|
| `baseURL` | Required | Application URL (e.g., `http://localhost:3000`) |
| `trustedOrigins` | `[baseURL]` | Origins allowed to make API requests |
| `advanced.cookiePrefix` | `"better-auth"` | Cookie name prefix |

Note: In DeesseJS, `baseURL` and `trustedOrigins` are set in `deesse.config.ts` under `auth.baseURL`.

---

## 4. Pillar 3: Client Session Management

### Creating the Client (DeesseJS Way)

DeesseJS provides a `createClient` function that wraps `better-auth/react`'s `createAuthClient`:

```typescript
// lib/auth-client.ts (or lib/deesse-client.ts)
import { createClient } from "deesse";

export const client = createClient({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3000",
    sessionOptions: {
      refetchInterval: 0,           // Disable polling
      refetchOnWindowFocus: true,   // Refetch when tab becomes visible
      refetchWhenOffline: false,
    },
  },
});
```

The `createClient` function from `packages/deesse/src/client.ts` is a thin wrapper:

```typescript
export function createClient(options: DeesseClientOptions): DeesseClient {
  const auth = createAuthClient(options.auth) as unknown as AuthClient<BetterAuthClientOptions>;
  return { auth };
}
```

### useSession Hook

```tsx
"use client";

import { client } from "@/lib/auth-client";

export function UserProfile() {
  const { data: session, isPending, error } = client.auth.useSession();

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!session) return <div>Not authenticated</div>;

  return (
    <div>
      <p>Welcome, {session.user.name}</p>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

Note: The `client.auth.useSession()` call uses the `AuthClient` interface from `better-auth`, proxied through DeesseJS's `DeesseClient.auth`.

```tsx
"use client";

import { authClient } from "@/lib/auth-client";

export function UserProfile() {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!session) return <div>Not authenticated</div>;

  return (
    <div>
      <p>Welcome, {session.user.name}</p>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

### Session Refresh Mechanisms

| Mechanism | Description |
|-----------|-------------|
| Polling | `refetchInterval` seconds (set to 0 to disable) |
| BroadcastChannel | Cross-tab sync via localStorage storage events |
| Focus Refetch | Triggers on `visibilitychange`, 5-second rate limit |
| Online Refetch | Triggers when `navigator.onLine` changes |

### Route Protection

**Server Component (Recommended)**:
```typescript
// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return <h1>Welcome {session.user.name}</h1>;
}
```

### Warning

> **Do NOT use `useSession` in `layout.tsx`** - This degrades performance. Use `auth.api.getSession()` in Server Components instead.

---

## 5. Pillar 4: Plugin Architecture

### Current State

The current `Plugin` type in `packages/deesse/src/config/plugin.ts` is:

```typescript
export type Plugin = {
  name: string;
};
```

**Critical Limitations**:
1. `Plugin` type only has a `name` field - no way to know what a plugin exposes
2. `Config.plugins` is **never used** in `createDeesse()` - better-auth plugins are in `InternalConfig.auth.plugins`
3. `admin()` is **hardcoded** in `defineConfig()` - cannot be removed or configured

### Proposed DeesseAuthPlugin Type

```typescript
export type DeesseAuthPlugin = {
  id: string;
  version?: string;

  /** Server-side BetterAuthPlugin */
  serverPlugin: BetterAuthPlugin;

  /** Client-side plugin for session management */
  clientPlugin?: BetterAuthClientPlugin;

  /** Zod schema for plugin config validation */
  configSchema?: ZodSchema<any>;
};
```

### How Plugins Should Work

```
User Config                         defineConfig()                    getDeesse()
─────────────────────────────────    ────────────────────    ──────────────────────────────────────
config = {
  plugins: [                         InternalConfig = {      instance = createDeesse(config)
    authPlugin({ name: 'admin' })      plugins: [                              │
  ],                                   BetterAuthPlugin    ───────────────►  │
  auth: {                              + clientPlugin ───────────────────►  │ Combines all
    baseURL: '...'                     ...                                       | clientPlugins
  }                                },                                           | into one
}                                 auth: {                                        | DeesseClient
                                     BetterAuthPlugin[]                           |
                                   }  ───────────────────────────────────────────┘
                                 }
```

### Recommended File Structure

```
packages/
  deesse-auth/                    # New @deessejs/auth package
    src/
      index.ts                   # Main exports
      types.ts                   # DeesseAuthPlugin, AuthPluginConfig
      plugin.ts                  # Plugin factory
      client.ts                  # Client plugins
      schema.ts                  # Database schemas

  deesse/
    src/
      config/
        plugin.ts               # Rewrite: DeesseAuthPlugin type
        define.ts              # Modify: wire plugins properly
      server.ts                 # Modify: pass schema to drizzleAdapter
```

---

## 6. Implementation Plan

### Phase 1: Stabilize Current Integration

| Step | Action | Priority |
|------|--------|----------|
| 1.1 | Pass schema explicitly to `drizzleAdapter` in `server.ts` | P0 |
| 1.2 | Add `nextCookies()` plugin as last plugin | P0 |
| 1.3 | Expose admin plugin options via `defineConfig()` | P1 |

### Phase 2: Route Handler Integration

| Step | Action | Priority |
|------|--------|----------|
| 2.1 | Create `app/(deesse)/api/[...slug]/route.ts` in templates | P1 |
| 2.2 | Create `src/lib/deesse.ts` singleton | P1 |
| 2.3 | Create `src/lib/deesse-client.ts` for client auth | P1 |
| 2.4 | Create `src/components/providers/auth-provider.tsx` | P2 |
| 2.5 | Create `src/hooks/use-session.ts` | P2 |

### Phase 3: Plugin System Rewrite

| Step | Action | Priority |
|------|--------|----------|
| 3.1 | Rewrite `DeesseAuthPlugin` type | P2 |
| 3.2 | Make `Config.plugins` functional | P2 |
| 3.3 | Add plugin schema aggregation | P3 |

---

## 7. Files Impacted

### packages/deesse/src/

| File | Action | Description |
|------|--------|-------------|
| `config/plugin.ts` | Rewrite | Replace empty `Plugin` with `DeesseAuthPlugin` |
| `config/define.ts` | Modify | Wire `Config.plugins` to `InternalConfig.auth.plugins`, extract admin options |
| `server.ts` | Modify | Pass schema explicitly to `drizzleAdapter`, add `nextCookies()` as last plugin |
| `client.ts` | Modify | Accept and merge client plugins |

### templates/default/src/

| File | Action | Description |
|------|--------|-------------|
| `app/(deesse)/api/[...slug]/route.ts` | Create | Route handler using REST_GET/POST from @deessejs/next |
| `lib/deesse.ts` | Create | Server-side singleton using `getDeesse()` from deesse |
| `lib/deesse-client.ts` | Create | Client-side auth singleton using `createClient()` from deesse |
| `components/providers/auth-provider.tsx` | Create | Auth context provider |
| `hooks/use-session.ts` | Create | Session hook |

### templates/without-admin/src/

Same as default template, minus admin-specific first-admin endpoint.

---

## Sources

- [Better Auth Documentation](https://better-auth.com/docs)
- [Better Auth Next.js Integration](https://better-auth.com/docs/integrations/next)
- [Better Auth Cookies](https://better-auth.com/docs/concepts/cookies)
- [Better Auth Client](https://better-auth.com/docs/concepts/client)
- [Better Auth API](https://better-auth.com/docs/concepts/api)
- [Fastify Plugins Documentation](https://fastify.dev/docs/latest/Reference/Plugins/)

---

## Sub-Agents

| Agent ID | Pillar | Status |
|----------|--------|--------|
| a5aa4de | Schema & Adapter Integration | ✅ Complete |
| ae1db49 | API Route Integration | ✅ Complete |
| adac4cb | Client Session Management | ✅ Complete |
| a68f47d | Plugin Architecture | ✅ Complete |

---

**Document Version**: 1.1
**Status**: Awaiting implementation approval
**Last Updated**: 2026-04-17 (Pillar 2 revised to reflect DeesseJS wrapper patterns)
