# Forbidden - Authorization

## Overview

Using Next.js `forbidden()` function for role-based access control and authorization in DeesseJS applications.

## Features

### Forbidden Function

- Throws 403 error
- Renders forbidden.js UI
- Role-based access control
- Collection-level permissions

### Use Cases

- Admin-only routes
- Role-based authorization
- Permission checks
- Access control lists

## Enable Forbidden

### Experimental Auth Interrupts

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
```

## Basic Usage

### Role-Based Protection

```typescript
// app/admin/page.tsx
import { verifySession } from '@deessejs/auth'
import { forbidden } from 'next/navigation'

export default async function AdminPage() {
  const session = await verifySession()

  if (session.role !== 'admin') {
    forbidden()
  }

  return <AdminDashboard />
}
```

### Permission Check

```typescript
// app/posts/[id]/edit/page.tsx
import { getPermissions } from '@deessejs/auth'
import { forbidden } from 'next/navigation'

export default async function EditPostPage(props: PageProps<'/posts/[id]/edit'>) {
  const { id } = await props.params
  const permissions = await getPermissions()

  if (!permissions.canEdit('posts')) {
    forbidden()
  }

  return <EditPostForm id={id} />
}
```

## Collection-Based Authorization

### Auto-Generated Permission Checks

```typescript
// app/@admin/posts/page.tsx
import { checkCollectionPermission } from '@deessejs/auth'
import { forbidden } from 'next/navigation'

export default async function PostsPage() {
  const canManage = await checkCollectionPermission('posts', 'manage')

  if (!canManage) {
    forbidden()
  }

  const posts = await db.posts.findMany()
  return <PostList posts={posts} />
}
```

### Permission Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      permissions: {
        read: ['public', 'user', 'admin'],
        write: ['admin'],
        delete: ['superadmin'],
        publish: ['admin', 'editor'],
      },
    },
  ],
});
```

### Permission Middleware

```typescript
// lib/auth.ts
export async function requirePermission(
  collection: string,
  action: 'read' | 'write' | 'delete' | 'publish'
) {
  const session = await verifySession();
  const permissions = await getPermissions(session.user.id);

  if (!permissions[collection]?.includes(action)) {
    forbidden();
  }

  return session;
}
```

## Server Actions

### Protected Actions

```typescript
// app/actions/posts.ts
'use server';

import { verifySession } from '@deessejs/auth';
import { forbidden } from 'next/navigation';

export async function publishPost(id: string) {
  const session = await verifySession();

  if (session.role !== 'admin' && session.role !== 'editor') {
    forbidden();
  }

  const post = await db.posts.publish({ id });

  revalidateTag('posts');
  revalidatePath('/blog');

  return post;
}
```

### Role-Based Mutation

```typescript
// app/actions/users.ts
'use server';

import { verifySession } from '@deessejs/auth';
import { forbidden } from 'next/navigation';

export async function updateUserRole(userId: string, role: string) {
  const session = await verifySession();

  if (session.role !== 'superadmin') {
    forbidden();
  }

  const user = await db.users.update({
    where: { id: userId },
    data: { role },
  });

  return user;
}
```

## Route Handlers

### Protected API Routes

```typescript
// app/api/admin/route.ts
import { verifySession } from '@deessejs/auth';
import { forbidden } from 'next/navigation';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await verifySession();

  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data = await getAdminData();
  return NextResponse.json(data);
}
```

### Forbidden in Route Handler

```typescript
// app/api/posts/[id]/route.ts
import { verifySession } from '@deessejs/auth';
import { forbidden } from 'next/navigation';

export async function DELETE(request: Request, { params }: RouteContext<'/api/posts/[id]'>) {
  const session = await verifySession();

  if (session.role !== 'admin') {
    forbidden();
  }

  const { id } = await params;
  await db.posts.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
```

## Custom Forbidden Pages

### Collection-Specific Forbidden

```typescript
// app/@admin/forbidden.tsx
import Link from 'next/link'

export default function AdminForbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600">403</h1>
        <h2 className="text-2xl mt-4">Access Denied</h2>
        <p className="text-gray-600 mt-2">
          You don't have permission to access the admin area.
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

### Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  auth: {
    forbidden: {
      enabled: true,
      pages: {
        admin: '@/app/@admin/forbidden',
        default: '@/app/forbidden',
      },
    },
  },
});
```

## Advanced Patterns

### Dynamic Permissions

```typescript
export default async function Page(props: PageProps<'/posts/[slug]'>) {
  const { slug } = await props.params
  const post = await db.posts.findBySlug(slug)
  const session = await getSession()

  // Post owner can edit
  const canEdit = session?.id === post.authorId || session?.role === 'admin'

  if (!canEdit) {
    forbidden()
  }

  return <EditPost post={post} />
}
```

### Team-Based Access

```typescript
export default async function TeamPage(props: PageProps<'/teams/[slug]'>) {
  const { slug } = await props.params
  const session = await getSession()

  const team = await db.teams.findBySlug(slug)
  const isMember = await db.teamMembers.findFirst({
    where: {
      teamId: team.id,
      userId: session.user.id
    }
  })

  if (!isMember) {
    forbidden()
  }

  return <TeamDashboard team={team} />
}
```

## Best Practices

### Always Check Permissions

- Verify before sensitive operations
- Use role-based access control
- Implement least privilege principle

### Provide Helpful Messages

- Custom forbidden pages per context
- Explain why access was denied
- Provide next steps

### Use Forbidden vs Unauthorized

- `unauthorized()`: Not authenticated (401)
- `forbidden()`: Authenticated but lacking permission (403)

## Benefits

- **Security**: Role-based access control
- **Flexibility**: Collection-level permissions
- **UX**: Custom forbidden pages
- **Type Safety**: Permission checking
- **Integration**: Works with auth system
