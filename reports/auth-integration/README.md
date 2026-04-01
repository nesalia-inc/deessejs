# Better-Auth Integration Report

## Overview

This document describes how better-auth integrates with DeesseJS. The integration is **first-class and opinionated** - DeesseJS is built to work specifically with better-auth as its authentication solution.

## Architecture

```
User's project
├── deesse.config.ts     ← Pure serializable config (no functions)
├── lib/
│   └── deesse.ts        ← Wiring: creates deesseServer + deesseClient
├── auth.ts               ← betterAuth() instance + createAuthClient()
├── middleware.ts         ← Auth protection via deesseServer
└── app/
    └── (deesse)/
        └── admin/
            ├── layout.tsx    ← Uses deesseClient
            ├── page.tsx      ← Uses deesseServer (RSC)
            ├── login/
            │   └── page.tsx ← Login page
            └── setup/
                └── page.tsx ← First-time admin setup
```

## Key Changes from Previous Version

1. **No "Agnosticism"** - DeesseJS commits to better-auth as the auth provider
2. **Server/Client Split** - `deesseServer` for RSCs/Actions, `deesseClient` for Client Components
3. **Runtime Setup Mode** - No build-time DB check; setup page appears when no admin exists
4. **Middleware Protection** - Auth checks happen in middleware (no FOUC)
5. **BETTER_AUTH_SECRET** - Uses better-auth's native secret, not a separate one
6. **Zero-Dep Login** - Simple React state, no TanStack Form dependency

---

## Implementation Plan

### 1. Config Type (Pure Definition)

**File:** `packages/deesse/src/config/define.ts`

The config contains only serializable values (strings, objects). No functions, no class instances - **except** `database` which is a Drizzle instance.

```typescript
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

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
```

**Important:** `config.database` is the **single source of truth** for the database instance. All components (auth, pages, etc.) must use this instance, not create their own.

**Note:** The config does NOT contain the auth instance itself. That is created in `lib/deesse.ts`.

### 2. Secret Management

**Environment Variable:** `BETTER_AUTH_SECRET`

DeesseJS uses better-auth's native secret. No separate `DEESSE_SECRET`.

```bash
# .env
BETTER_AUTH_SECRET=your-secret-here
```

If not set in production, better-auth throws an error at startup.

### 3. Auth Creation in lib/deesse.ts

The better-auth instance is created in `lib/deesse.ts`, not in a separate `auth.ts`. This ensures `config.database` is used as the single DB source.

The auth instance is exported via `deesseServer.auth` for use in middleware and API routes.

**API route** (`app/api/auth/[...slug]/route.ts`):

```typescript
import { deesseServer } from "@/lib/deesse";
import { toNextJsHandler } from "better-auth/next-js";

const { POST, GET } = toNextJsHandler(deesseServer.auth);

export { POST, GET };
```

### 4. Server/Client Wiring

**File:** `lib/deesse.ts`

This file creates the server and client instances. It wires `config.database` to better-auth. It is NOT part of the config.

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/drizzle-adapter";
import { adminPlugin } from "better-auth/admin";
import { createDeesseServer } from "@deessejs/next/server";
import { createDeesseClient } from "@deessejs/next/client";
import { config } from "../deesse.config";

/** Creates better-auth instance using config.database (single source of truth) */
function createAuth() {
  return betterAuth({
    database: drizzleAdapter(config.database, { provider: "pg" }),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true },
    plugins: [adminPlugin()],
  });
}

/** Used in Server Components, Actions, API routes, Middleware */
export const deesseServer = createDeesseServer(createAuth());

/** Used in Client Components */
export const deesseClient = createDeesseClient({
  auth: deesseServer.auth,
  baseURL: config.auth.baseURL,
});
```

**Important:** `config.database` is passed to `drizzleAdapter()`. The auth instance uses the **same database instance** as the rest of the application. No separate DB connection.

**Server instance** (`packages/next/src/server.ts`):

```typescript
import type { Auth } from "better-auth";

export function createDeesseServer(auth: Auth) {
  return {
    auth,
    api: auth,
    /**
     * Check if any admin exists in the database.
     * Used by middleware for setup mode detection.
     */
    async hasAdmin(): Promise<boolean> {
      const users = await auth.api.admin.listUsers({});
      return users.users.some((u) => u.role === "admin");
    },
  };
}
```

**Client instance** (`packages/next/src/client.ts`):

```typescript
import type { BetterAuthClient } from "better-auth/react";

export function createDeesseClient(options: {
  authClient: BetterAuthClient;
  baseURL: string;
}) {
  return {
    ...options.authClient,
    useSession: options.authClient.useSession,
    signIn: options.authClient.signIn,
    signOut: options.authClient.signOut,
  };
}
```

### 5. API Route Handler

See Section 3 for the API route handler implementation.

### 6. DeesseJS Config

**File:** `deesse.config.ts`

```typescript
import { defineConfig } from "@deessejs/core";

export const config = defineConfig({
  name: "My App",
  database: drizzle(...),
  auth: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    apiPath: "/api/auth",
  },
  pages: [
    // ... page tree
  ],
});
```

### 7. Middleware (Primary Auth Guard)

**File:** `middleware.ts` (project root)

Middleware handles auth protection BEFORE any page renders. This prevents Flash of Unauthenticated Content (FOUC).

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deesseServer } from "./lib/deesse";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only protect /admin/* routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Check if setup mode is needed (no admin exists)
  const hasAdmin = await deesseServer.hasAdmin();

  if (!hasAdmin && pathname !== "/admin/setup") {
    return NextResponse.redirect(new URL("/admin/setup", request.url));
  }

  // If trying to access setup when admin exists, redirect to login
  if (hasAdmin && pathname === "/admin/setup") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Public routes - allow
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Check session
  const session = await deesseServer.auth.api.getSession({
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

### 8. AdminPage Component (UI Guard)

The component is a secondary guard for UI purposes only. Real security is in middleware.

**File:** `packages/next/src/components/admin-page.tsx`

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { deesseClient } from "@/lib/deesse";

interface AdminPageProps {
  children: React.ReactNode;
}

export function AdminPage({ children }: AdminPageProps) {
  const router = useRouter();
  const { data: session, isPending } = deesseClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/admin/login");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null; // Middleware will redirect
  }

  return <>{children}</>;
}
```

### 9. RootLayout

**File:** `packages/next/src/components/root-layout.tsx`

```typescript
import type { Config } from "deesse";
import { toSidebarItems } from "../lib/to-sidebar-items";
import { AdminShell } from "./admin-shell";

export function RootLayout({
  config,
  children,
}: {
  config: Config;
  children: React.ReactNode;
}) {
  const items = toSidebarItems(config.pages ?? []);

  return (
    <AdminShell name={config.name} items={items}>
      {children}
    </AdminShell>
  );
}
```

### 10. Native Login Page

Simple React state, no external form library.

**File:** `packages/next/src/pages/login-page.tsx`

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deesseClient } from "@/lib/deesse";

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
      const { error } = await deesseClient.signIn.email({
        email,
        password,
      });

      if (error) {
        setError(error.message);
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

### 11. Setup Page (First Admin)

When no admin exists, this page allows creating the first admin.

**File:** `packages/next/src/pages/setup-page.tsx`

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deesseClient } from "@/lib/deesse";

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
      const { error } = await deesseClient.signUp.email({
        email,
        password,
        name,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // After signup, redirect to admin
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

### 12. CLI Commands

**File:** `packages/cli/src/commands/`

```bash
# Generate schema
npx deesse generate

# Apply migrations
npx deesse migrate

# Create admin user (bypasses auth API, uses raw SQL)
npx deesse admin:create --email admin@example.com --name Admin
```

**admin:create command** (`packages/cli/src/commands/admin-create.ts`):

Uses raw SQL to create admin, bypassing the auth API (in case it's misconfigured).

```typescript
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { hash } from "bcrypt";

export async function adminCreate(email: string, name: string) {
  const password = await promptSecret("Password:");

  // Insert directly via Drizzle (not through auth API)
  await db.execute(sql`
    INSERT INTO users (email, name, password, role, "emailVerified")
    VALUES (${email}, ${name}, ${await hash(password, 12)}, 'admin', NOW())
  `);

  console.log("Admin created successfully!");
}
```

**Optional CI check** (`packages/cli/src/commands/check.ts`):

```bash
# Can be run in CI/CD if desired
npx deesse check-env --production
```

### 13. Project Setup

**File:** `packages/cli/src/create-app.ts`

During `create-deesse-app`, after setup:

```typescript
async function createProject() {
  // ... scaffold, install deps, setup db ...

  const shouldCreateAdmin = await confirm(
    "Create your first admin account?"
  );

  if (shouldCreateAdmin) {
    const email = await prompt("Email:");
    const password = await promptSecret("Password:");
    const name = await prompt("Name:");

    await createAdminUser({ email, password, name });
  }
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `packages/deesse/src/config/define.ts` | Config with `database` and `auth` settings |
| `packages/next/src/server.ts` | New - createDeesseServer factory |
| `packages/next/src/client.ts` | New - createDeesseClient factory |
| `packages/next/src/components/admin-page.tsx` | Simplified - UI guard only |
| `packages/next/src/pages/login-page.tsx` | New - Zero-dep login |
| `packages/next/src/pages/setup-page.tsx` | New - First admin setup |
| `packages/cli/src/commands/admin-create.ts` | New - Raw SQL admin creation |
| `packages/cli/src/commands/generate.ts` | New - Schema generation |
| `packages/cli/src/commands/migrate.ts` | New - Migration runner |
| `middleware.ts` | New - Auth protection (user project) |
| `lib/deesse.ts` | New - Creates auth via `config.database`, exports `deesseServer` + `deesseClient` |
| `deesse.config.ts` | Updated - includes `auth.baseURL` |
| `app/api/auth/[...slug]/route.ts` | Updated - imports from lib/deesse.ts |

## Key Principles

### 1. Middleware-First Security

Auth protection happens in middleware, not in components. This prevents FOUC and ensures security even if JS fails to load.

### 2. Runtime Setup Mode

No build-time DB check. If no admin exists, the app shows the setup page at runtime. Works on Vercel, Docker, any CI/CD.

### 3. Server/Client Separation

- `deesseServer` (RSC, Actions, API routes) - has access to secrets
- `deesseClient` (Client Components) - only has hooks, no secrets

### 4. Commit to Better-Auth

No fake agnosticism. DeesseJS is built for better-auth first. The types and wiring are specific to better-auth.

### 5. Zero New Secrets

Uses `BETTER_AUTH_SECRET` (better-auth's native env var). No `DEESSE_SECRET`.

### 6. Minimal Dependencies

Login page uses plain React state. No TanStack Form dependency for built-in pages.

### 7. Single Database Instance

`config.database` is the single source of truth for the database. Better-auth and all application code use the same Drizzle instance. No separate DB connections.

---

## Security Considerations

### Flash of Unauthenticated Content (FOUC)

**Previous issue:** AdminPage redirected in a Client Component, causing 500ms of visible content before redirect.

**Fix:** Middleware handles redirects before any content renders.

### Build-Time DB Access

**Previous issue:** Build script queried production DB, failing in most CI/CD environments.

**Fix:** Runtime check via middleware. No build-time DB dependency.

### Secret Exposure

**Previous issue:** Auth instance (containing secrets) passed to Client Components.

**Fix:** Config contains only URLs/paths. Auth instance lives in `lib/deesse.ts` which is never imported by Client Components.

### CLI Path Resolution

**Previous issue:** CLI tried to import `@/auth` which requires TS compilation.

**Fix:** CLI uses raw SQL via Drizzle, bypassing the auth API entirely. No module resolution needed.
