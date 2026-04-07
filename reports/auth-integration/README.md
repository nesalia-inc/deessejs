# Better-Auth Integration Report

## Overview

This document describes how better-auth integrates with DeesseJS. The integration is **first-class and opinionated** - DeesseJS is built to work specifically with better-auth as its authentication solution.

## Design Principles

### Functional-First Architecture

DeesseJS follows functional programming principles:

| Principle | Implementation |
|-----------|----------------|
| No classes | Factory functions (`createDeesse`, `createClient`) |
| No globals | Dependency injection, module-scoped caching |
| Controlled effects | Effects represented as data, interpreted at boundaries |
| Railway-Oriented Programming | `Result<T, E>` type for all fallible operations |

### File Organization

Constants and types each have their own dedicated file, grouped by domain:

```
src/
├── session/
│   ├── types.ts       # SessionData, SessionToken, SessionError
│   ├── constants.ts   # DEFAULT_SESSION_TTL, SESSION_TOKEN_LENGTH
│   └── index.ts
├── auth/
│   ├── types.ts       # User, Credentials, AuthError
│   ├── constants.ts   # MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION
│   └── index.ts
└── config/
    ├── types.ts       # DeesseConfig, PluginConfig
    ├── constants.ts
    └── index.ts
```

**Rationale:** Domain first, then category. Easy to find, easy to maintain, easy to import.

---

## Architecture

```
User's project
├── deesse.config.ts     ← Config with auth.baseURL (NO secrets)
├── lib/
│   └── deesse.ts        ← Creates deesse + client (wiring layer)
├── middleware.ts         ← Auth protection via deesse
├── app/
│   └── api/auth/[...slug]/route.ts
└── app/(deesse)/admin/
    ├── page.tsx         ← Uses deesse (RSC)
    └── layout.tsx       ← Uses client (Client Components)
```

### The Two-Factory Pattern

DeesseJS uses two separate factory functions instead of a single config object:

| Factory | Purpose | Location |
|---------|---------|----------|
| `createDeesse(config)` | Server-side auth instance | `@deessejs/next/server` |
| `createClient(options)` | Client-safe session/hooks | `@deessejs/next/client` |

**Why not single config?**

A single `defineConfig` containing server-only values (database, secret) risks bundle leakage if imported in Client Components. Next.js webpack statically resolves imports, so even `"use client"` cannot prevent secrets from being bundled if any import chain reaches `deesse.config.ts`.

The split pattern provides **defense in depth**:
1. Module boundary: `deesse` never imported in client files
2. Type boundary: `createClient()` accepts only client-safe options
3. ESLint boundary: Rule blocks `deesse.config` import in client files

---

## Instance Management (No Globals)

### The Problem

Payload CMS uses `global._payload` singleton which violates DeesseJS principles. Creating fresh instances per request is principled but expensive (database reconnection overhead).

### The Solution: Module-Scoped Cache

```typescript
// packages/deesse/src/factory.ts
type CacheEntry<T> = {
  instance: T | null;
  promise: Promise<T> | null;
};

function createFactory<T, Options>(
  createInstance: (options: Options) => Promise<T>
) {
  const cache = new Map<string, CacheEntry<T>>();

  return {
    async get(key: string, options: Options): Promise<T> {
      const cached = cache.get(key);

      if (cached?.instance) return cached.instance;
      if (cached?.promise) return cached.promise;

      const promise = createInstance(options);
      cache.set(key, { instance: null, promise });

      try {
        const instance = await promise;
        cache.set(key, { instance, promise: null });
        return instance;
      } catch {
        cache.delete(key);
        throw;
      }
    },

    clear(): void {
      cache.clear();
    }
  };
}
```

**Why this is principled:**

| Principle | How It's Followed |
|-----------|-------------------|
| No globals | Cache is module-scoped, not on `global` object |
| Explicit deps | Factory must be explicitly imported |
| Testability | `clear()` available for testing |
| Predictable | Same key = same cached instance |

### Scope: What Gets Cached

| Resource | Scope | Rationale |
|----------|-------|-----------|
| Auth instance | Application | Stateless coordinator |
| Database pool | Application | Connection pooling is the point |
| Session data | Per-request | User-specific, security-sensitive |

---

## Config Type

**File:** `packages/deesse/src/config/define.ts`

```typescript
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PageTree } from "./page";
import type { Plugin } from "./plugin";

export type Config = {
  name?: string;
  database: PostgresJsDatabase;
  plugins?: Plugin[];
  pages?: PageTree[];
  auth: {
    /** URL of the deployed app, used by client */
    baseURL: string;
    /** Path to the auth API route */
    apiPath?: string;
  };
};

export function defineConfig(config: Config): Config {
  return config;
}
```

**Important:** `config.database` is the **single source of truth**. All components (auth, pages) must use this instance.

---

## Secret Management

**Environment Variable:** `BETTER_AUTH_SECRET`

```bash
# .env
BETTER_AUTH_SECRET=your-secret-here
```

DeesseJS uses better-auth's native secret. No separate `DEESSE_SECRET`.

---

## Factory Functions

### createDeesse (Server)

**File:** `packages/deesse/src/server.ts`

```typescript
import type { Auth } from "better-auth";

export type Deesse = {
  auth: Auth;
  /**
   * Check if any admin exists in the database.
   */
  hasAdmin: () => Promise<boolean>;
};

export function createDeesse(config: Config): Deesse {
  const auth = betterAuth({
    database: drizzleAdapter(config.database, { provider: "pg" }),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true },
    plugins: [adminPlugin()],
  });

  return {
    auth,
    async hasAdmin(): Promise<boolean> {
      const users = await auth.api.admin.listUsers({});
      return users.users.some((u) => u.role === "admin");
    },
  };
}
```

### createClient (Client)

**File:** `packages/deesse/src/client.ts`

```typescript
import type { BetterAuthClient } from "better-auth/react";

export type Client = Omit<
  BetterAuthClient,
  | "$store"
  | "$fetch"
>;

export function createClient(options: {
  baseURL: string;
  apiPath?: string;
}): Client {
  const authClient = createAuthClient({
    baseURL: options.baseURL,
    basePath: options.apiPath,
  });

  return {
    useSession: authClient.useSession,
    signIn: authClient.signIn,
    signOut: authClient.signOut,
    signUp: authClient.signUp,
  };
}
```

---

## Wiring Layer

**File:** `lib/deesse.ts` (User project)

```typescript
import { createDeesse } from "@deessejs/next/server";
import { createClient } from "@deessejs/next/client";
import { config } from "../deesse.config";

/** Server-side instance - NEVER import in Client Components */
export const deesse = createDeesse(config);

/** Client-safe instance - OK to import in Client Components */
export const client = createClient({
  baseURL: config.auth.baseURL,
  apiPath: config.auth.apiPath,
});
```

---

## Railway-Oriented Programming (ROP)

DeesseJS uses `@deessejs/core` for type-safe error handling. See [deessejs-core skill](./.claude/skills/deessejs-core) for detailed documentation.

### Result Type

Import from `@deessejs/core`:

```typescript
import { ok, err, map, flatMap, mapErr } from '@deessejs/core';
```

### AsyncResult for Async Operations

```typescript
import { fromPromise, okAsync, errAsync, flatMap, map, mapErr } from '@deessejs/core';
```

---

## Auth Error Types

**File:** `auth/types.ts`

```typescript
export type AuthError =
  // Validation
  | { type: "INVALID_EMAIL" }
  | { type: "PASSWORD_TOO_SHORT"; minLength: number }
  | { type: "MISSING_FIELD"; field: string }
  // Authentication
  | { type: "USER_NOT_FOUND" }
  | { type: "INVALID_CREDENTIALS" }
  | { type: "INVALID_PASSWORD" }
  // Session
  | { type: "SESSION_EXPIRED" }
  | { type: "TOKEN_EXPIRED" }
  // Account
  | { type: "EMAIL_NOT_VERIFIED" }
  | { type: "ACCOUNT_LOCKED"; until?: Date }
  | { type: "USER_ALREADY_EXISTS" }
  // Authorization
  | { type: "FORBIDDEN" }
  | { type: "INSUFFICIENT_ROLE"; required: string };
```

### Wrapping Better-Auth Errors

Better-auth server-side throws exceptions, but client-side returns `{ error, data }`. The integration layer must bridge these:

```typescript
// auth/result.ts
import { ok, err } from '@deessejs/core';
import type { Result } from '@deessejs/core';
import { APIError } from "@better-auth/core/error";

const AUTH_ERROR_MAP: Record<string, AuthError["type"]> = {
  INVALID_EMAIL_OR_PASSWORD: "INVALID_CREDENTIALS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
};

export const withAuthResult = <T>(
  fn: () => Promise<T>
): Promise<Result<T, AuthError>> => async () => {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof APIError) {
      return err({
        type: AUTH_ERROR_MAP[err.code] ?? "FORBIDDEN",
        message: err.message,
      });
    }
    throw err;
  }
};
```

---

## ROP in Auth Flows

Using `@deessejs/core` for type-safe error handling:

```typescript
import { ok, err, map, flatMap, flatMapAsync, fromPromise, pipe } from '@deessejs/core';
```

### Sign-In Flow

```typescript
const validateCredentials = (
  email: string,
  password: string
): Result<Credentials, AuthError> => {
  if (!email.includes("@")) {
    return err({ type: "INVALID_EMAIL" });
  }
  if (password.length < 8) {
    return err({ type: "PASSWORD_TOO_SHORT", minLength: 8 });
  }
  return ok({ email, password });
};

const authenticate = (
  credentials: Credentials
): Promise<Result<Session, AuthError>> =>
  flatMapAsync(
    ok(credentials),
    async ({ email, password }) => {
      const result = await client.signIn.email({ email, password });
      if (result.error) {
        return err(mapBetterAuthError(result.error));
      }
      return ok(result.data);
    }
  );

const signIn = (email: string, password: string) =>
  pipe(
    ok({ email, password }),
    flatMap(validateCredentials),
    flatMapAsync(authenticate)
  );
```

### Middleware Flow

Middleware uses direct better-auth calls (performance-critical path):

```typescript
import { ok, err, flatMap } from '@deessejs/core';

export async function middleware(
  request: NextRequest
): Promise<Result<Response, AuthError>> {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) {
    return ok(NextResponse.next());
  }

  // Setup mode detection
  const hasAdmin = await deesse.hasAdmin();
  if (!hasAdmin && pathname !== "/admin/setup") {
    return ok(NextResponse.redirect(new URL("/admin/setup", request.url)));
  }

  // Session check
  const session = await deesse.auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return err({ type: "SESSION_EXPIRED" });
  }

  if (session.user.role !== "admin") {
    return err({ type: "INSUFFICIENT_ROLE", required: "admin" });
  }

  return ok(NextResponse.next());
}
```

---

## API Route Handler

```typescript
// app/api/auth/[...slug]/route.ts
import { deesse } from "@/lib/deesse";
import { toNextJsHandler } from "better-auth/next-js";

const { POST, GET } = toNextJsHandler(deesse.auth);
export { POST, GET };
```

---

## Middleware (Primary Auth Guard)

**File:** `middleware.ts`

Middleware handles auth protection BEFORE any page renders. This prevents Flash of Unauthenticated Content (FOUC).

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deesse } from "./lib/deesse";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const hasAdmin = await deesse.hasAdmin();

  if (!hasAdmin && pathname !== "/admin/setup") {
    return NextResponse.redirect(new URL("/admin/setup", request.url));
  }

  if (hasAdmin && pathname === "/admin/setup") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const session = await deesse.auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

---

## Login Page

**File:** `packages/next/src/pages/login-page.tsx`

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { client } from "@/lib/deesse";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin";
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await client.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Sign In</h1>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-md border p-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full rounded-md border p-2"
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-black p-2 text-white"
        >
          {isPending ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
```

---

## Setup Page

**File:** `packages/next/src/pages/setup-page.tsx`

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/deesse";

export function SetupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await client.signUp.email({ email, password, name });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Create Admin Account</h1>
        <p className="text-sm text-gray-500">
          No admin exists yet. Create your admin account to continue.
        </p>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
          className="w-full rounded-md border p-2"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-md border p-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={8}
          className="w-full rounded-md border p-2"
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-black p-2 text-white"
        >
          {isPending ? "Creating..." : "Create Admin"}
        </button>
      </form>
    </div>
  );
}
```

---

## CLI Commands

```bash
# Generate schema
npx deesse db:generate

# Apply migrations
npx deesse db:migrate

# Push schema (dev)
npx deesse db:push

# Create admin user (raw SQL, bypasses auth API)
npx deesse admin:create --email admin@example.com --name Admin
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `packages/deesse/src/config/define.ts` | Config with `auth.baseURL` |
| `packages/deesse/src/server.ts` | `createDeesse()` factory |
| `packages/deesse/src/client.ts` | `createClient()` factory |
| `packages/deesse/src/factory.ts` | Module-scoped cache |
| `packages/deesse/src/auth/types.ts` | AuthError discriminated union |
| `packages/deesse/src/auth/constants.ts` | Auth constants |
| `packages/next/src/pages/login-page.tsx` | Login page |
| `packages/next/src/pages/setup-page.tsx` | Setup page |
| `lib/deesse.ts` | Wiring: `deesse` + `client` |
| `middleware.ts` | Auth protection |
| `app/api/auth/[...slug]/route.ts` | Auth API handler |

---

## Key Principles

### 1. Middleware-First Security

Auth protection happens in middleware, not components. This prevents FOUC.

### 2. Runtime Setup Mode

No build-time DB check. If no admin exists, the setup page appears at runtime.

### 3. Server/Client Separation

- `deesse` (server): secrets, database, session validation
- `client` (client): session hooks, signIn/signOut/signUp

### 4. ROP for Error Handling

All fallible operations return `Result<T, E>`. Errors are discriminated unions.

### 5. Functional-First

- Factory functions, not classes
- No global state (module-scoped cache)
- Controlled effects via Result type

### 6. Single Database Instance

`config.database` is the single source of truth.

---

## Security Considerations

### Bundle Leakage Prevention

**Problem:** If `deesse.config.ts` is imported in Client Components, server-only values leak.

**Solution:** Split factories + ESLint rule:

```javascript
// eslint.config.js
{
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [{
          group: ["@/deesse.config"],
          message: "Import from @/lib/deesse instead",
        }],
      },
    ],
  },
}
```

### FOUC Prevention

Middleware redirects before any content renders.

### Build-Time DB Access

Runtime check via `deesse.hasAdmin()` in middleware. No build-time dependency.

---

## Comparison with Payload CMS

| Aspect | Payload | DeesseJS |
|--------|---------|----------|
| Instance | `getPayload()` singleton on `global._payload` | `createDeesse()` with module-scoped cache |
| Error handling | Exceptions | `Result<T, E>` with ROP |
| Classes | `BasePayload` class | Factory functions only |
| Global state | Yes (`global`) | No (module-scoped) |
| Effects | Embedded | Controlled via `Result` type |
