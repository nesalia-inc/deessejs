# AsyncResult Type

Async operations with type-safe error handling.

## Overview

`AsyncResult<T, E>` is the async version of Result. It represents an async operation that can succeed or fail with typed errors.

## When to Use

Use AsyncResult when:
- Making API calls
- Database queries
- File system operations (async)
- Any Promise-based operation that can fail

## Creating AsyncResults

```typescript
import { fromPromise, okAsync, errAsync, isOk, isErr } from '@deessejs/core';

// fromPromise wraps a Promise
const result = await fromPromise(fetch('/api/user'));

// okAsync creates a successful AsyncResult
const success = okAsync({ id: 1, name: 'Alice' });

// errAsync creates a failed AsyncResult
const failure = errAsync(new Error('Something went wrong'));
```

## Why Not async/await with try/catch?

```typescript
// Bad - try/catch hides errors in types
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (e) {
    throw e; // Easy to forget or mishandle
  }
}

// Good - AsyncResult makes errors explicit
async function fetchUser(id: string): Promise<AsyncResult<User, Error>> {
  const response = await fromPromise(fetch(`/api/users/${id}`));
  if (!response.ok) {
    return errAsync(new Error(`HTTP ${response.status}`));
  }
  return okAsync(await response.json());
}
```

## Chaining Operations

```typescript
import { fromPromise, okAsync, flatMap, map, isOk } from '@deessejs/core';

const fetchUser = (id: number) =>
  fromPromise(fetch(`/api/users/${id}`).then(r => r.json()));

const fetchPosts = (userId: number) =>
  fromPromise(fetch(`/api/users/${userId}/posts`).then(r => r.json()));

// Chain with flatMap
const getUserWithPosts = async (userId: number) =>
  flatMap(
    await fetchUser(userId),
    user => flatMap(
      await fetchPosts(user.id),
      posts => okAsync({ user, posts })
    )
  );
```

## Combining AsyncResults

```typescript
import { okAsync, all, race, traverse } from '@deessejs/core';

// all - succeed only if all succeed (fail-fast)
const [user, posts, comments] = await all(
  fetchUser(1),
  fetchPosts(1),
  fetchComments(1)
);

// race - first to resolve wins
const fastest = await race(
  fetchFromCDN('/api/data'),
  fetchFromServer('/api/data')
);

// traverse - map over array in parallel
const users = await traverse([1, 2, 3], fetchUser);
```

## Transforming

```typescript
import { fromPromise, map, mapAsync, flatMap, mapErr } from '@deessejs/core';

// map - sync transformation
const doubled = await map(okAsync(21), x => x * 2); // Ok(42)

// mapAsync - async transformation
const fetchAndProcess = async (id: number) =>
  mapAsync(
    await fromPromise(fetch(`/api/user/${id}`)),
    async response => await processResponse(response)
  );

// mapErr - transform the error
const withContext = mapErr(
  await fromPromise(fetch('/api/user')),
  e => e.addNotes('Failed to fetch user')
);

// flatMap - chain AsyncResults
const withProfile = flatMap(
  await fetchUser(1),
  user => fetchProfile(user.id)
);
```

## Extraction

```typescript
import { okAsync, getOrElse, getOrCompute, unwrap, unwrapOr } from '@deessejs/core';

// getOrElse returns default if Err
const value = await getOrElse(okAsync(42), 0); // 42
const fallback = await getOrElse(errAsync(new Error('oops')), 0); // 0

// unwrapOr - unwrap or return default (no error access)
const unwrapped = await unwrapOr(okAsync(42), 0); // 42

// unwrap - extract or throw
const unwrapped = await unwrap(okAsync(42)); // 42
unwrap(errAsync(new Error('fail'))); // throws
```

## Pattern Matching

```typescript
import { okAsync, match } from '@deessejs/core';

const result = await okAsync(42);

const message = await match(
  result,
  value => `Got: ${value}`,
  error => `Error: ${error.message}`
); // "Got: 42"
```

## AbortSignal Support

```typescript
import { fromPromise, withSignal } from '@deessejs/core';

const controller = new AbortController();

// Use withSignal for AbortSignal support
const result = await withSignal(
  fetch('/api/data', { signal: controller.signal }),
  controller.signal
);

// Cancel if needed
controller.abort();
```

## Conversions

```typescript
import { okAsync, toNullable, toUndefined } from '@deessejs/core';

// To nullable
await toNullable(okAsync(42)); // 42
await toNullable(errAsync(new Error('oops'))); // null

// To undefined
await toUndefined(okAsync(42)); // 42
await toUndefined(errAsync(new Error('oops'))); // undefined
```

## Error Handling Patterns

```typescript
// Chain of operations with error enrichment
const processOrder = async (orderId: string) =>
  flatMap(
    await fetchOrder(orderId),
    order => flatMap(
      validateOrder(order),
      validated => flatMap(
        await processPayment(order.total),
        payment => flatMap(
          await fulfillOrder(order),
          fulfillment => okAsync({ order: validated, payment, fulfillment })
        ).mapErr(e => e.addNotes(`Fulfillment failed for ${orderId}`))
      ).mapErr(e => e.addNotes(`Payment failed for ${orderId}`))
    ).mapErr(e => e.addNotes(`Validation failed for ${orderId}`))
  ).mapErr(e => e.addNotes(`Order fetch failed for ${orderId}`));
```

## Comparison with Alternatives

| Feature | AsyncResult | Promise | try/catch |
|---------|-------------|---------|-----------|
| Type-safe errors | Yes | No | No |
| Explicit failure | Yes | No | Sometimes |
| Composition | Yes | Limited | No |
| Parallel ops | all, race, traverse | Promise.all | No |

## Anti-Patterns

```typescript
// Bad - async/await with try/catch
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    return await response.json();
  } catch (e) {
    throw e; // Errors hidden until runtime
  }
}

// Good - AsyncResult
const fetchUser = (id: string): Promise<AsyncResult<User, Error>> =>
  fromPromise(fetch(`/api/users/${id}`))
    .map(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });

// Bad - Promise.then().catch()
const user = await fetchUser(id)
  .then(r => r.json())
  .catch(e => ({ id: 0, name: 'Guest' }));

// Good - AsyncResult with getOrElse
const result = await fetchUser(id);
const user = getOrElse(result, { id: 0, name: 'Guest' });
```

## See Also

- [Result](./result.md) - Sync version of AsyncResult
- [Try](./try.md) - For sync operations that might throw
- [Error](./error.md) - For structured domain errors
