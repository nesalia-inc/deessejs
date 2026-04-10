# Error Handling Rules

Guidelines for error handling across the codebase.

## Core Principle

**Errors travel through the Result, not thrown.**

```typescript
// Bad - throwing breaks composability
const parse = (s: string): number => {
  const n = parseInt(s, 10);
  if (isNaN(n)) throw new Error('Not a number');
  return n;
};

// Good - error travels through Result
const parse = (s: string): Result<number, Error> => {
  const n = parseInt(s, 10);
  return isNaN(n) ? err(new Error('Not a number')) : ok(n);
};
```

## When to Break the Rail

Using `raise()` should be **extremely rare**:

1. **Unrecoverable programmer errors** - Bugs, not expected failures
2. **Invariant violations** - Internal assumptions that indicate corruption
3. **Immediate termination** - Continuing would cause data damage

```typescript
// Acceptable - unrecoverable bug detection
const process = (config: Config): Result<Data, Error> => {
  if (!config.requiredField) {
    return raise(new Error('Config corruption - required field missing'));
  }
  return ok(data);
};

// NOT acceptable - expected failures
const parse = (s: string): Result<number, Error> => {
  const n = parseInt(s, 10);
  if (isNaN(n)) {
    return raise(new Error('Invalid number')); // NO! Use err()
  }
  return ok(n);
};
```

## Always Use Structured Errors

For domain errors, use the Error system:

```typescript
import { error } from '@deessejs/core';
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  schema: z.object({ field: z.string(), reason: z.string() }),
  message: (args) => `"${args.field}" is invalid: ${args.reason}`
});

// Never
return err(new Error('Invalid email'));

// Always
return err(ValidationError({ field: 'email', reason: 'missing @' }));
```

## Error Enrichment

Add context with notes, not new error types:

```typescript
const processOrder = (id: string): Result<Order, Error> =>
  flatMap(
    fetchOrder(id),
    order => flatMap(
      validateOrder(order),
      validated => flatMap(
        processPayment(order.total),
        payment => fulfillOrder(order, payment)
      ).mapErr(e => e.addNotes(`Payment failed for order ${id}`))
    ).mapErr(e => e.addNotes(`Validation failed for order ${id}`))
  ).mapErr(e => e.addNotes(`Order fetch failed for ${id}`));
```

## Async Error Handling

Never throw in async operations:

```typescript
// Bad - throwing in async function
const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

// Good - return AsyncResult
const fetchUser = (id: string): Promise<AsyncResult<User, Error>> =>
  fromPromise(fetch(`/api/users/${id}`))
    .map(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
```

## Error Propagation Chain

Chain causes, don't lose context:

```typescript
import { error } from '@deessejs/core';

const LowLevelError = error({ name: 'LowLevelError', message: (a) => a.msg });
const HighLevelError = error({ name: 'HighLevelError', message: (a) => a.context });

const result = err(HighLevelError({ context: 'Processing failed' })
  .from(LowLevelError({ msg: 'Connection refused' })
    .addNotes('Attempted to connect to database')));

// Access the chain
result.error.cause.map(e => e.name).getOrElse('no cause'); // 'LowLevelError'
result.error.notes; // ['Attempted to connect to database']
```

## Never Swallow Errors

```typescript
// Bad - lost error context
catch (e) {
  console.error(e);
  return null;
}

// Good - preserve with enrichment
catch (e) {
  return err(ProcessingError({})
    .addNotes(`Failed at step 3: ${e.message}`));
}
```

## Don't Use Native Error Classes

```typescript
// Bad - custom Error classes
class ValidationError extends Error {
  constructor(public field: string) {
    super(`${field} is invalid`);
    this.name = 'ValidationError';
  }
}

// Good - structured Error from @deessejs/core
const ValidationError = error({
  name: 'ValidationError',
  schema: z.object({ field: z.string() }),
  message: (args) => `${args.field} is invalid`
});
```

## Validation Pattern

Always return Result for validation:

```typescript
const validateEmail = (email: string): Result<string, Error> =>
  email.includes('@')
    ? ok(email)
    : err(ValidationError({ field: 'email', reason: 'missing @' }));

const validateAge = (age: number): Result<number, Error> =>
  age >= 0 && age <= 150
    ? ok(age)
    : err(ValidationError({ field: 'age', reason: 'out of range' }));

// Compose validations
const validateUser = (email: string, age: number): Result<User, Error> =>
  flatMap(validateEmail(email), e =>
    flatMap(validateAge(age), a =>
      ok({ email: e, age: a })
    )
  );
```

## Exception Wrapping

When you must catch external exceptions:

```typescript
import { attempt, isError } from '@deessejs/core';

// Wrap throwing functions with attempt
const parsed = attempt(() => JSON.parse(input));

// For async, use fromPromise
const result = await fromPromise(fetch(url));

// Map errors to structured types
mapErr(result, e =>
  isError(e)
    ? e.addNotes(`Failed to fetch ${url}`)
    : NetworkError({ url, message: e.message })
);
```

## Summary Table

| Situation | Use |
|-----------|-----|
| Validation fails | `err(ValidationError(...))` |
| Operation not found | `err(NotFoundError(...))` |
| External library throws | `attempt(() => ...)` |
| Async operation fails | `errAsync(Error(...))` or `.mapErr()` |
| Unrecoverable bug | `raise(...)` (rare) |
| Add context | `.addNotes(...)` |
| Chain cause | `.from(...)` |

## Anti-Patterns Summary

- `throw new Error(...)` in Result-returning functions
- `raise(...)` for expected failures
- Custom `class Error extends Error`
- Swallowing errors with empty catch
- Creating new error types instead of using `.addNotes()`
- Returning `null` instead of `err(...)`

## See Also

- [Error](./error.md) - Error system reference
- [Result](./result.md) - Result type
- [AsyncResult](./async-result.md) - Async error handling
- [Try](./try.md) - Wrapping throwing functions
