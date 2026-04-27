# Integration Patterns: Wrapping drizzle-kit as a CLI

## Overview

This document describes patterns for building the `@deessejs/cli` wrapper that integrates Drizzle for database management. It is intended for **developers working on the CLI itself**, not for end users who consume the CLI.

**Audience:** Developers building or maintaining `@deessejs/cli`
**Purpose:** Understand how to wrap drizzle-kit functionality into a custom CLI tool

End users interact with the CLI via `npx @deessejs/cli db:generate`, `npx @deessejs/cli db:migrate`, and `npx @deessejs/cli db:push`. This document covers the implementation patterns for creating that wrapper.

## Command Wrapper Pattern

The core pattern for a CLI wrapper is to use `execSync` to delegate commands to `drizzle-kit`. This is the correct approach because `@deessejs/cli` is a thin wrapper around drizzle-kit.

```typescript
// src/commands/db/index.ts
import { execSync } from 'child_process';

export const dbCommands = {
  generate: (options?: string[]) => {
    const args = ['drizzle-kit', 'generate', ...(options || [])];
    execSync(args.join(' '), { stdio: 'inherit' });
  },

  migrate: (options?: string[]) => {
    const args = ['drizzle-kit', 'migrate', ...(options || [])];
    execSync(args.join(' '), { stdio: 'inherit' });
  },

  push: (options?: string[]) => {
    const args = ['drizzle-kit', 'push', ...(options || [])];
    execSync(args.join(' '), { stdio: 'inherit' });
  },
};
```

## Directory Structure

```
src/
  commands/
    db/
      index.ts        # Command exports using execSync wrapper
      generate.ts     # generate command wrapper
      migrate.ts      # migrate command wrapper
      push.ts         # push command wrapper
```

## Key Points

1. **Use execSync for delegation** - The CLI wrapper delegates to `drizzle-kit` binary for all operations
2. **Pass through options** - Forward CLI options directly to drizzle-kit
3. **Use stdio: 'inherit'** - This ensures output is shown in real-time to the user
4. **Handle errors** - Let drizzle-kit errors propagate naturally through execSync
