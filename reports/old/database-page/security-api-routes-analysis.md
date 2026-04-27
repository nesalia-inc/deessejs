# Security Analysis: API Routes for Admin Database Access

## Context

The Database page in the admin dashboard needs to display real database information (tables, data counts, schema). The security constraint is:

> **Client Components cannot directly access the server-side `deesse` instance** because:
> 1. `PostgresJsDatabase` is not serializable (contains TCP connection pools, closures, native bindings)
> 2. Exposing `deesse` to the client would give browsers direct database access

The alternative approach is **API Routes**: Client Components fetch data from server-side endpoints that have access to `deesse.database`, with proper admin-only authorization.

---

## Security Architecture Overview

### The Threat Model

```
Browser (Client Component)
    │
    │  fetch('/api/admin/database/stats')
    │  ↓
    ▼
API Route (/api/admin/database/stats)  ← Attack surface
    │  If NOT properly secured:
    │  → Any authenticated user could access admin data
    │  → Even unauthenticated requests might leak info
    │
    ▼
deesse.database  ← Must remain server-only
```

### Security Requirements

1. **Authentication**: The request must come from a logged-in user
2. **Authorization**: The logged-in user must have admin privileges
3. **Data Minimization**: API returns only what's needed for the UI
4. **No Direct Database Exposure**: Client never gets raw database access

---

## How Better-Auth Secures Its Routes

Better-auth uses a **middleware pattern** for route protection.

### The `adminMiddleware`

```typescript
// From temp/better-auth/packages/better-auth/src/plugins/admin/routes.ts:33-46
const adminMiddleware = createAuthMiddleware(async (ctx) => {
  const session = await getSessionFromCtx(ctx);
  if (!session) {
    throw APIError.fromStatus("UNAUTHORIZED");
  }
  return {
    session,
  } as {
    session: {
      user: UserWithRole;  // ← Includes role for permission checks
      session: Session;
    };
  };
});
```

### Permission Checking with `hasPermission`

```typescript
// From routes.ts:127-141
const canSetRole = hasPermission({
  userId: ctx.context.session.user.id,
  role: ctx.context.session.user.role,
  options: opts,
  permissions: {
    user: ["set-role"],
  },
});
if (!canSetRole) {
  throw APIError.from("FORBIDDEN", ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE);
}
```

### Protected Endpoint Pattern

```typescript
export const listUsers = (opts: AdminOptions) =>
  createAuthEndpoint(
    "/admin/list-users",
    {
      method: "GET",
      use: [adminMiddleware],  // ← Middleware enforces auth
      query: listUsersQuerySchema,
    },
    async (ctx) => {
      // At this point, ctx.context.session.user has admin role
      // Perform authorization check
      const canListUsers = hasPermission({ ... });
      if (!canListUsers) {
        throw APIError.from("FORBIDDEN", ...);
      }

      // Execute query
      const users = await ctx.context.internalAdapter.listUsers(...);
      return ctx.json({ users, total });
    },
  );
```

### Better-Auth's Permission System

Roles are configured in `adminOptions`:

```typescript
const adminOptions = {
  roles: {
    admin: {
      user: ["list", "get", "create", "update", "delete", "set-role", "ban", "impersonate"],
      session: ["list", "revoke"],
    },
    moderator: {
      user: ["list", "get"],
    },
  },
  defaultRole: "user",
  adminRoles: ["admin"],
};
```

---

## Security Patterns for Deesse Admin API Routes

### Pattern 1: Leverage Better-Auth's Existing Admin API

Better-auth already exposes admin endpoints through `auth.api`:

```typescript
// Client-side usage
const response = await authClient.admin.listUsers({
  limit: 10,
  offset: 0,
});
```

**Advantage**: Already implemented, already secured
**Disadvantage**: May not cover database introspection needs

### Pattern 2: Create Admin API Routes with Middleware

Create Next.js Route Handlers that wrap `deesse`:

```typescript
// app/api/admin/database/tables/route.ts
import { getDeesse } from "deesse";
import { defineConfig } from "deesse";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  // 1. Get session (server-side)
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check admin role
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Access database
  const config = await getConfig(); // user's deesse config
  const deesse = await getDeesse(config);
  const tables = await deesse.database
    .select({ name: sql`tablename` })
    .from(sql`information_schema.tables`)
    .where(eq(sql`table_schema`, "public"));

  return NextResponse.json({ tables });
}
```

### Pattern 3: Reuse Better-Auth's Middleware

Better-auth's `adminMiddleware` can be extracted and reused:

```typescript
// packages/next/src/api/admin-middleware.ts
import { getSessionFromCtx } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/core/api";
import { hasPermission } from "@better-auth/admin";
import type { AdminOptions } from "better-auth/admin";

export const requireAdmin = (opts: AdminOptions) =>
  createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session) {
      throw APIError.fromStatus("UNAUTHORIZED");
    }

    const canAccess = hasPermission({
      userId: session.user.id,
      role: session.user.role,
      options: opts,
      permissions: {
        database: ["read"], // New permission type
      },
    });

    if (!canAccess) {
      throw APIError.fromStatus("FORBIDDEN");
    }

    return { session };
  });
```

---

## Security Considerations

### 1. Session Validation on Every Request

API routes must validate the session on **every request**, not just check for presence:

```typescript
// ✅ Secure: Validates session with DB check
const session = await auth.api.getSession({
  headers: request.headers,
});

// ❌ Insecure: Only checks cookie presence
const cookie = request.cookies.get("session");
if (!cookie) return 401;
```

### 2. Role vs Permission Checks

Better-auth distinguishes between:

- **Authentication**: "Are you logged in?" → `getSessionFromCtx`
- **Authorization**: "Do you have permission?" → `hasPermission`

Both checks are required. A logged-in user might not be an admin.

### 3. CSRF Protection

Better-auth's `csrfToken` endpoint provides CSRF tokens. API routes handling state-changing operations (POST, PUT, DELETE) should validate:

```typescript
// For state-changing operations
const csrfToken = request.headers.get("x-csrf-token");
if (!validateCsrfToken(csrfToken, session.user.id)) {
  return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
}
```

### 4. Rate Limiting

Admin API routes should be rate-limited to prevent enumeration attacks:

```typescript
// Apply rate limiting middleware
const rateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (ctx) => ctx.session.user.id,
});
```

### 5. Input Validation

All query parameters and body data must be validated with Zod:

```typescript
const querySchema = z.object({
  tableName: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});
```

This prevents SQL injection and parameter tampering.

### 6. SQL Injection Prevention

With Drizzle ORM, parameterized queries prevent SQL injection. However:

```typescript
// ✅ Safe: Parameterized query
const result = await db
  .select()
  .from(user)
  .where(eq(user.email, input.email));

// ❌ Dangerous: String interpolation
const result = await db.execute(
  sql`SELECT * FROM ${sql.table(tableName)}`  // tableName from user input!
);
```

If dynamic table/column names are needed, validate against an allowlist.

---

## Proposed Architecture for Database Page

### API Route Structure

```
/api/admin/database/
├── stats          GET   → Database statistics (row counts, table count)
├── tables         GET   → List tables
├── tables/[name]  GET   → Table schema (columns, types)
└── query          POST  → Execute safe read-only queries
```

### Security Flow

```
Client Component (DatabasePage)
    │
    │  useSession() → gets auth client with session cookie
    │
    │  fetch('/api/admin/database/tables')
    │    headers: Cookie: session cookie
    │  ↓
API Route Handler
    │
    │  1. Extract cookies from request
    │  2. Call auth.api.getSession({ headers })
    │     → Verifies session with DB
    │     → Returns session.user with role
    │
    │  3. Check: session.user.role === 'admin'
    │     → If not: return 403
    │
    │  4. Execute: deesse.database.select(...)  ← server-side only
    │     → Raw SQL safe from client access
    │
    │  5. Return JSON (serializable data only)
    ↓
Client Component receives filtered JSON response
```

### Key Security Properties

| Property | How It's Achieved |
|----------|-------------------|
| **Authentication** | Better-auth session cookie validated on every request |
| **Authorization** | `role === 'admin'` check before any database access |
| **Data Isolation** | API returns only requested data, never raw DB |
| **Transport Security** | All requests over HTTPS |
| **No DB Exposure** | Client never has direct database connection |
| **Auditability** | All admin actions logged with user ID |

---

## Risk Analysis

### Attack Vectors

| Vector | Mitigation |
|--------|------------|
| Unauthenticated access | Session validation required |
| Non-admin user access | Role check + permission check |
| Session hijacking | HttpOnly, Secure, SameSite cookies |
| CSRF | CSRF token validation on mutations |
| SQL injection | Parameterized queries (Drizzle ORM) |
| Parameter tampering | Zod schema validation |
| Rate limiting | Request throttling per user |
| Information disclosure | Minimal response data, no stack traces |

### What Could Go Wrong

1. **Misconfigured role check**: If `role === 'admin'` is missing, any authenticated user could access
2. **Session not validated**: If we trust client-side session state without server verification, cookies could be forged
3. **No rate limiting**: Enumumeration of tables or data could be automated
4. **Verbose errors**: Detailed DB errors could leak schema information

---

## Summary

### The Recommended Pattern

1. **API Routes** as the bridge between Client Components and `deesse.database`
2. **Better-auth session validation** on every request
3. **Admin role check** before database access
4. **Input validation** with Zod
5. **Parameterized queries** with Drizzle ORM

### Why This Is Secure

- Client Components **cannot** access `deesse.database` directly
- API Routes **can** access `deesse.database` but only after auth checks
- The browser **only** receives serialized JSON, never raw database access
- All database operations **leave an audit trail** via session.user.id

### Comparison

| Approach | Security | Complexity | Notes |
|---------|----------|------------|-------|
| Direct client DB access | ❌ None | Low | Impossible - not serializable |
| Pass deesse to client | ❌ None | Low | Would expose DB connection |
| API with auth checks | ✅ Secure | Medium | Recommended |
| Server Components only | ✅ Secure | Low | Best if feasible |
