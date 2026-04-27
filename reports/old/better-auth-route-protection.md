# Better-Auth Route Protection Analysis

## 1. How Better-Auth Route Protection Works

Better-auth uses a **middleware-based approach** to protect routes. The protection is applied at the endpoint level using the `createAuthEndpoint` function with the `use` property.

### Core Middleware Types

**Session Middleware** (`sessionMiddleware`) - Found in `temp/better-auth/packages/better-auth/src/api/routes/session.ts`:

```typescript
export const sessionMiddleware = createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session?.session) {
        throw APIError.from("UNAUTHORIZED", {
            message: "Unauthorized",
            code: "UNAUTHORIZED",
        });
    }
    return { session };
});
```

**Available Middlewares:**
- `sessionMiddleware` - Requires valid session, throws UNAUTHORIZED if not authenticated
- `sensitiveSessionMiddleware` - Same as sessionMiddleware but bypasses cookie cache (for sensitive operations like password changes)
- `requestOnlySessionMiddleware` - Only requires session when request comes from client
- `freshSessionMiddleware` - Requires session to have been refreshed recently

### Protecting an Endpoint

Endpoints are protected by adding middleware to the `use` array:

```typescript
createAuthEndpoint(
    "/admin/list-users",
    {
        method: "GET",
        use: [adminMiddleware],  // middleware goes here
        query: listUsersQuerySchema,
    },
    async (ctx) => {
        // handler code
    }
);
```

The `adminMiddleware` (found in `temp/better-auth/packages/better-auth/src/plugins/admin/routes.ts`) ensures the user has a valid session and extracts role information:

```typescript
const adminMiddleware = createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session) {
        throw APIError.fromStatus("UNAUTHORIZED");
    }
    return {
        session,
    } as {
        session: {
            user: UserWithRole;
            session: Session;
        };
    };
});
```

## 2. Session Management and Authentication Checks

### Server-Side Session Retrieval

The `/get-session` endpoint (in `session.ts`) handles all session retrieval:

1. **Cookie-based session token**: Reads `session_token` from signed cookies
2. **Cookie cache support**: Supports JWE (encrypted), JWT (signed), or compact format for caching session data
3. **Database fallback**: If no valid cookie cache, queries the database via `ctx.context.internalAdapter.findSession()`

```typescript
export const getSession = <Option extends BetterAuthOptions>() =>
    createAuthEndpoint(
        "/get-session",
        {
            method: ["GET", "POST"],
            requireHeaders: true,
        },
        async (ctx) => {
            // Returns { session, user } or null
        }
    );
```

### Context Session Access

In endpoint handlers, session is available via `ctx.context.session`:

```typescript
async (ctx) => {
    const session = ctx.context.session;
    if (!session) {
        throw APIError.from("UNAUTHORIZED", {...});
    }
    const userId = session.user.id;
    const userRole = (session.user as UserWithRole).role;
}
```

### Client-Side Session

The client provides a `useSession` hook (from `createAuthClient()` in `vanilla.ts`):

```typescript
const authClient = createAuthClient({
    baseURL: "http://localhost:3000",
    // ...
});

// Usage in components
const session = authClient.useSession();
// session.data = { session, user } | null
// session.error = BetterFetchError | null
// session.isPending = boolean
// session.isRefetching = boolean
// session.refetch() = Promise<void>
```

**Session Refresh Behavior** (from `session-refresh.ts`):
- **Polling**: Optional interval-based refetch (`refetchInterval`)
- **Focus refetch**: Automatically refetches when window regains focus
- **BroadcastChannel**: Syncs session state across browser tabs
- **Online status**: Can refetch when coming back online

## 3. Role-Based Access Control (RBAC) Patterns

Better-auth provides two RBAC systems:

### Admin Plugin RBAC (Global Roles)

Found in `temp/better-auth/packages/better-auth/src/plugins/admin/`:

**Access Control Definition** (from `access/statement.ts`):
```typescript
export const defaultStatements = {
    user: ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "get", "update"],
    session: ["list", "revoke", "delete"],
} as const;

export const adminAc = defaultAc.newRole({
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
    session: ["list", "revoke", "delete"],
});

export const userAc = defaultAc.newRole({
    user: [],
    session: [],
});
```

**hasPermission Function** (from `has-permission.ts`):
```typescript
export const hasPermission = (input: {
    userId?: string;
    role?: string;
    options?: AdminOptions;
} & PermissionExclusive) => {
    // 1. Check adminUserIds override
    if (input.userId && input.options?.adminUserIds?.includes(input.userId)) {
        return true;
    }

    // 2. Check role permissions
    const roles = (input.role || input.options?.defaultRole || "user").split(",");
    const acRoles = input.options?.roles || defaultRoles;

    for (const role of roles) {
        const _role = acRoles[role];
        const result = _role?.authorize(input.permissions);
        if (result?.success) {
            return true;
        }
    }
    return false;
};
```

**Checking Permissions in Endpoints:**
```typescript
async (ctx) => {
    const canListUsers = hasPermission({
        userId: ctx.context.session.user.id,
        role: ctx.context.session.user.role,
        options: opts,
        permissions: { user: ["list"] },
    });
    if (!canListUsers) {
        throw APIError.from("FORBIDDEN", ADMIN_ERROR_CODES.YOU_ARE_NOT_ALLOWED_TO_LIST_USERS);
    }
    // proceed with listing users
}
```

### Organization Plugin RBAC (Per-Organization Roles)

Found in `temp/better-auth/packages/better-auth/src/plugins/organization/`:

The organization plugin allows per-organization role definitions with dynamic access control. Permissions are checked against the user's role within a specific organization context.

## 4. Integration with Deesse's Config System

Deesse's config system (in `packages/deesse/src/config/define.ts`) automatically includes the admin plugin:

```typescript
export function defineConfig(config: Config): InternalConfig {
    // Always include admin plugin - user cannot remove it
    const authPlugins: BetterAuthPlugin[] = [admin()];

    return {
        ...config,
        auth: {
            ...config.auth,
            plugins: authPlugins,
        },
    } as InternalConfig;
}
```

**Admin Options Available:**
```typescript
interface AdminOptions {
    defaultRole?: string;          // Default: "user"
    adminRoles?: (string | string[]) | undefined;  // Default: ["admin"]
    bannedUserMessage?: string;
    adminUserIds?: string[];       // Users who bypass role checks
    roles?: { [key: string]: Role };  // Custom role definitions
    ac?: AccessControl;           // Custom access control statements
    // ...
}
```

## 5. Code Patterns for Protecting Admin Routes

### Pattern 1: Full Admin Protection with Permission Check

```typescript
import { createAuthEndpoint, createAuthMiddleware } from "@better-auth/core/api";
import { APIError } from "@better-auth/core/error";
import { getSessionFromCtx } from "../../api";
import { hasPermission } from "./has-permission";
import type { AdminOptions } from "./types";

const adminMiddleware = createAuthMiddleware(async (ctx) => {
    const session = await getSessionFromCtx(ctx);
    if (!session) {
        throw APIError.fromStatus("UNAUTHORIZED");
    }
    return { session };
});

export const protectedEndpoint = (opts: AdminOptions) =>
    createAuthEndpoint(
        "/admin/protected",
        {
            method: "GET",
            use: [adminMiddleware],
            requireHeaders: true,
        },
        async (ctx) => {
            const canAccess = hasPermission({
                userId: ctx.context.session.user.id,
                role: (ctx.context.session.user as any).role,
                options: opts,
                permissions: { user: ["get"] },
            });

            if (!canAccess) {
                throw APIError.from("FORBIDDEN", {
                    message: "You don't have permission to access this resource",
                });
            }

            // Proceed with protected operation
            return ctx.json({ success: true });
        }
    );
```

### Pattern 2: Client-Side Route Protection (React)

```typescript
"use client";

import { useSession } from "better-auth/react";
import { redirect } from "next/navigation";

export default function AdminPage() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return <div>Loading...</div>;
    }

    if (!session) {
        redirect("/login");
    }

    // Check for admin role
    if (session.user.role !== "admin") {
        redirect("/unauthorized");
    }

    return <AdminDashboard />;
}
```

### Pattern 3: Using Organization Middleware for Multi-Tenant Protection

```typescript
import { orgSessionMiddleware } from "better-auth/plugins";

export const organizationEndpoint = createAuthEndpoint(
    "/organization/admin-action",
    {
        method: "POST",
        use: [orgSessionMiddleware],  // Requires session + active organization
    },
    async (ctx) => {
        const { session } = ctx.context;
        // session.session.activeOrganizationId is available
        // Check organization-specific permissions via hasPermission
        const canAccess = await hasPermission({
            organizationId: session.session.activeOrganizationId,
            // ...
        });
    }
);
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `temp/better-auth/packages/better-auth/src/api/routes/session.ts` | Session middleware and endpoint |
| `temp/better-auth/packages/better-auth/src/plugins/admin/admin.ts` | Admin plugin with RBAC |
| `temp/better-auth/packages/better-auth/src/plugins/admin/routes.ts` | Admin endpoint definitions |
| `temp/better-auth/packages/better-auth/src/plugins/admin/has-permission.ts` | Permission checking |
| `temp/better-auth/packages/better-auth/src/plugins/access/access.ts` | Access control system |
| `temp/better-auth/packages/better-auth/src/plugins/organization/organization.ts` | Organization plugin with per-org roles |
| `temp/better-auth/packages/better-auth/src/client/vanilla.ts` | Client session management |
| `temp/better-auth/packages/better-auth/src/client/session-atom.ts` | Client session atom |
| `packages/deesse/src/config/define.ts` | Deesse config with admin plugin integration |
