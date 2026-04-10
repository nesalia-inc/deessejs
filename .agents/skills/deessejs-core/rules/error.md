# Error System

Structured domain errors with notes, cause chaining, and Zod validation.

## Overview

The Error system provides rich error objects inspired by Python's exception classes. Errors have structured metadata, support enrichment with notes and cause chaining, and integrate with Result.

## Why Structured Errors?

```typescript
// Bad - Native Error is limited
throw new Error('Processing failed');

// Good - Structured error with context
const error = ProcessingError({ input: 'user data' })
  .addNotes('Attempted at 14:32:00', 'User: john')
  .from(causeError);

// Access structured data
error.name;     // 'ProcessingError'
error.args;     // { input: 'user data' }
error.notes;    // ['Attempted at 14:32:00', 'User: john']
error.cause;    // Maybe<Error> - the original cause
```

## Creating Domain Errors

```typescript
import { error } from '@deessejs/core';
import { z } from 'zod';

const ValidationError = error({
  name: 'ValidationError',
  schema: z.object({
    field: z.string(),
    reason: z.string()
  }),
  message: (args) => `"${args.field}" is invalid: ${args.reason}`
});

const err = ValidationError({ field: 'email', reason: 'missing @' });
err.name;     // 'ValidationError'
err.args;     // { field: 'email', reason: 'missing @' }
err.message;  // '"email" is invalid: missing @'
```

## Error Properties

```typescript
interface Error {
  readonly name: string;
  readonly args: T;                    // Domain-specific data
  readonly notes: readonly string[];  // Additional context
  readonly cause: Maybe<Error>;       // Chained error
  readonly message: string;            // Human-readable
  readonly stack?: string;             // Stack trace
}
```

## Enrichment with Notes

Notes add debugging context without creating new error types:

```typescript
import { error, err } from '@deessejs/core';

const ValidationError = error({
  name: 'ValidationError',
  schema: z.object({ field: z.string() })
});

const enriched = ValidationError({ field: 'email' })
  .addNotes('Input received at API endpoint')
  .addNotes('Timestamp: 2024-01-15T10:30:00Z');

enriched.notes; // ['Input received at API endpoint', 'Timestamp: 2024-01-15T10:30:00Z']
```

## Cause Chaining

Trace error provenance through the call stack:

```typescript
import { error, err } from '@deessejs/core';

const NetworkError = error({
  name: 'NetworkError',
  schema: z.object({ url: z.string() })
});

const ParseError = error({
  name: 'ParseError',
  schema: z.object({ raw: z.string() })
});

const result = err(ParseError({ raw: 'invalid' }).from(NetworkError({ url: '/api' })));

// Access the cause chain
result.error.cause.map(e => e.name).getOrElse('no cause'); // 'NetworkError'
```

## Using Errors with Result

```typescript
import { error, err, ok, isOk, mapErr } from '@deessejs/core';

const ValidationError = error({
  name: 'ValidationError',
  schema: z.object({ field: z.string() })
});

const validateEmail = (email: string): Result<string, ReturnType<typeof ValidationError>> => {
  if (!email.includes('@')) {
    return err(ValidationError({ field: 'email' })
      .addNotes('Email validation failed'));
  }
  return ok(email);
};

// Enrich errors during transformation
const result = validateEmail('invalid')
  .mapErr(e => e.addNotes('In user registration flow'));
```

## Guard Functions

```typescript
import { isError, isErrorGroup, assertIsError } from '@deessejs/core';

if (isError(value)) {
  console.log(value.name); // TypeScript knows value is Error
}

// Assert throws if not Error
assertIsError(unknownValue);
// Now TypeScript knows unknownValue is Error
```

## Error Groups

```typescript
import { error, exceptionGroup, isErrorGroup } from '@deessejs/core';

const ValidationError = error({
  name: 'ValidationError',
  schema: z.object({ field: z.string() })
});

// Collect multiple errors
const errors = exceptionGroup('ValidationFailed', [
  ValidationError({ field: 'email' }),
  ValidationError({ field: 'password' }),
  ValidationError({ field: 'username' })
]);

errors.name;           // 'ExceptionGroup'
errors.exceptions;      // [ValidationError, ValidationError, ValidationError]

// Filter errors by type
import { filterErrorsByName } from '@deessejs/core';
const validationErrors = filterErrorsByName(errors, 'ValidationError');
```

## Flattening Error Groups

```typescript
import { error, exceptionGroup, flattenErrorGroup } from '@deessejs/core';

const errors = exceptionGroup('MultipleErrors', [err1, err2, err3]);
const flattened = flattenErrorGroup(errors);
// Get all errors as a flat array
```

## Raising Errors

For unrecoverable errors that should propagate:

```typescript
import { error, raise } from '@deessejs/core';

const SystemError = error({
  name: 'SystemError',
  message: (args) => `System failure: ${args.reason}`
});

// raise throws the error - use sparingly
const process = (config: Config): Result<Data, Error> => {
  if (!config.required) {
    return raise(SystemError({ reason: 'Missing required config' }));
  }
  return ok(processData(config));
};
```

## Pattern: Error Enrichment in Chains

```typescript
const processOrder = (orderId: string): Result<Order, Error> => {
  const order = findOrder(orderId);

  return flatMap(order, o =>
    flatMap(validateInventory(o.items), v =>
      flatMap(processPayment(o.total), p =>
        fulfillOrder(o, p)
      ).mapErr(e => e.addNotes(`Payment failed for order ${orderId}: ${o.total}`))
    ).mapErr(e => e.addNotes(`Inventory check failed for order ${orderId}`))
  ).mapErr(e => e.addNotes(`Order not found: ${orderId}`));
};
```

## Schema Validation with Zod

```typescript
import { error } from '@deessejs/core';
import { z } from 'zod';

const ConfigError = error({
  name: 'ConfigError',
  schema: z.object({
    path: z.string(),
    missingKeys: z.array(z.string()).optional()
  }),
  message: (args) => `Config error at ${args.path}`
});

const config = ConfigError({ path: 'database.yml' })
  .addNotes('Failed to load configuration');

// Zod validation happens at creation time
ConfigError({ path: 123 }); // Throws - path must be string
```

## When to Use Each Error Pattern

| Pattern | Use When |
|---------|----------|
| `error()` factory | Creating domain-specific errors |
| `.addNotes()` | Adding debugging context |
| `.from()` | Chaining error causes |
| `exceptionGroup()` | Collecting multiple related errors |
| `raise()` | Unrecoverable errors (use sparingly) |

## Anti-Patterns

```typescript
// Bad - Native Error
throw new Error('Something went wrong');

// Bad - String as error
return err('Something went wrong');

// Good - Structured error
return err(ValidationError({ field: 'email', reason: 'invalid' }));

// Bad - Swallowing errors
catch (e) { /* do nothing */ }

// Good - Preserve error with notes
catch (e) {
  return err(ProcessingError({}).addNotes(`Failed at step 2: ${e.message}`));
}
```

## See Also

- [Result](./result.md) - Using errors with Result
- [AsyncResult](./async-result.md) - Async error handling
- [Try](./try.md) - Wrapping throwing functions
- [Error Handling Rules](./error-handling.md) - Project-wide patterns
