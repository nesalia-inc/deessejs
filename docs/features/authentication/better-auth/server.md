# Server-Side Authentication API

DeesseJS integrates better-auth's `betterAuth()` via the `getDeesse()` factory function, providing authentication alongside database access in a unified interface.

## Installation

```typescript
import { getDeesse } from "deesse";
```

## Deesse Type

When you call `getDeesse(config)`, it returns a `Deesse` instance that combines database access with authentication:

```typescript
interface Deesse {
  /** Better-auth instance - access operations via .api.* */
  auth: BetterAuthInstance;

  /** Drizzle database instance for ORM operations */
  database: PostgresJsDatabase;
}
```

The `auth` property is the better-auth instance (same as returned by `betterAuth()`). Access authentication operations via `auth.api.*`.

## Server Configuration

Create a Deesse config that includes better-auth integration:

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { drizzleAdapter } from "better-auth/drizzle-adapter";

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
  auth: {
    plugins: [],  // better-auth plugins
  },
});

export const deesse = getDeesse(config);
```

### Auth API Access

Access the better-auth API via `deesse.auth.api`:

```typescript
const { auth } = deesse;

// Use better-auth's API directly
const session = await auth.api.getSession({ headers: request.headers });

// Access admin operations (when admin plugin is enabled)
const users = await auth.api.listUsers({});
```

### API Route Handler

Create the auth API route. This follows the same DX as Payload CMS:

```typescript
// app/(deesse)/api/auth/[...slug]/route.ts
/* THIS FILE WAS GENERATED AUTOMATICALLY BY DEESSE. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from "@deesse-config";
import { REST_GET, REST_POST } from "@deessejs/next/routes";

export const GET = REST_GET(config);
export const POST = REST_POST(config);
```

## Database Adapters

Better-auth supports multiple database adapters through the `drizzleAdapter` function.

### Official Adapters

| Adapter | Package | Use Case |
|---------|---------|----------|
| Drizzle | `better-auth/drizzle-adapter` | Type-safe SQL with Drizzle ORM |
| Kysely | `better-auth/kysely-adapter` | SQL query builder with dialect support |
| Prisma | `better-auth/prisma-adapter` | Prisma ORM integration |
| MongoDB | `better-auth/mongo-adapter` | MongoDB NoSQL database |
| Memory | `better-auth/memory-adapter` | In-memory storage (dev/testing) |

### Database Configuration Formats

**Kysely Dialect (Recommended):**

```typescript
{
  database: {
    dialect: new PostgresDialect({ connectionString: process.env.DATABASE_URL }),
    type: "postgres" | "mysql" | "sqlite" | "mssql",
    casing?: "snake" | "camel",
  }
}
```

**Adapter Instance:**

```typescript
{
  database: drizzleAdapter(db, { provider: "pg" })
}
```

## Session Management

Better-auth provides flexible session handling with cookie-based sessions by default.

### Cookie-Based Sessions

Sessions are stored in HTTP-only cookies for security:

```typescript
// Default configuration (cookie-based)
session: {
  expiresIn: 60 * 60 * 24 * 7,  // 7 days
  updateAge: 60 * 60 * 24,       // Update every 24 hours
}
```

### Session Cookie Cache

Enable stateless cookie sessions via `session.cookieCache`:

```typescript
session: {
  cookieCache: {
    enabled: true,
    type: "compact" | "jwt" | "jwe",
  }
}
```

**Cache Types:**
- `"compact"` - base64url with HMAC-SHA256 signature (default)
- `"jwt"` - JWT with HMAC signature
- `"jwe"` - JWE with A256CBC-HS512 encryption

### Freshness Check

The `session.freshAge` determines when a session is considered "fresh":

```typescript
session: {
  freshAge: 60 * 60 * 24,  // 1 day (default)
}
```

### Secondary Storage

Store sessions in external storage like Redis:

```typescript
{
  secondaryStorage: {
    get: async (key: string) => { /* retrieve session */ },
    set: async (key: string, value: string, ttl?: number) => { /* store session */ },
    remove: async (key: string) => { /* delete session */ },
  }
}
```

## Auth Operations

### Session Operations

| Operation | Description |
|-----------|-------------|
| `getSession()` | Get current session from request headers/cookies |
| `signOut()` | Sign out the current session |
| `listSessions()` | List all sessions for the current user |
| `revokeSession()` | Revoke a specific session |
| `revokeSessions()` | Revoke all sessions |
| `revokeOtherSessions()` | Revoke all sessions except current |
| `updateSession()` | Update session data |
| `refreshToken()` | Refresh the session token |

### User Management

| Operation | Description |
|-----------|-------------|
| `signUpEmail()` | Create a new user with email/password |
| `signInEmail()` | Sign in with email/password |
| `updateUser()` | Update user data |
| `deleteUser()` | Delete a user account |

### Password Management

| Operation | Description |
|-----------|-------------|
| `resetPassword()` | Reset password with token |
| `verifyPassword()` | Verify a user's password |
| `setPassword()` | Set a new password |
| `changePassword()` | Change password (requires old password) |
| `requestPasswordReset()` | Request password reset email |

### Email Verification

| Operation | Description |
|-----------|-------------|
| `verifyEmail()` | Verify email with token |
| `sendVerificationEmail()` | Send verification email |
| `changeEmail()` | Change user email (triggers re-verification) |

### OAuth / Social

| Operation | Description |
|-----------|-------------|
| `signInSocial()` | Initiate OAuth flow (redirects to provider) |
| `callbackOAuth()` | OAuth callback handler |
| `linkSocialAccount()` | Link social account to existing user |
| `unlinkAccount()` | Unlink an account |
| `listUserAccounts()` | List all accounts linked to a user |
| `getAccessToken()` | Get OAuth access token |
| `accountInfo()` | Get account info |

## Plugin System

Better-auth uses a plugin architecture for extensibility. Plugins are passed via the `auth.plugins` array in your DeesseJS config.

### Core-Like Plugins

```typescript
import { admin, bearer, jwt, multiSession } from "better-auth/plugins";

export const config = defineConfig({
  auth: {
    plugins: [
      admin(),      // Admin user management
      bearer(),     // Bearer token authentication
      jwt(),        // JWT session support
      multiSession(), // Multiple simultaneous sessions
    ],
  },
});
```

### Organization & Teams

```typescript
import { organization } from "better-auth/plugins";

export const config = defineConfig({
  auth: {
    plugins: [
      organization(), // Multi-tenant organization support
    ],
  },
});
```

### Security Plugins

```typescript
import { twoFactor, passkey, anonymous } from "better-auth/plugins";

export const config = defineConfig({
  auth: {
    plugins: [
      twoFactor(),  // Two-factor authentication (TOTP + backup codes)
      passkey(),    // WebAuthn passkey support
      anonymous(),  // Anonymous sign-in
    ],
  },
});
```

### OAuth & SSO

```typescript
import { openAPI, oAuthProxy, sso } from "better-auth/plugins";

export const config = defineConfig({
  auth: {
    plugins: [
      openAPI(),    // OpenID Connect support
      oAuthProxy(), // OAuth proxy
      sso(),        // SAML 2.0 and OIDC SSO
    ],
  },
});
```

### Communication Plugins

```typescript
import { emailOtp, magicLink } from "better-auth/plugins";

export const config = defineConfig({
  auth: {
    plugins: [
      emailOtp(),   // Email OTP authentication
      magicLink(),  // Magic link authentication
    ],
  },
});
```

### Integration Plugins

```typescript
import { stripe, oneTap } from "better-auth/plugins";

export const config = defineConfig({
  auth: {
    plugins: [
      stripe(),    // Stripe subscription integration
      oneTap(),    // Google One Tap support
    ],
  },
});
```

## Configuration Examples

### Minimal Next.js Configuration

```typescript
import { betterAuth } from "better-auth/minimal";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
});
```

### Full-Featured Stateless Configuration

```typescript
import { betterAuth } from "better-auth";
import {
  admin, bearer, jwt, multiSession,
  organization, twoFactor, passkey, openAPI,
} from "better-auth/plugins";

export const auth = betterAuth({
  database: { dialect, type: "sqlite" },
  emailAndPassword: { enabled: true },
  plugins: [
    organization(),
    twoFactor(),
    passkey(),
    admin(),
    multiSession(),
    jwt({ jwt: { issuer: process.env.BETTER_AUTH_URL } }),
  ],
});
```

## Comparison with better-auth

DeesseJS wraps better-auth's `betterAuth()` with the following differences:

| Aspect | better-auth | DeesseJS |
|--------|-------------|----------|
| Import | `better-auth` | `deesse` |
| Instance creation | `betterAuth(config)` | `getDeesse(config)` |
| Auth API | `auth.api.getSession()` | `deesse.auth.api.getSession()` |
| Database access | Via adapter | Via `deesse.database` directly |
| Caching | Manual | Built-in via factory |

### Direct better-auth Usage

For projects that only need authentication without DeesseJS's admin features:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/drizzle-adapter";

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
});
```

### DeesseJS Native Integration

For projects using the full DeesseJS stack:

```typescript
import { getDeesse, defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { drizzleAdapter } from "better-auth/drizzle-adapter";
import { admin } from "better-auth/plugins";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const config = defineConfig({
  database: drizzle({ client: pool }),
  auth: {
    plugins: [admin()],
  },
});

export const deesse = getDeesse(config);

// Access both auth API and database from one instance
const { auth, database } = deesse;

// Database operations
const users = await database.select().from(userTable);

// Auth operations via auth.api
const session = await auth.api.getSession({ headers: request.headers });
const userList = await auth.api.listUsers({});
```

## Auth API Reference

The `deesse.auth` object provides the same API as better-auth's [API endpoints](https://better-auth.com/docs/concepts/api):

| Method | Description |
|--------|-------------|
| `auth.api.getSession()` | Get current session from request headers |
| `auth.api.signInEmail()` | Sign in with email/password |
| `auth.api.signUpEmail()` | Create new user account |
| `auth.api.signOut()` | Sign out current session |
| `auth.api.listUsers()` | List all users (admin plugin) |
| `auth.api.getUser()` | Get single user by ID (admin plugin) |
| `auth.api.createUser()` | Create new user (admin plugin) |
| `auth.api.adminUpdateUser()` | Update user data (admin plugin) |
| `auth.api.removeUser()` | Delete user (admin plugin) |
| `auth.api.banUser()` | Ban user account (admin plugin) |

See the [better-auth API documentation](https://better-auth.com/docs/concepts/api) for the complete list of available endpoints.

## Related

- [Client API](./client.md) - Client-side authentication
- [Admin & Users](./admin-users.md) - User management with admin plugin
