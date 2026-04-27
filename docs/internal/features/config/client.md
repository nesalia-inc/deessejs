# createClient()

**Package:** `deesse`

**Source:** `packages/deesse/src/client.ts`

## Purpose

Creates a type-safe authentication client for client-side React components. This is the entry point for every authentication interaction in the browser.

## Interface

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.auth` | `BetterAuthClientOptions` | better-auth client options |
| `options.auth.baseURL` | `string` | Your auth API base URL (e.g. `/api/auth`) |

| Returns | Type | Description |
|---------|------|-------------|
| `client.auth` | `BetterAuthClient` | better-auth client instance with React hooks |

## Wraps better-auth

`createClient()` is a thin wrapper around `better-auth/react`'s `createAuthClient`. It adds no additional logic - it simply provides a consistent interface for the Deesse ecosystem and allows future extension without breaking changes.

## Usage

### 1. Create the client once

Create the client in a shared file, then import it everywhere. The client should be instantiated once and reused.

```typescript
// src/lib/client.ts
import { createClient } from "deesse";

export const client = createClient({
  auth: {
    baseURL: "/api/auth",
  },
});
```

### 2. Use in components

```typescript
// components/MyComponent.tsx
import { client } from "@/lib/client";

function MyComponent() {
  const { data, isPending } = client.auth.useSession();

  if (isPending) return <Spinner />;
  if (!data) return <LoginPrompt />;

  return <p>Welcome, {data.user.name}</p>;
}
```

## Available Hooks

The returned `auth` client exposes all better-auth React hooks:

| Hook | Returns | Description |
|------|---------|-------------|
| `useSession()` | `{ data, isPending, error }` | Current user's session |
| `useUser()` | `{ data, isPending, error }` | Current user's profile |
| `signIn()` | mutation fn | Sign in (email/password, OAuth, etc.) |
| `signOut()` | mutation fn | Sign out |

See [better-auth/react documentation](https://better-auth.com/docs/client/react) for the full API.

## Type Safety

The `DeesseClientOptions` interface mirrors `BetterAuthClientOptions` directly, so any options supported by `better-auth/react`'s `createAuthClient` are also valid here. TypeScript will surface configuration errors at build time.

## Example: Full Authentication Flow

```typescript
import { client } from "@/lib/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = client.auth.signIn();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await signIn.trigger({ email, password });
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={signIn.isPending}>
        {signIn.isPending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

## Server vs Client

This function is for client-side usage only. For server-side authentication in API routes or Server Components, use the Deesse server utilities which handle cookies and session validation directly.
