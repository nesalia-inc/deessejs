# DeesseJS Next.js Enhancements - Quick Reference

**Last Updated:** 2025-01-29

This is a quick reference guide for implementing Next.js enhancements in DeesseJS. For detailed implementation guides, see [README.md](./README.md).

## 🎯 Overview

DeesseJS can be enhanced with 9 major Next.js feature sets across 4 implementation phases.

| Phase       | Duration | Focus Areas                                         |
| ----------- | -------- | --------------------------------------------------- |
| **Phase 1** | Week 1-2 | Foundation: Error handling, cookies, auth config    |
| **Phase 2** | Week 3-4 | Core: Auth hooks, Server Actions, navigation        |
| **Phase 3** | Week 5-6 | Advanced: Collection auth, smart caching, URL state |
| **Phase 4** | Week 7-8 | Optimization: Error recovery, monitoring, polish    |

---

## 📦 Enhancement Files

| File                                                                       | Purpose                        | Priority    | Complexity |
| -------------------------------------------------------------------------- | ------------------------------ | ----------- | ---------- |
| [error-handling-enhancements.md](./error-handling-enhancements.md)         | Error classification & logging | 🔴 Critical | Low        |
| [error-rethrow-strategies.md](./error-rethrow-strategies.md)               | Framework error handling       | 🔴 Critical | Low        |
| [auth-integration-enhancements.md](./auth-integration-enhancements.md)     | Auth, authorization, MFA       | 🔴 Critical | Medium     |
| [next-response-enhancements.md](./next-response-enhancements.md)           | Type-safe cookies & responses  | 🟡 High     | Low        |
| [redirect-strategies.md](./redirect-strategies.md)                         | Centralized redirects          | 🟡 High     | Medium     |
| [server-actions-complete.md](./server-actions-complete.md)                 | Server Actions & navigation    | 🟡 High     | Medium     |
| [cache-revalidation-enhancements.md](./cache-revalidation-enhancements.md) | Smart cache revalidation       | 🟡 High     | High       |
| [advanced-caching.md](./advanced-caching.md)                               | Progressive caching            | 🟢 Medium   | High       |
| [imageresponse-enhancements.md](./imageresponse-enhancements.md)           | Dynamic image generation       | 🟢 Medium   | Medium     |

---

## 🚀 Quick Start

### 1. Error Handling (5 minutes)

**Before:**

```typescript
throw new Error('Post not found');
```

**After:**

```typescript
import { ErrorFactory } from '@/lib/errors/classification';

throw ErrorFactory.notFound('post', id);
```

### 2. Authentication (5 minutes)

**Before:**

```typescript
const session = await getSession();
if (!session) redirect('/login');
```

**After:**

```typescript
import { requireAuth } from '@/lib/auth/hooks';

const session = await requireAuth();
```

### 3. Server Actions (10 minutes)

**Before:**

```typescript
export async function createPost(formData: FormData) {
  return await db.posts.create({ data });
}
```

**After:**

```typescript
import { updateTag } from 'next/cache';
import { withErrorHandling } from '@/lib/actions/server-action-patterns';

export async function createPost(formData: FormData) {
  return withErrorHandling(
    async () => {
      const post = await db.posts.create({ data });
      updateTag('posts');
      updateTag(`post-${post.id}`);
      return post;
    },
    {
      revalidateTags: ['posts'],
      refresh: true,
    }
  );
}
```

### 4. Navigation (5 minutes)

**Before:**

```typescript
'use client';
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push('/posts');
```

**After:**

```typescript
'use client';
import { useSmartNavigation } from '@/lib/navigation/hooks';

const { navigate } = useSmartNavigation();
navigate('/posts');
```

---

## 🔧 Common Patterns

### Read-Your-Own-Writes

Ensure users immediately see their changes:

```typescript
export async function updatePost(id: string, data: any) {
  const post = await db.posts.update({ where: { id }, data });

  // User immediately sees their changes
  updateTag('posts');
  updateTag(`post-${id}`);
  refresh();

  return post;
}
```

### Type-Safe Cookies

```typescript
import { setCookie, getCookie } from '@/lib/cookies/typed';

// Set cookie with type safety
await setCookie('theme', 'dark', { maxAge: 30 * 24 * 60 * 60 });

// Get cookie with type inference
const theme = await getCookie('theme'); // string | undefined
```

### Collection Authorization

```typescript
import { requireCollectionAccess } from '@/lib/auth/collection-auth';

export async function updatePost(id: string, data: any) {
  // Auto-check permissions based on collection config
  await requireCollectionAccess(postsConfig, 'write', id);

  return await db.posts.update({ where: { id }, data });
}
```

### URL State Management

```typescript
import { useCollectionURLState } from '@/lib/navigation/url-state'

export function PostList() {
  const { state, setPage, setSort, setFilter } = useCollectionURLState({
    page: 1,
    sort: 'createdAt',
    order: 'desc',
  })

  // URL automatically updates: /blog?page=2&sort=title
  return (
    <div>
      <button onClick={() => setPage(2)}>Next Page</button>
      <button onClick={() => setSort('title')}>Sort by Title</button>
    </div>
  )
}
```

---

## 📋 Configuration

Add to your `deesse.config.ts`:

```typescript
export const config = defineConfig({
  // Error handling
  errorHandling: {
    classification: { enabled: true },
    frameworkHandling: { enabled: true },
    recovery: { enabled: true },
    aggregation: { enabled: true },
  },

  // Authentication
  auth: {
    provider: 'better-auth',
    hooks: { enabled: true },
    collectionAuth: { enabled: true },
    mfa: { enabled: true },
    roles: ['admin', 'editor', 'author', 'user'],
    permissions: {
      posts: {
        read: ['admin', 'editor', 'author', 'user'],
        write: ['admin', 'editor', 'author'],
        delete: ['admin', 'editor'],
      },
    },
  },

  // Cache management
  cache: {
    smartRefresh: { enabled: true },
    collectionRevalidation: { enabled: true },
    progressive: { enabled: true },
    scheduled: { enabled: true },
    dependencyTracking: { enabled: true },
    warming: { enabled: true },
  },

  // Navigation
  navigation: {
    hooks: { enabled: true },
    redirects: { enabled: true },
    urlState: { enabled: true },
    linkStatus: { enabled: true },
  },

  // Performance
  performance: {
    webVitals: { enabled: true },
  },
});
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test errors/classification
npm run test auth/hooks
npm run test cache/smart-refresh

# Integration tests
npm run test integration/auth-flow
npm run test integration/cache-flow

# E2E tests
npm run test e2e

# Performance tests
npm run test performance/cache-hit-rate
```

---

## 🔄 Migration Checklist

Use this checklist when migrating existing code:

### Error Handling

- [ ] Replace `throw new Error()` with `ErrorFactory`
- [ ] Add error categories and severities
- [ ] Implement error boundaries
- [ ] Set up error logging

### Authentication

- [ ] Replace manual session checks with `requireAuth()`
- [ ] Add role checks with `requireRole()`
- [ ] Implement permission checks with `requirePermission()`
- [ ] Set up collection-level auth

### Server Actions

- [ ] Wrap actions with `withErrorHandling()`
- [ ] Add `updateTag()` for mutations
- [ ] Implement revalidation strategies
- [ ] Add refresh calls

### Navigation

- [ ] Replace `useRouter()` with `useDeesseNavigation()`
- [ ] Implement URL state management
- [ ] Add loading indicators
- [ ] Set up redirects

### Cache

- [ ] Configure smart refresh
- [ ] Implement collection revalidation
- [ ] Add progressive caching
- [ ] Set up scheduled revalidation

---

## 📊 Success Metrics

Track these metrics to measure success:

### Performance

- Cache hit rate > **80%**
- Average response time < **200ms**
- LCP < **2.5s**
- FID < **100ms**
- CLS < **0.1**

### Errors

- Error rate < **0.1%**
- Recovery success rate > **90%**
- Mean time to recovery < **5s**

---

## 🆘 Troubleshooting

### Cache Not Invalidating

**Problem:** Changes not appearing immediately

**Solution:**

```typescript
// Ensure you're using updateTag()
updateTag('posts');
updateTag(`post-${id}`);

// And calling refresh()
refresh();
```

### Auth Redirects Not Working

**Problem:** Unauthorized users can access protected pages

**Solution:**

```typescript
// Use requireAuth() instead of manual checks
export default async function AdminPage() {
  const session = await requireAuth(); // This will redirect if not authenticated
  // ...
}
```

### Server Actions Failing Silently

**Problem:** Errors not showing up in UI

**Solution:**

```typescript
// Use withErrorHandling wrapper
export async function myAction(formData: FormData) {
  return withErrorHandling(async () => {
    // Your action logic
  });
}

// Handle error in component
const result = await myAction(formData);
if (!result.success) {
  showError(result.error);
}
```

### Navigation Not Updating URL

**Problem:** URL state not syncing

**Solution:**

```typescript
// Use useCollectionURLState hook
const { state, setPage } = useCollectionURLState();

// URL will automatically update
setPage(2); // URL becomes /blog?page=2
```

---

## 📚 Additional Resources

- **Implementation Guide:** [README.md](./README.md)
- **Detailed Recommendations:** See individual recommendation files
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs

---

## 🎓 Learning Path

**Beginner (1-2 weeks):**

1. Error handling basics
2. Simple auth hooks
3. Type-safe cookies

**Intermediate (2-4 weeks):** 4. Server Actions patterns 5. Navigation hooks 6. Basic caching

**Advanced (4-8 weeks):** 7. Collection-level auth 8. Smart cache revalidation 9. Progressive caching 10. Error recovery

**Expert (8+ weeks):** 11. Performance monitoring 12. Advanced analytics 13. Custom optimizations

---

## 🚦 Feature Flags

Enable features gradually:

```typescript
// deesse.config.ts
export const config = defineConfig({
  features: {
    // Enable specific features
    smartRefresh: true,
    progressiveCache: true,

    // Enable for specific collections only
    collectionAuth: {
      enabled: true,
      collections: ['posts', 'products'],
    },

    // Enable for specific roles only
    mfa: {
      enabled: true,
      roles: ['admin', 'editor'],
    },
  },
});
```

---

**Need Help?** Check the [README.md](./README.md) for detailed implementation guides.
