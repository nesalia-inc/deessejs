# Sleep & Retry

Resilience patterns for handling delays and transient failures.

## Sleep

### Basic Sleep

```typescript
import { sleep } from '@deessejs/core';

await sleep(1000); // Sleep for 1 second
```

### Sleep with Jitter

Jitter prevents thundering herd problems:

```typescript
import { sleep } from '@deessejs/core';

// Add randomness to prevent synchronized retries
await sleep(1000, { jitter: true }); // 500-1500ms
await sleep(1000, { jitter: 0.2 }); // 800-1200ms (20% variance)
```

## Timeout

### Basic Timeout

```typescript
import { withTimeout } from '@deessejs/core';

const result = await withTimeout(
  fetch('/api/data'),
  5000 // 5 second timeout
);
```

### Timeout with Signal Injection

For fine-grained abort control:

```typescript
import { withTimeout } from '@deessejs/core';

const controller = new AbortController();

const { promise, cleanup } = withTimeout(
  (signal) => fetch('/api/data', { signal }),
  5000,
  { abortController: controller }
);

try {
  const result = await promise;
} finally {
  cleanup(); // Always cleanup
}

// To cancel:
controller.abort();
```

### Timeout Options

```typescript
import { withTimeout } from '@deessejs/core';

const result = await withTimeout(
  fetch('/api/data'),
  5000,
  {
    message: 'Request timed out',     // Custom message
    name: 'TIMEOUT',                   // Error name
    includeElapsed: true                 // Include elapsed time in error
  }
);
```

## Retry

### Basic Retry

```typescript
import { retryAsync } from '@deessejs/core';

const result = await retryAsync(
  () => fetch('/api/data').then(r => r.json()),
  { attempts: 3 }
);
```

### Retry with Backoff

```typescript
import { retryAsync, exponentialBackoff, linearBackoff, constantBackoff } from '@deessejs/core';

// Exponential backoff (default): 1s, 2s, 4s
await retryAsync(fn, { backoff: 'exponential', delay: 1000 });

// Linear: 1s, 2s, 3s
await retryAsync(fn, { backoff: 'linear', delay: 1000 });

// Constant: 1s, 1s, 1s
await retryAsync(fn, { backoff: 'constant', delay: 1000 });

// Custom function
await retryAsync(fn, {
  backoff: (attempt, delay) => delay * attempt * 2
});
```

### Retry with Max Delay

```typescript
await retryAsync(fn, {
  attempts: 5,
  delay: 1000,
  maxDelay: 5000 // Caps delay at 5 seconds
});
```

### Retry with Predicate

Retry only on specific errors:

```typescript
import { retryAsync } from '@deessejs/core';

const isTransientError = (e: Error) =>
  e.message.includes('ECONNRESET') ||
  e.message.includes('ETIMEDOUT');

await retryAsync(
  () => fetch('/api/data').then(r => r.json()),
  {
    attempts: 3,
    predicate: isTransientError
  }
);
```

### Retry with Callback

Track retry attempts:

```typescript
import { retryAsync } from '@deessejs/core';

await retryAsync(
  () => fetch('/api/data').then(r => r.json()),
  {
    attempts: 3,
    onRetry: (error, attempt) => {
      console.log(`Attempt ${attempt} failed: ${error.message}`);
    }
  }
);
```

### Retry with Jitter

Combine with jitter for distributed systems:

```typescript
await retryAsync(fn, {
  delay: 1000,
  jitter: true // Prevents thundering herd
});
```

### Retry with AbortSignal

Cancel retries mid-attempt:

```typescript
import { retryAsync } from '@deessejs/core';

const controller = new AbortController();

await retryAsync(
  () => fetch('/api/data', { signal: controller.signal }).then(r => r.json()),
  {
    attempts: 5,
    signal: controller.signal
  }
);

// Cancel:
controller.abort();
```

## Sync Retry

For CPU-bound operations that might throw:

```typescript
import { retry } from '@deessejs/core';

// WARNING: Blocks the event loop if delay > 0
const result = retry(
  () => riskyOperation(),
  {
    attempts: 3,
    delay: 0 // Use 0 for sync operations
  }
);
```

## Sleep with Signal

Abort sleep mid-wait:

```typescript
import { sleepWithSignal } from '@deessejs/core';

const controller = new AbortController();

try {
  await sleepWithSignal(5000, { signal: controller.signal });
} catch (e) {
  if (e.name === 'ABORTED') {
    console.log('Sleep was aborted');
  }
}

// Cancel:
controller.abort();
```

## Backoff Strategies

```typescript
import { exponentialBackoff, linearBackoff, constantBackoff } from '@deessejs/core';

// Exponential: delay * 2^(attempt-1)
exponentialBackoff(1, 1000); // 1000
exponentialBackoff(2, 1000); // 2000
exponentialBackoff(3, 1000); // 4000

// Linear: delay * attempt
linearBackoff(1, 1000); // 1000
linearBackoff(2, 1000); // 2000
linearBackoff(3, 1000); // 3000

// Constant: always delay
constantBackoff(1, 1000); // 1000
constantBackoff(2, 1000); // 1000
constantBackoff(3, 1000); // 1000
```

## Complete Example

```typescript
import { retryAsync, sleep, withTimeout } from '@deessejs/core';

const fetchWithRetry = async (url: string, options = {}) => {
  const {
    attempts = 3,
    delay = 1000,
    timeout = 5000
  } = options;

  return withTimeout(
    retryAsync(
      () => fetch(url).then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      {
        attempts,
        delay,
        backoff: 'exponential',
        maxDelay: 10000,
        jitter: true
      }
    ),
    timeout
  );
};

try {
  const data = await fetchWithRetry('/api/users/1', { attempts: 5 });
} catch (e) {
  if (e.name === 'TIMEOUT') {
    console.error('Request timed out after retries');
  } else {
    console.error('Request failed:', e.message);
  }
}
```

## Anti-Patterns

```typescript
// Bad - retry without exponential backoff in distributed systems
await retry(fn, { attempts: 10, delay: 100 }); // Thundering herd!

// Good - exponential backoff with jitter
await retryAsync(fn, {
  attempts: 10,
  delay: 1000,
  backoff: 'exponential',
  jitter: true
});

// Bad - retry on all errors
await retryAsync(fn, { predicate: () => true }); // Retry even on 404!

// Good - retry only on transient errors
await retryAsync(fn, {
  predicate: (e) => e.message.includes('ECONNREFUSED')
});
```

## See Also

- [AsyncResult](./async-result.md) - For async operations with error handling
