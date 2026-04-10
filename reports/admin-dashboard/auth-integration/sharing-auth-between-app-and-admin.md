# Sharing Auth State Between App and Admin Dashboard

## Architecture Overview

The deessejs project has a split between:
1. **Server-side auth** (`deesse.auth` / `deesseAuth`) - used for API routes, session verification
2. **Client-side auth** (`client.auth`) - used in React components via hooks

## How the Main App Creates and Uses the Deesse Client

**Server-Side Usage Pattern:**

In `examples/base/src/lib/deesse.ts`:
```typescript
export const deesse = await getDeesse(config);
export const deesseAuth = deesse.auth;
```

The `deesseAuth` object (type `Auth` from better-auth) is used for:
- API route handlers via `REST_GET({ auth: deesseAuth })` and `REST_POST({ auth: deesseAuth })`
- Server-side session verification in `RootPage`

**Client-Side Usage Pattern:**

In `examples/base/src/lib/client.ts`:
```typescript
export const client = createClient({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
});
```

The `client.auth` object provides React hooks like `useSession()` for client components.

## How the Admin Dashboard Accesses the Same Client

**Admin Page Architecture:**

```
examples/base/src/app/(deesse)/admin/
├── layout.tsx          # Server Component - wraps with RootLayout
└── [[...slug]]/
    └── page.tsx        # Server Component - passes auth to RootPage
```

**Admin Page (`[[...slug]]/page.tsx`):**
```typescript
import { deesseAuth } from "@/lib/deesse";
import { RootPage } from "@deessejs/next";

export default async function AdminPage({ params, searchParams }) {
  return (
    <RootPage
      config={config}
      auth={deesseAuth}    // Same server auth instance as main app
      params={resolvedParams}
      searchParams={resolvedSearchParams}
    />
  );
}
```

**Admin Layout (`layout.tsx`):**
```typescript
import { RootLayout } from "@deessejs/next/root-layout";
import { config } from "@/deesse-config";

export default function AdminLayout({ children }) {
  return <RootLayout config={config}>{children}</RootLayout>;
}
```

## Server-Side vs Client-Side Auth Patterns

**Server-Side Session Check (in `RootPage`):**
```typescript
export async function RootPage({ config, auth, params, searchParams }) {
  // Server-side session check using headers
  const session = await (auth.api as any).getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/admin/login");  // Redirect if not authenticated
  }

  // Render protected page content
  return <>{result.page.content}</>;
}
```

**Client-Side Session Hook (from better-auth/react):**
```typescript
"use client";

import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
});

// In a component:
const { data: session, isPending } = authClient.useSession();
```

## Relationship Between Deesse Client and Better-Auth's `createAuthClient`

**Server Auth (`deesseAuth`):**
- Type: `Auth<BetterAuthOptions>` from better-auth
- Created via: `betterAuth({ database: drizzleAdapter(...), ... })`
- Used for: API handlers, server-side session checks
- Lifetime: Singleton per process, cached in global

**Client Auth (`client.auth` / `DeesseClient.auth`):**
- Type: `AuthClient<BetterAuthClientOptions>` from better-auth/client
- Created via: `createAuthClient({ baseURL: ... })` from better-auth/react
- Used for: React hooks like `useSession()`, `useSignOut()`
- Lifetime: Created per client usage, usually module-level singleton

## The Shared Cookie Mechanism

Both server and client auth point to the same underlying auth system. They share the same cookie-based session mechanism:
- **Server `auth`**: Processes incoming requests with session cookies
- **Client `auth`**: Manages client-side state and makes fetch requests to `/get-session`

This means:
1. User logs in via client → cookie is set
2. Server-side session check reads the same cookie → session is valid
3. Client-side hooks fetch `/get-session` → same session data returned

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Session Cookie (better-auth.session_token)           │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                              │                     │
│         ▼                              ▼                     │
│  ┌──────────────┐              ┌──────────────┐             │
│  │ Server      │              │ Client Auth  │             │
│  │ Component   │              │ Hook         │             │
│  │ (RootPage)  │              │ (useSession) │             │
│  └──────┬───────┘              └──────┬───────┘             │
│         │                             │                      │
│         ▼                             │                      │
│  ┌──────────────┐                     │                      │
│  │ GET /get-    │◄────────────────────┘                      │
│  │ session      │   (fetch with cookie)                      │
│  └──────┬───────┘                                            │
└─────────┼────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────┐
│  Next.js Server  │
│                  │
│  ┌────────────┐  │
│  │ better-auth│  │
│  │ validates  │  │
│  │ cookie     │  │
│  └──────┬─────┘  │
│         │        │
│         ▼        │
│  ┌────────────┐  │
│  │ Returns    │  │
│  │ session +  │  │
│  │ user data  │  │
│  └────────────┘  │
└─────────────────┘
```

## Why It Works

The singleton pattern in `getDeesse()` ensures that:
1. `deesseAuth` is created once and cached
2. Both the main app and admin dashboard import the same instance
3. Session cookies are validated against the same secret
4. User data is consistent across all routes