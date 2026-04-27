# CLI Package Initialization - Implementation Plan

## Overview

Initialize `@deessejs/cli` as a working CLI package that can be invoked via `npx @deessejs/cli --help`. The CLI will use `@drizzle-team/brocli` as its command framework (same as drizzle-kit) and will eventually wrap drizzle-kit commands. For this initialization step, only a placeholder `db` namespace command will be created that logs a "coming soon" message.

## Current State Analysis

The CLI package at `packages/cli/` has the following existing configuration:

- **`package.json`**: Defines the package as `@deessejs/cli` v0.6.44 with bin field (`deesse: ./bin/deesse.js`), exports, scripts, and some dependencies already listed. However, **`@drizzle-team/brocli` is NOT listed as a dependency** and must be added.

- **`tsconfig.json`**: Extends the monorepo tsconfig with ESNext module, Bundler resolution, output to `./dist`, and path alias `@/*` mapping to `./*`.

- **`src/` directory**: Exists but is empty (all source files deleted per git status).

- **`bin/` directory**: Does not exist yet. The `bin/deesse.js` wrapper must be created.

## Files to Create/Modify

### packages/cli/package.json

**Status**: Modify (add missing brocli dependency)

**Changes needed**:
1. Add `@drizzle-team/brocli` to `dependencies` (version `^0.30.0` to match drizzle-kit)
2. Ensure `files` array includes `bin` and `dist`

**Final content should be**:

```json
{
  "name": "@deessejs/cli",
  "version": "0.6.44",
  "description": "DeesseJS CLI for managing DeesseJS projects",
  "type": "module",
  "bin": {
    "deesse": "./bin/deesse.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "bin",
    "dist"
  ],
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "clean": "rm -rf dist"
  },
  "keywords": [
    "cli",
    "deessejs",
    "deesse"
  ],
  "author": "DeesseJS",
  "license": "MIT",
  "dependencies": {
    "@drizzle-team/brocli": "^0.30.0",
    "deesse": "^0.2.11"
  },
  "devDependencies": {
    "@types/node": "^22.10.6",
    "typescript": "^5.7.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### packages/cli/tsconfig.json

**Status**: Already correct, no changes needed

**Current content** (verified):
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Note: The monorepo root `tsconfig.json` already has `strict: true` and other strict settings, so this tsconfig inherits them through the `extends` chain.

### packages/cli/bin/deesse.js

**Status**: Create new file

This is the CLI entry point that Node.js invokes. It must be a standalone JavaScript file (not TypeScript) that can be executed directly.

**Content**:

```javascript
#!/usr/bin/env node

import '../dist/index.js';
```

Note: The shebang `#!/usr/bin/env node` allows the file to be executed directly on Unix systems. On Windows, Node.js handles execution via the file association established through npm.

### packages/cli/src/index.ts

**Status**: Create new file

This is the main CLI logic entry point. It uses brocli's `run()` function to register commands.

**Content**:

```typescript
#!/usr/bin/env node

import { run, command } from '@drizzle-team/brocli';
import { dbCommand } from './commands/db/index.js';

const version = '0.6.44';

const help = command({
  name: 'help',
  options: {},
  handler: async () => {
    console.log(`
@deessejs/cli v${version}

Usage: deesse <command>

Available commands:
  db          Database commands (generate, migrate, push)

Run 'deesse <command> --help' for more information on a command.
    `.trim());
  },
});

run([dbCommand, help], {
  name: 'deesse',
  version,
});
```

### packages/cli/src/commands/db/index.ts

**Status**: Create new file

A placeholder stub for the `db` namespace. This file only exports a single placeholder command that logs "coming soon". No actual db commands (generate, migrate, push) are implemented in this step.

**Content**:

```typescript
import { command } from '@drizzle-team/brocli';

export const dbCommand = command({
  name: 'db',
  options: {},
  handler: async () => {
    console.log('db namespace - coming soon');
  },
});
```

### packages/cli/src/utils/config.ts

**Status**: Create new file

A stub for the future config loader that will load `drizzle.config.ts`.

**Content**:

```typescript
/**
 * Stub for loading project configuration (e.g., drizzle.config.ts).
 *
 * Currently not implemented. Will be implemented when db commands
 * (generate, migrate, push) are added.
 */
export async function loadConfig(): Promise<unknown> {
  throw new Error('Config loader not implemented yet');
}
```

## Dependencies

The following dependency must be installed:

```bash
pnpm add @drizzle-team/brocli@^0.30.0 --filter @deessejs/cli
```

This version is aligned with `drizzle-kit@^0.30.0` which is already in the project dependencies.

## Build Verification

After implementation, verify the CLI works by following these steps:

### Step 1: Build the package

```bash
cd packages/cli
pnpm build
```

Expected output: Compiled JavaScript files in `packages/cli/dist/`:
- `dist/index.js`
- `dist/commands/db/index.js`
- `dist/utils/config.js`

### Step 2: Run the CLI via npx

```bash
pnpm exec deesse --help
```

Or directly:

```bash
node packages/cli/bin/deesse.js --help
```

Expected output:
```
@deessejs/cli v0.6.44

Usage: deesse <command>

Available commands:
  db          Database commands (generate, migrate, push)

Run 'deesse <command> --help' for more information on a command.
```

### Step 3: Test the db placeholder

```bash
pnpm exec deesse db
```

Expected output:
```
db namespace - coming soon
```

## Implementation Order

1. **Create `packages/cli/bin/deesse.js`** - The bin wrapper
2. **Create `packages/cli/src/index.ts`** - Main CLI entry with brocli setup
3. **Create `packages/cli/src/commands/db/index.ts`** - Stub db command
4. **Create `packages/cli/src/utils/config.ts`** - Stub config loader
5. **Modify `packages/cli/package.json`** - Add `@drizzle-team/brocli` dependency
6. **Run `pnpm install`** - Install dependencies
7. **Run `pnpm build`** - Build the package
8. **Verify with `pnpm exec deesse --help`**

## Not in Scope (for this step)

The following are explicitly NOT included in this initialization plan:

- **db:generate command** - Will be added later
- **db:migrate command** - Will be added later
- **db:push command** - Will be added later
- **Config file loading** - The `loadConfig()` stub throws "not implemented yet"
- **Schema loading** - Not implemented
- **Database connection handling** - Not implemented
- **Interactive prompts** - Not implemented

These will be implemented in subsequent steps after the CLI framework is working.

---

### Critical Files for Implementation

- **packages/cli/package.json** - Package definition, need to add `@drizzle-team/brocli` dependency
- **packages/cli/src/index.ts** - Main CLI entry point using brocli `run()` function
- **packages/cli/bin/deesse.js** - Bin wrapper that Node.js invokes, must be created
- **packages/cli/src/commands/db/index.ts** - Stub db namespace command (placeholder only)
- **reports/deesse/cli/drizzle-integration/drizzle-cli-architecture.md** - Reference documentation for brocli patterns used by drizzle-kit