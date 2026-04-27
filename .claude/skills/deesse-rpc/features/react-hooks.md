# React Hooks

`@deessejs/client-react` provides React hooks that enable automatic cache synchronization.

## Overview

The hooks provide real-time sync from server to client using the cache invalidation system. When a mutation returns invalidation keys, affected queries are automatically refetched.

## Core Concept

```
Client                        Server
  │                              │
  ├── useQuery(api.users.list) ─►│  Returns data + keys: ["users", "list"]
  │◄──────────────────────────────│
  │                              │
  │  [Cache stored locally]       │
  │                              │
  ├── useMutation(api.users.create)
  │         (creates user) ──────►│  Returns invalidate: ["users", "list"]
  │◄─────────────────────────────┤
  │                              │
  ▼  [Auto-refetch affected queries]
```

## Why This Approach?

- **Simple** - No WebSocket, no complex subscriptions
- **Server-driven** - Server decides what to invalidate, client just follows
- **Local user only** - Syncs data for the current user, not broadcast to others
- **Zero configuration** - Just define keys in queries/mutations

## API Reference

### useQuery

```typescript
function useQuery<Args, Success>(
  query: Query<Ctx, Args, Success>,
  options: {
    args: Args
    enabled?: boolean
    staleTime?: number
    refetchOnWindowFocus?: boolean
  }
): {
  data: Success | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => Promise<void>
}
```

### useMutation

```typescript
function useMutation<Args, Success>(
  mutation: Mutation<Ctx, Args, Success>,
  options?: {
    onSuccess?: (data: Success) => void
    onError?: (error: Error) => void
  }
): {
  mutate: (args: Args) => Promise<Success>
  mutateAsync: (args: Args) => Promise<Success>
  isLoading: boolean
  isError: boolean
  error: Error | null
  data: Success | undefined
}
```

## Basic Usage

### Basic Query

```typescript
import { useQuery } from "@deessejs/client-react"

function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading, error } = useQuery(api.users.get, {
    args: { id: userId }
  })

  if (isLoading) return <Loading />
  if (error) return <Error error={error} />

  return <div>{data.name}</div>
}
```

### Query with Automatic Caching

```typescript
function UserList() {
  const { data, isLoading } = useQuery(api.users.list, {
    args: { limit: 10 }
  })

  // Cache keys are automatically extracted:
  // - ["users", "list", { limit: 10 }]
  // - "users:count"

  if (isLoading) return <Loading />
  return <List users={data} />
}
```

### Mutation with Automatic Invalidation

```typescript
function CreateUserForm() {
  const { mutate, isLoading } = useMutation(api.users.create)

  const handleSubmit = async (data: { name: string; email: string }) => {
    const result = await mutate(data)

    // Cache is automatically invalidated:
    // - "users:count" → refetched
    // - ["users", "list"] → refetched
  }

  return (
    <Form onSubmit={handleSubmit} disabled={isLoading} />
  )
}
```

### Optimistic Updates

```typescript
function UpdateUserButton({ userId, name }: { userId: number; name: string }) {
  const { mutate } = useMutation(api.users.update, {
    onSuccess: (data) => {
      // Update cache directly after mutation succeeds
      queryClient.setQueryData(["users", { id: userId }], data)
    }
  })

  return <button onClick={() => mutate({ id: userId, name })}>Update</button>
}
```

### Dependent Queries

```typescript
function UserPosts({ userId }: { userId: number }) {
  // Only fetch when userId is available
  const { data: user } = useQuery(api.users.get, {
    args: { id: userId },
    enabled: !!userId
  })

  const { data: posts } = useQuery(api.posts.listByUser, {
    args: { userId },
    enabled: !!user
  })

  return <div>{posts}</div>
}
```

### Manual Refetch

```typescript
function RefreshableUserList() {
  const { data, refetch, isLoading } = useQuery(api.users.list, {
    args: { limit: 10 }
  })

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {isLoading && <Spinner />}
      <List users={data} />
    </div>
  )
}
```

## Query Client Provider

Wrap your app with the QueryClientProvider:

```tsx
import { QueryClient, QueryClientProvider } from "@deessejs/client-react"
import { api } from "./api"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

function App() {
  return (
    <QueryClientProvider client={queryClient} api={api}>
      <YourApp />
    </QueryClientProvider>
  )
}
```

## SSR / Next.js Support

```typescript
// app/users/page.tsx
import { dehydrate, HydrationBoundary } from "@deessejs/client-react"
import { api } from "@/api"

export default async function UsersPage() {
  const queryClient = new QueryClient()

  // Prefetch on server
  await queryClient.prefetchQuery(api.users.list, {
    args: { limit: 10 }
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />
    </HydrationBoundary>
  )
}
```

## Type Safety

```typescript
// Args and return types are fully inferred
const { data } = useQuery(api.users.get, {
  args: { id: 1 }
})

// data is typed as User | undefined
// error is typed as Error | null
```

## Error Handling

```typescript
function CreateUserForm() {
  const { mutate, error, isError } = useMutation(api.users.create)

  return (
    <Form onSubmit={handleSubmit}>
      {isError && <ErrorMessage>{error.message}</ErrorMessage>}
    </Form>
  )
}
```

## Best Practices

1. **Use `enabled` for dependent queries** - Only fetch when parent data exists
2. **Handle loading and error states** - Show appropriate UI
3. **Use optimistic updates for better UX** - Update cache before server confirms
4. **Set appropriate `staleTime`** - Reduce unnecessary refetches

## See Also

- [Cache System](features/cache-system.md) - Cache keys and invalidation
- [Queries](features/queries.md) - Query procedure definition
- [Mutations](features/mutations.md) - Mutation procedure definition