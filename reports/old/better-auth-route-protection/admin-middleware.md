# Admin Middleware and Route Protection Analysis

## Report Location
`reports/better-auth-route-protection/admin-middleware.md`

---

## 1. How adminMiddleware Works (Exact Code Flow)

**File:** `temp/better-auth/packages/better-auth/src/plugins/admin/routes.ts` (lines 33-46)

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

**Code Flow:**

1. **`createAuthMiddleware`** is called from `@better-auth/core/api` (which wraps `better-call`'s `createMiddleware`)
2. The middleware calls `getSessionFromCtx(ctx)` to extract the session from the request context
3. If no session exists, it throws `APIError.fromStatus("UNAUTHORIZED")` (HTTP 401)
4. If a session exists, it returns the session object with `UserWithRole` typing (which includes `role`, `banned`, `banReason`, `banExpires`)

**The `createAuthMiddleware` wrapper** (from `packages/core/src/api/index.ts` lines 27-40):

```typescript
export const createAuthMiddleware = createMiddleware.create({
	use: [
		optionsMiddleware,
		createMiddleware(async () => {
			return {} as {
				returned?: unknown | undefined;
				responseHeaders?: Headers | undefined;
			};
		}),
	],
});
```

This wraps any middleware function to always include `optionsMiddleware` (which injects `AuthContext` type) and a post-hook middleware for response tracking.

---

## 2. All Admin Endpoints and Their Permission Requirements

The admin plugin registers 15 endpoints via `createAuthEndpoint` calls in `routes.ts`:

| Endpoint | Path | Method | Requires `adminMiddleware`? | Permission Checked | Permission Action |
|----------|------|--------|---------------------------|-------------------|-------------------|
| `setRole` | `/admin/set-role` | POST | Yes | `user: ["set-role"]` | user.set-role |
| `getUser` | `/admin/get-user` | GET | Yes | `user: ["get"]` | user.get |
| `createUser` | `/admin/create-user` | POST | **No** | `user: ["create"]` | user.create |
| `adminUpdateUser` | `/admin/update-user` | POST | Yes | `user: ["update"]` + `user: ["set-role"]` for role changes | user.update |
| `listUsers` | `/admin/list-users` | GET | Yes | `user: ["list"]` | user.list |
| `listUserSessions` | `/admin/list-user-sessions` | POST | Yes | `session: ["list"]` | session.list |
| `unbanUser` | `/admin/unban-user` | POST | Yes | `user: ["ban"]` | user.ban |
| `banUser` | `/admin/ban-user` | POST | Yes | `user: ["ban"]` | user.ban |
| `impersonateUser` | `/admin/impersonate-user` | POST | Yes | `user: ["impersonate"]` + `user: ["impersonate-admins"]` for admin targets | user.impersonate |
| `stopImpersonating` | `/admin/stop-impersonating` | POST | **No** | None (checks session.impersonatedBy manually) | N/A |
| `revokeUserSession` | `/admin/revoke-user-session` | POST | Yes | `session: ["revoke"]` | session.revoke |
| `revokeUserSessions` | `/admin/revoke-user-sessions` | POST | Yes | `session: ["revoke"]` | session.revoke |
| `removeUser` | `/admin/remove-user` | POST | Yes | `user: ["delete"]` | user.delete |
| `setUserPassword` | `/admin/set-user-password` | POST | Yes | `user: ["set-password"]` | user.set-password |
| `userHasPermission` | `/admin/has-permission` | POST | **No** | None (checks permissions directly) | N/A |

**Default Permissions (from `access/statement.ts`):**

```typescript
export const defaultStatements = {
	user: [
		"create", "list", "set-role", "ban", "impersonate", "impersonate-admins",
		"delete", "set-password", "get", "update",
	],
	session: ["list", "revoke", "delete"],
} as const;
```

**Default Roles:**
- `admin`: All permissions except empty arrays
- `user`: Empty arrays (no permissions)

---

## 3. How hasPermission is Used in Endpoint Handlers

**File:** `temp/better-auth/packages/better-auth/src/plugins/admin/has-permission.ts`

```typescript
export const hasPermission = (
	input: {
		userId?: string | undefined;
		role?: string | undefined;
		options?: AdminOptions | undefined;
	} & PermissionExclusive,
) => {
	if (input.userId && input.options?.adminUserIds?.includes(input.userId)) {
		return true;
	}
	if (!input.permissions) {
		return false;
	}
	const roles = (input.role || input.options?.defaultRole || "user").split(",");
	const acRoles = input.options?.roles || defaultRoles;
	for (const role of roles) {
		const _role = acRoles[role as keyof typeof acRoles];
		const result = _role?.authorize(input.permissions);
		if (result?.success) {
			return true;
		}
	}
	return false;
};
```

**Check Pattern in Handlers:**

Every protected handler follows this pattern:

```typescript
async (ctx) => {
	const session = ctx.context.session;
	const canDoAction = hasPermission({
		userId: ctx.context.session.user.id,
		role: session.user.role,
		options: opts,
		permissions: {
			resource: ["action"],
		},
	});
	if (!canDoAction) {
		throw APIError.from(
			"FORBIDDEN",
			ADMIN_ERROR_CODES.YOUR_ARE_NOT_ALLOWED_TO_ACTION,
		);
	}
	// ... proceed with action
}
```

**hasPermission Logic:**

1. **Admin User IDs bypass**: If `userId` is in `adminUserIds` array, return `true` immediately
2. **Split roles**: Roles are comma-separated strings split into an array
3. **Iterate roles**: For each role, check if that role has the required permissions
4. **Authorize call**: The `authorize()` method on the role checks if all requested permissions are included in the role's allowed actions
5. **Return first match**: Returns `true` on first successful authorization

**Special Cases:**

- **adminUpdateUser**: Checks TWO permissions - `user: ["update"]` for general updates AND `user: ["set-role"]` specifically when the `role` field is being modified
- **impersonateUser**: First checks `user: ["impersonate"]`, then if target is an admin, additionally checks `user: ["impersonate-admins"]` or `opts.allowImpersonatingAdmins === true`

---

## 4. How the `use` Array in createAuthEndpoint Applies Middleware

**File:** `packages/core/src/api/index.ts` (lines 173-205)

```typescript
export function createAuthEndpoint(pathOrOptions, handlerOrOptions, handlerOrNever) {
	const path = typeof pathOrOptions === "string" ? pathOrOptions : undefined;
	const options = typeof handlerOrOptions === "object" ? handlerOrOptions : pathOrOptions;
	const handler = typeof handlerOrOptions === "function" ? handlerOrOptions : handlerOrNever;

	if (path) {
		return createEndpoint(
			path,
			{
				...options,
				use: [...(options?.use || []), ...use],  // <-- middleware composition here
			} as any,
			async (ctx) => runWithEndpointContext(ctx, () => handler(ctx)),
		);
	}
	// ... similar for options-only overload
}
```

**Key insight:** The `use` array is prepended with user-provided middleware and appended with the default `use` array (containing `optionsMiddleware`):

```typescript
const use = [optionsMiddleware];
```

So the final middleware stack is: `[...userMiddlewares, optionsMiddleware]`

**Better-Call's Endpoint creation** (from `better-call` library) processes middleware in order - they execute left-to-right, with each middleware either passing control to the next or returning a response early.

---

## 5. Middleware Composition Patterns Used

### Pattern A: Pre-flight Session Check (adminMiddleware)

Used by most endpoints to ensure authentication before permission checking:

```typescript
// Applied via:
{
	method: "POST",
	use: [adminMiddleware],  // <-- session check happens here
}

// Handler still does hasPermission check for fine-grained authorization
async (ctx) => {
	const canUpdateUser = hasPermission({...});
	if (!canUpdateUser) {
		throw APIError.from("FORBIDDEN", ...);
	}
}
```

### Pattern B: Two-Layer Authorization

For `adminUpdateUser`, role changes require an additional permission check:

```typescript
async (ctx) => {
	// First check: general update permission
	const canUpdateUser = hasPermission({
		permissions: { user: ["update"] },
		...
	});

	// Second check (only if role is being changed): set-role permission
	if (Object.prototype.hasOwnProperty.call(ctx.body.data, "role")) {
		const canSetRole = hasPermission({
			permissions: { user: ["set-role"] },
			...
		});
		if (!canSetRole) { throw ... }
	}
}
```

### Pattern C: Bypass via adminUserIds

Certain users bypass all role-based permission checks by being in the `adminUserIds` array:

```typescript
if (input.userId && input.options?.adminUserIds?.includes(input.userId)) {
	return true;  // Immediate bypass
}
```

### Pattern D: Conditional Middleware Application

`createUser` and `userHasPermission` do NOT use `adminMiddleware`, instead they do an inline session check inside the handler:

```typescript
async (ctx) => {
	const session = await getSessionFromCtx<{ role: string }>(ctx);
	if (!session && (ctx.request || ctx.headers)) {
		throw ctx.error("UNAUTHORIZED");
	}
	if (session) {
		const canCreateUser = hasPermission({...});
		// ...
	}
	// Continue without session (anonymous user creation allowed in some cases)
}
```

### Pattern E: Database-Level Ban Checking

The `admin.ts` plugin registers database hooks that automatically reject banned users at the session creation level:

```typescript
init() {
	return {
		options: {
			databaseHooks: {
				session: {
					create: {
						async before(session, ctx) {
							const user = await ctx.context.internalAdapter.findUserById(session.userId);
							if (user?.banned) {
								// Redirect for OAuth callbacks, throw for API calls
								throw APIError.from("FORBIDDEN", {...});
							}
						},
					},
				},
			},
		},
	};
}
```

### Pattern F: Impersonation State Preservation

`stopImpersonating` uses a special `admin_session` cookie to restore the original admin session after impersonation ends:

```typescript
// Creates a special admin_session cookie during impersonateUser
await ctx.setSignedCookie(
	adminCookieProp.name,
	`${ctx.context.session.session.token}:${dontRememberMeCookie || ""}`,
	ctx.context.secret,
	authCookies.sessionToken.attributes,
);

// Restores admin session in stopImpersonating
const adminSessionCookie = ctx.context.createAuthCookie("admin_session");
const adminCookie = await ctx.getSignedCookie(adminSessionCookie.name, ...);
const [adminSessionToken, dontRememberMeCookie] = adminCookie?.split(":");
```

---

## Summary Table: Endpoint Security Matrix

| Endpoint | authN | authZ | Self-Protection |
|----------|-------|-------|-----------------|
| setRole | middleware | hasPermission | - |
| getUser | middleware | hasPermission | - |
| createUser | inline check | hasPermission | - |
| adminUpdateUser | middleware | hasPermission (x2) | - |
| listUsers | middleware | hasPermission | - |
| listUserSessions | middleware | hasPermission | - |
| banUser | middleware | hasPermission | check: not self |
| unbanUser | middleware | hasPermission | - |
| impersonateUser | middleware | hasPermission | check: not admin |
| stopImpersonating | inline | N/A | - |
| revokeUserSession | middleware | hasPermission | - |
| revokeUserSessions | middleware | hasPermission | - |
| removeUser | middleware | hasPermission | check: not self |
| setUserPassword | middleware | hasPermission | - |
| userHasPermission | inline | N/A | - |

Where:
- **authN** = Authentication layer (adminMiddleware vs inline session check)
- **authZ** = Authorization layer (hasPermission call)
- **Self-Protection** = Additional check preventing admin from action on themselves