# Maybe Type

Safe handling of optional values without null checks.

## Overview

`Maybe<T>` represents a value that can be either present (`Some<T>`) or absent (`None`). It makes absence explicit and safe.

## Why Maybe?

JavaScript's `null` and `undefined` cause runtime errors. Maybe makes absence explicit in the type:

```typescript
// Bad - null scattered everywhere
const getUser = (id: string): User | null => { /* ... */ };
const name = getUser(id)?.address?.city ?? 'Unknown';

// Good - absence is explicit
const getUser = (id: string): Maybe<User> => { /* ... */ };
const city = flatMap(getUser(id), u => fromNullable(u.address).flatMap(a => fromNullable(a.city))).getOrElse('Unknown');
```

## Creating Maybe

```typescript
import { some, none, fromNullable } from '@deessejs/core';

// Some - value is present
const present: Maybe<number> = some(42);

// None - value is absent
const absent: Maybe<number> = none();

// fromNullable - bridge from null/undefined
const fromNull: Maybe<number> = fromNullable(null); // None
const fromUndefined: Maybe<number> = fromNullable(undefined); // None
const fromValue: Maybe<number> = fromNullable(42); // Some(42)

// 0, '', false are valid values (only null/undefined become None)
fromNullable(0); // Some(0)
fromNullable(''); // Some('')
fromNullable(false); // Some(false)
```

## Type Guards

```typescript
import { some, none, isSome, isNone } from '@deessejs/core';

const maybe = some(42);

if (isSome(maybe)) {
  console.log(maybe.value); // 42
}

if (isNone(maybe)) {
  console.log('No value');
}
```

## Transforming

```typescript
import { some, none, map, flatMap, filter } from '@deessejs/core';

// map transforms the value if Some
const doubled = map(some(21), x => x * 2); // Some(42)
const noneDoubled = map(none(), x => x * 2); // None

// flatMap chains Maybes
const getUser = (id: number): Maybe<User> => /* ... */;
const getEmail = (user: User): Maybe<string> => fromNullable(user.email);

const userEmail = flatMap(getUser(1), getEmail); // Maybe<string>

// filter keeps Some only if predicate passes
const positive = filter(some(42), x => x > 0); // Some(42)
const notPositive = filter(some(-5), x => x > 0); // None

// flatten unwraps nested Maybe
import { flatten } from '@deessejs/core';
flatten(some(some(42))); // Some(42)
flatten(some(none())); // None
flatten(none()); // None
```

## Extraction

```typescript
import { some, none, getOrElse, getOrCompute } from '@deessejs/core';

// getOrElse returns default if None
const value = getOrElse(some(42), 0); // 42
const fallback = getOrElse(none(), 0); // 0

// getOrCompute computes default lazily
const computed = getOrElseCompute(none(), () => expensiveOperation());
```

## Pattern Matching

```typescript
import { some, none, match } from '@deessejs/core';

const maybe = some(42);

const message = match(
  maybe,
  value => `Got: ${value}`,
  () => 'No value'
); // "Got: 42"
```

## Nested Property Access

The Maybe pattern shines for safe property access:

```typescript
import { some, fromNullable, flatMap, getOrElse } from '@deessejs/core';

interface User {
  address?: {
    city?: string;
  };
}

const getCity = (user: Maybe<User>): Maybe<string> =>
  flatMap(user, u =>
    flatMap(fromNullable(u.address), a =>
      fromNullable(a.city)
    )
  );

const city = getCity(some(user)).getOrElse('Unknown');
```

## Combining Multiple Maybes

```typescript
import { some, none, all } from '@deessejs/core';

// all succeeds only if all are Some (fail-fast)
const combined = all(some(1), some(2), some(3)); // Some([1, 2, 3])
const failed = all(some(1), none(), some(3)); // None
```

## Conversions

```typescript
import { some, toNullable, toUndefined, toResult } from '@deessejs/core';

// To nullable
toNullable(some(42)); // 42
toNullable(none()); // null

// To undefined
toUndefined(some(42)); // 42
toUndefined(none()); // undefined

// To Result with error
import { toResult, error } from '@deessejs/core';

const NotFoundError = error({ name: 'NotFoundError', message: () => 'Not found' });
toResult(some(42), () => NotFoundError()); // Ok(42)
toResult(none(), () => NotFoundError()); // Err(NotFoundError)
```

## Comparison

```typescript
import { some, none, equals, equalsWith } from '@deessejs/core';

// Structural equality
equals(some(42), some(42)); // true
equals(some(42), some(1)); // false
equals(none(), none()); // true
equals(some(42), none()); // false

// Custom comparator
equalsWith(
  some({ id: 1, name: 'John' }),
  some({ id: 2, name: 'John' }),
  (a, b) => a.name === b.name
); // true (comparing by name only)
```

## When to Use Maybe

| Use Case | Example |
|----------|---------|
| Optional function parameters | `greet: (name?: Maybe<string>) => ...` |
| Nullable database fields | `getUser: (id) => Maybe<User>` |
| Missing configuration | `getConfig: () => Maybe<Config>` |
| Optional object properties | `user.address?.city` |

## Anti-Patterns

```typescript
// Bad - using null/undefined checks
const getCity = (user: User | null): string => {
  if (user === null) return 'Unknown';
  if (user.address === null) return 'Unknown';
  return user.address.city ?? 'Unknown';
};

// Good - Maybe throughout
const getCity = (user: Maybe<User>): Maybe<string> =>
  flatMap(user, u =>
    flatMap(fromNullable(u.address), a =>
      fromNullable(a.city)
    )
  );
```

## See Also

- [Result](./result.md) - For operations that can fail with error context
- [Try](./try.md) - For wrapping synchronous functions that might throw
