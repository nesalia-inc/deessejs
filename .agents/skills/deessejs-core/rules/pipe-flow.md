# Pipe & Flow

Function composition utilities.

## Overview

Pipe and flow enable function composition, allowing you to chain transformations cleanly.

## Pipe

Pipe passes a value through a series of functions:

```typescript
import { pipe } from '@deessejs/core';

const result = pipe(
  21,
  x => x * 2,      // 42
  x => x + 1,       // 43
  x => String(x)     // "43"
);
```

### With Result

```typescript
import { pipe, ok, map, flatMap } from '@deessejs/core';

const result = pipe(
  ok(21),
  (r) => map(r, x => x * 2),   // Ok(42)
  (r) => map(r, x => x + 1),   // Ok(43)
  (r) => map(r, String)         // Ok("43")
);
```

### Error Handling with Pipe

```typescript
import { pipe, ok, err, map, flatMap } from '@deessejs/core';

const process = (n: number) =>
  pipe(
    ok(n),
    (r) => map(r, x => x * 2),
    (r) => flatMap(r, x => x > 100 ? err(new Error('Too big')) : ok(x))
  );

process(21); // Ok(42)
process(60); // Err(Error: 'Too big')
```

## Flow

Flow creates a composed function without invoking it:

```typescript
import { flow } from '@deessejs/core';

const addOne = flow(
  (x: number) => x * 2,
  (x: number) => x + 1,
  (x: number) => String(x)
);

addOne(21); // "43"
```

### Type Safety with Flow

```typescript
import { flow } from '@deessejs/core';

const transform = flow(
  (s: string) => s.trim(),
  (s: string) => s.toLowerCase(),
  (s: string) => s.split('')
);

transform('  Hello World  '); // ['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd']
```

## Async Variants

### pipeAsync

```typescript
import { pipeAsync, okAsync, map } from '@deessejs/core';

const result = await pipeAsync(
  okAsync(21),
  async (r) => map(r, async x => x * 2),
  async (r) => map(r, async x => x + 1)
);
```

### flowAsync

```typescript
import { flowAsync } from '@deessejs/core';

const asyncTransform = flowAsync(
  async (x: number) => x * 2,
  async (x: number) => x + 1,
  async (x: number) => String(x)
);

await asyncTransform(21); // "43"
```

## Tap

Tap allows side effects without changing the value:

### tap

```typescript
import { ok, tap, pipe } from '@deessejs/core';

const logged = pipe(
  ok(42),
  (r) => tap(r, x => console.log('Value:', x)), // Logs "Value: 42"
  (r) => map(r, x => x * 2)                     // Ok(84)
);
```

### tapAsync

```typescript
import { okAsync, tapAsync, pipeAsync } from '@deessejs/core';

const result = await pipeAsync(
  okAsync(42),
  async (r) => tapAsync(r, async x => console.log('Async:', x))
);
```

### tapSafe

For logging without breaking the chain:

```typescript
import { ok, err, tapSafe } from '@deessejs/core';

// tapSafe catches errors and continues
const result = tapSafe(
  ok(42),
  x => { throw new Error('Logging failed'); return x; }
); // Still Ok(42), error is caught and logged
```

## Chaining with Pipe

### Complex Example

```typescript
import { pipe, ok, map, flatMap, getOrElse } from '@deessejs/core';

const processUser = (data: { name: string; age: string }) =>
  pipe(
    ok(data),
    (r) => flatMap(r, d => {
      const age = parseInt(d.age, 10);
      return isNaN(age)
        ? err(new Error('Invalid age'))
        : ok({ ...d, age });
    }),
    (r) => map(r, d => ({ ...d, name: d.name.trim() })),
    (r) => map(r, d => ({ ...d, name: d.name.toLowerCase() }))
  );

processUser({ name: ' Alice ', age: '30' }); // Ok({ name: 'alice', age: 30 })
processUser({ name: ' Bob ', age: 'invalid' }); // Err(Error: 'Invalid age')
```

## Composition Patterns

### Parallel Processing

```typescript
import { pipe, all } from '@deessejs/core';

// Process multiple values through same pipeline
const pipeline = flow(
  (x: number) => x * 2,
  (x: number) => x + 1
);

const [a, b, c] = await all(
  okAsync(pipeline(1)),
  okAsync(pipeline(2)),
  okAsync(pipeline(3))
);
```

### Conditional Pipelines

```typescript
import { pipe, ok, map, flatMap } from '@deessejs/core';

const process = (n: number, shouldDouble: boolean) =>
  pipe(
    ok(n),
    (r) => shouldDouble ? map(r, x => x * 2) : r,
    (r) => map(r, x => x + 1)
  );

process(21, true);  // Ok(43)
process(21, false); // Ok(22)
```

## Comparison

| Function | Purpose | Returns |
|----------|---------|---------|
| `pipe(v, f, g, h)` | Apply functions left-to-right | `h(g(f(v)))` |
| `flow(f, g, h)` | Create composed function | `(x) => h(g(f(x)))` |
| `pipeAsync(v, f, g)` | Async version of pipe | Promise |
| `flowAsync(f, g)` | Create async function | Async function |
| `tap(v, fn)` | Side effect, pass through | `v` unchanged |
| `tapAsync(v, fn)` | Async side effect | `v` unchanged |

## Anti-Patterns

```typescript
// Bad - mutation in pipe
pipe(
  21,
  x => { x.value = 42; return x; } // Mutation!
);

// Good - immutable transformations
pipe(
  21,
  x => ({ value: x }), // New object
  obj => ({ ...obj, doubled: obj.value * 2 })
);

// Bad - breaking the chain
pipe(
  ok(21),
  r => {
    if (isErr(r)) return r;
    return err(new Error('break')); // Breaks composition
  }
);

// Good - use flatMap for branching
pipe(
  ok(21),
  r => flatMap(r, x => x > 10 ? ok(x) : err(new Error('Too small')))
);
```

## See Also

- [Result](./result.md) - Using Result with pipe
- [AsyncResult](./async-result.md) - Async composition
