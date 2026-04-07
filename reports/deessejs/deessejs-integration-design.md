# DeesseJS Integration Architecture Design

## Executive Summary

This document defines the integration architecture for DeesseJS, synthesizing patterns from three established libraries:
- Payload CMS's `defineConfig`/`buildConfig` pattern
- better-auth's `createClient` pattern
- drizzle-orm's database configuration approach

**Key Design Decisions:**
- **Split Factory Pattern**: Separate `createDeesse()` (server) and `createClient()` (client)
- **Config as Data**: Configuration flows as plain objects
- **Module-Scoped Caching**: Instance caching without global state
- **Railway-Oriented Error Handling**: All fallible operations return `Result<T, E>` types

---

## Architecture Overview

### High-Level Structure

```
User Project
├── deesse.config.ts          # Server-only config (secrets, database)
├── lib/
│   └── deesse.ts             # Wiring layer: creates deesse + client
├── middleware.ts              # Auth protection via deesse
├── app/
│   └── api/auth/[...slug]/route.ts  # Auth API handler
└── app/(deesse)/             # Admin pages (RSC + Client Components)
```

### Factory Pattern Comparison

| Library | Server Entry | Client Entry |
|---------|--------------|--------------|
| Payload CMS | `getPayload()` singleton | N/A |
| better-auth | `betterAuth()` | `createAuthClient()` |
| drizzle-orm | `drizzle()` | N/A |
| **DeesseJS** | `createDeesse()` | `createClient()` |

---

## Config Design (`defineConfig`)

### Pattern Source

Payload CMS's `buildConfig` processes plugins sequentially then delegates to `sanitizeConfig`. DeesseJS adopts a simpler variant focused on validation.

### Type Definitions

```typescript
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Plugin } from "./plugin";
import type { PageTree } from "./page";

// Raw config - user-provided
export type Config = {
  name?: string;
  database: PostgresJsDatabase;
  plugins?: Plugin[];
  pages?: PageTree[];
  auth?: {
    baseURL: string;          // URL of the deployed app
    apiPath?: string;        // Path to auth API route (default: "/api/auth")
  };
};

export function defineConfig(config: Config): Config {
  // Validation happens here in development
  if (process.env.NODE_ENV !== "production") {
    // Zod validation
  }
  return config;
}
```

---

## Server Entry Point (`createDeesse`)

### Pattern Source

better-auth's `betterAuth()` function creates the server-side auth instance. DeesseJS wraps this with module-scoped caching.

### Type Definitions

```typescript
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BetterAuth } from "better-auth";
import type { Config } from "./config/define";

// Module-scoped cache entry
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
    },
  };
}

// Server instance type
export type Deesse = {
  auth: BetterAuth;
  database: PostgresJsDatabase;
  hasAdmin: () => Promise<boolean>;
};

// Server factory
export function createDeesse(config: Config): Deesse {
  const auth = betterAuth({
    database: drizzleAdapter(config.database, { provider: "pg" }),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true },
    plugins: config.plugins?.map((p) => p()) ?? [],
  });

  return {
    auth,
    database: config.database,
    async hasAdmin(): Promise<boolean> {
      const users = await auth.api.admin.listUsers({});
      return users.users.some((u) => u.role === "admin");
    },
  };
}
```

### Module-Scoped Cache

```typescript
// Module-scoped - not global
const deesseCache = createFactory<Deesse, Config>(createDeesse);

export function getDeesse(config: Config): Promise<Deesse> {
  return deesseCache.get("main", config);
}

export function clearDeesseCache(): void {
  deesseCache.clear();
}
```

---

## Client Entry Point (`createClient`)

### Pattern Source

better-auth's `createAuthClient()` provides client-safe session hooks. DeesseJS wraps this with a reduced API surface.

```typescript
import type { BetterAuthClient } from "better-auth/react";

// Client-safe instance type
export type Client = Omit<BetterAuthClient, "$store" | "$fetch">;

export type ClientOptions = {
  baseURL: string;
  apiPath?: string;
};

export function createClient(options: ClientOptions): Client {
  const authClient = createAuthClient({
    baseURL: options.baseURL,
    basePath: options.apiPath ?? "/api/auth",
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

## Database Integration (drizzle-orm)

### Integration Pattern

```typescript
// lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({ client: pool });

// deesse.config.ts
import { defineConfig } from "deesse";
import { db } from "./lib/db";

export const config = defineConfig({
  database: db,
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  },
});
```

---

## Auth Integration (better-auth)

### Configuration

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/drizzle";

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL,
    apiPath: "/api/auth",
  },
  plugins: [],
});
```

### API Route Handler

```typescript
// app/api/auth/[...slug]/route.ts
import { toNextJsHandler } from "better-auth/next-js";
import { getDeesse } from "@/lib/deesse";
import { config } from "@/deesse.config";

const deesse = await getDeesse(config);
const { POST, GET } = toNextJsHandler(deesse.auth);

export { POST, GET };
```

### Middleware Protection

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDeesse } from "./lib/deesse";
import { config } from "./deesse.config";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const deesse = await getDeesse(config);
  const hasAdmin = await deesse.hasAdmin();

  if (!hasAdmin && pathname !== "/admin/setup") {
    return NextResponse.redirect(new URL("/admin/setup", request.url));
  }

  const session = await deesse.auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

---

## Type Safety Design

### Discriminated Union for Errors

```typescript
export type AuthError =
  | { type: "INVALID_EMAIL" }
  | { type: "PASSWORD_TOO_SHORT"; minLength: number }
  | { type: "USER_NOT_FOUND" }
  | { type: "INVALID_CREDENTIALS" }
  | { type: "SESSION_EXPIRED" }
  | { type: "FORBIDDEN" }
  | { type: "INSUFFICIENT_ROLE"; required: string };
```

### Result Type for ROP

```typescript
// @deessejs/core provides:
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  result.ok ? { ok: true, value: fn(result.value) } : result;
```

### Branded Types for IDs

```typescript
export type UserId = string & { readonly brand: unique symbol };
export type SessionToken = string & { readonly brand: unique symbol };

export const UserId = (id: string): UserId => id as UserId;
export const SessionToken = (token: string): SessionToken => token as SessionToken;
```

---

## Migration Guide

### From Single Config to Split Pattern

**Before (v0.x):**

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";

export const config = defineConfig({
  database: drizzle({ ... }),
});

export const deesse = createDeesse(config);
export const client = createClient({ baseURL: config.auth?.baseURL });
```

**After (v1.0):**

```typescript
// deesse.config.ts (SERVER ONLY)
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const config = defineConfig({
  database: drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL }) }),
  auth: { baseURL: process.env.NEXT_PUBLIC_BASE_URL },
});

// lib/deesse.ts (wiring layer)
import { createDeesse } from "@deessejs/core/server";
import { createClient } from "@deessejs/core/client";
import { config } from "../deesse.config";

export const deesse = createDeesse(config);
export const client = createClient({ baseURL: config.auth?.baseURL ?? "" });
```

---

## Next Steps

### Phase 1: Core Infrastructure
1. Implement module-scoped cache in `packages/deesse/src/factory.ts`
2. Create `packages/deesse/src/server.ts` with `createDeesse()` factory
3. Create `packages/deesse/src/client.ts` with `createClient()` factory

### Phase 2: Auth Integration
1. Integrate better-auth with `drizzleAdapter`
2. Implement `hasAdmin()` check
3. Create API route handler helper
4. Add middleware auth protection

### Phase 3: CLI Commands
1. `db:generate` - Run drizzle-kit generate
2. `db:migrate` - Run drizzle-kit migrate
3. `db:push` - Run drizzle-kit push
4. `db:studio` - Open Drizzle Studio

---

## References

- [Payload CMS Config Lifecycle](../payload/config-lifecycle.md)
- [Drizzle-ORM Config](./drizzle-orm-config.md)
- [Better-Auth Client](./better-auth-client.md)
- [Better-Auth Server API](./better-auth-server-api.md)
