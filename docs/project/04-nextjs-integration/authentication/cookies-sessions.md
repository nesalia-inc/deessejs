# Cookies & Session Management

## Overview

Cookie management with Next.js cookies API integrated with DeesseJS authentication and sessions.

## Features

### Read Cookies

- Server Components cookie access
- Async cookies API
- Type-safe cookie values
- Cookie existence checking

### Write Cookies

- Set cookies in Server Functions
- Delete cookies
- Cookie options configuration
- Secure cookie handling

## Basic Usage

### Reading Cookies

```typescript
// app/page.tsx
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')

  return <div>Theme: {theme?.value}</div>
}
```

### Getting All Cookies

```typescript
export default async function Page() {
  const cookieStore = await cookies()

  return cookieStore.getAll().map((cookie) => (
    <div key={cookie.name}>
      <p>{cookie.name}: {cookie.value}</p>
    </div>
  ))
}
```

### Checking Cookie Exists

```typescript
export default async function Page() {
  const cookieStore = await cookies()
  const hasTheme = cookieStore.has('theme')

  return <div>{hasTheme ? 'Theme set' : 'No theme'}</div>
}
```

## Setting Cookies

### Set Cookie in Server Action

```typescript
// app/actions.ts
'use server';

import { cookies } from 'next/headers';

export async function setTheme(theme: string) {
  const cookieStore = await cookies();

  cookieStore.set('theme', theme, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  revalidatePath('/');
}
```

### Set Cookie with Options

```typescript
export async function login(sessionToken: string) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: 'session',
    value: sessionToken,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    priority: 'high',
  });
}
```

## Deleting Cookies

### Delete Cookie

```typescript
// app/actions.ts
'use server';

import { cookies } from 'next/headers';

export async function logout() {
  const cookieStore = await cookies();

  cookieStore.delete('session');

  redirect('/login');
}
```

### Alternative Delete Methods

```typescript
// Set empty value
cookieStore.set('session', '');

// Set maxAge to 0
cookieStore.set('session', '', { maxAge: 0 });
```

## Session Management

### Read Session

```typescript
// app/page.tsx
import { cookies } from 'next/headers'
import { getSession } from '@deessejs/auth'

export default async function Page() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value

  const session = await getSession(sessionToken)

  if (!session) {
    redirect('/login')
  }

  return <Dashboard user={session.user} />
}
```

### Create Session

```typescript
// app/actions/auth.ts
'use server';

import { cookies } from 'next/headers';
import { createSession } from '@deessejs/auth';

export async function login(email: string, password: string) {
  const user = await authenticate(email, password);
  const session = await createSession(user.id);

  const cookieStore = await cookies();
  cookieStore.set('session', session.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  redirect('/dashboard');
}
```

### Destroy Session

```typescript
// app/actions/auth.ts
'use server';

import { cookies } from 'next/headers';
import { deleteSession } from '@deessejs/auth';

export async function logout() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  cookieStore.delete('session');

  redirect('/login');
}
```

## Configuration

### Cookie Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  auth: {
    cookies: {
      session: {
        name: 'session',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        priority: 'high',
      },
      theme: {
        name: 'theme',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      },
    },
  },
});
```

## Collection-Based Cookies

### User Preferences

```typescript
// app/actions/preferences.ts
'use server';

import { cookies } from 'next/headers';

export async function setListPreference(listType: 'grid' | 'list') {
  const cookieStore = await cookies();

  cookieStore.set('list-preference', listType, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  revalidatePath('/');
}
```

### Read Preference

```typescript
// app/posts/page.tsx
import { cookies } from 'next/headers'

export default async function PostsPage() {
  const cookieStore = await cookies()
  const listPref = cookieStore.get('list-preference')?.value || 'grid'

  const posts = await db.posts.findMany()

  return <PostList posts={posts} view={listPref} />
}
```

## Third-Party Cookies

### Partitioned Cookies

```typescript
export async function setCookie() {
  const cookieStore = await cookies();

  cookieStore.set('cookie', 'value', {
    partitioned: true, // CHIPS (Cookies Having Independent Partitioned State)
    secure: true,
    sameSite: 'none',
  });
}
```

## Cookie Security

### Secure Cookie Configuration

```typescript
export async function setSecureCookie(name: string, value: string) {
  const cookieStore = await cookies();

  cookieStore.set(name, value, {
    httpOnly: true, // Prevents XSS
    secure: true, // HTTPS only
    sameSite: 'strict', // Prevents CSRF
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    priority: 'high',
  });
}
```

### Environment-Based Security

```typescript
export async function setCookie(name: string, value: string) {
  const cookieStore = await cookies();

  cookieStore.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
}
```

## Cookie Analytics

### Track Cookie Consent

```typescript
// app/page.tsx
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const consent = cookieStore.get('cookie-consent')

  if (!consent) {
    return <CookieBanner />
  }

  after(async () => {
    await analytics.track('page_view', {
      consent_given: true,
    })
  })

  return <PageContent />
}
```

## Best Practices

### Always Use Secure Settings

- httpOnly: true for session cookies
- secure: true in production
- sameSite: 'strict' for sensitive cookies
- Appropriate maxAge

### Cookie Size Limits

- Keep cookies small (< 4KB)
- Store session ID, not full data
- Use database for larger data

### Cookie Naming

- Use descriptive names
- Prefix with app name for shared environments
- Avoid conflicting names

## Benefits

- **Security**: Secure cookie defaults
- **Session Management**: Built-in session handling
- **Type Safety**: Typed cookie values
- **Flexibility**: Per-collection cookies
- **Easy**: Simple API for cookies
