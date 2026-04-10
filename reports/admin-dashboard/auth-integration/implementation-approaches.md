# Implementation Approaches for Passing Auth to Admin Dashboard

## Option A: Single Shared Client Instance

**Concept:** Create the deesse client once at module level and import it in both the main app and admin dashboard.

**Implementation:**
```typescript
// lib/deesse-server.ts
import { getDeesse } from "deesse";
import { defineConfig } from "./deesse.config";

export const config = defineConfig({ /* ... */ });
export const deesse = await getDeesse(config);
export const deesseAuth = deesse.auth;

// Admin page imports the same instance
import { deesseAuth, config } from "@/lib/deesse-server";

export default function AdminPage() {
  return <RootPage config={config} auth={deesseAuth} />;
}
```

**Pros:**
- Simple, explicit dependency injection
- Same instance used everywhere (guaranteed consistency)
- Works well with the existing singleton pattern in `getDeesse()`
- No provider overhead

**Cons:**
- Tight coupling to module resolution
- Can cause issues with Next.js hot reloading if not handled properly
- Less flexible for testing (hard to mock)

**Best for:** This is essentially what the example already does - it's the current recommended approach.

---

## Option B: Context/Provider Pattern

**Concept:** Wrap the application with an `AuthProvider` that contains the deesse client, and consume it in child components.

**Implementation:**
```typescript
// components/providers/auth-provider.tsx
"use client";

import { createContext, useContext } from "react";
import { createClient, type DeesseClient } from "deesse";

const AuthContext = createContext<DeesseClient | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = createClient({
    auth: {
      baseURL: process.env.NEXT_PUBLIC_AUTH_URL!,
    },
  });

  return (
    <AuthContext.Provider value={client}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthClient = () => {
  const client = useContext(AuthContext);
  if (!client) throw new Error("useAuthClient must be used within AuthProvider");
  return client;
};
```

**Usage in Admin Component:**
```typescript
"use client";

import { useAuthClient } from "@/components/providers/auth-provider";
import { useSession } from "better-auth/react";

function AdminProtectedContent() {
  const client = useAuthClient();
  const { data: session, isPending } = client.auth.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) redirect("/admin/login");

  return <AdminContent />;
}
```

**Pros:**
- Decoupled from module resolution
- Easy to test with mocked provider
- Can provide different clients in different contexts
- Works naturally with React's component model

**Cons:**
- Requires `"use client"` directive throughout the component tree
- Provider must be placed high enough in the tree
- Extra abstraction layer
- Session data can't be passed from server to client (client fetches independently)

**Best for:** When you need different auth configurations for different parts of the app, or when testing is a priority.

---

## Option C: Server-Side Session Injection

**Concept:** Server components fetch the session and pass it to client components as props. Client components use the session data without making additional fetch requests.

**Implementation:**
```typescript
// app/admin/[[...slug]]/page.tsx (Server Component)
import { getSession } from "better-auth";
import { deesseAuth } from "@/lib/deesse";
import { headers } from "next/headers";

export default async function AdminPage({ params }) {
  const session = await deesseAuth.api.getSession({
    headers: await headers(),
  });

  return (
    <AdminClientComponent
      initialSession={session}
      config={config}
    />
  );
}

// components/admin-client.tsx ("use client")
"use client";

export function AdminClientComponent({
  initialSession,
  config
}: {
  initialSession: Session | null;
  config: Config;
}) {
  // Use initialSession for immediate rendering
  // Could use useSession() for background refresh

  if (!initialSession) {
    redirect("/admin/login");
  }

  return <AdminDashboard session={initialSession} config={config} />;
}
```

**Pros:**
- No client-side session fetch needed on initial render
- Session is available immediately in client components
- Works with Next.js streaming/server components
- Session data passed explicitly (clear data flow)

**Cons:**
- Session data must be serializable
- If session expires, client needs to refetch
- More complex than Option A
- Need to handle session refresh manually

**Best for:** When you want to avoid the loading state on first render, or when you need to pass additional server-derived data alongside session.

---

## Comparison Table

| Aspect | Option A | Option B | Option C |
|--------|----------|----------|----------|
| Complexity | Low | Medium | High |
| Initial Load | May have loading state | May have loading state | No loading state |
| Testability | Hard to mock | Easy to mock | Medium |
| Coupling | Tight to module | Loose | Medium |
| Server-to-Client | Session fetched client-side | Session fetched client-side | Props passed directly |
| Flexibility | Low | High | Medium |

---

## Recommendation

**Option A (Single Shared Client Instance)** is the current implementation and the simplest approach. The existing singleton pattern in `getDeesse()` already handles:
- Caching across HMR
- Pool management for graceful shutdown
- Config equality checking

For the admin dashboard specifically, the key insight is that `RootPage` (a Server Component) handles session verification server-side, while client components needing auth can use the `DeesseClient` from `createClient()`.

The architecture is:
1. `RootPage` receives `deesseAuth` as a prop (the same instance used by the main app)
2. `RootPage` does server-side session verification
3. Protected pages render content via the page DSL
4. Client components needing auth use `createClient()` with the same baseURL