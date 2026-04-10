# Result Type

Explicit success/failure with typed errors.

## Overview

`Result<T, E>` represents a value that can be either a success (`Ok<T>`) or a failure (`Err<E>`). It makes errors explicit in the type system.

## Creating Results

```typescript
import { ok, err } from '@deessejs/core';

// Success
const success: Result<number, Error> = ok(42);

// Failure
const failure: Result<number, Error> = err(new Error('oops'));
```

## Type Guards

```typescript
import { ok, err, isOk, isErr } from '@deessejs/core';

const result = ok(42);

if (isOk(result)) {
  console.log(result.value); // TypeScript knows it's Ok
}

if (isErr(result)) {
  console.log(result.error.message); // TypeScript knows it's Err
}
```

## Transforming

```typescript
import { ok, err, map, flatMap, mapErr } from '@deessejs/core';

// map transforms the success value
const doubled = map(ok(21), x => x * 2); // Ok(42)
const failedDouble = map(err('oops'), x => x * 2); // Err('oops')

// flatMap chains operations that return Result
const safeDivide = (a: number, b: number): Result<number, string> =>
  b === 0 ? err('Division by zero') : ok(a / b);

const result = flatMap(ok(10), safeDivide); // Ok(5)
const failed = flatMap(ok(10), n => safeDivide(n, 0)); // Err('Division by zero')

// mapErr transforms the error
const withError = mapErr(err('old'), e => new Error(e)); // Err(Error: 'old')
```

## Extraction

```typescript
import { ok, err, getOrElse, getOrCompute, unwrap } from '@deessejs/core';

// getOrElse returns default if Err
const value = getOrElse(ok(42), 0); // 42
const fallback = getOrElse(err('oops'), 0); // 0

// getOrCompute computes default lazily (useful for expensive operations)
const computed = getOrElseCompute(err('oops'), () => expensiveOperation());

// unwrap extracts value or throws (avoid in production)
const unwrapped = unwrap(ok(42)); // 42
unwrap(err('oops')); // throws 'oops'
```

## Pattern Matching

```typescript
import { ok, err, match } from '@deessejs/core';

const result = ok(42);

const message = match(
  result,
  value => `Got: ${value}`,
  error => `Error: ${error.message}`
); // "Got: 42"
```

## Combining Multiple Results

```typescript
import { ok, err, all } from '@deessejs/core';

// all succeeds only if all succeed (fail-fast)
const combined = all(ok(1), ok(2), ok(3)); // Ok([1, 2, 3])
const failed = all(ok(1), err('fail'), ok(3)); // Err('fail')

// swap exchanges Ok and Err
import { swap } from '@deessejs/core';
swap(ok(42)); // Err(42)
swap(err('oops')); // Ok('oops')
```

## When to Use Result

| Use Case | Example |
|----------|---------|
| Validation with errors | `validateEmail: (s) => Result<string, ValidationError>` |
| Parsing | `parseJSON: (s) => Result<object, ParseError>` |
| File operations | `readFile: (p) => Result<string, FileError>` |
| API calls (sync) | `fetchUser: (id) => Result<User, NetworkError>` |

## Anti-Patterns

```typescript
// Bad - throwing breaks the rail
const divide = (a: number, b: number): Result<number, Error> => {
  if (b === 0) throw new Error('Division by zero'); // NO!
  return ok(a / b);
};

// Good - error travels through Result
const divide = (a: number, b: number): Result<number, Error> =>
  b === 0 ? err(new Error('Division by zero')) : ok(a / b);

// Bad - returning null instead of Err
const parse = (s: string): Result<number, Error> => {
  const n = parseInt(s, 10);
  if (isNaN(n)) return null; // NO!
  return ok(n);
};

// Good - explicit error
const parse = (s: string): Result<number, Error> =>
  isNaN(parseInt(s, 10)) ? err(new Error('Not a number')) : ok(parseInt(s, 10));
```

## See Also

- [Maybe](./maybe.md) - For values that may not exist (no error context)
- [Try](./try.md) - For wrapping synchronous functions that might throw
- [AsyncResult](./async-result.md) - For async operations
- [Error](./error.md) - For structured domain errors
