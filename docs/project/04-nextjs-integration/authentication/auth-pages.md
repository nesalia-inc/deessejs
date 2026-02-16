# Auth Status Pages

## Overview

Authentication status pages (forbidden.js, unauthorized.js) for handling auth errors with custom UI.

## Features

### 403 Forbidden

- Custom UI for forbidden access
- Auto 403 status code
- Integration with permission checks

### 401 Unauthorized

- Custom UI for unauthenticated access
- Auto 401 status code
- Integration with auth checks

### Auto-Generated Status Pages

- Collection-based permission errors
- Role-based access denied
- Auth provider integration

## Forbidden (403)

### Forbidden Page

```typescript
// app/forbidden.tsx
import Link from 'next/link'

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">403</h1>
        <h2 className="text-2xl mt-4">Forbidden</h2>
        <p className="text-gray-600 mt-2">
          You don't have permission to access this resource.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
```

### Triggering Forbidden

```typescript
// app/admin/page.tsx
import { verifyPermission } from '@deessejs/auth'
import { forbidden } from 'next/navigation'

export default async function AdminPage() {
  const permission = await verifyPermission('admin:access')

  if (!permission) {
    forbidden()
  }

  return <AdminDashboard />
}
```

### Collection-Based Forbidden

```typescript
// app/@admin/posts/page.tsx
import { verifyCollectionPermission } from '@deessejs/auth'
import { forbidden } from 'next/navigation'

export default async function PostsPage() {
  const canManagePosts = await verifyCollectionPermission('posts', 'manage')

  if (!canManagePosts) {
    forbidden()
  }

  const posts = await db.posts.findMany()
  return <PostList posts={posts} />
}
```

## Unauthorized (401)

### Unauthorized Page

```typescript
// app/unauthorized.tsx
import Login from '@/components/login'
import Link from 'next/link'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-yellow-600">401</h1>
        <h2 className="text-2xl mt-4">Unauthorized</h2>
        <p className="text-gray-600 mt-2">
          Please log in to access this page.
        </p>
        <div className="mt-6">
          <Login />
        </div>
        <Link
          href="/"
          className="mt-4 inline-block text-blue-600"
        >
          Return to Home
        </Link>
      </div>
    </div>
  )
}
```

### Triggering Unauthorized

```typescript
// app/dashboard/page.tsx
import { verifySession } from '@deessejs/auth'
import { unauthorized } from 'next/navigation'

export default async function DashboardPage() {
  const session = await verifySession()

  if (!session) {
    unauthorized()
  }

  return <Dashboard user={session.user} />
}
```

### API Route Unauthorized

```typescript
// app/api/posts/route.ts
import { verifySession } from '@deessejs/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const post = await db.posts.create({ data: body });
  return NextResponse.json(post);
}
```

## Role-Based Access

### Forbidden by Role

```typescript
// app/admin/page.tsx
import { getUserRole } from '@deessejs/auth'
import { forbidden } from 'next/navigation'

export default async function AdminPage() {
  const role = await getUserRole()

  if (role !== 'admin') {
    forbidden()
  }

  return <AdminDashboard />
}
```

### Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  auth: {
    statusPages: {
      forbidden: {
        enabled: true,
        component: 'ForbiddenPage',
      },
      unauthorized: {
        enabled: true,
        component: 'UnauthorizedPage',
      },
    },
  },
});
```

## Collection Permissions

### Permission Checks

```typescript
// app/@admin/users/page.tsx
import { checkPermission } from '@deessejs/auth'
import { forbidden } from 'next/navigation'

export default async function UsersPage() {
  const canReadUsers = await checkPermission('users', 'read')

  if (!canReadUsers) {
    forbidden()
  }

  const users = await db.users.findMany()
  return <UserList users={users} />
}
```

### Collection-Level Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'users',
      permissions: {
        read: 'admin',
        write: 'admin',
        delete: 'superadmin',
      },
    },
  ],
});
```

## Custom Auth Error Pages

### Custom Forbidden with Context

```typescript
// app/forbidden.tsx
import Link from 'next/link'
import { headers } from 'next/headers'

export default async function Forbidden() {
  const headersList = await headers()
  const path = headersList.get('x-path') || '/unknown'

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">403</h1>
        <h2 className="text-2xl mt-4">Access Denied</h2>
        <p className="text-gray-600 mt-2">
          You don't have permission to access: <code>{path}</code>
        </p>
        <Link href="/" className="mt-6 inline-block text-blue-600">
          Go Home
        </Link>
      </div>
    </div>
  )
}
```

### Custom Unauthorized with Login

```typescript
// app/unauthorized.tsx
import { LoginForm } from '@/components/auth'
import Link from 'next/link'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">Login Required</h1>
        <p className="text-gray-600 mb-6">
          Please log in to access this page.
        </p>
        <LoginForm />
        <Link
          href="/"
          className="mt-4 block text-center text-blue-600"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
```

## Status Code Handling

### Proxy-Level Auth Check

```typescript
// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Check auth for protected routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await auth();

    if (!session) {
      // Let unauthorized.js handle it
      return NextResponse.next();
    }

    if (session.user.role !== 'admin') {
      // Let forbidden.js handle it
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}
```

### API Status Codes

```typescript
// Route handler returns 401
export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ data: 'secret' });
}
```

## Configuration

### Auth Status Pages Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  auth: {
    statusPages: {
      forbidden: {
        path: '/forbidden',
        component: '@/components/errors/Forbidden',
        showLoginLink: true,
        showHomeLink: true,
      },
      unauthorized: {
        path: '/unauthorized',
        component: '@/components/errors/Unauthorized',
        showLoginForm: true,
        showHomeLink: true,
      },
    },
  },
});
```

## Best Practices

### User-Friendly Messages

- Explain why access was denied
- Provide helpful next steps
- Link to relevant pages

### Branding

- Match your app's design
- Use consistent styling
- Include navigation

### Logging

- Log unauthorized attempts
- Track forbidden access
- Monitor for abuse

## Benefits

- **User-Friendly**: Custom error pages
- **Security**: Proper status codes
- **Flexible**: Collection-based permissions
- **Integrated**: Works with auth system
- **Configurable**: Custom components
- **Informative**: Clear error messages
