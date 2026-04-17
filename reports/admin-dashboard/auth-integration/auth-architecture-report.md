# Authentication Architecture Report: DeesseJS Admin Dashboard

**Date:** 2026-04-14
**Status:** Analysis Complete
**Classification:** Senior Architecture Recommendation

---

## Executive Summary

This report analyzes the authentication architecture for the DeesseJS admin dashboard. After thorough exploration of the codebase and research into better-auth's client-only approach, we conclude:

1. **No dedicated auth server is needed** - better-auth's embedded design is sufficient
2. **First admin creation** requires privileged DB access via CLI command `npx @deessejs/cli admin create`
3. **Better Auth admin plugin** is appropriate and should be used for RBAC
4. **The architecture** is clean: embedded better-auth + CLI bootstrap + admin plugin

---

## 1. Current Architecture Analysis

### 1.1 PayloadCMS Auth (Reference Only)

The `temp/payload` directory contains a PayloadCMS exploration with the following characteristics:

- Uses `buildConfig()` + `getPayload()` singleton pattern
- Auth is **collection-based** with automatic endpoints: `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/refresh`
- JWT strategy is default
- Access control defined per-collection

**Note:** The project does **not** currently use PayloadCMS auth. This is a reference exploration.

### 1.2 Better Auth Integration

The actual authentication is built on **better-auth** with the following structure:

```
packages/deesse/src/config/define.ts  - Better Auth instance with admin plugin
packages/admin/src/lib/first-admin.ts - First admin creation logic
```

Key better-auth components:
- `createAuthClient()` - Framework-agnostic HTTP client
- `admin()` plugin - RBAC with roles: `admin`, `user`
- `emailAndPassword()` - Standard credential authentication
- Drizzle adapter for PostgreSQL persistence

### 1.3 CLI Structure

Current CLI is in `packages/create-deesse-app` (not `packages/cli`):
- Entry: `src/index.ts`
- Template copying: `src/copy.ts`
- Templates: `minimal`, `default`, `without-admin`

**Missing:** `admin create` subcommand does not exist yet.

---

## 2. Server vs Client-Only: Auth Server Analysis

### 2.1 Question

Do we need a dedicated auth server, or can we rely solely on better-auth's client-side approach?

### 2.2 Answer

**No dedicated auth server is needed.**

### 2.3 Rationale

| Factor | Dedicated Auth Server | Better Auth Embedded |
|--------|----------------------|----------------------|
| Infrastructure | Extra service to deploy/maintain | Embedded in Next.js |
| Network | Latency between app and auth | Zero latency |
| CORS/Cookies | Complex cross-domain setup | Same-origin, simple |
| Horizontal Scaling | Requires shared session store | Stateless JWT |
| Complexity | High | Low |

Better-auth's design supports horizontal scaling via:
- JWT stateless tokens (no sticky sessions needed)
- `trustedOrigins` configuration for cookie domains
- Framework-agnostic client (`createAuthClient`)

### 2.4 When a Dedicated Auth Server Would Be Needed

- Multi-tenant SaaS with per-tenant auth domains
- Microsservices requiring centralized auth
- Compliance requirements for dedicated auth infrastructure
- **None of these apply to DeesseJS admin dashboard**

---

## 3. First Admin Creation Strategy

### 3.1 The Bootstrapping Problem

Creating the first admin is a **bootstrapping problem** - it inherently requires privileged access that can't be authenticated first (chicken-and-egg).

### 3.2 Options Analysis

| Approach | Pros | Cons |
|----------|------|------|
| Direct DB insert | Fast, no deps | Bypasses better-auth schema, no password hashing |
| PayloadCMS Local API | Uses existing patterns | Not using better-auth - confusing |
| Better Auth admin plugin `createUser` | Uses proper API | Requires existing admin session (can't use for first admin) |
| **`@deessejs/admin` `createFirstAdmin()`** | **Uses existing validated code, proper hashing, domain validation** | **Requires DB connection at CLI runtime** |

### 3.3 Recommended Approach

**Two complementary methods:**

#### Method 1: API Route (Recommended for Development)

PayloadCMS style: `POST /api/admin/create-first-admin`

This provides a secure, user-friendly UI experience during initial setup.

**Advantages:**
- No need to remember CLI commands
- Visual feedback with password strength indicator
- Works in any environment with a running server
- Follows PayloadCMS proven pattern

**Security (3 layers):**
1. `NODE_ENV !== 'production'` check
2. `hasAdminUsers()` check - fails if admin exists
3. Email domain + password validation

#### Method 2: CLI Command (Alternative for Automation)

```bash
npx @deessejs/cli admin create --email admin@example.com --password "secure123"
```

**Advantages:**
- Works before server is running
- Scriptable/CI/CD friendly
- No server dependency

**Both use:** `@deessejs/admin`'s `createFirstAdmin()` function

### 3.4 Security Considerations for First Admin

- **Email domain restriction** via `ADMIN_ALLOWED_DOMAINS` environment variable
- **Password minimum length** (8 chars enforced)
- **Development-only** - ensure this can't run in production accidentally
- **Audit log** - record who created the first admin and when

---

## 4. Better Auth Plugin Integration

### 4.1 Which Plugins?

| Plugin | Purpose | Recommendation |
|--------|---------|-----------------|
| `admin()` | RBAC, user management, banning, impersonation | **Always include** |
| `emailAndPassword()` | Standard credential auth | **Always include** |
| `totp()` | Two-factor authentication | Future enhancement |
| `passkey()` | WebAuthn/FIDO2 passwordless | Future enhancement |
| `oauth()` | Social login (GitHub, Google, etc.) | Future enhancement |

### 4.2 Admin Plugin Features

The `admin()` plugin provides:

- **Schema extensions:**
  - `role: "admin" | "user"` field on user
  - `banned: boolean`, `banReason: string`, `banExpires: Date`

- **Default permissions for `admin` role:**
  - User: create, list, set-role, ban, impersonate, impersonate-admins, delete, set-password
  - Session: list, revoke, delete

- **API endpoints:**
  - `POST /admin/user/create` - create user
  - `GET /admin/user/list` - list users
  - `POST /admin/user/:id/ban` - ban user
  - `POST /admin/user/:id/impersonate` - impersonate user

### 4.3 Plugin Overhead

Minimal. Only adds a few columns to the `user` table:
- `role` (varchar, default 'user')
- `banned` (boolean, default false)
- `banReason` (varchar, nullable)
- `banExpires` (timestamp, nullable)

---

## 5. Recommended Architecture

### 5.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js App                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌────────────────────────────┐    │
│  │   Admin Pages    │         │   Better Auth API Routes   │    │
│  │   (Protected)    │◄───────►│   /api/auth/*              │    │
│  │   /admin/*      │         │   /api/admin/*              │    │
│  └──────────────────┘         └──────────────┬─────────────┘    │
│                                               │                   │
│                     ┌─────────────────────────┼─────────────┐   │
│                     │                         ▼               │   │
│                     │  ┌─────────────────────────────────┐    │   │
│                     │  │  Better Auth Instance           │    │   │
│                     │  │  + admin() plugin               │    │   │
│                     │  │  + emailAndPassword()           │    │   │
│                     │  │  + csrf() protection            │    │   │
│                     │  └─────────────────────────────────┘    │   │
│                     │                         │               │   │
│                     │                         ▼               │   │
│                     │  ┌─────────────────────────────────┐    │   │
│                     │  │  Drizzle Adapter → PostgreSQL  │    │   │
│                     │  └─────────────────────────────────┘    │   │
│                     └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CLI Bootstrap: npx @deessejs/cli admin create                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Parse CLI flags (email, password)                    │   │
│  │  2. Initialize database connection                        │   │
│  │  3. Validate inputs (email domain, password strength)    │   │
│  │  4. Hash password and create admin user                  │   │
│  │  5. Output success confirmation                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Session Security

| Mechanism | Implementation |
|-----------|---------------|
| **Token Type** | JWT (stateless, horizontal-scaling friendly) |
| **Cookie Attributes** | `httpOnly`, `secure`, `sameSite: lax` |
| **Token Expiration** | 7 days (configurable) |
| **CSRF Protection** | Origin header validation (built-in) |
| **Session Fixation** | New token on login (built-in) |
| **Privilege Escalation** | Token rotation on role change (built-in) |

### 5.3 Request Flow: Admin Page Access

```
1. User visits /admin/users
2. Next.js Middleware checks session cookie
3. Middleware calls /api/auth/get-session
4. Better Auth validates JWT, returns session { user, session }
5. If valid: render admin page
6. If invalid: redirect to /admin/login
```

### 5.4 Request Flow: First Admin Creation

```
1. Developer runs CLI command with email/password
2. CLI reads environment configuration
3. CLI initializes database connection
4. CLI validates email domain and password strength
5. CLI creates admin user with proper password hashing
6. CLI outputs success
```

---

## 6. Security Considerations

### 6.1 Already Handled by Better Auth

| Threat | Protection |
|--------|------------|
| CSRF | Origin header validation on all state-changing endpoints |
| Session Fixation | New session token generated on login |
| Token Tampering | JWT signed with HS256, verified on every request |
| Cookie Theft | `httpOnly` prevents XSS access, `secure` requires HTTPS |
| Privilege Escalation | Token regeneration on role change |

### 6.2 Recommended Hardening

| Enhancement | Priority |
|-------------|----------|
| Rate Limiting on `/api/auth/sign-in` | High |
| Login Attempt Tracking | High |
| Email Domain Restriction via `ADMIN_ALLOWED_DOMAINS` | High |
| Session Audit (`impersonatedBy` field) | Medium |
| Max Sessions per user | Medium |
| Password Breach Check (`haveIBeenPwned`) | Low |

### 6.3 Security Checklist

- [x] Production guard: `/api/admin/create-first-admin` returns 403 in production
- [x] Existing users check: returns 403 if admin already exists
- [ ] Rate limiting on auth endpoints (TODO: implement)
- [ ] `ADMIN_ALLOWED_DOMAINS` environment variable validation
- [ ] HTTPS enforced in production (`secure` cookie flag)
- [ ] CSRF protection verified (better-auth default)
- [ ] Session timeout configured appropriately
- [ ] Admin action audit logging

---

## 7. Implementation Plan

Implementation follows four phases: API route for first-admin creation, UI setup page, CLI command, and security hardening. Full implementation details are documented in separate specification files.

---

## 8. Key Files Reference

| File | Purpose |
|------|---------|
| `packages/deesse/src/config/define.ts` | Better Auth instance definition with admin plugin |
| `packages/deesse/src/app/api/admin/create-first-admin/route.ts` | First admin API route handler |
| `packages/admin/src/lib/first-admin.ts` | First admin creation logic (`createFirstAdmin`, `hasAdminUsers`) |
| `packages/admin/src/schema/index.ts` | Database schema with user/session tables |
| `packages/admin/src/app/(auth)/first-admin-setup/page.tsx` | First-admin setup UI page |
| `packages/admin/src/app/(auth)/login/page.tsx` | Login page |
| `packages/admin/src/app/(auth)/forgot-password/page.tsx` | Forgot password page |
| `packages/admin/src/app/(auth)/reset-password/page.tsx` | Reset password page |
| `packages/create-deesse-app/src/index.ts` | CLI entry point |
| `packages/create-deesse-app/src/commands/admin.ts` | CLI admin subcommand |
| **CLI Details:** | See [cli-admin-create-command.md](./cli-admin-create-command.md) |

---

## 9. Open Questions

1. **Auth Backend Choice:** Is `temp/payload` a reference exploration, or do you intend to use PayloadCMS auth alongside/instead of better-auth?

2. **Database Connection:** Will the CLI command run against the same PostgreSQL instance that the app uses? Or need support for different environments?

3. **Password Policy:** Any specific requirements beyond minimum length (8 chars)?

4. **Production Guard:** Should `admin create` be blocked in production environments (via `NODE_ENV=production`)?

5. **First Admin Setup Page:** Should the `/admin/first-admin-setup` page remain the primary bootstrap method, with CLI as alternative?

---

## 10. Conclusion

The recommended architecture is:

1. **No dedicated auth server** - better-auth's embedded design is sufficient
2. **Admin plugin always enabled** - provides necessary RBAC for admin dashboard
3. **API Route for first admin** - `POST /api/admin/create-first-admin` with PayloadCMS-style security
4. **CLI alternative** - `npx @deessejs/cli admin create` for automation/CI/CD
5. **Better-auth handles runtime auth** - session management, login, logout, refresh
6. **Rate limiting as hardening** - add `@upstash/ratelimit` middleware

This architecture is:
- **Simple:** No extra services to deploy
- **Powerful:** Full RBAC, session management, admin plugin
- **Secure:** 3-layer protection (env check + users exist check + validation), CSRF, session fixation prevention
- **Ergonomic:** UI pages for development + CLI for automation

---

## 11. PayloadCMS First-Admin Route Analysis

After analyzing PayloadCMS's first admin creation mechanism, we can adopt a similar approach for DeesseJS.

### 11.1 How PayloadCMS Does It

**Route:** `POST /{collectionSlug}/first-register`

**Handler:** `temp/payload/packages/payload/src/auth/endpoints/registerFirstUser.ts`

**Operation:** `temp/payload/packages/payload/src/auth/operations/registerFirstUser.ts`

### 11.2 PayloadCMS Security Model

PayloadCMS uses a **three-layer protection** approach:

```
Layer 1: Public Admin Route
├── Listed in isPublicAdminRoute.ts as 'createFirstUser'
└── No auth required to access

Layer 2: Local Strategy Check
├── Checks config.auth.disableLocalStrategy
└── Throws Forbidden if disabled

Layer 3: Existing Users Check (CRITICAL)
├── Queries database for any existing user
└── Throws Forbidden if users already exist
```

**Important:** There is **NO NODE_ENV check**. Security relies entirely on "no existing users" check.

### 11.3 Request/Response Flow (PayloadCMS)

**Request:**
```
POST /users/first-register
Content-Type: application/json
Body: {
  "email": "admin@example.com",
  "password": "securePassword123",
  "confirm-password": "securePassword123"
}
```

**Success Response (200):**
Returns user data plus `Set-Cookie` header for auth token.

**Failure Response (403):** When users already exist - returns forbidden error.

### 11.4 Password Handling (PayloadCMS)

**Hashing Algorithm:** PBKDF2 with SHA-256, 25000 iterations

**Salt:** 32 random bytes, hex-encoded
**Hash:** 512 bytes output

**Validation:** Only `minLength` (default: 3, no complexity requirements)

### 11.5 DeesseJS Implementation: `/admin/create-first-admin` Route

Based on PayloadCMS analysis, we recommend implementing a similar route with three-layer protection.

**Route Design:** `POST /api/admin/create-first-admin`

**Request/Response Shapes:**

| Response | Description |
|----------|-------------|
| Success (200) | Returns created user object with id, email, name, role |
| Validation Error (400) | Invalid email format or password too short |
| Forbidden (403) | Admin users already exist |

**Key Differences from PayloadCMS:**

| Aspect | PayloadCMS | DeesseJS (Proposed) |
|--------|------------|---------------------|
| Route | `/{slug}/first-register` | `/api/admin/create-first-admin` |
| Env Check | None | `NODE_ENV !== 'production'` |
| Password Hashing | PBKDF2 (25000 iter) | bcrypt (better-auth default) |
| Confirmation | `confirm-password` field | Not needed (simple UX) |
| Auto-login | Returns JWT token | Returns user, client handles session |

---

## 12. Better-Auth Login & Forgot-Password Pages

### 12.1 Sign-In (Login) Flow

**Endpoint:** `POST /api/auth/sign-in/email`

The client uses `createAuthClient()` to call this endpoint with email and password credentials.

**Response includes:** redirect flag, token, user object

### 12.2 Session Management

Session state is managed via the `useSession` hook from the auth client.

**Session Data Structure:**

| Field | Type | Description |
|-------|------|-------------|
| user.id | string | Unique user identifier |
| user.email | string | User email address |
| user.name | string? | Optional user name |
| user.emailVerified | boolean | Whether email is verified |
| session.id | string | Session identifier |
| session.expiresAt | Date | Session expiration |
| session.token | string | JWT session token |

### 12.3 Forgot Password / Reset Password Flow

**Password Reset Flow:**
1. User submits email to request reset
2. Server generates token, sends email via configured callback
3. User clicks email link with token
4. User submits new password with token
5. Server validates token, updates password, revokes sessions

**Client Methods:**

| Method | Purpose |
|--------|---------|
| `forgetPassword()` | Request password reset email |
| `resetPassword()` | Complete password reset with token |

**Security Notes:**
- Tokens are cryptographically random, single-use
- Default expiry: 1 hour
- Sessions are revoked on password reset

### 12.4 Protected Routes / Middleware

**Middleware Pattern:**
- Check for session cookie on protected routes
- Redirect unauthenticated users to login with callback URL
- Validate session on each request via `/api/auth/get-session`

### 12.5 Error Handling Patterns

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_EMAIL` | Invalid email format |
| 400 | `INVALID_TOKEN` | Token is invalid or expired |
| 401 | `INVALID_EMAIL_OR_PASSWORD` | Wrong credentials |
| 429 | `TOO_MANY_REQUESTS` | Rate limited |
| 403 | `EMAIL_NOT_VERIFIED` | Email verification required |

### 12.6 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/sign-in/email` | POST | Sign in with email/password |
| `/api/auth/sign-out` | POST | Sign out current session |
| `/api/auth/get-session` | GET | Get current session |
| `/api/auth/request-password-reset` | POST | Request password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/verify-email` | POST | Verify email with token |

### 12.7 Security Considerations

| Aspect | Protection |
|--------|------------|
| **Password Reset** | Token uses crypto-random 24-char ID, 1-hour expiry, one-time use |
| **Email Enumeration** | Always returns success to prevent email enumeration |
| **Rate Limiting** | Built-in on sign-in endpoint (429 response) |
| **Session Fixation** | New session on login |
| **Cookie Security** | HTTP-only, Secure (prod), SameSite |

---

## Appendix: Better Auth Client-Only Reference

### What is Client-Only Auth?

Better-auth provides a framework-agnostic client (`createAuthClient`) that communicates with better-auth server endpoints over HTTP.

### When Client-Only is Appropriate

- Traditional web app where server handles auth logic
- Want to minimize DB queries with cookie caching
- Framework-agnostic auth (React, Vue, Svelte, etc.)
- Separate backend already using better-auth server

### Security Trade-offs

| Cookie Strategy | Size | Security | Use Case |
|-----------------|------|----------|----------|
| `compact` (HMAC-SHA256) | Smallest | Signed only | Performance-critical |
| `jwt` (HS256) | Medium | Signed | External integrations |
| `jwe` | Largest | Encrypted | Maximum security |

### Session Revocation Note

When cookie caching is enabled, revoked sessions may remain active until cache expires. For immediate revocation:
- Disable cookie cache
- Use shorter `maxAge` values
- Use better-auth's `revokeSession()` API

---

**Report Generated:** 2026-04-14
**Analysis Method:** Codebase exploration + better-auth documentation research
**Confidence:** High
