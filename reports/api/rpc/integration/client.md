# deesse-rpc Client Integration

## Desired Developer Experience

### 1. Client Setup

```typescript
// src/client.ts
import { createClient } from "deesse";
import { fetchTransport } from "deesse/client";
import type { AppRouter } from "@/server";

// createClient from deesse provides both auth (better-auth) AND api (RPC)
// Type-safe client with AppRouter generic
export const client = createClient<AppRouter>({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  },
  api: {
    transport: fetchTransport("/api/rpc"),
  },
});

// client.auth - better-auth session/client (session, login, etc.)
// client.api - RPC client for server procedures (typed via AppRouter)
```

The key insight is that `createClient` from `deesse` gives you both:
- `client.auth` → better-auth session management (`useSession()`, `signIn()`, etc.)
- `client.api` → RPC procedures via `client.api.admin.users.list.useQuery()` etc.

The RPC endpoint is automatically available at `/api/rpc` (built into `@deessejs/next`), so you don't need to configure anything.

### 2. React Hooks in Components

```typescript
// src/components/UserList.tsx
"use client";
import { client } from "@/client";

export function UserList() {
  // Auto-typed based on AppRouter type - note the client.api prefix
  const { data, isLoading } = client.api.admin.users.list.useQuery({ limit: 10 });

  return (
    <ul>
      {data?.value?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

export function DeleteUserButton({ userId }: { userId: string }) {
  const deleteUser = client.api.admin.users.delete.useMutation();

  return (
    <button onClick={() => deleteUser.mutate({ id: userId })}>
      Delete
    </button>
  );
}
```

### 3. Session Management (via client.auth)

```typescript
// src/components/UserBadge.tsx
"use client";
import { client } from "@/client";

export function UserBadge() {
  const { data: session } = client.auth.useSession();

  if (!session) {
    return <SignInButton />;
  }

  return (
    <div>
      <span>{session.user.name}</span>
      <SignOutButton />
    </div>
  );
}
```

### Key Principle

- **`client.auth`** → better-auth session management (`useSession()`, `signIn()`, etc.)
- **`client.api`** (client-side) → Public-only access, typed via `AppRouter`

`createClient()` returns a client with both auth and api:
```typescript
type DeesseClient = {
  auth: BetterAuthClient;  // Session, login, etc.
  api: PublicAPIInstance;   // RPC client - public procedures only
};
```

**Usage:**
- `client.auth.useSession()` → Session state
- `client.auth.signIn()` → Login
- `client.auth.signOut()` → Logout
- `client.api.admin.users.list.useQuery()` → RPC queries
- `client.api.admin.users.delete.useMutation()` → RPC mutations

---

## Context

This document describes the client-side integration of `deesse-rpc`. The server setup is described in [server.md](./server.md).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Components                             │
│                                                                  │
│  client.auth.useSession()     → better-auth session            │
│  client.api.admin.users.list  → RPC query                      │
│  client.api.admin.users.delete → RPC mutation                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    deesse/client                                │
│                                                                  │
│  auth: BetterAuthClient     → session, login, logout            │
│  api: PublicAPIInstance      → typed RPC calls                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  app/(deesse)/api/rpc/[...slug]/route.ts  (built-in)           │
│                                                                  │
│  RPC route handler automatically provided by @deessejs/next      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Transport Layer

The RPC client uses a transport to communicate with the server:

```typescript
import { fetchTransport } from "deesse/client";

const transport = fetchTransport("/api/rpc");
```

The transport sends requests to the built-in RPC endpoint at `/api/rpc`.

---

## Type Safety

The `AppRouter` type from the server is used to type the client via the generic parameter:

```typescript
// src/server/index.ts exports the type
export type AppRouter = typeof appRouter;

// src/client.ts imports the type and passes it as generic
import type { AppRouter } from "@/server";

export const client = createClient<AppRouter>({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  },
  api: {
    transport: fetchTransport("/api/rpc"),
  },
});
```

This ensures:
- Only public procedures are available on `client.api`
- Internal operations are excluded (TypeScript error if attempted)
- Arguments are fully typed
- No `as any` cast needed

---

## Open Questions

1. **Type injection:** How to properly inject `AppRouter` type at build time without runtime overhead?

2. **Transport customization:** Should users be able to provide custom transports (WebSocket, etc.)?

3. **QueryClient integration:** How does TanStack Query fit into this architecture?

---

## See Also

- [Server Integration](./server.md) - Server-side setup and usage
- [Plugin System](./plugins.md) - How plugins can expose routes
- `../deesse-rpc/SKILL.md` - Full RPC protocol documentation
- `../deesse-rpc/features/client-react-hooks.md` - React hooks for RPC
