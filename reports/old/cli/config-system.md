# Configuration System

## Overview

The Better Auth CLI uses a multi-layered configuration system that supports:
- Multiple configuration file formats and locations
- Environment variable overrides
- Command-line option overrides
- Framework-specific conventions
- Interactive prompting for missing values

---

## Configuration File Discovery

### Search Order

The CLI searches for configuration files in a specific order. The first valid config found is used.

#### Server Auth Config (`auth.ts`)

```
1. ./auth.ts
2. ./auth.tsx
3. ./auth.js
4. ./auth.jsx
5. ./auth.server.js
6. ./auth.server.ts
7. ./auth/index.ts
8. ./auth/index.tsx
9. ./auth/index.js
10. ./auth/index.jsx
11. ./auth/index.server.js
12. ./auth/index.server.ts
13. ./lib/server/auth.ts (and variants)
14. ./server/auth.ts (and variants)
15. ./lib/auth.ts (and variants)
16. ./utils/auth.ts (and variants)
17. ./src/auth.ts (and variants)
18. ./app/auth.ts (and variants)
```

#### Client Auth Config (`auth-client.ts`)

```
1. ./auth-client.ts
2. ./auth-client.tsx
3. ./auth-client.js
4. ./auth-client.jsx
5. ./auth-client.server.js
6. ./auth-client.server.ts
7. ./auth-client/index.ts (and variants)
... (same pattern as server config)
```

### Configuration File Formats

#### TypeScript/JS Files (`auth.ts`)

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: { /* ... */ },
  plugins: [/* ... */],
});
```

#### Config Files (`auth.config.ts`)

```typescript
export default {
  database: "drizzle-postgresql",
  plugins: ["twoFactor", "username"],
  emailAndPassword: true,
};
```

#### Package.json Integration

```json
{
  "name": "my-app",
  "betterAuth": {
    "database": "drizzle-sqlite",
    "plugins": ["twoFactor"]
  }
}
```

---

## Configuration Loading Strategy

### Strategy Pattern

The CLI uses a cascading strategy pattern to resolve configuration:

```
┌─────────────────────────────────────────────────────────────┐
│                    getConfig(cwd, options)                    │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
   │envConfigStrat│   │cliOptionStrat│   │fileSystemStrategy│
   │  (highest)   │   │   (middle)   │   │    (lowest)      │
   └──────────────┘   └──────────────┘   └──────────────────┘
```

#### 1. Environment Strategy (`envConfigStrategy`)

Check for `BETTER_AUTH_CONFIG` environment variable:

```bash
# Path to config file
BETTER_AUTH_CONFIG=./auth.config.ts

# Or inline JSON
BETTER_AUTH_CONFIG='{"database":"drizzle-sqlite"}'
```

#### 2. CLI Options Strategy (`cliOptionStrategy`)

Check command-line options passed to the CLI:

```bash
better-auth init --database drizzle-sqlite --plugins twoFactor
```

#### 3. File System Strategy (`fileSystemStrategy`)

Search for configuration files in the project:

```typescript
// Searches in order:
[
  "auth.ts",
  "auth.config.ts",
  "better-auth.config.ts",
  "package.json#betterAuth",
]
```

#### 4. Default Strategy (`defaultStrategy`)

If no configuration found, use sensible defaults and prompt for required values.

---

## Configuration Schema

### Top-Level Configuration

```typescript
interface BetterAuthConfig {
  // Database configuration
  database: DatabaseConfig;

  // Authentication plugins
  plugins?: Plugin[];

  // Social/OAuth providers
  socialProviders?: SocialProvider[];

  // Email/password configuration
  emailAndPassword?: EmailPasswordConfig | boolean;

  // Application base URL
  baseURL?: string;

  // Application name
  appName?: string;

  // Advanced options
  advanced?: AdvancedConfig;
}
```

### Database Configuration

```typescript
type DatabaseConfig =
  // Prisma
  | { provider: "prisma"; schema: string }
  | { provider: "sqlite"; url: string }
  | { provider: "mysql"; url: string }
  | { provider: "postgresql"; url: string }
  // Drizzle
  | { provider: "drizzle"; dialect: DrizzleDialect; schema: string }
  // Kysely
  | { provider: "kysely"; dialect: KyselyDialect }
  // MongoDB
  | { provider: "mongodb"; url: string };
```

### Database Adapter Types

```typescript
type DatabaseAdapter =
  // Prisma
  | "prisma-sqlite"
  | "prisma-mysql"
  | "prisma-postgresql"
  // Drizzle
  | "drizzle-sqlite-better-sqlite3"
  | "drizzle-sqlite-bun"
  | "drizzle-sqlite-node"
  | "drizzle-mysql"
  | "drizzle-postgresql"
  // Kysely
  | "sqlite-better-sqlite3"
  | "sqlite-bun"
  | "sqlite-node"
  | "mysql"
  | "postgresql"
  | "mssql"
  // MongoDB
  | "mongodb";
```

### Plugin Configuration

```typescript
type PluginConfig = {
  name: Plugin;
  enabled: boolean;
  options?: Record<string, unknown>;
};
```

Supported plugins are defined in `temp-plugins.config.ts` with their argument schemas.

---

## Environment Variables

### General

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_CONFIG` | Path to config file or inline config |
| `BETTER_AUTH_PACKAGE_MANAGER` | Override package manager |
| `BETTER_AUTH_BASE_URL` | Default base URL |

### Social Providers

Each OAuth provider requires specific environment variables:

```bash
# Google
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# GitHub
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Discord
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx

# (30+ more providers...)
```

### Database

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/db
# or
DATABASE_URL=mysql://user:pass@localhost:3306/db
# or
DATABASE_URL=sqlite:./database.sqlite
```

---

## Validation System

### Zod Schema Validation

Plugin arguments are validated using Zod schemas:

```typescript
type GetArgumentsOptions = {
  flag: string;
  description: string;
  question?: string;
  defaultValue?: any;
  isRequired?: boolean;
  skip?: "always" | "prompt" | "flag";
  argument: {
    index: number;
    isProperty: false | string;
    schema?: ZodSchema;
  };
};
```

### Validation Flow

```
┌─────────────────────────────────────────┐
│           User Input                    │
│  (CLI flag, prompt, or default)          │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│        cliTransform (if provided)       │
│   (e.g., comma-separated to array)       │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Zod Schema Parse                │
│    (safeParse with error handling)       │
└─────────────────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
   ┌────────┐            ┌─────────┐
   │ Success│            │  Error  │
   │ Return │            │  Throw  │
   │  Data  │            │  Error  │
   └────────┘            └─────────┘
```

### Error Handling

```typescript
// Invalid argument
if (!schema.success) {
  throw new Error(
    `Invalid argument for ${functionName} on flag "${flag}": ${schema.error.message}`
  );
}

// Nested object validation
if (argument.isNestedObject && argument.argument.schema) {
  const schema = argument.argument.schema.safeParse(value);
  if (!schema.success) {
    throw new Error(`Invalid nested object: ${schema.error.message}`);
  }
}
```

---

## Framework-Specific Configuration

### Next.js

```typescript
// next.config.js/ts
const nextConfig = {
  // Standard Next.js config
};

// Generated route handler: app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth.handler);
```

### SvelteKit

```typescript
// Generated: hooks.server.ts
import { auth } from "$lib/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";

export async function handle({ event, resolve, building }) {
  return svelteKitHandler({ event, resolve, auth, building });
}
```

### Nuxt

```typescript
// Generated: server/api/auth/[...all].ts
import { auth } from "~/lib/auth";

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
```

---

## Configuration Resolution Process

### Full Resolution Flow

```
1. CLI Invocation
   │
   ├─► Parse command-line arguments
   │
   ├─► Load .env files (if present)
   │
   ├─► Detect project framework
   │   └─► Strategy: package.json → config files
   │
   ├─► Detect package manager
   │   └─► Strategy: env → package.json → lock files → CLI check
   │
   ├─► Load configuration
   │   └─► Strategy: env → CLI flags → file system
   │
   ├─► Validate configuration
   │   └─► Zod schema validation for plugins
   │
   ├─► Prompt for missing values (if interactive)
   │
   └─► Generate configuration files
```

---

## Configuration Templates

### Minimal Configuration

```typescript
// auth.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    provider: "sqlite",
    url: "sqlite://database.sqlite",
  },
});
```

### Full-Featured Configuration

```typescript
// auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  appName: "My Application",
  baseURL: "https://example.com",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    twoFactor({
      issuer: "My App",
      totp: { digits: 6, period: 30 },
    }),
  ],
});
```

---

## Advanced Configuration

### Database URL Override

```typescript
// In auth.ts
const databaseUrl = process.env.DATABASE_URL ||
  (process.env.NODE_ENV === "test" ? "sqlite://:memory:" : null);
```

### Multiple Environments

```typescript
// auth.development.ts
// auth.production.ts
// auth.test.ts
```

### Monorepo Configuration

```json
{
  "workspaces": ["packages/*"],
  "betterAuth": {
    "database": "drizzle-postgresql",
    "plugins": ["admin", "apiKey"]
  }
}
```

---

## Configuration Utilities

### `getConfig(cwd, options)`

Main configuration loading function.

```typescript
async function getConfig(
  cwd?: string,
  options?: {
    packageManager?: boolean;
    throwNotFound?: boolean;
  }
): Promise<{
  config: BetterAuthConfig | null;
  packageManager?: PackageManager;
}>
```

### `resolveConfig(config, options)`

Resolve and merge configuration with defaults.

```typescript
function resolveConfig(
  config: GenericConfig,
  options?: { schema?: ZodSchema }
): BetterAuthConfig
```

### `validateConfig(config)`

Validate configuration against schema.

```typescript
function validateConfig(config: unknown): ValidationResult
```

---

## Environment File Handling

### `.env` File Format

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/mydb

# OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Auth
BETTER_AUTH_SECRET=xxx
```

### Env File Operations

```typescript
// Get all env files in directory
const envFiles = await getEnvFiles(cwd);

// Parse existing variables
const existingVars = await parseEnvFiles(envFiles);

// Add new variables
await updateEnvFiles(envFiles, ["NEW_VAR=value"]);

// Create new .env
await createEnvFile(cwd, ["VAR1=value1", "VAR2=value2"]);

// Check for missing
const missing = await getMissingEnvVars(existingVars, [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET"
]);
```

---

## Configuration Best Practices

1. **Use environment variables for secrets** - Never hardcode secrets in config files
2. **Use `.env.example`** - Document required environment variables
3. **Validate early** - Fail fast on invalid configuration
4. **Provide defaults** - Sensible defaults reduce user burden
5. **Support multiple formats** - TypeScript, JSON, package.json
6. **Document configuration** - Clear documentation reduces errors

---

## Debugging Configuration Issues

### Enable Debug Output

```bash
DEBUG=better-auth:config better-auth init
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Config not found | Check file path and CWD |
| Invalid schema | Validate with Zod schemas |
| Missing env vars | Check .env file and .env.example |
| Wrong format | Convert to supported format |

---

## Future Enhancements

### Planned Features

1. **Schema validation** - JSON Schema for config files
2. **Configuration inheritance** - Base + environment configs
3. **Remote configuration** - Load from remote URL
4. **Configuration migration** - Auto-migrate old formats
5. **Visual editor** - GUI for configuration
