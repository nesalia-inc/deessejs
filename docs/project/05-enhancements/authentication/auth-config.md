# Auth Integration Enhancements for DeesseJS

## Overview

Recommendations for enhancing DeesseJS's authentication system using Next.js `unauthorized()` and advanced auth patterns.

## Current State Analysis

Based on documentation analysis, DeesseJS has:

- `docs\next\auth-status-pages.md` - Basic forbidden/unauthorized pages
- `docs\native-features.md` - Basic auth system

Current gaps:

- No centralized auth configuration
- Limited role-based access control
- Missing auth state management
- No session management UI

## Recommended Enhancements

### 1. Auth Configuration System

Centralized authentication configuration:

```typescript
// lib/auth/config.ts
export interface AuthConfig {
  provider: 'better-auth' | 'next-auth' | 'clerk' | 'custom';
  session: {
    strategy: 'jwt' | 'database';
    maxAge: number;
    updateAge: number;
  };
  pages: {
    login: string;
    logout: string;
    error: string;
    verify: string;
  };
  callbacks: {
    signIn?: (user: any, account: any) => boolean | Promise<boolean>;
    signOut?: (user: any) => void | Promise<void>;
    session?: (session: any) => any | Promise<any>;
    jwt?: (token: any, user: any) => any | Promise<any>;
  };
  roles: string[];
  permissions: Record<string, string[]>;
}

export const authConfig: AuthConfig = {
  provider: 'better-auth',
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 1 day
  },
  pages: {
    login: '/login',
    logout: '/logout',
    error: '/auth/error',
    verify: '/auth/verify-request',
  },
  roles: ['admin', 'editor', 'author', 'user'],
  permissions: {
    posts: {
      read: ['admin', 'editor', 'author', 'user'],
      write: ['admin', 'editor', 'author'],
      delete: ['admin', 'editor'],
      publish: ['admin', 'editor'],
    },
    users: {
      read: ['admin'],
      write: ['admin'],
      delete: ['admin'],
    },
  },
};
```

### 2. Enhanced Auth Hooks

Type-safe authentication hooks for Server Components:

```typescript
// lib/auth/hooks.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unauthorized } from 'next/navigation';
import { cache } from 'react';

export interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  expiresAt: Date;
}

const getSessionCache = cache<Promise<Session | null>>({});

export async function getSession(): Promise<Session | null> {
  const cached = getSessionCache.get();
  if (cached) {
    return cached;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    // Validate session token and get user data
    const session = await validateSessionToken(sessionToken);

    // Cache the result
    getSessionCache.set(Promise.resolve(session));

    return session;
  } catch (error) {
    console.error('Failed to validate session:', error);
    return null;
  }
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function requireRole(roles: string[]): Promise<Session> {
  const session = await requireAuth();

  if (!roles.includes(session.user.role)) {
    unauthorized();
  }

  return session;
}

export async function requirePermission(resource: string, action: string): Promise<Session> {
  const session = await requireAuth();
  const permissions = authConfig.permissions[resource];

  if (!permissions) {
    throw new Error(`Unknown resource: ${resource}`);
  }

  const allowedRoles = permissions[action];
  if (!allowedRoles) {
    throw new Error(`Unknown action: ${action} on ${resource}`);
  }

  if (!allowedRoles.includes(session.user.role)) {
    unauthorized();
  }

  return session;
}

export async function canAccess(resource: string, action: string): Promise<boolean> {
  try {
    await requirePermission(resource, action);
    return true;
  } catch {
    return false;
  }
}

async function validateSessionToken(token: string): Promise<Session | null> {
  // Implementation depends on auth provider
  // This is a placeholder for Better Auth
  return null;
}
```

### 3. Collection-Level Authorization

Auto-generate authorization for collections:

```typescript
// lib/auth/collection-auth.ts
import { unauthorized } from 'next/navigation';
import { authConfig } from './config';
import { db } from '@deessejs/db';

export interface CollectionAuthConfig {
  collection: string;
  permissions: {
    read?: string[];
    write?: string[];
    delete?: string[];
    publish?: string[];
    manage?: string[];
  };
  fieldLevelPermissions?: {
    [fieldName: string]: string[];
  };
}

export async function authorizeCollection(
  config: CollectionAuthConfig,
  action: 'read' | 'write' | 'delete' | 'publish' | 'manage',
  itemId?: string
): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  const allowedRoles = config.permissions[action];

  if (!allowedRoles) {
    // No permissions defined for this action
    return true;
  }

  if (!allowedRoles.includes(session.user.role)) {
    return false;
  }

  // Check item-level permissions if specified
  if (itemId && config.fieldLevelPermissions) {
    const item = await db[config.collection].findUnique({
      where: { id: itemId },
      select: { authorId: true },
    });

    if (item) {
      // Allow if user is the owner
      if (item.authorId === session.user.id) {
        return true;
      }
    }
  }

  return true;
}

export async function requireCollectionAccess(
  config: CollectionAuthConfig,
  action: 'read' | 'write' | 'delete' | 'publish' | 'manage',
  itemId?: string
): Promise<void> {
  const hasAccess = await authorizeCollection(config, action, itemId);

  if (!hasAccess) {
    unauthorized();
  }
}

// Usage in Server Actions
export async function updatePost(id: string, data: any) {
  const postsConfig: CollectionAuthConfig = {
    collection: 'posts',
    permissions: authConfig.permissions.posts,
  };

  await requireCollectionAccess(postsConfig, 'write', id);

  // Proceed with update
  const post = await db.posts.update({
    where: { id },
    data,
  });

  return post;
}
```

### 4. Auth State Management

Server and client auth state synchronization:

```typescript
// lib/auth/state.ts
'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export async function getAuthState(): Promise<AuthState> {
  const session = await getSession();

  return {
    isAuthenticated: !!session,
    user: session?.user,
  };
}

export async function updateAuthState(): Promise<void> {
  revalidatePath('/', 'layout');
  revalidatePath('/admin', 'layout');
  revalidatePath('/dashboard', 'layout');
}

export async function setAuthCookie(
  token: string,
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  }
) {
  const cookieStore = await cookies();

  cookieStore.set('session', token, {
    httpOnly: options?.httpOnly ?? true,
    secure: options?.secure ?? process.env.NODE_ENV === 'production',
    sameSite: options?.sameSite ?? 'lax',
    path: '/',
    maxAge: options?.maxAge ?? 30 * 24 * 60 * 60, // 30 days
    priority: 'high',
  });

  await updateAuthState();
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');

  await updateAuthState();
}
```

### 5. Auth Error Handling

Comprehensive authentication error handling:

```typescript
// lib/auth/errors.ts
import { unauthorized, redirect } from 'next/navigation';
import { ErrorFactory } from '@/lib/errors/classification';

export enum AuthError {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNVERIFIED_ACCOUNT = 'UNVERIFIED_ACCOUNT',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  MFA_REQUIRED = 'MFA_REQUIRED',
}

export function handleAuthError(
  error: AuthError,
  context?: {
    returnPath?: string;
  }
) {
  switch (error) {
    case AuthError.SESSION_EXPIRED:
    case AuthError.TOKEN_INVALID:
      // Clear session and redirect to login
      return redirect('/login?error=session-expired');

    case AuthError.UNVERIFIED_ACCOUNT:
      return redirect('/verify-email');

    case AuthError.ACCOUNT_SUSPENDED:
      return redirect('/suspended');

    case AuthError.INSUFFICIENT_PERMISSIONS:
      unauthorized();

    case AuthError.MFA_REQUIRED:
      return redirect('/mfa');

    default:
      return redirect('/login?error=unknown');
  }
}

export function throwAuthError(error: AuthError) {
  throw ErrorFactory.unauthorized('Authentication failed');
}
```

### 6. Multi-Factor Authentication (MFA)

MFA support implementation:

```typescript
// lib/auth/mfa.ts
import { db } from '@deessejs/db';
import { generateTOTP, verifyTOTP } from '@/lib/totp';

export interface MFAConfig {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email' | 'backup_codes')[];
  backupCodesCount: number;
}

export interface TOTPSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export async function setupTOTP(userId: string): Promise<TOTPSetup> {
  const secret = generateSecret();
  const backupCodes = generateBackupCodes(10);

  // Store TOTP secret
  await db.user.update({
    where: { id: userId },
    data: {
      totpSecret: secret,
      backupCodes: backupCodes,
      mfaEnabled: true,
    },
  });

  // Generate QR code for authenticator apps
  const qrCode = generateTOTPQRCode(userId, secret);

  return {
    secret,
    qrCode,
    backupCodes,
  };
}

export async function verifyTOTPCode(userId: string, code: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, backupCodes: true },
  });

  if (!user || !user.totpSecret) {
    return false;
  }

  // Check if code is a backup code
  if (user.backupCodes?.includes(code)) {
    await consumeBackupCode(userId, code);
    return true;
  }

  // Verify TOTP code
  const isValid = verifyTOTP(code, user.totpSecret);

  if (isValid) {
    await markMFAVerified(userId);
  }

  return isValid;
}

export async function requireMFA(session: any): Promise<void> {
  if (!session.user.mfaVerified) {
    redirect('/mfa/verify');
  }
}

async function generateSecret(): string {
  // Generate a secure random secret
  return 'BASE32SECRET'; // Implementation needed
}

function generateBackupCodes(count: number): string[] {
  return Array.from({ length: count }, () => Math.random().toString(36).substr(2, 8).toUpperCase());
}

function generateTOTPQRCode(userId: string, secret: string): string {
  // Generate QR code URL for authenticator apps
  return `otpauth://totp/DeesseJS:${userId}?secret=${secret}`;
}

async function consumeBackupCode(userId: string, code: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      backupCodes: {
        push: code,
      },
    },
  });
}

async function markMFAVerified(userId: string) {
  // Implementation depends on session storage
}
```

### 7. Auth Dashboard

Admin dashboard for authentication management:

```typescript
// app/@admin/auth/page.tsx
import { db } from '@deessejs/db'
import { getSession } from '@/lib/auth/hooks'

export default async function AuthManagementPage() {
  await requireRole(['admin'])

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      mfaEnabled: true,
      lastLogin: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const stats = {
    total: users.length,
    mfaEnabled: users.filter(u => u.mfaEnabled).length,
    byRole: users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>),
  }

  return (
    <div>
      <h1>Authentication Management</h1>

      <AuthStats stats={stats} />
      <UserList users={users} />
      <RoleManagement />
      <MFAManagement />
    </div>
  )
}
```

### 8. Session Management UI

User session management interface:

```typescript
// app/@admin/sessions/page.tsx
import { db } from '@deessejs/db'
import { requireRole } from '@/lib/auth/hooks'

export default async function SessionsPage() {
  await requireRole(['admin'])

  const sessions = await db.session.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const activeSessions = sessions.filter(s => s.expiresAt > new Date())

  return (
    <div>
      <h1>Active Sessions ({activeSessions.length})</h1>

      <SessionList sessions={activeSessions} />

      <RevokeAllSessions />
    </div>
  )
}
```

## Implementation Priority

1. **High Priority**
   - Auth configuration system
   - Enhanced auth hooks
   - Collection-level authorization

2. **Medium Priority**
   - Auth state management
   - Auth error handling
   - Auth dashboard

3. **Low Priority**
   - Multi-factor authentication
   - Session management UI
   - Advanced analytics

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  auth: {
    provider: 'better-auth',
    session: {
      strategy: 'database',
      maxAge: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
    },
    pages: {
      login: '/login',
      logout: '/logout',
      error: '/auth/error',
      verify: '/auth/verify',
    },
    mfa: {
      enabled: true,
      methods: ['totp', 'backup_codes'],
      requiredFor: ['admin', 'editor'],
    },
    roles: ['admin', 'editor', 'author', 'user'],
    permissions: {
      posts: {
        read: ['admin', 'editor', 'author', 'user'],
        write: ['admin', 'editor', 'author'],
        delete: ['admin', 'editor'],
        publish: ['admin', 'editor'],
      },
    },
    collections: {
      posts: {
        permissions: {
          read: ['admin', 'editor', 'author', 'user'],
          write: ['admin', 'editor', 'author'],
          delete: ['admin', 'editor'],
          publish: ['admin', 'editor'],
        },
        fieldLevelPermissions: {
          publishedAt: ['admin', 'editor'],
        },
      },
    },
  },
});
```
