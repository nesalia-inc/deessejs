# Client-Side Authentication API

DeesseJS provides `createClient()` which creates a type-safe authentication client. It accepts the same configuration options as better-auth's `createAuthClient()` and returns an object with the better-auth client accessible via the `auth` property.

## Installation

```typescript
import { createClient } from "deesse";
```

## Configuration

### `DeesseClientOptions`

`createClient()` accepts the same options as better-auth's `createAuthClient()`:

```typescript
interface DeesseClientOptions {
  /**
   * Auth server URL. Defaults to `/api/auth`.
   * Supports environment variables: `NEXT_PUBLIC_AUTH_URL`, `NEXTAUTH_URL`, `VERCEL_URL`
   */
  baseURL?: string;

  /** Custom base path for API routes */
  basePath?: string;

  /** Client plugins to extend functionality */
  plugins?: BetterAuthClientPlugin[];

  /** Disable default redirect handling */
  disableDefaultFetchPlugins?: boolean;

  /** Fetch lifecycle hooks */
  fetchOptions?: {
    onSuccess?: (ctx: Context) => void;
    onError?: (ctx: Context) => void;
    onRequest?: (ctx: Context) => void;
    onResponse?: (ctx: Context) => void;
    plugins?: FetchPlugin[];
  };
}
```

## Basic Usage

### Minimal Setup (React/Next.js)

```typescript
// lib/auth-client.ts
import { createClient } from "deesse";

export const client = createClient();
```

When no `baseURL` is provided, it defaults to `/api/auth`.

### With Custom Base URL

```typescript
// lib/auth-client.ts
import { createClient } from "deesse";

export const client = createClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
});
```

### With Plugins

```typescript
// lib/auth-client.ts
import { createClient } from "deesse";
import { adminClient, multiSessionClient } from "better-auth/client/plugins";

export const client = createClient({
  plugins: [adminClient(), multiSessionClient()],
});
```

## Client API

The object returned by `createClient()` has the following structure:

```typescript
{
  auth: BetterAuthClient  // The actual better-auth client
}
```

Access the better-auth client via `client.auth`:

```typescript
const { auth } = client;
auth.signIn.email({ ... });
auth.useSession();
```

### Core Properties (via `client.auth`)

| Property | Type | Description |
|----------|------|-------------|
| `useSession` | `() => { data: Session | null, error: Error | null, isPending: boolean }` | Session state hook |
| `signIn` | `SignInClient` | Email/password and OAuth sign-in |
| `signOut` | `SignOutClient` | Sign out functionality |
| `$fetch` | `BetterFetch` | Raw fetch instance for custom requests |
| `$Infer` | `{Session}` | Inferred TypeScript types |
| `$store` | `{notify, listen, atoms}` | Store for signals and atom management |
| `$ERROR_CODES` | `Record<string, RawError>` | Error codes from plugins |

### Auth Actions (via `client.auth`)

| Method | Description |
|--------|-------------|
| `auth.signIn.email()` | Sign in with email/password |
| `auth.signIn.social()` | Initiate OAuth flow |
| `auth.signOut()` | Sign out the current session |
| `auth.getSession()` | Fetch current session |
| `auth.refreshSession()` | Refresh session token |
| `auth.updateUser()` | Update user data |

## Usage in React Components

### Getting the Session

```tsx
import { client } from "@/lib/auth-client";

export function UserProfile() {
  const { data, isPending, error } = client.auth.useSession();

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>Not signed in</div>;

  return (
    <div>
      <p>Welcome, {data.user.name}</p>
      <p>Email: {data.user.email}</p>
    </div>
  );
}
```

### Signing In

```tsx
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

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### Signing Out

```tsx
import { client } from "@/lib/auth-client";

export function SignOutButton() {
  async function handleSignOut() {
    await client.auth.signOut();
  }

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

### Using with Error Handling

```tsx
import { client } from "@/lib/auth-client";

export function SignInWithFeedback() {
  async function handleSignIn(email: string, password: string) {
    const { error } = await client.auth.signIn.email({
      email,
      password,
    });

    if (error) {
      switch (error.status) {
        case 429:
          alert("Too many attempts. Please try again later.");
          break;
        case 401:
          alert("Invalid email or password.");
          break;
        default:
          alert("An error occurred. Please try again.");
      }
    }
  }

  return (
    <button onClick={() => handleSignIn("user@example.com", "password")}>
    Sign In
    </button>
  );
}
```

## TypeScript Types

The client infers types from the server configuration. The `$Infer` property on `client.auth` provides these types:

```typescript
import { createClient } from "deesse";

export const client = createClient();

// Access inferred types
type Session = typeof client.auth.$Infer.Session;
type User = Session["user"];
```

### Session Type

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
    // ... custom fields from your user table
  };
  session: {
    id: string;
    expiresAt: Date;
    // ... custom session fields
  };
}
```

## Environment Variables

The client automatically resolves `baseURL` from these environment variables (in order of precedence):

1. `NEXT_PUBLIC_AUTH_URL`
2. `NEXTAUTH_URL`
3. `VERCEL_URL`

If none are set, it defaults to `/api/auth`.

## Comparison with better-auth

DeesseJS's `createClient()` accepts the same options as better-auth's `createAuthClient()`:

| Aspect | better-auth | DeesseJS |
|--------|-------------|----------|
| Import | `better-auth/react` | `deesse` |
| Return | Direct `BetterAuthClient` | `{ auth: BetterAuthClient }` |
| Type inference | Manual via generic | Automatic via better-auth |

```typescript
// better-auth
import { createAuthClient } from "better-auth/react";
const authClient = createAuthClient();
authClient.signIn.email({ ... });

// DeesseJS
import { createClient } from "deesse";
const client = createClient();
client.auth.signIn.email({ ... });
```

## Related

- [Server Configuration](./server.md) - Setting up the auth server
- [Admin & Users](./admin-users.md) - User management with admin plugin
