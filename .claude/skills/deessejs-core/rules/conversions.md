# Conversions

Convert between Result, Maybe, and Try types.

## Overview

Conversions allow seamless transitions between the monadic types, enabling you to work with mixed error-handling styles.

## Maybe to Result

```typescript
import { some, none, toResult, error } from '@deessejs/core';

const NotFoundError = error({
  name: 'NotFoundError',
  message: () => 'Resource not found'
});

// Maybe<T> -> Result<T, E>
const result = toResult(some(42), () => NotFoundError()); // Ok(42)
const failed = toResult(none(), () => NotFoundError()); // Err(NotFoundError)

// with default error
import { toResult as maybeToResult } from '@deessejs/core';
maybeToResult(some('value'), () => new Error('Not found'));
```

## Result to Maybe

```typescript
import { ok, err, toMaybeFromResult } from '@deessejs/core';

// Result<T, E> -> Maybe<T> (errors become None)
const maybe = toMaybeFromResult(ok(42)); // Some(42)
const noneResult = toMaybeFromResult(err(new Error('oops'))); // None
```

## Maybe to Result (fromNullable)

```typescript
import { fromNullable, toResult, error } from '@deessejs/core';

const ValidationError = error({
  name: 'ValidationError',
  message: (args) => `${args.field} is required`
});

// Combine nullable check with error creation
const value: string | null = getConfig('key');

const result = toResult(
  fromNullable(value),
  () => ValidationError({ field: 'key' })
);
```

## Nullable to Result

```typescript
import { resultFromNullable, error } from '@deessejs/core';

const NotFoundError = error({
  name: 'NotFoundError',
  message: () => 'Not found'
});

// Direct conversion from nullable
const user: User | null = findUser(id);
const result = resultFromNullable(user, () => NotFoundError());
```

## Result to Result (error mapping)

```typescript
import { ok, err, mapErr } from '@deessejs/core';

const OriginalError = error({ name: 'OriginalError', message: (args) => args.msg });
const MappedError = error({ name: 'MappedError', message: (args) => args.reason });

const result: Result<number, ReturnType<typeof OriginalError>> = err(OriginalError({ msg: 'original' }));

// Map error type
const mapped: Result<number, ReturnType<typeof MappedError>> =
  mapErr(result, e => MappedError({ reason: e.message }));
```

## Throwable to Result

```typescript
import { resultFromThrowable } from '@deessejs/core';

// Wrap synchronous functions that might throw
const parseJSON = resultFromThrowable(
  (input: string) => JSON.parse(input),
  (e) => new Error(`Parse error: ${e.message}`)
);

const result = parseJSON('{"valid": true}'); // Ok({ valid: true })
const failed = parseJSON('invalid'); // Err(Error: 'Parse error: Unexpected token...')
```

## Async Conversions

```typescript
import { fromPromise, toNullable, toUndefined, okAsync, errAsync } from '@deessejs/core';

// fromPromise wraps Promise, automatically handling rejections
const result = await fromPromise(fetch('/api/user'));

// toNullable / toUndefined work with AsyncResult
await toNullable(okAsync(42)); // 42
await toUndefined(errAsync(new Error('oops'))); // undefined

// okAsync / errAsync create AsyncResults directly
const success = okAsync({ id: 1 });
const failure = errAsync(new Error('failed'));
```

## Try to Result

```typescript
import { attempt, mapErr, ok, err } from '@deessejs/core';
import { isError } from '@deessejs/core';

// Try wraps throwing functions
const parsed = attempt(() => JSON.parse(input));

// Convert Try error to custom error
const withCustomError = mapErr(parsed, e =>
  isError(e) ? e : new Error(String(e))
);
```

## Chaining Conversions

```typescript
import { some, fromNullable, toResult, flatMap } from '@deessejs/core';

const ConfigError = error({ name: 'ConfigError', message: () => 'Config required' });

const processConfig = (key: string) =>
  flatMap(
    toResult(fromNullable(config[key]), () => ConfigError()),
    value => validateConfig(value)
  );
```

## Type-Level Conversions

```typescript
import { some, fromNullable } from '@deessejs/core';

// NonNullable unwraps Maybe<T> to T (removes null/undefined)
const value: string | null = 'hello';
const maybe: Maybe<string> = fromNullable(value);
type Extracted = Extract<typeof maybe, Some>['value']; // string

// Working with discriminated unions
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
type Maybe<T> = { ok: true; value: T } | { ok: false };
```

## Conversion Summary Table

| From | To | Function |
|------|-----|----------|
| `Maybe<T>` | `Result<T, E>` | `toResult(maybe, onNone)` |
| `Result<T, E>` | `Maybe<T>` | `toMaybeFromResult(result)` |
| `T \| null` | `Maybe<T>` | `fromNullable(value)` |
| `T \| null` | `Result<T, E>` | `resultFromNullable(value, onNull)` |
| `() => T` (throws) | `Result<T, E>` | `resultFromThrowable(fn, onThrow)` |
| `Promise<T>` | `AsyncResult<T, Error>` | `fromPromise(promise)` |

## Anti-Patterns

```typescript
// Bad - manual conversion with null checks
const toResult = <T>(value: T | null, onNull: () => Error): Result<T, Error> =>
  value === null ? err(onNull()) : ok(value);

// Good - use built-in conversions
import { fromNullable, toResult } from '@deessejs/core';
toResult(fromNullable(value), onNull);

// Bad - nested conversions
const result = toMaybeFromResult(ok(fromNullable(value)));

// Good - direct conversion
fromNullable(value);
```

## See Also

- [Result](./result.md)
- [Maybe](./maybe.md)
- [Try](./try.md)
- [AsyncResult](./async-result.md)
