# Payload CMS Admin Authentication Flow

## Overview

This document describes the complete authentication flow in Payload CMS 3.x, covering:
1. First admin user creation
2. Login flow for admin users
3. Authentication mechanisms
4. Admin dashboard authentication handling
5. Security considerations

---

## 1. First Admin User Creation

### The `/create-first-user` Route

When a Payload CMS instance has no users in the database, the system automatically redirects to the first user creation route at `/create-first-user` (configurable via `config.admin.routes.createFirstUser`).

**Key Files:**
- `packages/next/src/views/CreateFirstUser/index.tsx` - Server component that renders the first user view
- `packages/next/src/views/CreateFirstUser/index.client.tsx` - Client component with the form

**Flow:**
1. User visits `/create-first-user`
2. The `CreateFirstUserView` component checks if `dbHasUser` is false in `RootPage`
3. If no users exist, the first user creation form is displayed
4. The form POSTs to `/api/{userSlug}/first-register`

**First User Form Features:**
```tsx
// From index.client.tsx
<Form
  action={formatAdminURL({
    apiRoute,
    path: `/${userSlug}/first-register`,
  })}
  method="POST"
  onSuccess={handleFirstRegister}
  redirect={admin}
>
```

The form includes:
- Email field (or username if `loginWithUsername` is enabled)
- Password field
- Confirm password field
- Additional collection fields (if any)

### The `first-register` Endpoint

**File:** `packages/payload/src/auth/endpoints/registerFirstUser.ts`

```typescript
export const registerFirstUserHandler: PayloadHandler = async (req) => {
  const collection = getRequestCollection(req)
  const { data, t } = req
  const authData = collection.config.auth?.loginWithUsername
    ? {
        email: typeof req.data?.email === 'string' ? req.data.email : '',
        password: typeof req.data?.password === 'string' ? req.data.password : '',
        username: typeof req.data?.username === 'string' ? req.data.username : '',
      }
    : {
        email: typeof req.data?.email === 'string' ? req.data.email : '',
        password: typeof req.data?.password === 'string' ? req.data.password : '',
      }

  const result = await registerFirstUserOperation({
    collection,
    data: {
      ...data,
      ...authData,
    },
    req,
  })
  // ... set cookie and return response
}
```

### The `registerFirstUserOperation`

**File:** `packages/payload/src/auth/operations/registerFirstUser.ts`

**Key Logic:**
1. **Checks if local strategy is disabled** - throws `Forbidden` if disabled
2. **Checks if any user exists** - if a user already exists, throws `Forbidden` (prevents duplicate registration)
3. **Validates username/email** using `ensureUsernameOrEmail`
4. **Creates the user** with `payload.create()`
5. **Auto-verifies** the user if `verify` option is enabled
6. **Automatically logs in** the new user by calling `payload.login()`

```typescript
export const registerFirstUserOperation = async <TSlug extends AuthCollectionSlug>(
  args: Arguments<TSlug>,
): Promise<Result<DataFromCollectionSlug<TSlug>>> => {
  // ... validation ...

  const doc = await payload.db.findOne({
    collection: config.slug,
    req,
    where,
  })

  if (doc) {
    throw new Forbidden(req.t)  // User already exists
  }

  const result = await payload.create<TSlug, SelectType>({
    collection: slug as TSlug,
    data,
    overrideAccess: true,
    req,
  })

  // Auto-verify if applicable
  if (verify) {
    await payload.update({
      id: result.id,
      collection: slug,
      data: { _verified: true },
      req,
    })
  }

  // Log in the new user
  const { exp, token } = await payload.login({
    ...args,
    collection: slug,
    req,
  })
  // ...
}
```

---

## 2. Login Flow for Admin Users

### The `/login` Route

**File:** `packages/next/src/views/Login/index.tsx`

**Flow:**
1. User visits `/login`
2. If user is already logged in (`req.user` exists), redirect to admin dashboard
3. If `autoLogin` is configured and `prefillOnly` is true, credentials are prefilled
4. Renders `LoginForm` component

**Public Route Configuration:**
```typescript
// packages/next/src/utilities/isPublicAdminRoute.ts
const publicAdminRoutes = [
  'createFirstUser',
  'forgot',
  'login',
  'logout',
  'forgot',
  'inactivity',
  'unauthorized',
  'reset',
]
```

### Login Form

**File:** `packages/next/src/views/Login/LoginForm/index.tsx`

```tsx
<Form
  action={formatAdminURL({
    apiRoute,
    path: `/${userSlug}/login`,
  })}
  method="POST"
  onSuccess={handleLogin}
  redirect={getSafeRedirect({ fallbackTo: adminRoute, redirectTo: searchParams?.redirect })}
>
```

The form POSTs to `/api/{userSlug}/login` with:
- `email` (or `username` if loginWithUsername is enabled)
- `password`

### The `login` Endpoint

**File:** `packages/payload/src/auth/endpoints/login.ts`

```typescript
export const loginHandler: PayloadHandler = async (req) => {
  const collection = getRequestCollection(req)
  const { searchParams, t } = req
  const depth = searchParams.get('depth')
  const authData = {
    email: typeof req.data?.email === 'string' ? req.data.email : '',
    password: typeof req.data?.password === 'string' ? req.data.password : '',
    username: typeof req.data?.username === 'string' ? req.data.username : '',
  }

  const result = await loginOperation({
    collection,
    data: authData,
    depth: isNumber(depth) ? Number(depth) : undefined,
    req,
  })

  const cookie = generatePayloadCookie({
    collectionAuthConfig: collection.config.auth,
    cookiePrefix: req.payload.config.cookiePrefix,
    token: result.token!,
  })

  return Response.json(
    { message: t('authentication:passed'), ...result },
    { headers: headersWithCors({ ... }), status: httpStatus.OK }
  )
}
```

### The `loginOperation`

**File:** `packages/payload/src/auth/operations/login.ts`

**Complete Flow:**
1. **Input Validation** - Validates email/username and password are provided
2. **Build Query** - Creates WHERE clause to find user by email and/or username
3. **Find User** - Queries database for matching user
4. **Check Lock Status** - Throws `LockedAuth` if user is locked out
5. **Authenticate** - Uses `authenticateLocalStrategy` to verify password
6. **Check Verification** - If `verify` is enabled, checks if email is verified
7. **Add Session** - If sessions are enabled, creates a new session
8. **Reset Login Attempts** - If `maxLoginAttempts` is enabled, resets failed attempts
9. **Execute Hooks** - Runs `beforeLogin` and `afterLogin` hooks
10. **Generate JWT** - Signs and returns JWT token
11. **Set Cookie** - Generates `payload-token` cookie

**Password Verification (PBKDF2):**
```typescript
// packages/payload/src/auth/strategies/local/authenticate.ts
export const authenticateLocalStrategy = async ({ doc, password }: Args): Promise<Doc | null> => {
  try {
    const { hash, salt } = doc
    if (typeof salt === 'string' && typeof hash === 'string') {
      const res = await new Promise<Doc | null>((resolve, reject) => {
        crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (e, hashBuffer) => {
          // Uses 25,000 iterations SHA-256
          const storedHashBuffer = Buffer.from(hash, 'hex')
          if (crypto.timingSafeEqual(hashBuffer, storedHashBuffer)) {
            resolve(doc)
          } else {
            reject(new Error('Invalid password'))
          }
        })
      })
      return res
    }
    return null
  } catch (ignore) {
    return null
  }
}
```

---

## 3. Authentication Mechanisms

### JWT Token Structure

**File:** `packages/payload/src/auth/jwt.ts`

```typescript
export const jwtSign = async ({
  fieldsToSign,
  secret,
  tokenExpiration,
}) => {
  const secretKey = new TextEncoder().encode(secret)
  const issuedAt = Math.floor(Date.now() / 1000)
  const exp = issuedAt + tokenExpiration
  const token = await new SignJWT(fieldsToSign)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(exp)
    .sign(secretKey)
  return { exp, token }
}
```

### JWT Fields (Default)

From `getFieldsToSign`:
```typescript
const result = {
  id: user?.id,
  collection: collectionConfig.slug,
  email,
}
```

Additional fields can be included if they have `saveToJWT: true` in their field config.

### JWT Extraction Order

**File:** `packages/payload/src/auth/extractJWT.ts`

**Config:** `config.auth.jwtOrder` defaults to `['JWT', 'Bearer', 'cookie']`

```typescript
const extractionMethods = {
  Bearer: ({ headers }) => {
    // Looks for Authorization: Bearer <token>
  },
  JWT: ({ headers }) => {
    // Looks for Authorization: JWT <token>
  },
  cookie: ({ headers, payload }) => {
    // Looks for ${cookiePrefix}-token cookie
    // Enforces CSRF protection via Origin/Sec-Fetch-Site headers
  },
}
```

### Cookie Configuration

**File:** `packages/payload/src/auth/cookies.ts`

```typescript
export const generatePayloadCookie = ({
  collectionAuthConfig,
  cookiePrefix,
  token,
}) => {
  return generateCookie({
    name: `${cookiePrefix}-token`,  // e.g., "payload-token"
    httpOnly: true,
    secure: collectionAuthConfig.cookies.secure,
    sameSite: collectionAuthConfig.cookies.sameSite ?? 'Strict',
    expires: getCookieExpiration({ seconds: collectionAuthConfig.tokenExpiration }),
  })
}
```

### Sessions (Optional)

**File:** `packages/payload/src/auth/sessions.ts`

When `useSessions: true` (default), each login creates a session:
```typescript
export const addSessionToUser = async ({
  collectionConfig,
  payload,
  req,
  user,
}) => {
  if (collectionConfig.auth.useSessions) {
    const sid = uuid()
    const expiresAt = new Date(now.getTime() + tokenExpiration * 1000)
    const session = { id: sid, createdAt: now, expiresAt }

    user.sessions.push(session)
    await payload.db.updateOne({
      id: user.id,
      collection: collectionConfig.slug,
      data: user,
    })
  }
}
```

---

## 4. Admin Dashboard Authentication Handling

### Access Control Check

**File:** `packages/payload/src/utilities/canAccessAdmin.ts`

```typescript
export const canAccessAdmin = async ({ req }: { req: PayloadRequest }) => {
  const incomingUserSlug = req.user?.collection
  const adminUserSlug = req.payload.config.admin.user

  if (incomingUserSlug) {
    // User is logged in
    const adminAccessFn = req.payload.collections[incomingUserSlug]?.config.access?.admin
    if (adminAccessFn) {
      const canAccess = await adminAccessFn({ req })
      if (!canAccess) throw new UnauthorizedError()
    } else if (adminUserSlug !== incomingUserSlug) {
      throw new UnauthorizedError()
    }
  } else {
    // No user logged in
    const hasUsers = await req.payload.find({
      collection: adminUserSlug,
      depth: 0,
      limit: 1,
    })

    // If users exist, deny access (redirects to login)
    // If no users exist, allow access (for first-user creation)
    if (hasUsers.docs.length) {
      throw new UnauthorizedError()
    }
  }
}
```

### Route Protection in RootPage

**File:** `packages/next/src/views/Root/index.tsx`

```typescript
if (
  !permissions.canAccessAdmin &&
  !isPublicAdminRoute({ adminRoute, config: payload.config, route: currentRoute }) &&
  !isCustomAdminView({ ... })
) {
  redirect(
    handleAuthRedirect({
      config: payload.config,
      route: currentRoute,
      user: req.user,
    })
  )
}

// Redirect to /create-first-user if no users exist
if (!dbHasUser && currentRoute !== createFirstUserRoute && !disableLocalStrategy) {
  redirect(createFirstUserRoute)
}

// Redirect to /admin if user already exists and visiting /create-first-user
if (dbHasUser && currentRoute === createFirstUserRoute) {
  redirect(adminRoute)
}
```

### Public vs Protected Routes

**Public Routes** (accessible without authentication):
- `/login`
- `/logout`
- `/create-first-user` (only when no users exist)
- `/forgot` (password reset request)
- `/reset` (password reset)
- `/unauthorized`

**Protected Routes** (require authentication):
- All other `/admin/*` routes except those above

### Permissions Calculation

**File:** `packages/payload/src/auth/getAccessResults.ts`

After login, `getAccessResults` computes user permissions:
```typescript
export async function getAccessResults({ req }): Promise<SanitizedPermissions> {
  const results = { collections: {}, globals: {} }
  const { user } = req

  if (userCollectionConfig && payload.config.admin.user === user?.collection) {
    results.canAccessAdmin = userCollectionConfig.access.admin
      ? await userCollectionConfig.access.admin({ req })
      : isLoggedIn
  }

  // Calculate permissions for all collections...
  return sanitizePermissions(results)
}
```

---

## 5. Security Considerations

### Password Hashing

- **Algorithm:** PBKDF2 with HMAC-SHA256
- **Iterations:** 25,000
- **Key Length:** 512 bits (64 bytes)
- **Salt:** 32 bytes of cryptographically random data, stored as hex

```typescript
// From generatePasswordSaltHash.ts
const hashRaw = await pbkdf2Promisified(passwordToSet, salt)  // 25000 iterations
const hash = hashRaw.toString('hex')
```

### Brute Force Protection

**File:** `packages/payload/src/auth/strategies/local/incrementLoginAttempts.ts`

If `maxLoginAttempts` is configured (default: 0 = disabled):
- Track failed login attempts on user document
- Lock account after `maxLoginAttempts` failures
- `lockTime` determines lockout duration (default: 1 hour)

```typescript
if (maxLoginAttemptsEnabled) {
  await incrementLoginAttempts({
    collection: collectionConfig,
    payload: req.payload,
    user,
  })
}
```

### CSRF Protection

**File:** `packages/payload/src/auth/extractJWT.ts`

Cookie-based JWT extraction enforces CSRF protection:
```typescript
cookie: ({ headers, payload }) => {
  const origin = headers.get('Origin')

  if (origin) {
    // Origin present — validate against csrf allowlist
    if (payload.config.csrf.length === 0 || payload.config.csrf.includes(origin)) {
      return cookieToken
    }
    return null
  }

  // No Origin — enforce via Sec-Fetch-Site
  const secFetchSite = headers.get('Sec-Fetch-Site')
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none') {
    return cookieToken
  }
  return null
}
```

### Token Expiration

- **Default:** 2 hours (7200 seconds)
- **Configurable** via `collection.auth.tokenExpiration`
- Session cookies expire at the same time

### Email Verification (Optional)

When `verify: true` is set on the auth collection:
- New users start as unverified (`_verified: false`)
- They must click a verification link before logging in
- The `UnverifiedEmail` error is thrown during login

### Auto-Login Feature (Development)

**File:** `packages/payload/src/auth/strategies/jwt.ts`

In development, `config.admin.autoLogin` can prefill credentials:
```typescript
autoLogin: {
  email: 'dev@payloadcms.com',
  password: 'test',
  prefillOnly: true,  // User must still click login
}
```

**WARNING:** This should NEVER be enabled in production.

### Custom Auth Strategies

Auth collections can define custom strategies:
```typescript
auth: {
  strategies: [
    {
      name: 'my-strategy',
      authenticate: async ({ headers, payload }) => {
        // Return user or null
      }
    }
  ]
}
```

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIRST VISIT (No Users)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  RootPage detects: !dbHasUser && currentRoute !== createFirstUser │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           Redirect to /create-first-user                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            CreateFirstUserView renders form                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         POST /api/{userSlug}/first-register                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           registerFirstUserOperation                             │
│  1. Check no users exist                                         │
│  2. Create user with hashed password                             │
│  3. Auto-verify if required                                      │
│  4. Call loginOperation()                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              JWT Token + Cookie generated                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           Redirect to /admin (dashboard)                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 SUBSEQUENT VISIT (Has Users)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RootPage                                      │
│  - Redirects to /login if !req.user                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               LoginView renders form                            │
│  - Checks if user already logged in                              │
│  - Auto-fill if autoLogin configured                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              POST /api/{userSlug}/login                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  loginOperation                                 │
│  1. Validate inputs                                              │
│  2. Find user by email/username                                  │
│  3. Verify password (PBKDF2)                                    │
│  4. Check maxLoginAttempts / lock status                         │
│  5. Create session (if enabled)                                  │
│  6. Reset login attempts                                        │
│  7. Execute beforeLogin/afterLogin hooks                        │
│  8. Generate JWT with fieldsToSign                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           Set payload-token cookie + return JSON                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              getAccessResults calculates permissions              │
│  - canAccessAdmin                                               │
│  - Collection permissions                                       │
│  - Global permissions                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Admin Dashboard rendered                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Configuration Options

```typescript
// In payload.config.ts
export default defineConfig({
  admin: {
    user: 'users',  // Collection slug for admin users
    autoLogin: false,  // { email, password, prefillOnly }
    routes: {
      createFirstUser: '/create-first-user',
      login: '/login',
      logout: '/logout',
    },
  },
  collections: [
    {
      slug: 'users',
      auth: {
        tokenExpiration: 7200,  // 2 hours
        maxLoginAttempts: 0,  // 0 = disabled
        lockTime: 3600000,  // 1 hour lockout
        useSessions: true,
        verify: false,  // Email verification
        loginWithUsername: false,
        cookies: {
          secure: true,
          sameSite: 'Strict',
        },
      },
    },
  ],
})
```

---

## Summary

The Payload CMS authentication system provides:

1. **First User Creation**: A dedicated route when no users exist, with automatic login after creation
2. **Login Flow**: Email/username + password authentication with comprehensive validation
3. **JWT + Cookie Auth**: Two authentication mechanisms with configurable extraction order
4. **Session Management**: Optional session tracking for enhanced security
5. **Password Security**: PBKDF2 with 25,000 iterations
6. **Brute Force Protection**: Optional account lockout after failed attempts
7. **CSRF Protection**: Via cookie origin validation
8. **Route Protection**: Automatic redirect to login when unauthenticated

This system is designed to be flexible while maintaining strong security defaults, suitable for both development and production environments.

---

## 6. Admin User Detection and Redirect Flow (DeesseJS Implementation)

### How `hasAdminUsers` Gets Determined

The `hasAdminUsers` function is defined in `packages/deesse/src/lib/admin.ts`:

```typescript
export async function hasAdminUsers(auth: Auth): Promise<boolean> {
  try {
    // Access internal adapter directly - bypasses all auth middleware
    const context = await auth.$context;
    const users = await context.internalAdapter.listUsers(100);
    return users.some((u: any) => u.role === "admin") ?? false;
  } catch {
    return false;
  }
}
```

**Key aspects:**
- Uses the internal adapter's `listUsers` method directly, bypassing all authentication middleware
- This bypass is necessary because the regular `listUsers` API endpoint requires admin permissions, creating a circular dependency when checking if an admin exists
- Lists up to 100 users and checks if any have `role === "admin"`
- Returns `false` on error (fail-safe default)

### Exact Flow from `/admin` to `/admin/create-first-user`

The `RootPage` in `packages/next/src/root-page.tsx` is a **server component** that handles all admin routing:

```typescript
export async function RootPage<Options extends BetterAuthOptions>({
  config,
  auth,
  params,
}: RootPageProps<Options>) {
  const slugParts = extractSlugParts(params);

  // Check if this is the login page
  const isLoginPage = slugParts.length === 1 && slugParts[0] === "login";

  // If this is the login page, always show LoginPage
  if (isLoginPage) {
    return <LoginPage />;
  }

  // In development: check if we need to show first-admin-setup
  // First, try to get session
  const session = await (auth.api as any).getSession({
    headers: requestHeaders,
  });

  // If no session exists, redirect to login
  if (!session) {
    redirect("/admin/login");
  }

  // Session exists - check if admin users exist (using internal adapter, no auth needed)
  const adminExists = await hasAdminUsers(auth as any);

  // If no admin users exist, show first admin setup
  if (!adminExists) {
    return <FirstAdminSetup />;
  }

  // Show the protected page
  const result = findPage(config.pages, slugParts);
  // ...
}
```

**Flow Steps:**
1. User visits `/admin` (root admin route)
2. `RootPage` receives the request as a server component
3. `extractSlugParts(params)` parses the URL - for `/admin`, this returns `[]` (empty array)
4. `isLoginPage` is `false` since `slugParts[0]` is not `"login"`
5. In **development mode** only: `getSession()` is called to check if user is logged in
6. If not logged in: redirects to `/admin/login`
7. If logged in: calls `hasAdminUsers(auth)` to check if any admin exists
8. If no admin exists (`!adminExists`): renders `<FirstAdminSetup />` instead of page content
9. If admin exists: finds and renders the appropriate page from `config.pages`

**Important:** When no admin exists, it does NOT redirect to a separate `/create-first-user` URL. Instead, `FirstAdminSetup` is rendered in place when `!adminExists`. The URL stays at `/admin` (or whatever route was accessed), but the content shows the first admin setup form.

### The `adminExists` Variable

The codebase uses `adminExists` rather than `dbHasUser`:

```typescript
const adminExists = await hasAdminUsers(auth as any);
```

Where `hasAdminUsers` returns `true` if at least one user with `role === "admin"` exists in the database.

### API/Database Query to Check User Existence

```typescript
const context = await auth.$context;
const users = await context.internalAdapter.listUsers(100);
return users.some((u: any) => u.role === "admin") ?? false;
```

- **Method:** `context.internalAdapter.listUsers(100)` - Better Auth's internal adapter
- **Bypasses auth:** No authentication headers required because it uses the internal adapter directly
- **Pagination:** Limited to 100 users (sufficient since we only need to know if ANY admin exists)
- **Filter:** Checks each user for `role === "admin"` role

### Redirect Logic in RootPage

The redirect logic is **development-only**:

```typescript
// In production: just check session and show protected page
if (process.env['NODE_ENV'] === "production") {
  const session = await (auth.api as any).getSession({
    headers: requestHeaders,
  });
  if (!session) {
    redirect("/admin/login");
  }
  // ... render page
}

// In development: check if we need to show first-admin-setup
const session = await (auth.api as any).getSession({
  headers: requestHeaders,
});

if (!session) {
  redirect("/admin/login");
}

const adminExists = await hasAdminUsers(auth as any);

if (!adminExists) {
  return <FirstAdminSetup />;  // Not a URL redirect - renders in place
}
```

**Important:** When no admin exists, it does NOT redirect to a separate `/create-first-user` route. Instead, it renders `FirstAdminSetup` component directly at whatever URL was requested. The URL does not change.

### Timing: Server Component vs Client Component

| Component | Type | Purpose |
|-----------|------|---------|
| `RootPage` | **Server Component** | Handles auth check, admin existence check, and routing |
| `LoginPage` | Client Component (`"use client"`) | Renders login form, handles submit |
| `FirstAdminSetup` | Client Component (`"use client"`) | Renders first admin creation form, handles submit |

**Server Component benefits:**
- Direct database access via `internalAdapter.listUsers` (no API round-trip)
- Secure session checking via `getSession`
- No sensitive data sent to client until auth verified

**Client Component flow:**
- `FirstAdminSetup` posts to `/api/first-admin`
- The `/api/first-admin` route (in `routes.ts`) handles the actual user creation
- On success, redirects to `/admin/login?created=true`

### First Admin Creation API Flow

When `FirstAdminSetup` form is submitted:

1. POST to `/api/first-admin` with `{ name, email, password }`
2. `REST_POST` in `routes.ts` intercepts this
3. `handleFirstAdmin` function validates:
   - Not production
   - No admin exists already
   - Required fields present
   - Password length >= 8
   - Email is valid via `validateAdminEmail`
4. Creates user via `(auth.api as any).createUser()`
5. Returns success response

### Key Files

- `packages/next/src/root-page.tsx` - Server component handling the admin redirect logic
- `packages/deesse/src/lib/admin.ts` - `hasAdminUsers` function implementation
- `packages/next/src/routes.ts` - `/api/first-admin` endpoint
- `packages/next/src/components/first-admin-setup.tsx` - Client component for first admin form
- `packages/next/src/components/login-page.tsx` - Login form component
