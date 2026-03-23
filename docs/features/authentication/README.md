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

To configure authentication in DeesseJS, use `auth.api` and `auth.client` in `deesse.config.ts`:

```typescript
import { defineConfig } from '@deessejs/core';

export const config = defineConfig({
  auth: {
    api: {
      // Server-side API configuration
    },
    client: {
      // Client-side configuration (baseURL, plugins, etc.)
      baseURL: 'http://localhost:3000',
    },
    // Other better-auth options
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

The `config.auth.api` and `config.auth.client` are created internally by DeesseJS based on your configuration.

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
await config.auth.api.signIn.email({
  body: {
    email: 'john@doe.com',
    password: 'password',
  },
  headers: await headers(),
});

// Sign up with email
await config.auth.api.signUp.email({
  body: {
    email: 'john@doe.com',
    password: 'password',
    name: 'John Doe',
  },
  headers: await headers(),
});

// Sign out
await config.auth.api.signOut({
  headers: await headers(),
});

// Get user
const user = await config.auth.api.getUser({
  params: { userId: 'user-id' },
});

// Update user
await config.auth.api.updateUser({
  params: { userId: 'user-id' },
  body: { name: 'New Name' },
});
```

### Body, Headers, Query Parameters

Unlike the client, server-side endpoints require explicit parameter passing:

```typescript
// Body parameters
await config.auth.api.signIn.email({
  body: { email, password },
});

// Query parameters (e.g., email verification)
await config.auth.api.verifyEmail({
  query: { token: 'verification-token' },
});

// Headers
await config.auth.api.getSession({
  headers: await headers(),
});
```

### Error Handling

```typescript
import { isAPIError } from 'better-auth/api';

try {
  await config.auth.api.signIn.email({
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

The `config.auth.client` is already the ready-to-use client:

```typescript
import { config } from '@deesse-config';

const { useSession, signIn, signOut, signUp } = config.auth.client;
```

### Usage

```typescript
import { config } from '@deesse-config';

const { signIn, signOut, signUp } = config.auth.client;

// Sign in
const { data, error } = await signIn.email({
  email: 'test@user.com',
  password: 'password1234',
});

if (error) {
  console.log(error.message, error.status);
}

// Sign up
await signUp.email({
  email: 'test@user.com',
  password: 'password1234',
  name: 'Test User',
});

// Sign out
await signOut();
```

### Using Hooks (React)

```typescript
import { config } from '@deesse-config';

const { useSession, signIn, signOut } = config.auth.client;

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

### Client Configuration

Configure client options in `deesse.config.ts`:

```typescript
export const config = defineConfig({
  auth: {
    client: {
      baseURL: 'http://localhost:3000',
      fetchOptions: {
        // custom fetch options
      },
      disableDefaultFetchPlugins: true, // For React Native/Expo
    },
  },
});
```

## Configuration Structure

The `auth` config in `deesse.config.ts`:

```typescript
export const config = defineConfig({
  auth: {
    api: {
      // Server-side API config (optional)
    },
    client: {
      // Client-side config (baseURL, plugins, etc.)
      baseURL: 'http://localhost:3000',
    },
    // Other better-auth options
    database: /* database adapter */,
    emailAndPassword: { enabled: true },
    socialProviders: { /* ... */ },
  },
});
```

- `auth.api` - Server-side API methods (auto-created)
- `auth.client` - Client-side auth (auto-created)
- `auth.database` - Database adapter
- `auth.emailAndPassword` - Email/password authentication
- `auth.socialProviders` - OAuth providers

## Why better-auth?

- Actively maintained
- Rich feature set needed for plugins (organizations, SSO, multi-session, etc.)
- If needed in the future, the system can be forked to support additional providers
