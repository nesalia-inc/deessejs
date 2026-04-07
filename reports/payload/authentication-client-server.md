# Payload CMS Authentication: Client-Side vs Server-Side Operations

## 1. Executive Summary

Payload CMS provides a comprehensive authentication system built on JWT (JSON Web Tokens) with session management capabilities. The authentication architecture distinguishes clearly between client-side and server-side operations, with the server-side being the authoritative source for all authentication decisions.

Key characteristics:
- **JWT-based authentication** with configurable token expiration (default: 2 hours)
- **Session management** stored on user documents in the database
- **Multiple token extraction methods**: Bearer token, JWT header, or HTTP-only cookies
- **CSRF protection** built into cookie-based authentication
- **Hooks system** for extending authentication behavior at various points

---

## 2. Authentication Architecture Overview

### Auth Collection Configuration

An auth-enabled collection differs from a regular collection by having the `auth` property set:

```typescript
// From: packages/payload/src/collections/config/types.ts (line 583)
export type CollectionConfig<TSlug extends CollectionSlug = any> = {
  auth?: boolean | IncomingAuthType
  // ...
}
```

Default auth settings (from `packages/payload/src/collections/config/defaults.ts`):

```typescript
export const authDefaults: IncomingAuthType = {
  cookies: {
    sameSite: 'Lax',
    secure: false,
  },
  forgotPassword: {},
  lockTime: 600000,        // 10 minutes
  loginWithUsername: false,
  maxLoginAttempts: 5,
  tokenExpiration: 7200,   // 2 hours in seconds
  useSessions: true,
  verify: false,
}
```

### Auth-Related Fields Added to Users

When `auth: true` is enabled, users collection automatically includes:
- `hash` - Password hash (PBKDF2)
- `salt` - Password salt
- `_verified` - Email verification status
- `_lockUntil` - Account lock expiration
- `loginAttempts` - Failed login attempt counter
- `resetPasswordToken` - Password reset token
- `resetPasswordExpiration` - Password reset token expiration
- `sessions` - Array of session objects with `id`, `createdAt`, `expiresAt`

---

## 3. Server-Side Authentication

### The `PayloadRequest` Object

The `PayloadRequest` type (from `packages/payload/src/types/index.ts`) contains all authentication-related information:

```typescript
export interface PayloadRequest
  extends CustomPayloadRequestProperties,
    Partial<Request>,
    PayloadRequestData {
  headers: Request['headers']
  // ...
}

type CustomPayloadRequestProperties = {
  // ...
  user: null | TypedUser          // The authenticated user
  payload: typeof payload          // The Payload instance
  responseHeaders?: Headers       // Headers to set in response
  // ...
}
```

### Auth Operations Flow

#### Login Operation (`loginOperation`)

**File**: `packages/payload/src/auth/operations/login.ts`

The login operation follows this sequence:

1. **Input Validation** - Validates email/username and password presence
2. **User Lookup** - Queries database for user by email or username
3. **Permission Check** - Checks if user is locked via `checkLoginPermission()`
4. **Password Verification** - Uses `authenticateLocalStrategy()` with PBKDF2
5. **Login Attempts** - Increments counter on failure, resets on success
6. **Session Creation** - Creates session via `addSessionToUser()` if `useSessions` enabled
7. **JWT Signing** - Signs JWT with `jwtSign()` containing fields from `getFieldsToSign()`
8. **Hooks Execution** - Runs `beforeLogin` and `afterLogin` hooks
9. **Cookie Generation** - Sets HTTP-only cookie via `generatePayloadCookie()`

**Key code snippet** (login flow):

```typescript
// From login.ts lines 323-327
const { exp, token } = await jwtSign({
  fieldsToSign,
  secret,
  tokenExpiration: collectionConfig.auth.tokenExpiration,
})
```

### JWT Token Structure

**File**: `packages/payload/src/auth/jwt.ts`

```typescript
export const jwtSign = async ({
  fieldsToSign,
  secret,
  tokenExpiration,
}: {
  fieldsToSign: Record<string, unknown>
  secret: string
  tokenExpiration: number
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

The JWT contains fields defined by `getFieldsToSign()`:
- `id` - User ID
- `collection` - Collection slug
- `email` - User email
- `sid` - Session ID (if sessions enabled)
- Custom fields with `saveToJWT: true` in field config

### Session Management

**File**: `packages/payload/src/auth/sessions.ts`

```typescript
export const addSessionToUser = async ({
  collectionConfig,
  payload,
  req,
  user,
}: {
  collectionConfig: SanitizedCollectionConfig
  payload: Payload
  req: PayloadRequest
  user: TypedUser
}): Promise<{ sid?: string }> => {
  let sid: string | undefined
  if (collectionConfig.auth.useSessions) {
    sid = uuid()  // Generate unique session ID
    const now = new Date()
    const tokenExpInMs = collectionConfig.auth.tokenExpiration * 1000
    const expiresAt = new Date(now.getTime() + tokenExpInMs)

    const session = { id: sid, createdAt: now, expiresAt }

    // Add session, remove expired sessions
    if (!user.sessions?.length) {
      user.sessions = [session]
    } else {
      user.sessions = removeExpiredSessions(user.sessions)
      user.sessions.push(session)
    }
    // ... update user in database
  }
  return { sid }
}
```

### Token Extraction Methods

**File**: `packages/payload/src/auth/extractJWT.ts`

Payload supports multiple JWT extraction strategies in order:

```typescript
const extractionMethods: Record<string, ExtractionMethod> = {
  Bearer: ({ headers }) => {
    // RFC6750 OAuth 2.0 Bearer token
    const jwtFromHeader = headers.get('Authorization')
    if (jwtFromHeader?.startsWith('Bearer ')) {
      return jwtFromHeader.replace('Bearer ', '')
    }
    return null
  },
  cookie: ({ headers, payload }) => {
    // Extract from cookie with CSRF protection
    const cookies = parseCookies(headers)
    const tokenCookieName = `${payload.config.cookiePrefix}-token`
    // CSRF validation based on Origin header or Sec-Fetch-Site
    // ...
  },
  JWT: ({ headers }) => {
    // Legacy JWT prefix (non-standard)
    const jwtFromHeader = headers.get('Authorization')
    if (jwtFromHeader?.startsWith('JWT ')) {
      return jwtFromHeader.replace('JWT ', '')
    }
    return null
  },
}
```

The extraction order is configurable via `config.auth.jwtOrder`.

### Auth Endpoint Handlers

**Login Handler**: `packages/payload/src/auth/endpoints/login.ts`

```typescript
export const loginHandler: PayloadHandler = async (req) => {
  const collection = getRequestCollection(req)
  const { searchParams, t } = req
  const depth = searchParams.get('depth')

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
    {
      headers: headersWithCors({
        headers: new Headers({ 'Set-Cookie': cookie }),
        req,
      }),
      status: httpStatus.OK,
    }
  )
}
```

### Auth Strategy Execution

**File**: `packages/payload/src/auth/executeAuthStrategies.ts`

```typescript
export const executeAuthStrategies = async (
  args: AuthStrategyFunctionArgs,
): Promise<AuthStrategyResult> => {
  let result: AuthStrategyResult = { user: null }

  for (const strategy of args.payload.authStrategies) {
    args.strategyName = strategy.name
    args.isGraphQL = Boolean(args.isGraphQL)
    args.canSetHeaders = Boolean(args.canSetHeaders)

    try {
      const authResult = await strategy.authenticate(args)
      // Merge response headers if allowed
      if (authResult.responseHeaders) {
        authResult.responseHeaders = mergeHeaders(...)
      }
      result = authResult
    } catch (err) {
      logError({ err, payload: args.payload })
    }

    if (result.user) {
      return result  // Return on first successful auth
    }
  }
  return result
}
```

### Access Control

**File**: `packages/payload/src/auth/getAccessResults.ts`

After authentication, permissions are computed:

```typescript
export async function getAccessResults({
  req,
}: GetAccessResultsArgs): Promise<SanitizedPermissions> {
  const results = { collections: {}, globals: {} } as Permissions
  const { payload, user } = req

  const isLoggedIn = !!user
  const userCollectionConfig = user?.collection
    ? payload?.collections?.[user.collection]?.config
    : null

  // Admin access check
  if (userCollectionConfig && payload.config.admin.user === user?.collection) {
    results.canAccessAdmin = userCollectionConfig.access.admin
      ? await userCollectionConfig.access.admin({ req })
      : isLoggedIn
  }

  // Compute permissions for each collection
  await Promise.all(
    payload.config.collections.map(async (collection) => {
      const collectionPermissions = await getEntityPermissions({
        entity: collection,
        entityType: 'collection',
        fetchData: false,
        operations: ['create', 'read', 'update', 'delete', 'unlock', 'readVersions'],
        req,
      })
      results.collections![collection.slug] = collectionPermissions
    })
  )
  // ...
}
```

---

## 4. Client-Side Authentication

### Server Actions for Auth (Next.js)

**File**: `packages/next/src/auth/login.ts`

```typescript
'use server'

export async function login<TSlug extends AuthCollectionSlug>({
  collection,
  config,
  email,
  password,
  username,
}: LoginArgs<TSlug>): Promise<LoginResult<TSlug>> {
  const payload = await getPayload({ config, cron: true })
  const authConfig = payload.collections[collection]?.config.auth

  const loginWithUsername = authConfig?.loginWithUsername ?? false

  let loginData
  if (loginWithUsername) {
    loginData = username ? { password, username } : { email, password }
  } else {
    loginData = { email, password }
  }

  const result = await payload.login({
    collection,
    data: loginData,
  })

  if (result.token) {
    await setPayloadAuthCookie({
      authConfig,
      cookiePrefix: payload.config.cookiePrefix,
      token: result.token,
    })
  }

  return result
}
```

### Setting Auth Cookie (Client-side)

**File**: `packages/next/src/utilities/setPayloadAuthCookie.ts`

```typescript
export async function setPayloadAuthCookie({
  authConfig,
  cookiePrefix,
  token,
}: SetPayloadAuthCookieArgs): Promise<void> {
  const cookies = await getCookies()

  const payloadCookie = generatePayloadCookie({
    collectionAuthConfig: authConfig,
    cookiePrefix,
    returnCookieAsObject: true,
    token,
  })

  if (payloadCookie.value) {
    cookies.set(payloadCookie.name, payloadCookie.value, {
      domain: authConfig.cookies.domain,
      expires: payloadCookie.expires ? new Date(payloadCookie.expires) : undefined,
      httpOnly: true,
      sameSite: typeof authConfig.cookies.sameSite === 'string'
        ? authConfig.cookies.sameSite.toLowerCase() as 'lax' | 'none' | 'strict'
        : 'lax',
      secure: authConfig.cookies.secure || false,
    })
  }
}
```

### Logout (Client-side)

**File**: `packages/next/src/auth/logout.ts`

```typescript
'use server'

export async function logout({
  allSessions = false,
  config,
}: {
  allSessions?: boolean
  config: MaybePromise<SanitizedConfig>
}) {
  const payload = await getPayload({ config, cron: true })
  const headers = await nextHeaders()
  const authResult = await payload.auth({ headers })

  if (!authResult.user) {
    return { message: 'User already logged out', success: true }
  }

  const { user } = authResult
  const req = await createLocalReq({ user }, payload)
  const collection = payload.collections[user.collection]

  const logoutResult = await logoutOperation({
    allSessions,
    collection,
    req,
  })

  const existingCookie = await getExistingAuthToken(payload.config.cookiePrefix)
  if (existingCookie) {
    const cookies = await getCookies()
    cookies.delete(existingCookie.name)
  }

  return { message: 'User logged out successfully', success: true }
}
```

### Token Refresh

**File**: `packages/next/src/auth/refresh.ts`

```typescript
export async function refresh({ config }: { config: MaybePromise<SanitizedConfig> }) {
  const payload = await getPayload({ config, cron: true })
  const headers = await nextHeaders()
  const result = await payload.auth({ headers })  // Gets current user

  if (!result.user) {
    throw new Error('Cannot refresh token: user not authenticated')
  }

  const existingCookie = await getExistingAuthToken(payload.config.cookiePrefix)
  if (!existingCookie) {
    return { message: 'No valid token found to refresh', success: false }
  }

  const req = await createLocalReq({ user: result.user }, payload)
  const refreshResult = await refreshOperation({
    collection: collectionConfig,
    req,
  })

  await setPayloadAuthCookie({
    authConfig: collectionConfig.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token: refreshResult.refreshedToken,
  })

  return { message: 'Token refreshed successfully', success: true }
}
```

### Request Initialization for Server Components

**File**: `packages/next/src/utilities/initReq.ts`

This is the key function for initializing authenticated requests in Server Components:

```typescript
export const initReq = async function ({
  canSetHeaders,
  configPromise,
  importMap,
  key,
  overrides,
}: {
  canSetHeaders?: boolean
  configPromise: Promise<SanitizedConfig> | SanitizedConfig
  importMap: ImportMap
  key: string
  overrides?: Parameters<typeof createLocalReq>[0]
}): Promise<InitReqResult> {
  const headers = await getHeaders()
  const cookies = parseCookies(headers)

  const partialResult = await partialReqCache.get(async () => {
    const config = await configPromise
    const payload = await getPayload({ config, cron: true, importMap })

    // Execute auth strategies to get user
    const { responseHeaders, user } = await executeAuthStrategies({
      canSetHeaders,
      headers,
      payload,
    })

    return { payload, responseHeaders, user }
  }, 'global')

  return reqCache.get(async () => {
    const { payload, responseHeaders, user } = partialResult

    const req = await createLocalReq(
      {
        req: {
          headers,
          host: headers.get('host'),
          responseHeaders,
          user,
          ...(reqOverrides || {}),
        },
        ...(optionsOverrides || {}),
      },
      payload,
    )

    const locale = await getRequestLocale({ req })
    req.locale = locale?.code

    const permissions = await getAccessResults({ req })

    return { cookies, headers, locale, permissions, req }
  }, key)
}
```

---

## 5. Token and Session Management

### Cookie Configuration

**File**: `packages/payload/src/auth/cookies.ts`

```typescript
export const generatePayloadCookie = ({
  collectionAuthConfig,
  cookiePrefix,
  returnCookieAsObject = false,
  token,
}: GeneratePayloadCookieArgs) => {
  const sameSite = typeof collectionAuthConfig.cookies.sameSite === 'string'
    ? collectionAuthConfig.cookies.sameSite
    : collectionAuthConfig.cookies.sameSite
      ? 'Strict'
      : undefined

  return generateCookie({
    name: `${cookiePrefix}-token`,
    domain: collectionAuthConfig.cookies.domain ?? undefined,
    expires: getCookieExpiration({ seconds: collectionAuthConfig.tokenExpiration }),
    httpOnly: true,  // Always HTTP-only for security
    path: '/',
    returnCookieAsObject,
    sameSite,
    secure: collectionAuthConfig.cookies.secure,
    value: token,
  })
}
```

### Cookie Options
- `httpOnly: true` - Prevents JavaScript access
- `sameSite` - CSRF protection (Lax/Strict/None)
- `secure` - HTTPS-only in production
- `domain` - Cross-domain support
- `expires` - Based on token expiration

### CSRF Protection

The cookie extraction method in `extractJWT.ts` includes CSRF validation:

```typescript
cookie: ({ headers, payload }) => {
  const cookies = parseCookies(headers)
  const tokenCookieName = `${payload.config.cookiePrefix}-token`
  const cookieToken = cookies.get(tokenCookieName)

  const origin = headers.get('Origin')

  // Origin present — validate against csrf allowlist
  if (origin) {
    if (payload.config.csrf.length === 0 || payload.config.csrf.includes(origin)) {
      return cookieToken
    }
    return null
  }

  // No Origin with csrf configured — fall back to Sec-Fetch-Site
  const secFetchSite = headers.get('Sec-Fetch-Site')

  // Allow same-origin, same-site, and direct navigations
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none') {
    return cookieToken
  }

  return null  // Reject cross-site requests
}
```

---

## 6. Access Control and Permissions

### Collection Access Configuration

```typescript
export type CollectionConfig = {
  access?: {
    admin?: ({ req }: { req: PayloadRequest }) => boolean | Promise<boolean>
    create?: Access
    delete?: Access
    read?: Access
    update?: Access
    unlock?: Access
    readVersions?: Access
  }
}
```

### Access Execution

**File**: `packages/payload/src/auth/executeAccess.ts`

```typescript
export const executeAccess = async (
  { id, data, disableErrors, isReadingStaticFile = false, req }: OperationArgs,
  access: Access,
): Promise<AccessResult> => {
  if (access) {
    const resolvedConstraint = await access({ id, data, isReadingStaticFile, req })
    if (!resolvedConstraint) {
      if (!disableErrors) {
        throw new Forbidden(req.t)
      }
    }
    return resolvedConstraint
  }

  if (req.user) {
    return true  // Logged in users can access if no access control defined
  }

  if (!disableErrors) {
    throw new Forbidden(req.t)
  }
  return false
}
```

### Permission Types

**File**: `packages/payload/src/auth/types.ts`

```typescript
export type Permission = {
  permission: boolean
  where?: Where  // Query constraint
}

export type SanitizedCollectionPermission = {
  create?: true
  delete?: true
  fields: SanitizedFieldsPermissions
  read?: true
  readVersions?: true
  unlock?: true
  update?: true
}
```

---

## 7. Auth Hooks

Auth-enabled collections support the following hooks:

### Login-related hooks
- `beforeLogin` - Modify user or prevent login
- `afterLogin` - Perform actions after successful login
- `afterLogout` - Perform actions after logout

### Password-related hooks
- `afterForgotPassword` - Send custom emails, log events

### User-related hooks
- `afterMe` - Modify the `me` response
- `refresh` - Control token refresh behavior

Example hook configuration:

```typescript
const Users: CollectionConfig = {
  auth: true,
  hooks: {
    beforeLogin: [({ user, req }) => {
      // Check if user is active
      if (!user.isActive) {
        throw new Forbidden('User account is inactive')
      }
      return user
    }],
    afterLogin: [({ user, token, req }) => {
      // Log login event
      req.payload.create({
        collection: 'audit-log',
        data: { action: 'login', userId: user.id }
      })
    }],
  }
}
```

---

## 8. Common Pitfalls

### 1. Token Not Sent with Requests
When using the local API, tokens must be explicitly passed:

```typescript
// Server Component - token from cookie is auto-extracted
const payload = await getPayload({ config })
const result = await payload.findByID({ collection: 'users', id: 1, req })

// API Route - must extract and pass token manually
const token = extractJWT({ headers, payload })
const payload = await getPayload({ config })
const req = await createLocalReq({ headers, user: /* extracted user */ }, payload)
```

### 2. Session Not Being Invalidated
Sessions are stored on the user document. If `useSessions: false`, only the JWT is used and server-side session tracking is disabled.

### 3. CSRF Issues with Cookies
If using cookies, ensure proper CSRF configuration:

```typescript
// payload.config.ts
export default config = {
  csrf: ['https://yourdomain.com'],  // Allowed origins
  // OR
  auth: {
    jwtOrder: ['Bearer', 'cookie']  // Prefer Bearer for APIs
  }
}
```

### 4. Cookie Domain Issues
Cookies set with `domain: undefined` only apply to the exact domain. For subdomains, specify the parent domain.

### 5. Token Expiration Mismatch
Token expiration is in seconds in config but some operations use milliseconds:

```typescript
// Config (seconds)
tokenExpiration: 7200  // 2 hours

// Internal (milliseconds)
const tokenExpInMs = collectionConfig.auth.tokenExpiration * 1000
```

---

## 9. Code Examples

### Server-Side Login

```typescript
import { getPayload } from 'payload'
import { setPayloadAuthCookie } from '@payloadcms/next/auth'

const login = async (email: string, password: string) => {
  const payload = await getPayload({ config })

  const result = await payload.login({
    collection: 'users',
    data: { email, password }
  })

  if (result.token) {
    await setPayloadAuthCookie({
      authConfig: payload.collections.users.config.auth,
      cookiePrefix: payload.config.cookiePrefix,
      token: result.token
    })
  }

  return result
}
```

### Server-Side Auth Check

```typescript
import { headers } from 'next/headers'
import { getPayload, extractJWT } from 'payload'

const checkAuth = async () => {
  const headersList = await headers()
  const payload = await getPayload({ config })

  const token = extractJWT({
    headers: headersList,
    payload
  })

  if (!token) {
    return { user: null, authenticated: false }
  }

  const authResult = await payload.auth({
    headers: headersList,
    canSetHeaders: false
  })

  return {
    user: authResult.user,
    permissions: authResult.permissions,
    authenticated: !!authResult.user
  }
}
```

### Protected API Route

```typescript
import { NextResponse } from 'next/server'
import { getPayload, createLocalReq } from 'payload'
import { headers } from 'next/headers'

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const headersList = await headers()

  const authResult = await payload.auth({ headers: headersList })

  if (!authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // User is authenticated, proceed with operation
  const data = await payload.find({
    collection: 'protected-collection',
    where: { createdBy: { equals: authResult.user.id } },
    req: authResult.req
  })

  return NextResponse.json(data)
}
```

### Custom Auth Strategy

```typescript
import type { AuthStrategy, AuthStrategyFunctionArgs, AuthStrategyResult } from 'payload'

const customAuthStrategy: AuthStrategy = {
  name: 'custom-auth',
  authenticate: async (args: AuthStrategyFunctionArgs): Promise<AuthStrategyResult> => {
    const { headers, payload } = args

    // Extract token from custom header
    const customToken = headers.get('X-Custom-Token')

    if (!customToken) {
      return { user: null }
    }

    // Validate token and fetch user
    const user = await validateCustomToken(customToken, payload)

    if (!user) {
      return { user: null }
    }

    return {
      user: {
        ...user,
        _strategy: 'custom-auth'
      }
    }
  }
}

// Register in config
const config = {
  collections: [{
    slug: 'users',
    auth: {
      strategies: [customAuthStrategy]
    }
  }]
}
```

---

## Summary

Payload CMS authentication is a well-architected system that:

1. **Server-side is authoritative** - All auth decisions happen on the server via `executeAuthStrategies()` and `getAccessResults()`

2. **JWT with sessions** - Tokens are signed JWTs containing user identity, with optional server-side sessions for multi-device control

3. **Multiple token methods** - Supports Bearer tokens, cookies, and legacy JWT headers

4. **CSRF protection** - Built-in for cookie-based auth via Origin/Sec-Fetch-Site validation

5. **Hook system** - Extensive hooks for customizing auth behavior at every step

6. **Local API** - Server Components and API routes use `getPayload()` and `createLocalReq()` for authenticated operations

7. **Client/Server separation** - Client-side uses server actions with automatic cookie management, while server-side handles all sensitive operations
