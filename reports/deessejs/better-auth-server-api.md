# Better-Auth Server-Side API

## 1. Server-Side Configuration

Better-auth is initialized by calling `betterAuth()` with a configuration object.

```typescript
import { betterAuth } from "better-auth";

const auth = betterAuth({
  appName?: string,
  baseURL?: BaseURLConfig,
  basePath?: string,
  secret?: string,
  database?: DatabaseConfig,
  secondaryStorage?: SecondaryStorage,
  emailVerification?: EmailVerificationConfig,
  emailAndPassword?: EmailAndPasswordConfig,
  socialProviders?: SocialProviders,
  plugins?: BetterAuthPlugin[],
  user?: UserConfig,
  session?: SessionConfig,
  account?: AccountConfig,
  verification?: VerificationConfig,
  trustedOrigins?: string[] | ((request?: Request) => Awaitable<(string | undefined | null)[]>),
  rateLimit?: RateLimitConfig,
  advanced?: BetterAuthAdvancedOptions,
  logger?: Logger,
  databaseHooks?: DatabaseHooksConfig,
  onAPIError?: OnAPIErrorConfig,
  hooks?: HooksConfig,
  disabledPaths?: string[],
  telemetry?: { enabled?: boolean, debug?: boolean },
  experimental?: { joins?: boolean },
});
```

### Returned Auth Object

```typescript
{
  handler: (request: Request) => Promise<Response>,
  api: InferAPI<...>,  // Typed API endpoints
  options: Options,
  $ERROR_CODES: Record<string, string>,
  $context: Promise<AuthContext<Options>>,
  $Infer: { Session: { session: Session; user: User } }
}
```

---

## 2. Auth Operations (API Endpoints)

### Session Management
- `getSession()` - Get current session from request headers/cookies
- `signOut()` - Sign out the current session
- `listSessions()` - List all sessions for the current user
- `revokeSession()` - Revoke a specific session
- `revokeSessions()` - Revoke all sessions
- `revokeOtherSessions()` - Revoke all sessions except current
- `updateSession()` - Update session data
- `refreshToken()` - Refresh the session token

### User Management
- `signUpEmail()` - Create a new user with email/password
- `signInEmail()` - Sign in with email/password
- `updateUser()` - Update user data
- `deleteUser()` - Delete a user account

### Password Management
- `resetPassword()` - Reset password with token
- `verifyPassword()` - Verify a user's password
- `setPassword()` - Set a new password
- `changePassword()` - Change password (requires old password)
- `requestPasswordReset()` - Request password reset email

### Email Verification
- `verifyEmail()` - Verify email with token
- `sendVerificationEmail()` - Send verification email
- `changeEmail()` - Change user email (triggers re-verification)

### OAuth / Social
- `signInSocial()` - Initiate OAuth flow (redirects to provider)
- `callbackOAuth()` - OAuth callback handler
- `linkSocialAccount()` - Link social account to existing user
- `unlinkAccount()` - Unlink an account
- `listUserAccounts()` - List all accounts linked to a user

### Token Operations
- `getAccessToken()` - Get OAuth access token
- `accountInfo()` - Get account info

---

## 3. Session Handling

### Cookie-Based Sessions (Default)
- Sessions stored in HTTP-only cookies
- Configurable expiration and refresh intervals
- Supports `cookieCache` for stateless cookie-based sessions

### Secondary Storage
- Sessions can be stored in external storage (e.g., Redis)
- Set via `secondaryStorage` config option

### Session Cookie Cache
Enable via `session.cookieCache.enabled`:
- `"compact"`: base64url with HMAC-SHA256 signature (default)
- `"jwt"`: JWT with HMAC signature
- `"jwe"`: JWE with A256CBC-HS512 encryption

### Freshness Check
- `session.freshAge` determines when a session is considered "fresh"
- Default: 1 day

---

## 4. Database Adapters

### Official Adapters
- **Drizzle Adapter** (`better-auth/drizzle-adapter`)
- **Kysely Adapter** (`better-auth/kysely-adapter`)
- **Prisma Adapter** (`better-auth/prisma-adapter`)
- **MongoDB Adapter** (`better-auth/mongo-adapter`)
- **Memory Adapter** (`better-auth/memory-adapter`)

### Database Configuration Formats

**Kysely Dialect (recommended):**
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

---

## 5. Plugin System

### Core-Like Plugins
- `admin()` - Admin user management
- `bearer()` - Bearer token authentication
- `jwt()` - JWT session support
- `multiSession()` - Multiple simultaneous sessions

### Organization & Teams
- `organization()` - Multi-tenant organization support

### Security
- `twoFactor()` - Two-factor authentication (TOTP + backup codes)
- `passkey()` - WebAuthn passkey support
- `anonymous()` - Anonymous sign-in

### OAuth & SSO
- `openAPI()` - OpenID Connect support
- `oAuthProxy()` - OAuth proxy
- `sso()` - SAML 2.0 and OIDC SSO

### Communication
- `emailOtp()` - Email OTP authentication
- `magicLink()` - Magic link authentication

### Integration
- `stripe()` - Stripe subscription integration
- `oneTap()` - Google One Tap support

---

## 6. Demo Configuration Examples

### Minimal Next.js Config

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

### Full-Featured Stateless Config

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

---

## 7. Key Files

| File | Purpose |
|------|---------|
| `packages/better-auth/src/auth/full.ts` | Full mode initializer |
| `packages/better-auth/src/auth/base.ts` | Core auth factory |
| `packages/better-auth/src/types/auth.ts` | Auth type definitions |
| `packages/better-auth/src/types/models.ts` | Core model types |
| `packages/better-auth/src/api/index.ts` | API router and endpoints |
| `packages/better-auth/src/adapters/index.ts` | Adapter exports |
