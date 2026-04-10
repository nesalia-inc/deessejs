# Unit Type

The unit type for void-like returns in functional composition.

## Overview

`Unit` is a special type representing a "no value" or "done" state. It enables function composition when you need to return something but have no meaningful value to return.

## What is Unit?

```typescript
import { unit, isUnit } from '@deessejs/core';

unit; // The single value of type Unit

// Check if a value is unit
isUnit(unit); // true
isUnit(undefined); // false
isUnit(null); // false
```

## Why Unit?

In functional programming, `void` and `undefined` are problematic because:
- `void` means "returns nothing" but TypeScript treats it differently
- `undefined` is a value that can be passed around
- Unit makes the "no value" state explicit and composable

## Usage with Result

```typescript
import { unit, ok, err, map } from '@deessejs/core';

// When you need to return Result but have no meaningful value
const logResult = (message: string): Result<Unit, Error> => {
  try {
    console.log(message);
    return ok(unit); // Return unit instead of undefined
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
};

// Chain operations
pipe(
  ok('hello'),
  (r) => map(r, s => s.toUpperCase()),
  (r) => flatMap(r, logResult) // Result<Unit, Error>
);
```

## Usage with Maybe

```typescript
import { unit, some, none, map, flatMap } from '@deessejs/core';

// When you need Maybe but have no value
const findDefault = (): Maybe<Unit> => {
  if (hasDefault()) {
    return some(unit); // Must return Some with a value
  }
  return none();
};

flatMap(findDefault(), () => doSomething());
```

## Comparison with undefined/null

| Aspect | Unit | undefined | null |
|--------|------|-----------|-----|
| Type safety | Explicit | Implicit | Explicit |
| Composition | Works | Limited | Works |
| Meaning | "Done" | "Missing" | "Absent" |
| TypeScript | `Unit` | `void` | `null` |

## When to Use Unit

| Use Case | Example |
|----------|---------|
| Logging | `Result<Unit, Error>` |
| Side effects | `Maybe<Unit>` when action not found |
| Completion signals | Stream completion |
| Fire-and-forget | `Promise<Unit>` |

## Pattern: Command Result

```typescript
import { unit, ok, err, map, flatMap } from '@deessejs/core';

type CommandResult = Result<Unit, Error>;

const createUser = (name: string): CommandResult => { /* ... */ return ok(unit); };
const sendEmail = (to: string): CommandResult => { /* ... */ return ok(unit); };
const logActivity = (msg: string): CommandResult => { /* ... */ return ok(unit); };

const createUserAndNotify = (name: string, email: string): CommandResult =>
  flatMap(createUser(name), () =>
    flatMap(sendEmail(email), () =>
      logActivity(`Created user: ${name}`)
    )
  );

// Usage
const result = createUserAndNotify('Alice', 'alice@example.com');
if (isErr(result)) {
  console.error('Failed:', result.error.message);
}
// Success - unit means "done"
```

## Pattern: Optional Action

```typescript
import { unit, some, none, flatMap } from '@deessejs/core';

interface Action {
  execute(): void;
}

const findAction = (name: string): Maybe<Action> => { /* ... */ };

const runAction = (name: string): Maybe<Unit> =>
  flatMap(findAction(name), action => {
    action.execute();
    return some(unit); // Must return Some
  });

// Usage
const result = runAction('cleanup');
if (isSome(result)) {
  console.log('Action completed');
}
```

## Unit in Async Context

```typescript
import { unit, okAsync, errAsync } from '@deessejs/core';

const cleanup = async (): Promise<AsyncResult<Unit, Error>> => {
  try {
    await closeConnections();
    await clearCache();
    return okAsync(unit);
  } catch (e) {
    return errAsync(e instanceof Error ? e : new Error(String(e)));
  }
};

await cleanup();
```

## Implementation Details

```typescript
// Unit is a frozen object with no properties
const unit: Unit = Object.create(null, {
  value: {
    value: undefined,
    enumerable: true,
    writable: false,
    configurable: false,
  },
});

// This makes unit unique and comparable
unit === unit; // true
unit === undefined; // false
unit === null; // false
```

## Anti-Patterns

```typescript
// Bad - returning undefined
const log = (msg: string): Result<void, Error> => {
  console.log(msg);
  return undefined; // Wrong type!
};

// Good - return unit
const log = (msg: string): Result<Unit, Error> => {
  console.log(msg);
  return ok(unit);
};

// Bad - using null to signal "no action"
const findUser = (id: string): User | null => { /* ... */ };

// Good - Maybe for absence
const findUser = (id: string): Maybe<User> => fromNullable(user);
```

## See Also

- [Result](./result.md) - Using Result with Unit
- [Maybe](./maybe.md) - Optional values
