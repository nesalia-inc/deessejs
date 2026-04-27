# RBAC System Analysis: better-auth Admin Plugin

## Report Location
`reports/better-auth-route-protection/rbac-system.md`

---

## 1. The AccessControl Class and How It Works

The access control system is not implemented as a class but as a factory pattern built from two core functions in `temp/better-auth/packages/better-auth/src/plugins/access/access.ts`:

**`createAccessControl(s)`** - The entry point factory that takes a `Statements` map (resource -> allowed actions) and returns an object with:
- `newRole()` - method to create a new role
- `statements` - the original statements passed in

```typescript
export function createAccessControl<const TStatements extends Statements>(s: TStatements) {
    return {
        newRole<K extends keyof TStatements>(statements: Subset<K, TStatements>) {
            return role<Subset<K, TStatements>>(statements);
        },
        statements: s,
    };
}
```

**`role(statements)`** - Creates a Role object with:
- `authorize(request, connector)` - checks if requested permissions are satisfied
- `statements` - the role's permitted statements

The `authorize` method iterates over each requested resource and checks if the role's statements allow the requested actions. It supports two connector modes:
- `AND` (default) - all requested resources and actions must be allowed
- `OR` - success if any resource/action is allowed

The authorize response is either `{ success: true }` or `{ success: false, error: string }`.

---

## 2. How Roles Are Defined (adminAc, userAc, etc.)

Roles are defined in `temp/better-auth/packages/better-auth/src/plugins/admin/access/statement.ts`:

**`defaultStatements`** - The base set of resources and actions:

```typescript
export const defaultStatements = {
    user: [
        "create", "list", "set-role", "ban", "impersonate",
        "impersonate-admins", "delete", "set-password", "get", "update",
    ],
    session: ["list", "revoke", "delete"],
} as const;
```

**`defaultAc`** - The base access control instance:
```typescript
export const defaultAc = createAccessControl(defaultStatements);
```

**`adminAc`** - Created via `defaultAc.newRole()` with all permissions (full access):
```typescript
export const adminAc = defaultAc.newRole({
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
    session: ["list", "revoke", "delete"],
});
```

Note: `adminAc` does NOT include `"impersonate-admins"` in its user permissions.

**`userAc`** - Created with empty permissions (no access to admin actions):
```typescript
export const userAc = defaultAc.newRole({
    user: [],
    session: [],
});
```

**`defaultRoles`** - Maps role names to role objects:
```typescript
export const defaultRoles = {
    admin: adminAc,
    user: userAc,
};
```

---

## 3. How hasPermission Checks Permissions

Located in `temp/better-auth/packages/better-auth/src/plugins/admin/has-permission.ts`:

```typescript
export const hasPermission = (
    input: {
        userId?: string | undefined;
        role?: string | undefined;
        options?: AdminOptions | undefined;
    } & PermissionExclusive,
) => {
    // 1. adminUserIds bypass
    if (input.userId && input.options?.adminUserIds?.includes(input.userId)) {
        return true;
    }

    // 2. No permissions = deny
    if (!input.permissions) {
        return false;
    }

    // 3. Parse roles (comma-separated for multiple roles)
    const roles = (input.role || input.options?.defaultRole || "user").split(",");
    const acRoles = input.options?.roles || defaultRoles;

    // 4. Check each role
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

The `permissions` parameter passed to `hasPermission` is an object where keys are resource names and values are arrays of actions being requested. For example:
```typescript
hasPermission({
    userId: "123",
    role: "admin",
    permissions: { user: ["create", "delete"] }
})
```

---

## 4. Relationship Between Roles, Permissions, and Statements

**Statements** (`defaultStatements`) define the universe of available actions per resource. They are the allowlist of what actions *can* be permitted.

**Roles** (`adminAc`, `userAc`) are subsets of statements - each role specifies which actions on which resources are permitted for that role.

**Permissions** (the input to `authorize()`) represent the specific resource+actions being requested. The `authorize()` method checks if the role's statements satisfy the requested permissions.

```
Statements (universe)      Role (subset)         Requested Permission
────────────────────      ─────────────         ───────────────────
user: [create, list,   ←   user: [create,    ←   { user: [create] }
  set-role, ban, ...]       list, delete]          OR
                          session: [list]       { user: ["ban"] }
```

The `authorize` method uses strict subset checking - the role must include all requested actions for each resource (in AND mode).

---

## 5. How adminUserIds Bypasses Role Checks

Line 15-17 of `has-permission.ts`:

```typescript
if (input.userId && input.options?.adminUserIds?.includes(input.userId)) {
    return true;
}
```

If a user's ID appears in the `adminUserIds` array (configured in `AdminOptions`), they immediately get `true` returned, skipping all role-based authorization checks entirely. This is a hardcoded bypass mechanism.

From `AdminOptions` types:
```typescript
/**
 * List of user ids that should have admin access
 *
 * If this is set, the `adminRole` option is ignored
 */
adminUserIds?: string[] | undefined;
```

Note: The comment references `adminRole` but the actual code checks `adminRoles` (plural). The bypass takes precedence over the role-based system.

---

## 6. How Custom Roles Can Be Defined via AdminOptions

Two configuration options in `AdminOptions` allow custom roles:

**Option 1: `roles` - Custom role object map**

```typescript
/**
 * Custom permissions for roles.
 */
roles?: {
    [key in string]?: Role;
} | undefined;
```

This allows passing a complete custom roles object that replaces `defaultRoles`:

```typescript
const myRoles = {
    admin: adminAc,
    moderator: defaultAc.newRole({
        user: ["list", "get", "ban"],
        session: ["list"],
    }),
    user: userAc,
};

// Usage in plugin:
adminPlugin({
    options: {
        roles: myRoles
    }
})
```

**Option 2: `ac` - Custom AccessControl instance**

```typescript
/**
 * Configure the roles and permissions for the admin plugin.
 */
ac?: AccessControl | undefined;
```

This allows passing a completely custom `AccessControl` instance created via `createAccessControl()`, which would include custom statements (resources and actions):

```typescript
const customAc = createAccessControl({
    user: ["create", "read", "update", "delete"],
    post: ["create", "publish", "delete"],
    // ... custom resources
});

adminPlugin({
    options: {
        ac: customAc
    }
})
```

The `hasPermission` function resolves roles from `input.options?.roles || defaultRoles`, so custom roles fully replace the defaults when provided.

---

## Additional Schema Fields

The admin plugin extends the user schema (`schema.ts`) with RBAC-related fields:

```typescript
fields: {
    role: { type: "string", required: false, input: false },
    banned: { type: "boolean", defaultValue: false, required: false, input: false },
    banReason: { type: "string", required: false, input: false },
    banExpires: { type: "date", required: false, input: false },
}
```

And session schema:
```typescript
impersonatedBy: { type: "string", required: false }
```

These fields are managed by the plugin but not exposed as user-editable input fields (`input: false`), meaning they are set programmatically by the plugin's internal logic.