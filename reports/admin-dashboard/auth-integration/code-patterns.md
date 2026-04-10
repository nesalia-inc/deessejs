# Code Patterns for Auth Integration

## Pattern 1: Initializing the Deesse Client (Server-Side)

**File: `src/lib/deesse.ts`**

```typescript
import { getDeesse } from "deesse";
import { config } from "../deesse.config";

// Top-level await for singleton creation
// This runs once per process lifecycle
export const deesse = await getDeesse(config);

// Extract auth for API routes and RootPage
export const deesseAuth = deesse.auth;

// Type augmentation for better-auth's admin plugin
declare module "better-auth" {
  interface inferUser extends AdminUser {}
}
```

## Pattern 2: Initializing the Client (Client-Side)

**File: `src/lib/client.ts`**

```typescript
import { createClient } from "deesse";

export const client = createClient({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  },
});
```

## Pattern 3: Passing Auth to Admin Dashboard

**File: `src/app/(deesse)/admin/[[...slug]]/page.tsx`**

```typescript
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { RootPage } from "@deessejs/next";
import { deesseAuth } from "@/lib/deesse";
import { config } from "@/deesse-config";

interface AdminPageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) as Record<string, string | string[]>;

  return (
    <RootPage
      config={config}
      auth={deesseAuth}
      params={resolvedParams}
      searchParams={resolvedSearchParams}
    />
  );
}
```

## Pattern 4: Checking Auth in Admin Pages (Server-Side)

The `RootPage` from `@deessejs/next` handles this automatically:

```typescript
// packages/next/src/root-page.tsx (simplified)
export async function RootPage({ config, auth, params, searchParams }) {
  // 1. Check if database has users
  const usersExist = await checkUsersExist();
  if (!usersExist) {
    return <FirstAdminSetup />;
  }

  // 2. Server-side session check
  const session = await (auth.api as any).getSession({
    headers: await headers(),
  });

  // 3. Redirect if not authenticated
  if (!session) {
    redirect("/admin/login");
  }

  // 4. Find and render the page
  const result = findPage(config.pages, slugParts);
  return <>{result.page.content}</>;
}
```

## Pattern 5: Client-Side Session Check in Admin Components

**For components that need client-side session access:**

```typescript
"use client";

import { createClient } from "deesse";
import { useSession } from "better-auth/react";
import { redirect } from "next/navigation";

// Create client at module level (singleton)
const client = createClient({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  },
});

export function AdminProtectedComponent() {
  const { data: session, isPending, error } = client.auth.useSession();

  if (isPending) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (error || !session) {
    redirect("/admin/login");
    return null;
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      {/* Admin content */}
    </div>
  );
}
```

## Pattern 6: Using "use client" Directive Properly with Auth

**Key Insight:** The `"use client"` directive marks the boundary where a component transitions from server to client. Components above this boundary can still do server-side data fetching.

**Server Component (no directive):**
```typescript
// This runs on the server
import { getSession } from "better-auth";
import { AdminShell } from "./admin-shell";
import { client } from "@/lib/client";

export default async function AdminPage() {
  // Server-side session check
  const session = await getSession();

  return <AdminShell session={session} />;
}
```

**Client Component (has "use client"):**
```typescript
"use client";
// This runs on the client

import { useSession } from "better-auth/react";

export function AdminShell({ session }) {
  const { data: liveSession, isPending } = useSession();

  // Use liveSession for real-time auth state
  // Use session prop for initial data
  return <div>{/* Admin UI */}</div>;
}
```

## Pattern 7: Admin Layout with Auth Context

**File: `src/app/(deesse)/admin/layout.tsx`**

```typescript
import { RootLayout } from "@deessejs/next/root-layout";
import { config } from "@/deesse-config";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootLayout config={config}>
      {children}
    </RootLayout>
  );
}
```

The `RootLayout` is a simple shell that renders children. Auth checking happens in `RootPage`, not in the layout.

## Pattern 8: API Routes with Auth

**File: `src/app/(deesse)/api/[...slug]/route.ts`**

```typescript
import { deesseAuth } from "@/lib/deesse";
import { REST_GET, REST_POST } from "@/deessejs/next/routes";

export const GET = REST_GET({ auth: deesseAuth });
export const POST = REST_POST({ auth: deesseAuth });
```

The `REST_GET` and `REST_POST` helpers from `@deessejs/next` convert better-auth's handler format to Next.js route handler format.

## Pattern 9: Role-Based Access in Admin Pages

Based on better-auth's admin plugin RBAC system:

```typescript
// In a client component
import { adminClient, hasPermission } from "better-auth/plugins/admin";

const ac = adminClient();  // Uses default roles

// Check if user has permission
const canListUsers = ac.checkRolePermission({
  role: session.user.role || "user",
  permissions: {
    user: ["list"],
  },
});

if (!canListUsers) {
  redirect("/admin/unauthorized");
}
```

## Pattern 10: Handling Session Expiration

**Client-side with automatic refresh:**

```typescript
const client = createClient({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
    sessionOptions: {
      refetchInterval: 60,  // Refetch every 60 seconds
      refetchOnWindowFocus: true,
    },
  },
});

// Component will automatically refetch session
// and update state when session expires
const { data: session } = client.auth.useSession();
```

**Server-side session verification for API routes:**

```typescript
import { sessionMiddleware } from "better-auth";

const protectedEndpoint = createAuthEndpoint(
  "/admin/protected",
  {
    method: "GET",
    use: [sessionMiddleware],  // Requires valid session
  },
  async (ctx) => {
    // Session is available in ctx.context.session
    const userId = ctx.context.session.user.id;
    return ctx.json({ success: true });
  }
);
```

## Pattern 11: Passing Deesse Config to Admin Pages

```typescript
// The config contains the page DSL (pages, sections, links)
// Both app and admin use the same config
import { config } from "@/deesse-config";

// In admin page
export default function AdminPage() {
  return (
    <RootPage
      config={config}  // Page DSL configuration
      auth={deesseAuth} // Auth instance
      // ... params
    />
  );
}
```

## Pattern 12: Module-Level Singleton Pattern

```typescript
// libs/singleton.ts
const singletons = new Map<string, unknown>();

export function getOrCreate<T>(key: string, factory: () => T): T {
  if (!singletons.has(key)) {
    singletons.set(key, factory());
  }
  return singletons.get(key) as T;
}

// Usage for deesse client
const deesse = getOrCreate("deesse", () => createDeesse(config));
```

## Summary

The deessejs admin dashboard architecture relies on:

1. **Server-side singleton** (`deesse` via `getDeesse()`) for API handlers and session verification
2. **Server Component** (`RootPage`) performing the initial session check
3. **Client Components** (`LoginPage`, `FirstAdminSetup`) for user interactions
4. **Optional client-side auth** (`DeesseClient` via `createClient()`) for hooks like `useSession()`

The main app and admin dashboard share the same `deesseAuth` instance because they both import from the same module (`@/lib/deesse`), which creates a singleton cached on the global object.