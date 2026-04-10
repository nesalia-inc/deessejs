# First Admin Setup - Implementation Plan

## Context

The `FirstAdminSetup` component (`packages/next/src/components/first-admin-setup.tsx`) calls `POST /api/admin/setup` to create the first admin user, but **this API route does not exist**.

The goal is to create a `/api/first-admin` endpoint that:
1. Is integrated into the existing routing architecture via `packages/next/src/routes.ts`
2. Allows creating the first admin user when the database is empty
3. Validates email domain restrictions if configured
4. Creates the user with `role: "admin"`
5. Prevents abuse (only works when no admin users exist, only works in development)

## Key Insight

Better-auth's admin plugin allows programmatic user creation without authentication when called **without headers or request object**:

```typescript
// This bypasses auth check when called without headers
await auth.api.createUser({
  body: { email, password, name, role: "admin" }
});
```

From `temp/better-auth/packages/better-auth/src/plugins/admin/routes.ts` lines 327-347:
```typescript
const session = await getSessionFromCtx<{ role: string }>(ctx);
if (!session && (ctx.request || ctx.headers)) {
  throw ctx.error("UNAUTHORIZED");
}
// If no session and NO request/headers → bypasses auth check
```

## Routing Architecture

The current architecture:

1. `examples/base/src/app/(deesse)/api/[...slug]/route.ts` uses:
   ```typescript
   export const POST = REST_POST({ auth: deesseAuth });
   ```

2. `packages/next/src/routes.ts` wraps `toNextJsHandler` from `better-auth/next-js`:
   ```typescript
   export function REST_POST(config) {
     return toNextJsHandler(config.auth).POST;
   }
   ```

All requests are delegated to better-auth's handler. For custom endpoints (like `/api/first-admin`), we need to integrate within this structure.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/next/src/routes.ts` | **Modify** | Add custom route handler registration for first-admin |
| `packages/next/src/components/first-admin-setup.tsx` | **Modify** | Update endpoint from `/api/admin/setup` to `/api/first-admin` |
| `packages/deesse/src/lib/admin.ts` | **Modify** | Add `hasAdminUsers` function |
| `packages/next/src/root-page.tsx` | **Modify** | Use `hasAdminUsers` + production guard |

## Implementation Details

### 1. Extend `packages/next/src/routes.ts` to support custom handlers

```typescript
import { toNextJsHandler } from 'better-auth/next-js';
import type { Auth, BetterAuthOptions, InternalCall } from 'better-auth';
import { NextResponse } from "next/server";
import { hasAdminUsers, validateAdminEmail } from "deesse";

export interface DeesseAPIConfig<
  Options extends BetterAuthOptions = BetterAuthOptions,
> {
  auth: Auth<Options>;
}

// Custom first-admin handler function
async function handleFirstAdmin(
  auth: Auth<BetterAuthOptions>,
  request: Request
): Promise<NextResponse> {
  try {
    // Production guard
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { message: "First admin setup is only available in development mode" },
        { status: 403 }
      );
    }

    // Check if admin users already exist
    const adminExists = await hasAdminUsers(auth);
    if (adminExists) {
      return NextResponse.json(
        { message: "Admin users already exist. Cannot create first admin." },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Missing required fields: name, email, password" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate email domain
    const validation = validateAdminEmail(email);
    if (!validation.valid) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    // Create admin user (internal call without headers - bypasses auth)
    const result = await (auth.api as any).createUser({
      body: {
        email,
        password,
        name,
        role: "admin",
      },
    });

    return NextResponse.json(
      { message: "Admin user created successfully", userId: result.user?.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[first-admin]", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export function REST_GET<
  Options extends BetterAuthOptions = BetterAuthOptions,
>(config: DeesseAPIConfig<Options>) {
  return toNextJsHandler(config.auth).GET;
}

export function REST_POST<
  Options extends BetterAuthOptions = BetterAuthOptions,
>(config: DeesseAPIConfig<Options>) {
  const betterAuthHandler = toNextJsHandler(config.auth).POST;

  return async (request: Request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Intercept /api/first-admin route
    if (pathname === "/api/first-admin" || pathname.endsWith("/first-admin")) {
      return handleFirstAdmin(config.auth, request);
    }

    // Delegate all other routes to better-auth
    return betterAuthHandler(request);
  };
}
```

### 2. Modify: `packages/next/src/components/first-admin-setup.tsx`

Change the API endpoint from `/api/admin/setup` to `/api/first-admin`:

```typescript
// Before:
const response = await fetch("/api/admin/setup", {

// After:
const response = await fetch("/api/first-admin", {
```

Also update the success redirect if needed:
```typescript
router.push("/admin/login?created=true");
// Consider redirecting to "/" or "/admin" after first admin creation
```

## Additional Protection: Admin Existence Check

Currently `isDatabaseEmpty` checks if **any users** exist, not specifically **admin users**. A non-admin user could exist and the first-admin-setup would still be shown.

### New utility function: `hasAdminUsers` in `packages/deesse/src/lib/admin.ts`

```typescript
export async function hasAdminUsers(auth: Auth): Promise<boolean> {
  try {
    const result = await (auth.api as any).listUsers({ limit: 100 });
    return result?.users?.some((u: any) => u.role === "admin") ?? false;
  } catch {
    return false;
  }
}
```

### Files to also modify:

| File | Action | Purpose |
|------|--------|---------|
| `packages/deesse/src/lib/admin.ts` | **Modify** | Add `hasAdminUsers` function |
| `packages/next/src/root-page.tsx` | **Modify** | Use `hasAdminUsers` instead of checking any users |

### Updated `root-page.tsx` logic:

```typescript
// Helper to check if admin users exist
async function checkAdminUsersExist(): Promise<boolean> {
  try {
    const result = await (auth.api as any).listUsers({ limit: 100 });
    return result?.users?.some((u: any) => u.role === "admin") ?? false;
  } catch {
    return false;
  }
}

// If DB has no admin users, show first admin setup
if (!usersExist || !(await checkAdminUsersExist())) {
  return <FirstAdminSetup />;
}
```

---

## Additional Protection: Development-Only Check

The first-admin setup **must not work in production**. Add this check to both the API route and the page rendering.

### Updated API route:

```typescript
// At the start of POST handler
if (process.env.NODE_ENV === "production") {
  return NextResponse.json(
    { message: "First admin setup is only available in development mode" },
    { status: 403 }
  );
}
```

### Updated `root-page.tsx`:

```typescript
// Don't show first-admin-setup in production
if (!usersExist && process.env.NODE_ENV !== "production") {
  return <FirstAdminSetup />;
}
```

Or more elegantly, redirect to login page in production:

```typescript
// In production, just show login (no special first-admin flow)
if (process.env.NODE_ENV === "production") {
  return <LoginPage />;
}
```

---

## Security Considerations

1. **Rate limiting**: Consider adding rate limiting to prevent brute force attacks (can be added via middleware later)
2. **Email validation**: Uses existing `validateAdminEmail` to enforce organizational email domains
3. **Only works in development**: `NODE_ENV !== "production"` check prevents accidental first-admin creation in production
4. **Only works when no admin exists**: `hasAdminUsers` check ensures we specifically look for admin role
5. **Password validation**: Minimum 8 character requirement enforced
6. **No auth bypass in production**: Even if someone bypasses the UI, the API won't work in production

## Verification

1. **Build the project**:
   ```bash
   cd examples/base
   pnpm build
   ```

2. **Test the flow in development**:
   - Clear the database or ensure no admin users exist
   - Start the dev server: `pnpm dev`
   - Navigate to the root page - should show first-admin-setup form
   - Fill in the form and submit
   - Should redirect to `/admin/login?created=true`
   - Can log in with the created admin credentials

3. **Verify second attempt fails**:
   - After first admin is created, try calling `/api/first-admin` again
   - Should return 403 "Admin users already exist"

4. **Verify production guard works**:
   - Build for production: `pnpm build`
   - Start production server: `pnpm start`
   - Try to access first-admin page or call `/api/first-admin`
   - Should return 403 or show login page (not first-admin-setup)

5. **Verify non-admin users don't trigger protection**:
   - Create a non-admin user in the database
   - Navigate to root page
   - First-admin-setup should still be shown (because no admin exists)
   - Creating first admin should still work

## Dependencies

- `deesseAuth` singleton from `@/lib/deesse` (already exists in example)
- `hasAdminUsers` from `deesse` (new function to add in `packages/deesse/src/lib/admin.ts`)
- `validateAdminEmail` from `deesse` (already exists in `packages/deesse/src/lib/admin.ts`)
- `Auth` type from `better-auth`
- `NODE_ENV` from `process.env` (built-in Node.js)

## Alternative Approaches Considered

### Dedicated route file approach
Could create `examples/base/src/app/(deesse)/api/first-admin/route.ts` as a separate file. Next.js App Router would match this more specific route before the catch-all `[...slug]` route. However, this distributes the logic across multiple locations.

### Direct better-auth internal adapter
Could call `ctx.internalAdapter.createUser()` directly, but this requires access to the AuthContext which is not easily accessible from a Next.js route handler. The `auth.api.createUser()` approach is simpler and leverages the existing admin plugin.
