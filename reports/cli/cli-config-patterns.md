# CLI Config Access Patterns Research Report

## Overview

This document analyzes how various Node.js CLIs (Next.js, Prisma, tRPC, Payload, and DeesseJS's own CLI) load project configuration. The focus is on common patterns, path resolution strategies, and how config is passed to runtime functions.

---

## 1. Next.js CLI Config Loading Patterns

### File Discovery Order

Next.js CLI uses a `findConfigPath` function that searches for configuration files in priority order:

1. `.${key}rc.json`
2. `${key}.config.json`
3. `.${key}rc.js`
4. `${key}.config.js`
5. `${key}.config.mjs`
6. `${key}.config.cjs`

**Key Principle:** "package.json configuration always wins."

### Path Resolution Strategy

**For Windows ESM compatibility**, absolute paths are converted to `file://` URLs:
```typescript
// On windows, import('C:\\path\\to\\file') is not valid
// Must use file:// URLs
import(pathToFileURL(path).toString())
```

**Relative Path Resolution:**
- The `cwd: dir` parameter in `findUp` establishes relative path resolution from the starting directory
- Both dynamic `import()` and `require()` resolve paths relative to the config file's location

### File Loading Strategy

| File Type | Loading Mechanism |
|-----------|-------------------|
| `.mjs` | Always ESM via dynamic `import()` |
| `.cjs` | Always CommonJS via `require()` |
| `.js` | Conditional loading based on `package.type` |
| JSON/JSON5 | Direct file read with JSON5 parsing for comment support |

### Runtime Config Passing

Next.js passes config through the `withPayload` enhancer:
```typescript
import { withPayload } from '@payloadcms/next'
const nextConfig = {}
export default withPayload(nextConfig)
```

The config is then accessed at runtime through `initReq` which bridges Next.js and Payload:
```typescript
const config = await configPromise
const payload = await getPayload({ config, cron: true, importMap })
```

---

## 2. Prisma CLI Config Loading Patterns

### Config Detection

Prisma uses a **programmatic approach** where config is not loaded from files by the CLI itself, but rather:
1. The CLI expects a `schema.prisma` file at a known location (or path provided via `--schema`)
2. Config values are passed as command-line arguments or environment variables

### Schema Path Resolution

**Default schema location:** `./prisma/schema.prisma`

**Path resolution pattern:**
```typescript
// Schema path can be overridden via CLI flag
// prisma migrate dev --schema ./path/to/schema.prisma

// Runtime uses the schema path to generate client
```

### Runtime Config Access

Prisma Client receives config at **instantiation time**:
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})
```

**Key Pattern:** Prisma uses environment variables (`DATABASE_URL`) as the primary config source, with CLI flags for overrides.

### Path Handling

- Schema paths are resolved relative to `process.cwd()` unless absolute
- Prisma uses `path.resolve()` to normalize paths across platforms
- The generated client embeds the schema path for runtime use

---

## 3. tRPC CLI Config Loading Patterns

### Config Definition Pattern

tRPC uses a **builder pattern** for defining config:
```typescript
import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  // router definitions
});

export type AppRouter = typeof appRouter;
```

### Path Resolution

**Key Pattern:** tRPC does not have a CLI that loads external config files. Instead:
1. Config is defined inline in TypeScript files
2. The router IS the config - all procedures, middlewares, and context are defined together
3. Paths are resolved relative to the router file location

### Runtime Config Passing

tRPC passes config through **context** and **middleware**:
```typescript
const t = initTRPC.context<Context>().create();

export const router = t.router({
  // procedures have access to context
});
```

**Context is created per-request** and contains:
- Database connections
- Authentication info
- Request-specific config

---

## 4. Payload CMS Config Loading Patterns

### Config Types

| Type | Description | Characteristics |
|------|-------------|------------------|
| `Config` (IncomingConfig) | Raw user-provided config | All fields optional, plugins as transformers |
| `SanitizedConfig` | Post-processed, validated config | All fields guaranteed present, blocks flattened |

### Config Flow

```
User's payload.config.ts
         |
         v
buildConfig(config)          [packages/payload/src/config/build.ts]
         |
         | async loop over plugins
         v
sanitizeConfig(incomingConfig)    [packages/payload/src/config/sanitize.ts]
         |
         v
SanitizedConfig
         |
         v
getPayload({ config: SanitizedConfig })   [packages/payload/src/index.ts]
```

### Path Handling

Payload adds path information during sanitization:
```typescript
// Added properties after sanitization:
paths: {
  config: string;        // Absolute path to config file
  configDir: string;     // Directory containing config
  rawConfig: Config;     // Original unprocessed config
}
```

### Plugin System

Plugins receive config and return (potentially modified) config:
```typescript
type Plugin = (config: Config) => Config | Promise<Config>
```

**Important:** Plugins are async-aware and run sequentially.

---

## 5. DeesseJS CLI Config Loading Patterns (Current Implementation)

### Current Structure

The DeesseJS CLI is located at `packages/cli/src/` with these key files:
- `src/index.ts` - Main dispatcher using raw `process.argv` parsing
- `src/commands/db.ts` - Database command dispatcher
- `src/commands/db-generate.ts`, `db-push.ts`, `db-migrate.ts` - Individual DB commands
- `src/utils/schema-loader.ts` - Schema loading utility

### Config Access Pattern

**Schema Path Resolution:**
```typescript
const SCHEMA_PATH = './src/db/schema.ts';

export async function loadSchema(): Promise<SchemaLoaderResult> {
  const schemaPath = path.resolve(process.cwd(), SCHEMA_PATH);
  const require = createRequire(import.meta.url);
  const schemaModule = require(schemaPath);
  // ...
}
```

**Config File Verification:**
```typescript
const DRIZZLE_CONFIG_PATH = './drizzle.config.ts';

const drizzleConfigPath = path.join(cwd, DRIZZLE_CONFIG_PATH);
try {
  await fs.access(drizzleConfigPath);
} catch {
  throw new Error(`db:generate requires ${DRIZZLE_CONFIG_PATH} to exist...`);
}
```

### Path Resolution Strategy

| Pattern | Implementation |
|---------|----------------|
| Working Directory | `process.cwd()` as default, overridable via `--cwd` flag |
| Schema Path | `path.resolve(process.cwd(), './src/db/schema.ts')` |
| Config Path | `path.join(cwd, DRIZZLE_CONFIG_PATH)` |
| Module Loading | `createRequire(import.meta.url)` for ESM compatibility |

### Runtime Config Passing

The CLI delegates to external tools (drizzle-kit) rather than loading config directly:

```typescript
// Delegates to drizzle-kit CLI
execSync('npx drizzle-kit generate', {
  cwd,
  stdio: 'inherit',
});

// Uses dotenv for environment config
dotenv.config();
```

### Command Options Pattern

All commands accept a `cwd` option for working directory override:
```typescript
export interface DbGenerateOptions {
  cwd?: string;
}

export async function dbGenerate(options: DbGenerateOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  // ...
}
```

---

## 6. Common Patterns Summary

### 1. Config File Discovery Patterns

| CLI | Discovery Method |
|-----|------------------|
| Next.js | `findUp` traversing upward, file priority order |
| Prisma | Known file location with CLI override (`--schema`) |
| tRPC | No external config - inline TypeScript definition |
| Payload | User imports config function, `buildConfig()` processes |
| DeesseJS | Known file location with verification (no dynamic loading) |

### 2. Path Resolution Strategies

**Relative vs Absolute Paths:**

| CLI | Strategy |
|-----|----------|
| Next.js | Uses `pathToFileURL()` for ESM on Windows, `cwd` parameter for relative resolution |
| Prisma | `path.resolve()` for normalization, relative to `process.cwd()` |
| tRPC | Paths relative to router file location |
| Payload | Paths added to `SanitizedConfig` during sanitization |
| DeesseJS | `path.resolve(process.cwd(), relativePath)` pattern |

**Working Directory Handling:**

| CLI | Approach |
|-----|----------|
| Next.js | Uses `cwd` parameter in `findUp` |
| Prisma | `process.cwd()` as base, `--schema` overrides |
| tRPC | N/A - inline config |
| Payload | Resolved from config file location |
| DeesseJS | `process.cwd()` default, `--cwd` CLI flag override |

### 3. Config Passing to Runtime

| CLI | Mechanism |
|-----|-----------|
| Next.js | `withPayload()` enhancer wraps Next.js config |
| Prisma | `PrismaClient` instantiated with config object |
| tRPC | Context created per-request, injected into procedures |
| Payload | `getPayload({ config: SanitizedConfig })` |
| DeesseJS | Delegates to drizzle-kit with env vars |

### 4. Key Implementation Details

**ESM Compatibility:**
```typescript
// Windows requires file:// URL conversion for ESM imports
import(pathToFileURL(path).toString())

// Using createRequire for dynamic module loading
const require = createRequire(import.meta.url);
```

**Environment Variable Handling:**
```typescript
// dotenv for local development
dotenv.config();

// Process env access at runtime
const connectionString = process.env.DATABASE_URL;
```

**Error Handling for Missing Config:**
```typescript
// Pattern used in DeesseJS CLI
try {
  await fs.access(configPath);
} catch {
  throw new Error(`Command requires ${CONFIG_FILE} to exist...\nExample: ...`);
}
```

---

## 7. Recommendations for DeesseJS CLI

Based on the research, here are patterns that could improve the DeesseJS CLI config handling:

### 7.1 Config File Discovery

Consider implementing a `findUp`-based discovery for config files:
```typescript
async function findConfigPath(configName: string, cwd: string): Promise<string | null> {
  // Search for config in priority order
  // .deesserc.json, deesse.config.json, .deesserc.ts, deesse.config.ts
}
```

### 7.2 Relative Path Resolution

Always resolve paths relative to the **config file's directory**, not `process.cwd()`:
```typescript
// Current (relative to cwd)
path.resolve(process.cwd(), './src/db/schema.ts')

// Better (relative to config file location)
const configDir = path.dirname(configPath);
path.resolve(configDir, './src/db/schema.ts');
```

### 7.3 Config Passing Pattern

For commands that need runtime config, consider adopting Payload's approach:
```typescript
// Define config builder
export async function buildConfig(config: Config): Promise<SanitizedConfig> {
  // Apply defaults, validate, sanitize
}

// Commands receive pre-processed config
export async function runCommand(options: CommandOptions) {
  const config = await loadConfig(); // or buildConfig
  const payload = await getPayload({ config });
  // use payload
}
```

### 7.4 Path Normalization Utility

Create a shared utility for cross-platform path handling:
```typescript
export function resolveProjectPath(relativePath: string, cwd?: string): string {
  const base = cwd ?? process.cwd();
  return path.resolve(base, relativePath);
}

export function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).toString();
}
```

---

## 8. Sources

- Next.js CLI source: `packages/next/src/lib/find-config.ts`
- Prisma Client runtime: `packages/client/src/runtime/`
- tRPC server: `packages/server/src/`
- Payload CMS config: `packages/payload/src/config/`
- DeesseJS CLI: `packages/cli/src/`
