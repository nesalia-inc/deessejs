# Functional Programming Rules

Functional programming principles for @deessejs/core.

## Core Principles

1. **No mutation** - Data is transformed, not modified
2. **No classes** - Use functions and types
3. **No side effects** - Pure functions return values
4. **Composition over inheritance** - Build behavior by combining functions

## No Classes

### Forbidden

```typescript
// Bad - classes
class Result {
  constructor(private value: T | E) {}

  map(fn: (v: T) => U): Result<U, E> {
    // ...
  }
}

// Bad - class properties
class User {
  name: string;
  email: string;
}
```

### Allowed

```typescript
// Good - types
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// Good - interfaces
interface User {
  name: string;
  email: string;
}
```

## Standalone Functions

All operations are standalone functions:

```typescript
// Good - standalone functions
import { map, flatMap } from '@deessejs/core';
const doubled = map(ok(21), x => x * 2);

// Bad - methods on objects
const doubled = ok(21).map(x => x * 2);
```

Exception: AsyncResult uses thenable pattern for `await` support.

## No Mutation

```typescript
// Bad - mutation
const addToList = (list: number[], item: number): number[] => {
  list.push(item); // Mutates original!
  return list;
};

// Good - immutable
const addToList = (list: readonly number[], item: number): number[] => [
  ...list,
  item
];
```

## Pure Functions

```typescript
// Bad - side effects
const logAndDouble = (n: number): number => {
  console.log(n); // Side effect
  return n * 2;
};

// Good - returns value, no side effects
const double = (n: number): number => n * 2;
const log = <T>(v: T): T => { console.log(v); return v; }; // Explicit logging
```

## Function Composition

Build complex behavior from simple functions:

```typescript
import { pipe, map, flatMap } from '@deessejs/core';

const processUser = (data: unknown): Result<User, Error> =>
  pipe(
    validateRaw(data),
    (r) => flatMap(r, parseUser),
    (r) => flatMap(r, validateUser)
  );
```

## Point-Free Style

When appropriate:

```typescript
import { map } from '@deessejs/core';

// Less ideal - explicit parameter
const doubled = map((x: number) => x * 2);

// Point-free - function composition
const double = (x: number) => x * 2;
const doubledValues = map(double);
```

## Currying

For partial application:

```typescript
// Not curried - all arguments at once
const map2 = <T, U>(fn: (v: T) => U, result: Result<T, Error>): Result<U, Error> =>
  map(result, fn);

// Curried - chain arguments
const mapCurried = <T, U>(fn: (v: T) => U) =>
  (result: Result<T, Error>): Result<U, Error> =>
    map(result, fn);

// Usage
const doubled = mapCurried(x => x * 2)(ok(21));
```

## Pattern Matching

Replace conditionals with `match`:

```typescript
import { match } from '@deessejs/core';

// Bad - if/else chains
const message = result.ok
  ? `Got: ${result.value}`
  : `Error: ${result.error.message}`;

// Good - match
const message = match(
  result,
  value => `Got: ${value}`,
  error => `Error: ${error.message}`
);
```

## Railway-Oriented Programming

Errors stay on the failure track:

```typescript
import { ok, err, map, flatMap } from '@deessejs/core';

const divide = (a: number, b: number): Result<number, Error> =>
  b === 0 ? err(new Error('Division by zero')) : ok(a / b);

const square = (n: number): Result<number, Error> => ok(n * n);

// Pipeline stops at first error
const result = pipe(
  ok(10),
  (r) => flatMap(r, n => divide(n, 2)), // Ok(5)
  (r) => flatMap(r, n => divide(1, n)),  // Ok(0.2)
  (r) => map(r, square)                  // Ok(0.04)
);

// If divide(1, 0) was called, it would return Err immediately
```

## Data Transformation

Transform data through pipelines:

```typescript
import { pipe, map, flatMap } from '@deessejs/core';

const transformUser = (raw: unknown): Result<User, Error> =>
  pipe(
    ok(raw),
    (r) => flatMap(r, validateRaw),
    (r) => flatMap(r, parseJSON),
    (r) => flatMap(r, normalizeFields),
    (r) => map(r, toUser)
  );
```

## Factory Functions

Create objects via functions:

```typescript
// Bad - constructor
const user = new User({ name: 'Alice', email: 'alice@example.com' });

// Good - factory
const createUser = (name: string, email: string): User => ({
  name,
  email,
  createdAt: new Date()
});

const user = createUser('Alice', 'alice@example.com');
```

## Immutability

Never modify input data:

```typescript
// Bad
const updateUser = (user: User, name: string): User => {
  user.name = name; // Mutation!
  return user;
};

// JS objects are passed by reference!

// Good
const updateUser = (user: User, name: string): User => ({
  ...user,
  name
});
```

## Closure for State

When state is needed, use closures:

```typescript
// Bad - class for state
class Counter {
  private count = 0;
  increment() { this.count++; }
  get() { return this.count; }
}

// Good - closure for state
const createCounter = () => {
  let count = 0;
  return {
    increment: () => { count++; },
    get: () => count
  };
};
```

## Async Patterns

```typescript
// Async composition
import { fromPromise, map, flatMap } from '@deessejs/core';

const fetchAndProcess = (id: string) =>
  flatMap(
    fromPromise(fetch(`/api/${id}`)),
    response => flatMap(
      fromPromise(response.json()),
      data => ok(process(data))
    )
  );

// Parallel with all
import { all } from '@deessejs/core';

const [user, posts, comments] = await all(
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id)
);
```

## Summary

| Principle | Application |
|-----------|-------------|
| No classes | Use types and functions |
| No mutation | Return new values |
| Pure functions | No side effects |
| Composition | Build from small functions |
| Immutability | Never modify inputs |

## See Also

- [Result](./result.md) - Functional error handling
- [Pipe & Flow](./pipe-flow.md) - Function composition
- [Railway-Oriented Programming Rules](../railway-oriented-programming.md)
