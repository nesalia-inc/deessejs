# Authentication

This is an internal document outlining the authentication system for DeesseJS.

## Overview

DeesseJS uses [better-auth](https://www.better-auth.com/) as its authentication solution. better-auth provides a comprehensive set of features including:

- Admin functionality
- Organization support
- SSO integration
- Last login tracking
- Multi-session management
- First-class Stripe support

## Usage

To configure authentication in DeesseJS, pass the better-auth configuration directly in `deesse.config.ts`:

```typescript
import { defineConfig } from '@deessejs/core';

export const config = defineConfig({
  auth: {
    // better-auth configuration
    database: /* database adapter */,
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      },
    },
  },
});
```

The `config.auth` object exposes both `api` (server-side) and `client` (client-side) directly.

## API (Server-Side)

The `config.auth.api` object provides server-side authentication methods:

```typescript
import { config } from '@deesse-config';
import { headers } from 'next/headers';

// Get current session
const { session, user } = await config.auth.api.getSession({
  headers: await headers(),
});

// Sign in with email
await auth.api.signIn.email({
  body: {
    email: 'john@doe.com',
    password: 'password',
  },
  headers: await headers(),
});

// Sign up with email
await auth.api.signUp.email({
  body: {
    email: 'john@doe.com',
    password: 'password',
    name: 'John Doe',
  },
  headers: await headers(),
});

// Sign out
await auth.api.signOut({
  headers: await headers(),
});

// Get user
const user = await auth.api.getUser({
  params: { userId: 'user-id' },
});

// Update user
await auth.api.updateUser({
  params: { userId: 'user-id' },
  body: { name: 'New Name' },
});
```

### Body, Headers, Query Parameters

Unlike the client, server-side endpoints require explicit parameter passing:

```typescript
// Body parameters
await auth.api.signIn.email({
  body: { email, password },
});

// Query parameters (e.g., email verification)
await auth.api.verifyEmail({
  query: { token: 'verification-token' },
});

// Headers
await auth.api.getSession({
  headers: await headers(),
});
```

### Error Handling

```typescript
import { isAPIError } from 'better-auth/api';

try {
  await auth.api.signIn.email({
    body: { email: 'test@test.com', password: 'wrong' },
  });
} catch (error) {
  if (isAPIError(error)) {
    console.log(error.message, error.status);
    // e.g., "Invalid email or password", 401
  }
}
```

## Client (Client-Side)

The `config.auth.client` provides client-side authentication:

```typescript
import { config } from '@deesse-config';
import { createAuthClient } from '@deessejs/auth-client';

export const authClient = createAuthClient(config.auth.client);
```

### Usage

```typescript
import { authClient } from '@/lib/auth-client';

// Sign in
const { data, error } = await authClient.signIn.email({
  email: 'test@user.com',
  password: 'password1234',
});

if (error) {
  console.log(error.message, error.status);
}

// Sign up
await authClient.signUp.email({
  email: 'test@user.com',
  password: 'password1234',
  name: 'Test User',
});

// Sign out
await authClient.signOut();
```

### Using Hooks (React)

```typescript
import { createAuthClient } from '@deessejs/auth-client';

const { useSession, signIn, signOut } = createAuthClient();

function UserProfile() {
  const { data: session, isPending, error, refetch } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Welcome, {session?.user.name}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Client Options

```typescript
// With custom fetch options
const authClient = createAuthClient({
  baseURL: 'http://localhost:3000',
  fetchOptions: {
    // custom fetch options
  },
  disableDefaultFetchPlugins: true, // For React Native/Expo
});
```

## Configuration Structure

The `auth` config in `deesse.config.ts` provides:

- `auth.api` - Server-side API methods
- `auth.client` - Client-side configuration
- `auth.database` - Database adapter (required)
- `auth.emailAndPassword` - Email/password authentication
- `auth.socialProviders` - OAuth providers (GitHub, Google, etc.)
- And all other better-auth options

## Why better-auth?

- Actively maintained
- Rich feature set needed for plugins (organizations, SSO, multi-session, etc.)
- If needed in the future, the system can be forked to support additional providers
