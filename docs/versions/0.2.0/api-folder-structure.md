# API Folder Structure

This document outlines the folder structure decision for integrating `@deessejs/functions` into the default template.

## Decision: `src/api/`

After evaluating multiple options, we chose `src/api/` as the location for `@deessejs/functions` integration.

## Rationale

### Why `api/` over `actions/`

1. **Clarity**
   - "API" is universally understood for read/write operations
   - Explicitly conveys purpose: queries and mutations
   - No ambiguity about what the folder contains

2. **Avoids Confusion with Next.js Server Actions**
   - `actions/` in Next.js typically refers to Server Actions (marked with `"use server"`)
   - Server Actions are a different concept - they're server-side functions invoked from forms
   - `@deessejs/functions` provides a complete API layer, not server actions
   - Using `actions/` would create confusion for Next.js developers

3. **Industry Convention**
   - Widely adopted across frameworks and libraries
   - Developers naturally look for `api/` when seeking API endpoints
   - Consistent with REST/GraphQL conventions

4. **Alignment with Package Terminology**
   - Documentation refers to "API", "endpoints", "queries", "mutations"
   - `createAPI()` is the main export
   - Consistency between code structure and package language

## Rejected Alternatives

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| `actions/` | Short, modern | Conflicts with Next.js Server Actions | ❌ Rejected |
| `operations/` | Technically accurate | Less conventional, longer | ❌ Rejected |
| `endpoints/` | Precise | Not widely used convention | ❌ Rejected |
| `lib/api/` | Keeps technical code separate | Unnecessary nesting for a core feature | ❌ Rejected |
| `functions/` | Matches package name | Could imply serverless functions | ❌ Rejected |

## Proposed Structure

```
src/
├── api/
│   ├── index.ts          # Main API export
│   ├── context.ts        # Context definition with dependencies
│   ├── users.ts          # User queries and mutations
│   ├── posts.ts          # Post queries and mutations
│   └── ...
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/
└── lib/
    └── utils.ts
```

## File Organization

### `src/api/index.ts`
Main entry point that exports the complete API:

```typescript
import { createAPI } from './context';
import { userRouter } from './users';
import { postRouter } from './posts';

export const api = createAPI({
  users: userRouter,
  posts: postRouter,
});

export type API = typeof api;
```

### `src/api/context.ts`
Defines the context and creates the API builder:

```typescript
import { defineContext } from '@deessejs/functions';
import { database } from '@/lib/database';

interface Context {
  userId: string | null;
  database: Database;
}

export const { t, createAPI } = defineContext<Context>({
  userId: null, // Set by middleware/auth
  database,
});
```

### `src/api/users.ts`
Domain-specific queries and mutations:

```typescript
import { t } from './context';
import { z } from 'zod';
import { success } from '@deessejs/functions';

export const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.database.users.find(args.id);
    if (!user) {
      throw new Error('User not found');
    }
    return success(user);
  },
});

export const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.database.users.create(args);
    return success(user);
  },
});

export const userRouter = t.router({
  get: getUser,
  create: createUser,
});
```

## Usage Examples

### In Server Components
```typescript
import { api } from '@/api';

export default async function UserProfile({ id }: { id: number }) {
  const result = await api.users.get({ id });

  if (!result.ok) {
    return <div>Error: {result.error.message}</div>;
  }

  return <div>{result.value.name}</div>;
}
```

### In API Routes
```typescript
import { api } from '@/api';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = await api.users.create(body);

  if (!result.ok) {
    return Response.json({ error: result.error.message }, { status: 400 });
  }

  return Response.json(result.value);
}
```

### In Client Components (with Server Actions wrapper)
```typescript
'use client';

import { api } from '@/api';
import { createUserAction } from '@/app/actions/users';

export function CreateUserForm() {
  const handleSubmit = async (data: { name: string; email: string }) => {
    const result = await createUserAction(data);
    // Handle result
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

## Best Practices

### 1. Separate Domains
Each domain (users, posts, etc.) gets its own file with related queries and mutations.

### 2. Export Routers
Use `t.router()` to group related operations:

```typescript
export const userRouter = t.router({
  get: getUser,
  list: listUsers,
  create: createUser,
  update: updateUser,
  delete: deleteUser,
});
```

### 3. Type Safety
Export the API type for use in other parts of the application:

```typescript
export type API = typeof api;

// Use in type definitions
type APIClient = {
  users: {
    get: (args: { id: number }) => Promise<User>;
    // ...
  };
};
```

### 4. Context Management
Set context values in middleware or authentication layers:

```typescript
// middleware.ts
export const { t, createAPI } = defineContext<Context>({
  userId: null,
  database,
});

// In API route
export const { t: tWithAuth } = defineContext<Context>({
  userId: getUserFromSession(request),
  database,
});
```

## Integration with Next.js

### App Router
The `api/` folder works seamlessly with Next.js App Router:

- Server Components can import and use `api` directly
- API routes can wrap `@deessejs/functions` endpoints
- Server Actions can delegate to the API layer

### Example: API Route Wrapper
```typescript
// app/api/users/[id]/route.ts
import { api } from '@/api';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await api.users.get({ id: parseInt(params.id) });

  if (!result.ok) {
    return Response.json(
      { error: result.error.message },
      { status: 404 }
    );
  }

  return Response.json(result.value);
}
```

### Example: Server Action Wrapper
```typescript
// app/actions/users.ts
'use server';

import { api } from '@/api';

export async function createUser(data: { name: string; email: string }) {
  const result = await api.users.create(data);

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.value;
}
```

## Migration Path

For projects upgrading from v0.1.0 (no API layer) to v0.2.0 (with `@deessejs/functions`):

1. **Create `src/api/` folder**
2. **Define context** in `src/api/context.ts`
3. **Migrate existing API calls** to use `@deessejs/functions`
4. **Update imports** from old API paths to `@/api`
5. **Remove duplicate code** (old API implementations)

## Conclusion

The `src/api/` folder structure provides:
- ✅ Clear, conventional naming
- ✅ No confusion with Next.js concepts
- ✅ Scalable organization for domains
- ✅ Type-safe API layer
- ✅ Seamless Next.js integration

This structure serves as the foundation for building type-safe, maintainable APIs in DeesseJS applications.
