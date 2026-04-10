# Try Type

Wrap synchronous functions that might throw.

## Overview

`Try<T>` wraps synchronous functions that might throw, converting exceptions into typed errors. It is the bridge between imperative exception handling and functional error management.

## When to Use Try

Use Try when:
- Calling external libraries that might throw
- Parsing (JSON.parse, regex)
- File system operations
- Any operation that can legitimately throw

## Creating Try

```typescript
import { attempt, isOk, isErr, Try } from '@deessejs/core';

// attempt wraps a function that might throw
const result: Try<number, Error> = attempt(() => JSON.parse('{"valid": true}'));

// attempt with custom error handler
const result = attempt(
  () => parseInt('42', 10),
  (error) => new Error(`Parse failed: ${error.message}`)
);
```

## Why Not Just try/catch?

```typescript
// Bad - try/catch is error-prone and verbose
function parseJSON(input: string): object {
  try {
    return JSON.parse(input);
  } catch (e) {
    throw new Error(`Parse failed: ${e.message}`); // Easy to forget
  }
}

// Good - Try makes error handling explicit
const parseJSON = (input: string): Try<object, Error> =>
  attempt(() => JSON.parse(input));
```

## Type Guards

```typescript
import { attempt, isOk, isErr } from '@deessejs/core';

const result = attempt(() => JSON.parse('{"valid": true}'));

if (isOk(result)) {
  console.log(result.value); // { valid: true }
}

if (isErr(result)) {
  console.error(result.error.message);
}
```

## Transforming

```typescript
import { attempt, map, flatMap } from '@deessejs/core';

// map transforms the success value
const doubled = map(attempt(() => 21), x => x * 2); // Try(42)

// flatMap chains Try operations
const parseAndDouble = (s: string): Try<number, Error> =>
  flatMap(attempt(() => parseInt(s, 10)), n =>
    attempt(() => n * 2)
  );
```

## Extraction

```typescript
import { attempt, getOrElse, getOrCompute, unwrap } from '@deessejs/core';

// getOrElse returns default if failure
const value = getOrElse(attempt(() => 42), 0); // 42
const fallback = getOrElse(attempt(() => { throw new Error('oops'); }), 0); // 0

// getOrCompute computes default lazily
const computed = getOrElseCompute(
  attempt(() => { throw new Error('oops'); }),
  () => expensiveOperation()
);

// unwrap extracts value or throws
unwrap(attempt(() => 42)); // 42
unwrap(attempt(() => { throw new Error('fail'); })); // throws
```

## Pattern Matching

```typescript
import { attempt, match } from '@deessejs/core';

const result = attempt(() => 42);

const message = match(
  result,
  value => `Got: ${value}`,
  error => `Error: ${error.message}`
); // "Got: 42"
```

## Conversions

```typescript
import { attempt, toNullable, toUndefined } from '@deessejs/core';

// To nullable
toNullable(attempt(() => 42)); // 42
toNullable(attempt(() => { throw new Error('oops'); })); // null

// To undefined
toUndefined(attempt(() => 42)); // 42
toUndefined(attempt(() => { throw new Error('oops'); })); // undefined
```

## Real-World Example: JSON Parsing

```typescript
import { attempt, getOrElse, err } from '@deessejs/core';

interface User {
  id: number;
  name: string;
}

const parseUser = (json: string): Try<User, Error> =>
  attempt(() => {
    const obj = JSON.parse(json);
    if (typeof obj.id !== 'number') throw new Error('Invalid id');
    if (typeof obj.name !== 'string') throw new Error('Invalid name');
    return obj as User;
  });

const user = getOrElse(parseUser('{"id": 1, "name": "Alice"}'), { id: 0, name: 'Guest' });
```

## Async Try

```typescript
import { attemptAsync, isOk } from '@deessejs/core';

// attemptAsync wraps async functions that might reject
const result = await attemptAsync(fetch('https://api.example.com'));

// It works with Try<Promise<T>> - use with flatMap
import { flatMap } from '@deessejs/core';

const fetchAndParse = (url: string) =>
  flatMap(
    attemptAsync(fetch(url)),
    response => attemptAsync(() => response.json())
  );
```

## Comparison with Result

| Aspect | Try | Result |
|--------|-----|--------|
| Error source | Exceptions | Explicit |
| Use case | Wrapping throwing functions | Defining failure semantics |
| Error type | Always Error | Custom E |
| Synchronous | Yes | Yes |

```typescript
// Try - for things that throw
const parsed = attempt(() => JSON.parse(input));

// Result - for things you define as failing
const validated = isValid(input)
  ? ok(input)
  : err(new ValidationError('Invalid input'));
```

## Anti-Patterns

```typescript
// Bad - Try for validation (should be Result)
const validateEmail = (email: string): Try<boolean, Error> =>
  attempt(() => {
    if (!email.includes('@')) throw new Error('Invalid');
    return true;
  });

// Good - Result for explicit validation
const validateEmail = (email: string): Result<boolean, Error> =>
  email.includes('@') ? ok(true) : err(new Error('Invalid'));

// Bad - try/catch when Try would work
const parse = (s: string): Try<object, Error> => {
  try {
    return ok(JSON.parse(s));
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
};

// Good - attempt handles this automatically
const parse = (s: string): Try<object, Error> =>
  attempt(() => JSON.parse(s));
```

## See Also

- [Result](./result.md) - For explicit success/failure semantics
- [Maybe](./maybe.md) - For values that may not exist
- [AsyncResult](./async-result.md) - For async operations with error handling
- [Error](./error.md) - For structured domain errors
