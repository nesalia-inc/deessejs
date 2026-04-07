# Better-Auth `createAuthClient` Analysis

## Overview

`createAuthClient` is a factory function that creates a type-safe authentication client instance. It is available from different entry points depending on your framework:

- `better-auth/client` - Vanilla JavaScript (no framework-specific hooks)
- `better-auth/react` - React hooks (`useSession`, etc.)
- `better-auth/solid` - SolidJS hooks
- `better-auth/svelte` - Svelte stores
- `better-auth/vue` - Vue composables

---

## Usage Examples from Demos

### Minimal Usage (NextJS - vanilla)

```typescript
// From: demo/nextjs/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
```

No `baseURL` means it defaults to `/api/auth`.

### Expo with Custom Storage

```typescript
// From: demo/expo/src/lib/auth-client.ts
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: "http://localhost:8081",
  disableDefaultFetchPlugins: true,
  plugins: [
    expoClient({
      scheme: "better-auth",
      storage: SecureStore,
    }),
  ],
});
```

### Electron with Protocol Handling

```typescript
// From: demo/electron/src/lib/auth-client.ts
import { electronClient } from "@better-auth/electron/client";
import { storage } from "@better-auth/electron/storage";
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000/api/auth",
  plugins: [
    electronClient({
      protocol: {
        scheme: "com.better-auth.demo",
      },
      signInURL: "http://localhost:3000/sign-in",
      storage: storage(),
    }),
  ],
});
```

### Full-Featured NextJS with Many Plugins

```typescript
// From: e2e/integration/solid-vinxi/src/lib/auth-client.ts
import { dashClient } from "@better-auth/dash/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";
import {
  adminClient,
  customSessionClient,
  deviceAuthorizationClient,
  lastLoginMethodClient,
  multiSessionClient,
  oneTapClient,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    dashClient(),
    organizationClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/two-factor";
      },
    }),
    passkeyClient(),
    adminClient(),
    multiSessionClient(),
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      promptOptions: { maxAttempts: 1 },
    }),
    oauthProviderClient(),
    stripeClient({ subscription: true }),
    customSessionClient<typeof auth>(),
    deviceAuthorizationClient(),
    lastLoginMethodClient(),
  ],
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        toast.error("Too many requests. Please try again later.");
      }
    },
  },
});
```

---

## Client API Structure

The returned `authClient` object provides:

### Core Properties

| Property | Type | Description |
|----------|------|-------------|
| `useSession` | `Atom<{data, error, isPending, isRefetching, refetch}>` | Session state hook (React/Solid) or Atom (vanilla) |
| `$fetch` | `BetterFetch` | Raw fetch instance for custom requests |
| `$store` | `{notify, listen, atoms}` | Store for signals and atom management |
| `$Infer` | `{Session}` | Inferred TypeScript types |
| `$ERROR_CODES` | `Record<string, RawError>` | Error codes from plugins |

### Common Actions (inferred from server config + plugins)

- `signIn` - Email/password sign in
- `signOut` - Sign out (POST to `/sign-out`)
- `getSession` - Fetch current session
- `refreshSession` - Refresh session token
- `updateUser` - Update user data
- `updateSession` - Update session data

### Plugin-Specific Hooks (via `use{PluginName}` pattern)

- `useOrganization()` - Organization context
- `useTwoFactor()` - Two-factor authentication state
- `usePasskey()` - Passkey/WebAuthn state
- `useMultiSession()` - Multi-session management
- `useOneTap()` - Google One Tap state

---

## Configuration Options (`BetterAuthClientOptions`)

```typescript
interface BetterAuthClientOptions {
  baseURL?: string;              // Auth server URL (default: "/api/auth")
  basePath?: string;             // Custom base path
  plugins?: BetterAuthClientPlugin[];  // Client plugins
  disableDefaultFetchPlugins?: boolean; // Disable default redirect handling
  fetchOptions?: {
    onSuccess?: (ctx: Context) => void;
    onError?: (ctx: Context) => void;
    onRequest?: (ctx: Context) => void;
    onResponse?: (ctx: Context) => void;
    plugins?: FetchPlugin[];
  };
}
```

---

## Internal Architecture

### `getClientConfig`

Sets up:
1. **`$fetch`** - A `BetterFetch` instance with:
   - Base URL resolution (supports env vars: `NEXT_PUBLIC_AUTH_URL`, `NEXTAUTH_URL`, `VERCEL_URL`)
   - Default plugins including redirect handling
   - JSON parser with error handling

2. **Session Management** (via `getSessionAtom`):
   - `$sessionSignal` - Atom for signaling session changes
   - `session` - `AuthQueryAtom` for `/get-session` endpoint
   - Broadcast channel for cross-tab session sync

3. **Plugin System**:
   - `pluginsAtoms` - Atoms from plugins
   - `pluginsActions` - Actions from plugins
   - `pluginPathMethods` - HTTP method overrides per path
   - `atomListeners` - Listeners for atom changes

### `createDynamicPathProxy`

Creates a proxy that:
- Routes method calls to appropriate `$fetch` calls
- Handles plugin actions and hooks
- Provides type-safe access to all auth endpoints

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/better-auth/src/client/vanilla.ts` | Main client factory |
| `packages/better-auth/src/client/react/index.ts` | React implementation |
| `packages/better-auth/src/client/solid/index.ts` | Solid implementation |
| `packages/better-auth/src/client/config.ts` | Configuration |
| `packages/better-auth/src/client/session-atom.ts` | Session management |
| `packages/better-auth/src/client/query.ts` | Query hooks |
| `packages/better-auth/src/client/types.ts` | Types |
