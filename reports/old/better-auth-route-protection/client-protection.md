# Better-Auth Client-Side Route Protection Patterns

## Report Location
`reports/better-auth-route-protection/client-protection.md`

---

## 1. How `useSession` Hook Works

### Core Implementation

The `useSession` hook is provided by `createAuthClient` in the React client (`temp/better-auth/packages/better-auth/src/client/react/index.ts`).

**Hook Signature:**
```typescript
useSession: () => {
    data: Session;
    isPending: boolean;
    isRefetching: boolean;
    error: BetterFetchError | null;
    refetch: (queryParams?: { query?: SessionQueryParams } | undefined) => Promise<void>;
};
```

### Session Atom Architecture

The session state is managed through a nanostores atom created in `session-atom.ts`:

```typescript
// temp/better-auth/packages/better-auth/src/client/session-atom.ts
export function getSessionAtom($fetch: BetterFetch, options?: BetterAuthClientOptions) {
    const $signal = atom<boolean>(false);
    const session: SessionAtom = useAuthQuery<{
        user: User;
        session: Session;
    }>($signal, "/get-session", $fetch, {
        method: "GET",
    });
    // ...
}
```

The `AuthQueryAtom` type (`query.ts`) defines the session state shape:
```typescript
export type AuthQueryAtom<T> = PreinitializedWritableAtom<{
    data: null | T;
    error: null | BetterFetchError;
    isPending: boolean;
    isRefetching: boolean;
    refetch: (queryParams?: { query?: SessionQueryParams } | undefined) => Promise<void>;
}>;
```

### React Integration via `useStore`

The React `useStore` hook (`react-store.ts`) wraps `useSyncExternalStore` to subscribe to nanostores atom changes:

```typescript
export function useStore<SomeStore extends Store>(
    store: SomeStore,
    options: UseStoreOptions<SomeStore> = {},
): StoreValue<SomeStore> {
    const snapshotRef = useRef<StoreValue<SomeStore>>(store.get());
    const subscribe = useCallback((onChange: () => void) => {
        const emitChange = (value: StoreValue<SomeStore>) => {
            if (snapshotRef.current === value) return;
            snapshotRef.current = value;
            onChange();
        };
        emitChange(store.value);
        if (keys?.length) {
            return listenKeys(store as any, keys, emitChange);
        }
        return store.listen(emitChange);
    }, deps);
    const get = () => snapshotRef.current as StoreValue<SomeStore>;
    return useSyncExternalStore(subscribe, get, get);
}
```

### SSR-Safe Behavior

The `useAuthQuery` function (`query.ts`) handles SSR properly:
```typescript
const isServer = () => typeof window === "undefined";
// ...
if (isServer()) {
    // On server, don't trigger fetch
    return;
}
```

---

## 2. How `createAuthClient` Provides Session Management

### Client Creation

`createAuthClient` (`react/index.ts`) is the main entry point for client-side auth:

```typescript
export function createAuthClient<Option extends BetterAuthClientOptions>(
    options?: Option | undefined,
) {
    const {
        pluginPathMethods,
        pluginsActions,
        pluginsAtoms,
        $fetch,
        $store,
        atomListeners,
    } = getClientConfig(options);

    // Convert plugin atoms to React hooks (e.g., session -> useSession)
    const resolvedHooks: Record<string, any> = {};
    for (const [key, value] of Object.entries(pluginsAtoms)) {
        resolvedHooks[getAtomKey(key)] = () => useStore(value);
    }
    // ...
}
```

### Session Atom Initialization

The session atom is created via `getSessionAtom` in `config.ts`:

```typescript
const { $sessionSignal, session, broadcastSessionUpdate } = getSessionAtom($fetch, options);
```

### Session Refresh Manager

The `createSessionRefreshManager` (`session-refresh.ts`) handles automatic session refreshing:

```typescript
export function createSessionRefreshManager(opts: SessionRefreshOptions) {
    const { sessionAtom, sessionSignal, $fetch, options = {} } = opts;
    const refetchInterval = options.sessionOptions?.refetchInterval ?? 0;
    const refetchOnWindowFocus = options.sessionOptions?.refetchOnWindowFocus ?? true;
    const refetchWhenOffline = options.sessionOptions?.refetchWhenOffline ?? false;
    // ...
}
```

---

## 3. Client-Side Route Protection Patterns

### Basic Session Check Pattern

```typescript
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
});

export default function ProtectedPage() {
    const { data: session, isPending, error } = authClient.useSession();

    if (isPending) {
        return <div>Loading...</div>;
    }

    if (error || !session) {
        // Redirect to login
        redirect("/sign-in");
        return null;
    }

    return <Dashboard session={session} />;
}
```

### Redirect on Session State Change

The `useSession` hook updates reactively when:
- User signs in/out
- Session expires
- `refetch()` is called
- Automatic refresh triggers update

### Loading State Handling

The `isPending` flag is set during the initial fetch:
```typescript
// query.ts
const value: AuthQueryAtom<T> = atom({
    data: null,
    error: null,
    isPending: true,  // Starts as pending
    isRefetching: false,
    refetch: (queryParams) => fn(queryParams),
});
```

On successful response:
```typescript
value.set({
    data: context.data,
    error: null,
    isPending: false,
    isRefetching: false,
    refetch: value.value.refetch,
});
```

---

## 4. How `session.isPending` and `session.error` Work

### `isPending` State Machine

`isPending` follows this lifecycle:

1. **Initial**: `true` (session unknown)
2. **On Request**: `true` if `currentValue.data === null`, otherwise `isRefetching: true`
3. **On Success**: `false`, `isRefetching: false`
4. **On Error**: `false`, `isRefetching: false`

```typescript
// query.ts - onRequest handler
const currentValue = value.get();
value.set({
    isPending: currentValue.data === null,  // Only true if no cached data
    data: currentValue.data,
    error: null,
    isRefetching: true,
    refetch: value.value.refetch,
});
```

### `isRefetching` State

`isRefetching` is `true` when:
- A background refetch is in progress
- Session data already exists (user is not loading for first time)

This allows showing a subtle refresh indicator without blocking the UI:
```typescript
if (isRefetching) {
    // Show subtle refresh indicator, don't block UI
}
```

### `error` Handling

```typescript
// query.ts - onError handler
const isUnauthorized = context.error.status === 401;
value.set({
    error: context.error,
    data: isUnauthorized
        ? null  // Clear session on HTTP 401
        : value.get().data,  // Preserve stale data on other errors
    isPending: false,
    isRefetching: false,
    refetch: value.value.refetch,
});
```

Key behaviors:
- **401 Unauthorized**: Session is cleared (`data: null`)
- **Other errors**: Stale session data is preserved

---

## 5. Protecting Next.js Pages with Role Checks

### Using the Admin Plugin's `checkRolePermission`

The admin plugin (`plugins/admin/client.ts`) provides client-side role checking:

```typescript
import { adminClient, hasPermission } from "better-auth/plugins/admin";

const ac = adminClient({
    ac: customAccessControl,  // Optional custom access control
    roles: {
        admin: adminAc,
        user: userAc,
    },
});

// On the client:
const authClient = createAuthClient({
    plugins: [ac],
});

// Check permission:
const canAccess = authClient.admin.checkRolePermission({
    role: "admin",
    permissions: {
        user: ["list", "get"],
        session: ["list"],
    },
});

if (!canAccess) {
    redirect("/unauthorized");
}
```

### Role-Based Access Control (RBAC) System

The admin plugin uses an Access Control (AC) system defined in `plugins/access/access.ts`:

```typescript
export function role<TStatements extends Statements>(statements: TStatements) {
    return {
        authorize<K extends keyof TStatements>(
            request: { [key in K]?: TStatements[key] | { actions: TStatements[key]; connector: "OR" | "AND" } },
            connector: "OR" | "AND" = "AND",
        ): AuthorizeResponse { /* ... */ }
    };
}
```

### Default Roles and Permissions

From `plugins/admin/access/statement.ts`:

```typescript
export const defaultStatements = {
    user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
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

### Complete Next.js Page Protection Pattern

```typescript
import { createAuthClient } from "better-auth/react";
import { redirect } from "next/navigation";

const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
    plugins: [adminClient()],
});

export default function AdminUsersPage() {
    const { data: session, isPending, error } = authClient.useSession();

    // Step 1: Check if session is loading
    if (isPending) {
        return <LoadingSkeleton />;
    }

    // Step 2: Check if authenticated
    if (error || !session) {
        redirect("/sign-in");
        return null;
    }

    // Step 3: Check permissions
    const canListUsers = authClient.admin.checkRolePermission({
        role: session.user.role || "user",
        permissions: {
            user: ["list"],
        },
    });

    if (!canListUsers) {
        redirect("/unauthorized");
        return null;
    }

    return <UserManagementUI users={[]} />;
}
```

---

## 6. The `refetchInterval` and Focus Refetch Behavior

### Configuration Options

From `packages/core/src/types/plugin-client.ts`:

```typescript
export interface RevalidateOptions {
    /**
     * A time interval (in seconds) after which the session will be re-fetched.
     * If set to `0` (default), the session is not polled.
     * @default 0
     */
    refetchInterval?: number | undefined;

    /**
     * Automatically refetch the session when the user switches back to the window/tab.
     * @default true
     */
    refetchOnWindowFocus?: boolean | undefined;

    /**
     * Set to `false` to stop polling when the device has no internet access.
     * @default false
     */
    refetchWhenOffline?: boolean | undefined;
}
```

### Usage Example

```typescript
const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
    sessionOptions: {
        refetchInterval: 60,       // Refetch every 60 seconds
        refetchOnWindowFocus: true,  // Refetch when tab becomes visible
        refetchWhenOffline: false,  // Don't refetch when offline
    },
});
```

### Polling Implementation

From `session-refresh.ts`:

```typescript
const setupPolling = () => {
    if (refetchInterval && refetchInterval > 0) {
        state.pollInterval = setInterval(() => {
            const currentSession = sessionAtom.get();
            if (currentSession?.data) {
                triggerRefetch({ event: "poll" });
            }
        }, refetchInterval * 1000);
    }
};
```

**Important**: Polling only occurs when there is existing session data (`currentSession?.data`). If the user is not logged in, no polling requests are made.

### Focus Refetch Implementation

The focus manager (`focus-manager.ts`) listens to `visibilitychange` events:

```typescript
class WindowFocusManager implements FocusManager {
    setup() {
        const visibilityHandler = () => {
            if (document.visibilityState === "visible") {
                this.setFocused(true);
            }
        };
        document.addEventListener("visibilitychange", visibilityHandler, false);
        return () => {
            document.removeEventListener("visibilitychange", visibilityHandler);
        };
    }
}
```

### Rate Limiting on Focus Refetch

```typescript
// Don't refetch on focus if a session request was made within 5 seconds
const FOCUS_REFETCH_RATE_LIMIT_SECONDS = 5;

const triggerRefetch = (event?: { event?: "poll" | "visibilitychange" | "storage" }) => {
    // ...
    if (event?.event === "visibilitychange") {
        const timeSinceLastRequest = now() - state.lastSessionRequest;
        if (timeSinceLastRequest < FOCUS_REFETCH_RATE_LIMIT_SECONDS) {
            return;  // Skip refetch due to rate limiting
        }
        state.lastSessionRequest = now();
        fetchSessionWithRefresh();
        return;
    }
    // ...
};
```

### Broadcast Channel for Cross-Tab Sync

Session changes in one tab are broadcast to other tabs via the Broadcast Channel API (implemented with `localStorage` events as fallback):

```typescript
const broadcastSessionUpdate = (trigger: "signout" | "getSession" | "updateUser") => {
    getGlobalBroadcastChannel().post({
        event: "session",
        data: { trigger },
        clientId: Math.random().toString(36).substring(7),
    });
};

const setupBroadcast = () => {
    state.unsubscribeBroadcast = getGlobalBroadcastChannel().subscribe(() => {
        triggerRefetch({ event: "storage" });
    });
};
```

When a user signs out in one tab, other tabs receive the `storage` event and refetch the session.

### Online/Offline Detection

```typescript
class WindowOnlineManager implements OnlineManager {
    isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    setup() {
        const onOnline = () => this.setOnline(true);
        const onOffline = () => this.setOnline(false);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        // ...
    }
}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/client/react/index.ts` | React `createAuthClient` and `useStore` |
| `src/client/react/react-store.ts` | React integration for nanostores |
| `src/client/session-atom.ts` | Session atom creation via `useAuthQuery` |
| `src/client/session-refresh.ts` | Automatic session refresh manager |
| `src/client/query.ts` | `useAuthQuery` implementation |
| `src/client/config.ts` | Client configuration and atom listeners |
| `src/client/focus-manager.ts` | Window focus detection |
| `src/client/broadcast-channel.ts` | Cross-tab session sync |
| `src/client/online-manager.ts` | Online/offline detection |
| `src/plugins/admin/client.ts` | Admin plugin client with role checks |
| `src/plugins/admin/has-permission.ts` | Permission checking logic |
| `src/plugins/access/access.ts` | Access control framework |
| `packages/core/src/types/plugin-client.ts` | `BetterAuthClientOptions`, `RevalidateOptions` |