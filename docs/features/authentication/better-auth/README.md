# better-auth Integration

DeesseJS provides first-class integration with [better-auth](https://www.better-auth.com/), a modern authentication framework for Next.js applications.

## Overview

better-auth handles authentication concerns including:
- **Session management** - Secure cookie-based sessions with built-in CSRF protection
- **User identity** - Account creation, login, logout flows with email/password and OAuth providers
- **Admin capabilities** - User management, role-based access control via the admin plugin
- **Database adapters** - PostgreSQL, MySQL, SQLite, MongoDB support via Drizzle ORM

DeesseJS wraps better-auth to provide a unified authentication interface alongside database access.

## Core Concepts

### Client vs Server

better-auth distinguishes between the **client** (browser) and **server** (Node.js runtime):

| Aspect | Client | Server |
|--------|--------|--------|
| Use case | React components, API routes | Server actions, middleware |
| Location | Browser | Node.js server |
| Purpose | Trigger auth operations | Manage sessions, protect routes |

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Side                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ SignInForm   │───▶│ client     │───▶│ fetch/axios  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        Server Side                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ createServer │◀───│ authInstance │◀───│ authOptions  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Cache Strategy

DeesseJS caches the authentication instance using the same pattern as database access:

1. First call creates and caches the instance
2. Subsequent calls return the cached instance
3. Cache can be cleared for testing or hot-reloading scenarios

## Documentation Structure

- **[Client API](client.md)** - Browser-side authentication utilities
- **[Server API](server.md)** - Node.js runtime authentication, session management, and admin operations
- **[Admin & Users](admin-users.md)** - User management, roles, and admin plugin features

## Quick Start

### Server-Side Setup

```typescript
// lib/deesse.ts
import { getDeesse } from "deesse";
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { drizzleAdapter } from "better-auth/drizzle-adapter";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const config = defineConfig({
  database: drizzle({ client: pool }),
  auth: {
    plugins: [],
  },
});

export const deesse = getDeesse(config);
```

```typescript
// app/(deesse)/api/auth/[...slug]/route.ts
/* THIS FILE WAS GENERATED AUTOMATICALLY BY DEESSE. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from "@deesse-config";
import { REST_GET, REST_POST } from "@deessejs/next/routes";

export const GET = REST_GET(config);
export const POST = REST_POST(config);
```

### Client-Side Setup

```typescript
// lib/auth-client.ts
import { createClient } from "deesse";

export const client = createClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
});
```

Access the better-auth client via `client.auth`:

```tsx
// components/SignInForm.tsx
import { client } from "@/lib/auth-client";

export function SignInForm() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await client.auth.signIn.email({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (error) {
      console.error("Sign in failed:", error.message);
    }
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```