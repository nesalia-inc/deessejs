# Yield Control

Yield control to the event loop for responsive async operations.

## Overview

`yield` and `yieldControl` allow async functions to yield control back to the event loop, preventing blocking and improving responsiveness.

## When to Use Yield

Use yield when:
- Long-running async operations might block the event loop
- You need to allow other pending operations to run
- Building cooperative multitasking patterns
- Preventing UI freezes in browser environments

## Basic Usage

```typescript
import { yieldControl, yield as yieldFn } from '@deessejs/core';

// yieldControl() pauses the current async operation
async function longOperation() {
  for (let i = 0; i < 10000; i++) {
    // Do work
    if (i % 100 === 0) {
      await yieldControl(); // Yield to allow other operations
    }
  }
}

// yield is an alias for yieldControl
async function anotherLongOperation() {
  await yieldFn(); // Same as yieldControl()
}
```

## Immediate Yield

For yielding at the next tick without delay:

```typescript
import { immediate } from '@deessejs/core';

// immediate() schedules work for the next microtask
async function scheduleWork() {
  await immediate();
  console.log('Runs after current stack clears');
}
```

## Pattern: Cooperative Multitasking

```typescript
import { yieldControl } from '@deessejs/core';

async function processBatch(items: string[], batchSize: number = 100) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    results.push(await processItem(items[i]));

    // Yield every batch
    if (i > 0 && i % batchSize === 0) {
      await yieldControl();
    }
  }

  return results;
}
```

## Pattern: Responsive Loops

```typescript
import { yieldControl } from '@deessejs/core';

async function processLargeArray<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (const item of items) {
    results.push(await processor(item));
    await yieldControl(); // Keep UI responsive
  }

  return results;
}

// In a React component or UI:
await processLargeArray(bigDataset, processItem);
updateUI(results); // UI stays responsive
```

## With AsyncResult

```typescript
import { yieldControl, fromPromise, map } from '@deessejs/core';

const processWithYield = async <T, E>(promise: Promise<T>) =>
  fromPromise(promise)
    .map(await yieldControl(), x => x); // Yield after resolution

// Or chain after yield
await yieldControl();
const result = await fetchData();
```

## Platform Detection

```typescript
import { yieldControl } from '@deessejs/core';

// Browser/Node.js compatible
await yieldControl();

// Microtask version
import { immediate } from '@deessejs/core';
await immediate(); // setImmediate / process.nextTick equivalent
```

## Comparison

| Function | Behavior | Use Case |
|----------|----------|----------|
| `yieldControl()` | Yields to event loop | Long-running loops |
| `immediate()` | Next microtask | Scheduling work |
| `setTimeout(fn, 0)` | Next macrotask | Non-urgent deferral |
| `await Promise.resolve()` | Next tick | Same as immediate |

## Common Mistakes

```typescript
// Bad - forgetting to await
async function process() {
  for (const item of items) {
    processItem(item);
    // Missing await - doesn't actually yield
  }
}

// Good - await the yield
async function process() {
  for (const item of items) {
    await processItem(item);
    await yieldControl(); // Actually yields
  }
}

// Bad - yielding inside sync loops
function process() { // Not async!
  for (const item of items) {
    yieldControl(); // Won't work - must be async
  }
}

// Good - async wrapper
async function process() {
  for (const item of items) {
    await processItem(item);
    await yieldControl();
  }
}
```

## Real-World Example

```typescript
import { yieldControl, fromPromise } from '@deessejs/core';

async function crawl(urls: string[], concurrency = 5): Promise<CrawlResult[]> {
  const queue = [...urls];
  const running: Promise<void>[] = [];
  const results: CrawlResult[] = [];

  while (queue.length > 0 || running.length > 0) {
    // Start new crawls up to concurrency limit
    while (running.length < concurrency && queue.length > 0) {
      const url = queue.shift()!;
      const crawlPromise = fromPromise(fetch(url))
        .map(response => ({ url, data: response }))
        .catch(error => ({ url, error }));

      running.push(
        crawlPromise.then(async result => {
          results.push(await result);
          await yieldControl(); // Yield after each completion
        })
      );
    }

    // Wait for at least one to complete
    if (running.length > 0) {
      await Promise.race(running);
      await yieldControl();
    }
  }

  return results;
}
```

## With Sleep for Rate Limiting

```typescript
import { yieldControl, sleep } from '@deessejs/core';

async function rateLimitedFetch(urls: string[], delayMs: number = 100) {
  const results = [];

  for (const url of urls) {
    results.push(await fetch(url).then(r => r.json()));
    await sleep(delayMs); // Respect rate limits
    await yieldControl(); // Stay responsive
  }

  return results;
}
```

## Browser Compatibility

```typescript
import { yieldControl } from '@deessejs/core';

// Works in:
// - Node.js (all versions)
// - Modern browsers (Chrome 71+, Firefox 65+, Safari 12.1+)
// - Deno
// - Bun

await yieldControl();
```

## See Also

- [AsyncResult](./async-result.md) - Async operations
- [Sleep & Retry](./sleep-retry.md) - Timing utilities
