# Caching Systems Analysis

## Overview

This document analyzes the caching mechanisms in **better-auth** (client-side and server-side cookie cache) and the **planned module-scoped caching** for DeesseJS. Understanding these systems is critical for building a performant, stateless-friendly authentication layer.

---

## 1. Better-Auth Multi-Layer Caching Architecture

Better-Auth implements a sophisticated **multi-layer caching system** for session management that spans both server and client.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Session Atom │  │   $store     │  │  SessionRefreshManager │  │
│  │ (nanostores) │  │ (atoms)      │  │  - polling            │  │
│  └──────────────┘  └──────────────┘  │  - focus refetch      │  │
│         │                │          │  - online refetch     │  │
│         │                │          └────────────────────────┘  │
│         │                │                     │                 │
│         ▼                ▼                     ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Cross-Tab Sync (Storage Events)                │ │
│  │              BroadcastChannel → localStorage                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Cookies
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Cookie Cache (session_data)                   │   │
│  │  - compact: Base64url + HMAC-SHA256                       │   │
│  │  - jwt: JWT with HMAC                                     │   │
│  │  - jwe: A256CBC-HS512 (encrypted + signed)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Database (optional, for revocation)          │   │
│  │              DrizzleAdapter / KyselyAdapter / etc.        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Server-Side Cookie Cache

### Purpose

The cookie cache enables **stateless session validation** without database lookups. Session data is stored directly in signed/encrypted HTTP cookies.

### Configuration

```typescript
session: {
    cookieCache?: {
        enabled?: boolean;
        maxAge?: number;              // Cookie max age in seconds
        strategy?: "compact" | "jwt" | "jwe";
        version?: string | ((session, user) => string | Promise<string>);
        refreshCache?: boolean | { updateAge?: number };
    };
}
```

### Encryption Strategies

| Strategy | Algorithm | Encryption | Use Case |
|----------|-----------|------------|----------|
| `compact` | Base64url + HMAC-SHA256 | **Signed only** | Default for DB-enabled, fastest |
| `jwt` | JWT (HS256) | Signed only | Standard format, widely supported |
| `jwe` | A256CBC-HS512 | **Encrypted + Signed** | Default for stateless mode, most secure |

### Cookie Structure

```
better-auth.session_data = "<encrypted/signed session token>"
better-auth.session_data.0 = "<chunk 1 if >4KB>"  (when data exceeds 4096 bytes)
better-auth.session_data.1 = "<chunk 2 if >4KB>"
...
```

### Cookie Chunking

When session data exceeds **4096 bytes** (browser cookie limit), `session-store.ts` automatically splits it:

```typescript
const ALLOWED_COOKIE_SIZE = 4096;
const ESTIMATED_EMPTY_COOKIE_SIZE = 200;
const CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE;
```

### Session Freshness

Sessions have two time-based concepts:

| Concept | Default | Purpose |
|---------|---------|---------|
| `expiresIn` | 7 days | When the entire session expires |
| `freshAge` | 1 day | Window for "fresh" operations (password change, account deletion) |

---

## 3. Client-Side Session Atom

### Framework-Agnostic State (Nanostores)

Better-Auth uses **nanostores** for framework-agnostic reactive state:

```typescript
export type SessionAtom = AuthQueryAtom<{
    user: User;
    session: Session;
}>;

export type AuthQueryAtom<T> = {
    data: T | null;
    error: BetterFetchError | null;
    isPending: boolean;
    isRefetching: boolean;
    refetch: (queryParams?) => Promise<void>;
};
```

### Session Signal

The `$sessionSignal` is a boolean atom that triggers re-renders when toggled:

```typescript
$sessionSignal: atom<boolean>(false);
```

When certain operations occur (sign-out, update-user), the signal is toggled to force all subscribed components to re-render.

### SessionRefreshManager

The `SessionRefreshManager` handles automatic session refreshing:

```typescript
interface SessionRefreshState {
    lastSync: number;              // Last successful sync
    lastSessionRequest: number;   // Last API call timestamp
    cachedSession: any;           // Local session cache
    pollInterval?: ReturnType<typeof setInterval>;
    unsubscribeBroadcast?: () => void;
    unsubscribeFocus?: () => void;
    unsubscribeOnline?: () => void;
}
```

### Refresh Triggers

| Trigger | Event | Behavior |
|---------|-------|----------|
| Polling | `setInterval` | Periodic refetch if `refetchInterval > 0` |
| Window Focus | `visibilitychange` | Refetch when tab becomes visible |
| Network Recovery | `online`/`offline` | Refetch when back online |
| Cross-Tab Sync | `storage` event | Refetch when another tab updates session |

### Rate Limiting

```typescript
const FOCUS_REFETCH_RATE_LIMIT_SECONDS = 5;
```

Prevents excessive refetches during rapid focus/unfocus cycles.

---

## 4. Cross-Tab Session Sync

### Mechanism: Storage Events

Better-Auth uses the **Storage Event API** for cross-tab synchronization:

```typescript
export interface BroadcastMessage {
    event?: "session";
    data?: {
        trigger?: "signout" | "getSession" | "updateUser";
    };
    clientId: string;
    timestamp: number;
}
```

### Implementation

```typescript
class WindowBroadcastChannel implements BroadcastChannel {
    name = "better-auth.message";

    post(message: BroadcastMessage) {
        localStorage.setItem(
            this.name,
            JSON.stringify({ ...message, timestamp: Date.now() })
        );
    }

    setup() {
        window.addEventListener("storage", (event: StorageEvent) => {
            if (event.key !== this.name) return;
            const message = JSON.parse(event.newValue);
            this.notify(message);
        });
    }
}
```

### Why Storage Events Instead of BroadcastChannel?

- **Broader browser support** (IE11 compatible)
- **Works across origins** (with limitations)
- **Simpler implementation** for same-origin tabs

### Sync Triggers

| Path Called | Broadcast Trigger | Action in Other Tabs |
|-------------|-------------------|---------------------|
| `/sign-out` | `"signout"` | Clear session state |
| `/update-user` | `"updateUser"` | Refetch session |
| `/update-session` | `"updateUser"` | Refetch session |

---

## 5. $store and Atom Management

### Global Store Structure

```typescript
const $store = {
    notify: (signal?: string) => {
        pluginsAtoms[signal].set(!pluginsAtoms[signal].get());
    },
    listen: (signal: string, listener: Listener) => {
        pluginsAtoms[signal].subscribe(listener);
    },
    atoms: pluginsAtoms,
};
```

### Atom Listeners Configuration

```typescript
const atomListeners: ClientAtomListener[] = [
    {
        signal: "$sessionSignal",
        matcher(path) {
            return path === "/sign-out" ||
                   path === "/update-user" ||
                   path === "/update-session" ||
                   path === "/link-social" ||
                   path === "/unlink-account" ||
                   path === "/revoke-session" ||
                   path === "/revoke-other-sessions";
        },
        callback(path, data) {
            if (path === "/sign-out") {
                broadcastSessionUpdate("signout");
            } else {
                broadcastSessionUpdate("getSession");
            }
        },
    },
];
```

---

## 6. Module-Scoped Caching (DeesseJS Planned)

### Design Principle

Unlike Payload CMS which uses `global._payload` (global singleton), DeesseJS uses **module-scoped caching** with explicit imports and **functional programming principles** (immutable state, pure functions).

### Comparison

| Aspect | Payload CMS | DeesseJS (Planned) |
|--------|-------------|-------------------|
| Cache Location | `global._payload` (global object) | Module-scoped `Map` |
| State Mutation | Hidden in closure | **Immutable (functional)** |
| Instance API | `getPayload()` singleton | `getDeesse()` with explicit cache |
| Clear Cache | No (except HMR reload) | `clearDeesseCache()` |
| Testability | Difficult to isolate | Easy with `clearDeesseCache()` |

### Functional Factory Pattern (Recommended)

The factory uses **immutable state** — each cache operation returns a new state rather than mutating existing state. This makes the code easier to test and reason about.

```typescript
/**
 * Immutable cache state - each operation returns a new state
 */
type CacheState<T> = {
    instances: Map<string, T>;
    promises: Map<string, Promise<T>>;
};

/**
 * Pure function: creates empty cache state
 */
const empty = <T>(): CacheState<T> => ({
    instances: new Map(),
    promises: new Map(),
});

/**
 * Pure function: adds instance to cache, returns NEW state
 */
const setInstance = <T>(
    state: CacheState<T>,
    key: string,
    instance: T
): CacheState<T> => ({
    instances: new Map(state.instances).set(key, instance),
    promises: new Map(state.promises).delete(key), // Promise fulfilled, remove it
});

/**
 * Pure function: registers pending promise, returns NEW state
 */
const setPromise = <T>(
    state: CacheState<T>,
    key: string,
    promise: Promise<T>
): CacheState<T> => ({
    instances: state.instances,
    promises: new Map(state.promises).set(key, promise),
});

/**
 * Pure function: removes failed promise, returns NEW state
 */
const removePromise = <T>(
    state: CacheState<T>,
    key: string
): CacheState<T> => ({
    instances: state.instances,
    promises: new Map(state.promises).delete(key),
});

/**
 * Pure function: gets cached instance or pending promise
 */
const getCached = <T>(
    state: CacheState<T>,
    key: string
): T | Promise<T> | undefined => {
    const instance = state.instances.get(key);
    if (instance !== undefined) return instance;
    return state.promises.get(key);
};

/**
 * Cache factory with expressive API
 */
const createFactory = <T, Options>(
    createInstance: (options: Options) => Promise<T>
) => {
    let state: CacheState<T> = empty();

    return {
        async get(key: string, options: Options): Promise<T> {
            const cached = getCached(state, key);
            if (cached !== undefined) return cached as T;

            const promise = createInstance(options);
            state = setPromise(state, key, promise);

            try {
                const instance = await promise;
                state = setInstance(state, key, instance);
                return instance;
            } catch {
                state = removePromise(state, key);
                throw;
            }
        },

        /** Check if cache is empty */
        isEmpty(): boolean {
            return state.instances.size === 0 && state.promises.size === 0;
        },

        /** Number of cached instances (excluding pending promises) */
        size(): number {
            return state.instances.size;
        },

        /** Number of pending promises */
        pendingCount(): number {
            return state.promises.size;
        },

        /** Total entries (instances + pending) */
        totalCount(): number {
            return state.instances.size + state.promises.size;
        },

        /** Check if key has an instance or pending promise */
        has(key: string): boolean {
            return state.instances.has(key) || state.promises.has(key);
        },

        /** Check if key has a resolved instance */
        hasInstance(key: string): boolean {
            return state.instances.has(key);
        },

        /** Check if key has a pending promise */
        hasPromise(key: string): boolean {
            return state.promises.has(key);
        },

        /** Get cached instance without triggering creation */
        getIfCached(key: string): T | undefined {
            return state.instances.get(key);
        },

        /** Get all cached instance keys */
        keys(): IterableIterator<string> {
            return state.instances.keys();
        },

        /** Get all pending promise keys */
        pendingKeys(): IterableIterator<string> {
            return state.promises.keys();
        },

        /** Returns current state for introspection/testing */
        getState(): Readonly<CacheState<T>> {
            return state;
        },

        /** Resets to empty state */
        clear(): void {
            state = empty();
        },
    };
};
```

### Why This Is Functional First

| Aspect | Mutable Version | Functional Version |
|--------|-----------------|-------------------|
| State | Mutated via `Map.set()` | Each update returns new `CacheState` |
| Functions | Impures (side effects) | **Pures** (`setInstance`, `getCached`) |
| Immutability | Reference equality not guaranteed | State snapshots at each step |
| Testability | Hard to test internals | Each function testable in isolation |
| Debuggability | Hard to trace state changes | State transitions are explicit |

### Key Benefits

1. **No hidden mutations**: Every state change is visible in the code flow
2. **Time-travel debugging**: `getState()` returns immutable snapshots
3. **Safe concurrency**: Each operation produces new state (if ever needed)
4. **Thundering herd prevention**: Same promise returned to all concurrent callers
5. **Expressive API**: `isEmpty()`, `size()`, `has()`, `getIfCached()` for clean introspection

### Thundering Herd Prevention

```typescript
// Without thundering herd prevention:
// Call 1: Creates instance (takes 100ms)
// Call 2, 3, 4: Also create instances (all take 100ms each)
// Total: 400ms with 4 instances created

// With thundering herd prevention:
// Call 1: Creates instance, caches promise
// Call 2, 3, 4: Return the same promise
// Total: 100ms with 1 instance created
```

### Server Instance Cache

```typescript
// packages/deesse/src/factory.ts
const deesseCache = createFactory<Deesse, Config>(createDeesse);

export function getDeesse(config: Config): Promise<Deesse> {
    return deesseCache.get("main", config);
}

// Introspection API
export function hasDeesse(): boolean {
    return deesseCache.has("main");
}

export function clearDeesseCache(): void {
    deesseCache.clear();
}
```

### Usage in Next.js

```typescript
// lib/deesse.ts (wiring layer)
// Module-scoped - imported explicitly, no global state
import { createDeesse } from "@deessejs/core/server";
import { createClient } from "@deessejs/core/client";
import { config } from "../deesse.config";

export const deesse = createDeesse(config);
export const client = createClient({ baseURL: config.auth?.baseURL ?? "" });

// In API routes (server components, middleware):
const deesse = await getDeesse(config);

// In client components:
const { data: session } = client.useSession();
```

---

## 7. Cache Invalidation Strategies

### Better-Auth Session Invalidation

| Strategy | Mechanism | Latency |
|----------|-----------|---------|
| **Cookie expiry** | Browser auto-expires cookie | Until `expiresIn` |
| **Cookie cache refresh** | Background refresh before expiry | ~5 min before expiry |
| **Database revocation** | Delete session from DB | Immediate |
| **Secret rotation** | Old cookies fail signature | Immediate |

### Manual Invalidation Points

```typescript
// When password changes:
if (session.revokeOtherSessionsOnPasswordReset) {
    // API call to revoke all sessions except current
}

// When admin deletes user:
await auth.api.revokeSessions({ userId: targetUser.id });

// When user signs out:
await auth.api.signOut();
```

---

## 8. Performance Trade-offs

### Cookie Cache vs Database Sessions

| Aspect | Cookie Cache | Database Sessions |
|--------|--------------|-------------------|
| **Latency** | ~0ms (no network) | ~5-50ms |
| **Scalability** | Stateless | Requires DB connection pool |
| **Revocation** | Delayed (until cookie expires) | Immediate |
| **Storage** | 4KB per session | Unlimited |
| **Security** | Signed/encrypted | Stored in DB |

### Recommended Configuration

```typescript
// High-security application
session: {
    cookieCache: { enabled: false }, // Always validate against DB
    expiresIn: 7 * 24 * 60 * 60,      // 7 days
};

// Scalable application
session: {
    cookieCache: {
        enabled: true,
        strategy: "compact",
        maxAge: 5 * 60,               // 5 minutes
    },
    expiresIn: 30 * 24 * 60 * 60,    // 30 days
};
```

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `packages/better-auth/src/cookies/session-store.ts` | Cookie encoding, chunking, encryption |
| `packages/better-auth/src/cookies/index.ts` | Cookie creation/parsing utilities |
| `packages/better-auth/src/client/session-atom.ts` | Client session atom with nanostores |
| `packages/better-auth/src/client/session-refresh.ts` | SessionRefreshManager |
| `packages/better-auth/src/client/broadcast-channel.ts` | Cross-tab sync via storage events |
| `packages/better-auth/src/client/focus-manager.ts` | visibilitychange handler |
| `packages/better-auth/src/client/online-manager.ts` | online/offline handler |
| `packages/better-auth/src/client/config.ts` | $store and atom listeners |

---

## 10. Summary

| Cache Layer | Type | Location | Purpose |
|-------------|------|----------|---------|
| Cookie Cache | Server | HTTP Cookie | Stateless session validation |
| Session Atom | Client | Memory (nanostores) | Framework reactivity |
| $store | Client | Memory | Plugin state management |
| Cross-Tab Sync | Client | localStorage | Tab synchronization |
| Refresh Manager | Client | Memory + Timers | Auto-refresh session |
| Deesse Factory | Server | Module Memory | Instance caching with immutable state |

The **cookie cache** is the most critical for performance—it's what enables stateless authentication. The **client-side refresh manager** ensures sessions stay in sync without excessive polling. DeesseJS's **functional factory cache** provides instance caching with immutable state, making it easier to test and debug while avoiding the pitfalls of global state.
