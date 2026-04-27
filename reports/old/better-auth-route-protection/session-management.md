# Session Management and Authentication Flow in Better-Auth

## Report Location
`reports/better-auth-route-protection/session-management.md`

---

## 1. How Session Tokens are Read from Cookies

### Cookie Structure
Better-Auth uses two primary cookies for session management (defined in `temp/better-auth/packages/better-auth/src/cookies/index.ts`, lines 110-145):

```typescript
// From getCookies() function:
const sessionToken = createCookie("session_token", { maxAge: sessionMaxAge });
const sessionData = createCookie("session_data", { maxAge: options.session?.cookieCache?.maxAge || 60 * 5 });
const dontRememberToken = createCookie("dont_remember");
```

**Cookie names** (with prefix `better-auth.` by default):
- `better-auth.session_token` - Contains the raw session token (signed)
- `better-auth.session_data` - Contains encrypted/cached session data (cookie cache)
- `better-auth.dont_remember` - Marks if "remember me" was disabled

### Reading the Session Token
In the `getSession` endpoint (`session.ts`, lines 86-93):

```typescript
const sessionCookieToken = await ctx.getSignedCookie(
    ctx.context.authCookies.sessionToken.name,
    ctx.context.secret,
);
```

The session token is a **signed cookie** (HMAC verified), not encrypted. The actual token value is the primary key used to look up the session in the database.

### Session Data Cookie (Optional Cache)
If cookie caching is enabled (`options.session?.cookieCache?.enabled`), the `sessionData` cookie stores the session and user data directly in the cookie. This avoids a database lookup on every request.

The session data cookie can be encoded in three strategies (lines 112-198):
1. **`jwe`** - JSON Web Encryption (A256CBC-HS512 + HKDF) - encrypted
2. **`jwt`** - JSON Web Token with HMAC-SHA256 - signed but not encrypted
3. **`compact`** (default) - base64url encoded + HMAC signature

---

## 2. How getSession Endpoint Works

**Location:** `temp/better-auth/packages/better-auth/src/api/routes/session.ts` (lines 31-523)

### Endpoint Definition
```typescript
createAuthEndpoint(
    "/get-session",
    {
        method: ["GET", "POST"],
        operationId: "getSession",
        query: getSessionQuerySchema,
        requireHeaders: true,
    },
    async (ctx) => { /* handler */ }
)
```

### Query Parameters (from `session-store.ts`, lines 330-350):
- `disableCookieCache` - Force database lookup, bypass cookie cache
- `disableRefresh` - Skip session refresh (for status checks)

### Flow Diagram:

```
1. Read sessionToken from signed cookie
         |
         v
2. Is cookieCache enabled AND sessionData cookie present?
    |-- NO  --> Go to step 4
    |
    v
3. Decode sessionData cookie, validate signature/version/expiry
    |
    v
4. Is cached data valid?
    |-- YES --> Return from cache, maybe refresh cookie
    |-- NO  --> Continue to step 5
         |
         v
5. Database lookup: findSession(sessionToken)
         |
         v
6. Is session valid and not expired?
    |-- NO  --> Delete cookies, return null
    |
    v
7. Should refresh? (based on updateAge calculation)
    |-- YES --> Update session in DB, set new cookies
    |-- NO  --> Continue
         |
         v
8. Return session + user
```

### Session Refresh Calculation (lines 418-422):
```typescript
const sessionIsDueToBeUpdatedDate =
    session.session.expiresAt.valueOf() -
    expiresIn * 1000 +
    updateAge * 1000;
const shouldBeUpdated = sessionIsDueToBeUpdatedDate <= Date.now();
```
**Formula inspiration:** From next-auth's session handling.

---

## 3. How getSessionFromCtx Retrieves Session Context

**Location:** `session.ts` lines 525-563

```typescript
export const getSessionFromCtx = async (ctx, config?) => {
    // 1. Check if already populated (memoization)
    if (ctx.context.session) {
        return ctx.context.session;
    }

    // 2. Call getSession endpoint directly
    const session = await getSession()({
        ...ctx,
        method: "GET",
        asResponse: false,
        headers: ctx.headers!,
        returnHeaders: false,
        returnStatus: false,
        query: {
            ...config,
            ...ctx.query,
        },
    }).catch((e) => null);

    // 3. Cache in context for subsequent calls
    ctx.context.session = session;
    return session;
};
```

**Key behaviors:**
- **Memoization**: First call populates `ctx.context.session`, subsequent calls return cached value
- **Error handling**: Catches errors and returns `null` instead
- **Query merging**: Combines config options with existing query params

---

## 4. Middleware Differences

### sessionMiddleware (lines 568-579)
```typescript
export const sessionMiddleware = createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session?.session) {
        throw APIError.from("UNAUTHORIZED", { message: "Unauthorized" });
    }
    return { session };
});
```
**Use case:** General protection - requires valid session.

### sensitiveSessionMiddleware (lines 586-597)
```typescript
export const sensitiveSessionMiddleware = createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx, { disableCookieCache: true });
    if (!session?.session) {
        throw APIError.from("UNAUTHORIZED", { message: "Unauthorized" });
    }
    return { session };
});
```
**Difference:** Passes `{ disableCookieCache: true }` to force **database lookup**.

**Use case:** Password changes, account deletion, sensitive operations where revoked sessions must not be reused even if cached.

### freshSessionMiddleware (lines 623-648)
```typescript
export const freshSessionMiddleware = createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session?.session) {
        throw APIError.from("UNAUTHORIZED", { message: "Unauthorized" });
    }
    if (ctx.context.sessionConfig.freshAge === 0) {
        return { session };  // Skip freshness check
    }
    const freshAge = ctx.context.sessionConfig.freshAge;
    const lastUpdated = new Date(session.session.updatedAt || session.session.createdAt).getTime();
    const isFresh = Date.now() - lastUpdated < freshAge * 1000;
    if (!isFresh) {
        throw APIError.from("FORBIDDEN", BASE_ERROR_CODES.SESSION_NOT_FRESH);
    }
    return { session };
});
```
**Difference:** Additionally checks if session was updated within `freshAge` seconds.

**Use case:** High-security actions requiring recent authentication (e.g., changing 2FA settings).

### requestOnlySessionMiddleware (lines 603-614)
```typescript
export const requestOnlySessionMiddleware = createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session?.session && (ctx.request || ctx.headers)) {
        throw APIError.from("UNAUTHORIZED", { message: "Unauthorized" });
    }
    return { session };
});
```
**Difference:** Does NOT require session on server-side calls without headers, but DOES require session if request/headers are present (client calls).

---

## 5. How ctx.context.session is Populated

**Context type:** `AuthContext<Options>` (defined in `packages/core/src/types/context.ts`, lines 268-412)

```typescript
session: {
    session: Session & Record<string, any>;
    user: User & Record<string, any>;
} | null;
```

### Population Points in getSession:

**Point 1** (line 252) - Cookie cache, refresh disabled:
```typescript
ctx.context.session = session;  // from cookie cache
```

**Point 2** (lines 331-334) - Cookie cache, refreshed:
```typescript
ctx.context.session = {
    session: parsedRefreshedSession,
    user: parsedRefreshedUser,
};
```

**Point 3** (lines 356-359) - Cookie cache, no refresh needed:
```typescript
ctx.context.session = {
    session: parsedSession,
    user: parsedUser,
};
```

**Point 4** (line 373) - Database lookup:
```typescript
ctx.context.session = session;  // from findSession()
```

**Point 5** (line 558) - In getSessionFromCtx wrapper:
```typescript
ctx.context.session = session;
```

### Session Context Includes:
```typescript
{
    options: BetterAuthOptions,
    internalAdapter: InternalAdapter,  // DB operations
    authCookies: BetterAuthCookies,    // Cookie definitions
    sessionConfig: {
        updateAge: number,             // 3600 (1 hour default)
        expiresIn: number,             // 604800 (7 days default)
        freshAge: number,              // 600 (10 min default)
        cookieRefreshCache: false | { enabled: true, updateAge: number }
    },
    secret: string,
    // ... many more
}
```

---

## 6. Session Refresh Behavior and Polling

### deferSessionRefresh Option
When `options.session?.deferSessionRefresh` is enabled:

**GET requests** (lines 434-448):
```typescript
if (deferSessionRefresh && !isPostRequest) {
    await setCookieCache(ctx, session, !!dontRememberMe);
    return ctx.json({
        session: parsedSession,
        user: parsedUser,
        needsRefresh,  // <-- Client-side polling hint
    });
}
```

**POST requests** (lines 78-83):
```typescript
if (isPostRequest && !deferSessionRefresh) {
    throw APIError.from("METHOD_NOT_ALLOWED",
        BASE_ERROR_CODES.METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED);
}
```

### Cookie Cache Refresh (lines 246-342):
```typescript
const timeUntilExpiry = sessionDataPayload.expiresAt - Date.now();
const updateAge = cookieRefreshCache.updateAge * 1000;

if (timeUntilExpiry < updateAge && !shouldSkipSessionRefresh) {
    // Refresh the cookie cache
    await setCookieCache(ctx, refreshedSession, false);
    // Also refresh session_token cookie expiry
    await ctx.setSignedCookie(
        ctx.context.authCookies.sessionToken.name,
        session.session.token,
        ctx.context.secret,
        { maxAge: sessionTokenMaxAge }
    );
}
```

### Polling Pattern:
1. Client calls `GET /get-session`
2. Server returns `{ session, user, needsRefresh: true }` when session is near expiration
3. Client can then call `POST /get-session` to actually refresh (when `deferSessionRefresh` is enabled)
4. Or client simply continues polling `GET /get-session` which will auto-refresh cookies

### shouldSkipSessionRefresh (State-based rate limiting):
From `state/should-session-refresh.ts` - a global flag that can prevent session refreshes, useful for:
- Rate limiting refresh operations
- Preventing refresh storms during high load

---

## Summary of Key Files

| File | Purpose |
|------|---------|
| `session.ts` (lines 31-523) | getSession endpoint implementation |
| `session.ts` (lines 525-563) | getSessionFromCtx function |
| `session.ts` (lines 568-648) | All session middlewares |
| `cookies/index.ts` | Cookie creation, setSessionCookie, setCookieCache |
| `cookies/session-store.ts` | Chunking logic for large cookies |
| `packages/core/src/types/context.ts` | AuthContext type definition |
| `packages/core/src/api/index.ts` | createAuthMiddleware, createAuthEndpoint |