---
name: deessejs-core
description: Functional programming patterns for TypeScript - Result, Maybe, Try, AsyncResult, and structured error handling
metadata:
  tags: typescript, functional-programming, error-handling, result, maybe, try, asyncresult
---

# @deessejs/core Skill

Functional programming patterns for TypeScript: Result, Maybe, Try, AsyncResult, and structured error handling.

## Quick Usage

```bash
/deessejs-core
/deessejs-core --topic=result
/deessejs-core --topic=maybe
```

## Overview

@deessejs/core provides zero-dependency monads for type-safe error handling:

| Type | Use When | Replaces |
|------|----------|----------|
| `Result<T, E>` | Operation can succeed or fail with typed error | try/catch, if/else |
| `Maybe<T>` | Value may or may not exist | null checks, undefined |
| `Try<T>` | Synchronous function might throw | try/catch blocks |
| `AsyncResult<T, E>` | Async operation with typed errors | async/await with try/catch |
| `Error<T>` | Structured domain errors with Zod | Custom Error classes |

## Topics

- [Result](./rules/result.md) - Explicit success/failure with typed errors
- [Maybe](./rules/maybe.md) - Safe handling of optional values
- [Try](./rules/try.md) - Wrap synchronous functions that might throw
- [AsyncResult](./rules/async-result.md) - Async operations with error handling
- [Error](./rules/error.md) - Structured errors with notes and cause chaining
- [Conversions](./rules/conversions.md) - Convert between types
- [Sleep & Retry](./rules/sleep-retry.md) - Resilience patterns
- [Pipe & Flow](./rules/pipe-flow.md) - Function composition
- [Yield](./rules/yield.md) - Control yielding in async operations
- [Unit](./rules/unit.md) - The unit type for void-like returns

## Key Principles

### Railway-Oriented Programming

Errors travel through the Result, not thrown:

```typescript
// Bad - throwing breaks the rail
const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
};

// Good - error travels through Result
const divide = (a: number, b: number): Result<number, Error> =>
  b === 0 ? err(new Error("Division by zero")) : ok(a / b);
```

### Null Safety with Maybe

Make absence explicit in the type:

```typescript
// Bad - null scattered everywhere
const getCity = (user: User | null): string | null => {
  if (!user) return null;
  if (!user.address) return null;
  return user.address.city;
};

// Good - absence is explicit
const getCity = (user: Maybe<User>): Maybe<string> =>
  flatMap(user, u =>
    flatMap(fromNullable(u.address), a =>
      fromNullable(a.city)
    )
  );
```

## Error Handling

Always use the Error system for domain errors:

```typescript
import { error, err } from '@deessejs/core';
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  schema: z.object({ field: z.string() }),
  message: (args) => `"${args.field}" is invalid`
});

return err(ValidationError({ field: 'email' }));
```

See [Error Handling Rules](./rules/error-handling.md) for patterns.

## Functional Programming

No classes. No mutations. Pure functions only:

```typescript
// Good - standalone functions
import { map, flatMap } from '@deessejs/core';
const doubled = map(result, x => x * 2);

// Bad - methods on objects
const doubled = result.map(x => x * 2);
```

See [Functional Programming Rules](./rules/functional-programming.md) for principles.

## API Reference

See [packages/core/src/index.ts](https://github.com/nesalia-inc/core/blob/main/packages/core/src/index.ts) for the complete exported API.

## Examples

### Input Validation

```typescript
import { ok, err, map, flatMap } from '@deessejs/core';

const validateEmail = (email: string): Result<string, Error> =>
  email.includes('@') ? ok(email) : err(new Error('Invalid email'));

const parseAge = (age: string): Result<number, Error> => {
  const n = parseInt(age, 10);
  return isNaN(n) ? err(new Error('Not a number')) : ok(n);
};

const createUser = (email: string, age: string) =>
  flatMap(validateEmail(email), e =>
    flatMap(parseAge(age), a =>
      ok({ email: e, age: a })
    )
  );
```

### Safe API Calls

```typescript
import { fromPromise, ok, err, isOk } from '@deessejs/core';

const fetchUser = (id: string) =>
  fromPromise(fetch(`/api/users/${id}`))
    .mapErr(e => e.addNotes(`Failed to fetch user ${id}`))
    .flatMap(async response =>
      response.ok
        ? ok(await response.json())
        : err(new Error(`HTTP ${response.status}`))
    );

const result = await fetchUser('123');
if (isOk(result)) {
  console.log(result.value);
}
```

### Nested Property Access

```typescript
import { some, fromNullable, flatMap, getOrElse } from '@deessejs/core';

const getCity = (user: Maybe<User>): Maybe<string> =>
  flatMap(user, u =>
    flatMap(fromNullable(u.address), a =>
      fromNullable(a.city)
    )
  );

const city = getCity(some(user)).getOrElse('Unknown');
```
