# Better-Auth CLI Analysis Report

## Overview

Yes, **better-auth has a CLI**. The CLI is published as the `auth` package (npm: `auth`) and provides a comprehensive set of commands for managing Better Auth projects. It is located in `temp/better-auth/packages/cli/`.

---

## 1. Does Better-Auth Have a CLI?

**Yes.** The CLI is a full-featured command-line tool with multiple subcommands.

### Entry Point

- **File:** `temp/better-auth/packages/cli/src/index.ts`
- **Binary names:** `better-auth` and `auth` (symlinked)
- **Package name:** `auth`
- **Current version:** `1.5.7-beta.1` (CLI version: `1.1.2`)

### Available Commands

| Command | Description |
|---------|-------------|
| `init` | Interactive setup for Better Auth in a project |
| `generate` | Generate database schema from auth configuration |
| `migrate` | Run database migrations (Kysely adapter only) |
| `info` | Display system and Better Auth configuration information |
| `login` | Login to Better Auth Infrastructure |
| `logout` | Logout from Better Auth Infrastructure |
| `secret` | Generate a secret key |
| `mcp` | Add Better Auth MCP server to MCP clients |
| `ai` | Interactive setup for Agent Auth |
| `upgrade` | Upgrade Better Auth |

### Dependencies

Key dependencies for CLI functionality:
- `commander` - CLI argument parsing
- `@clack/prompts` - Interactive prompts UI
- `c12` - Configuration loading with dotenv support
- `jiti` - TypeScript/JS runtime transpilation
- `@babel/core`, `@babel/preset-react`, `@babel/preset-typescript` - Code transpilation for config loading
- `better-auth` and `@better-auth/core` - Core library integration

---

## 2. How Does It Handle Configuration?

### Configuration File Discovery

The CLI uses `get-config.ts` (`temp/better-auth/packages/cli/src/utils/get-config.ts`) to locate the auth configuration. It searches for config files in a prioritized order:

**Possible auth config paths (in order of priority):**
```
auth.ts, auth.tsx, auth.js, auth.jsx, auth.server.js, auth.server.ts,
auth/index.ts, auth/index.tsx, auth/index.js, auth/index.jsx, auth/index.server.js, auth/index.server.ts,
lib/server/auth.ts, server/auth/auth.ts, server/auth.ts, auth/auth.ts, lib/auth.ts, utils/auth.ts,
src/auth.ts, src/lib/auth.ts, server/src/auth.ts, auth/src/auth.ts, lib/src/auth.ts, utils/src/auth.ts,
app/auth.ts, app/lib/auth.ts
```

The search also checks variations with `src/` and `app/` prefixes.

### Configuration Loading

The CLI uses `c12` with `jiti` for configuration loading:

```typescript
// From get-config.ts
const { config } = await loadConfig({
  configFile: resolvedPath,
  dotenv: {
    fileName: [".env", ".env.local"],
  },
  jitiOptions: jitiOptions(cwd),
  cwd,
});
```

**Key aspects:**
1. Uses `jiti` to transpile TypeScript/JSX on-the-fly
2. Supports Babel presets for React/TypeScript
3. Resolves path aliases from `tsconfig.json` (including project references)
4. Handles special modules for Cloudflare and SvelteKit environments
5. Loads `.env` and `.env.local` automatically

### Config Schema Support

The CLI supports two export patterns:
1. **Default export:** `export default betterAuth({ ... })`
2. **Named export:** `export const auth = betterAuth({ ... })`

The loader checks for `config.auth?.options` or `config.options` to extract the configuration.

### Configuration Generation (Init Command)

The `init` command (`temp/better-auth/packages/cli/src/commands/init/index.ts`) generates configuration through an interactive wizard:

1. **Environment Variables:** Prompts for `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`, with auto-generation option for the secret
2. **Database Selection:** Supports multiple ORMs and adapters:
   - Drizzle (SQLite, PostgreSQL, MySQL)
   - Prisma (SQLite, PostgreSQL, MySQL, MongoDB)
   - Kysely (SQLite, PostgreSQL, MySQL, MSSQL)
   - Direct adapters (LibSQL, etc.)
3. **Email & Password:** Option to enable email/password authentication
4. **Social Providers:** Multi-select for OAuth providers (Google, GitHub, Facebook, etc.)
5. **Framework Detection:** Auto-detects Next.js, Nuxt, SvelteKit, Hono, Express, Fastify, etc.
6. **Route Handler Generation:** Creates the API route handler based on detected framework

### Sensitive Data Handling (Info Command)

The `info` command (`temp/better-auth/packages/cli/src/commands/info.ts`) sanitizes sensitive values before displaying:

**Redacted keys include:**
- `secret`, `clientSecret`, `clientId`, `authToken`, `apiKey`, `apiSecret`
- `privateKey`, `publicKey`, `password`, `token`, `webhook`
- `connectionString`, `databaseUrl`, `databaseURL`, `DATABASE_URL`
- `TURSO_AUTH_TOKEN`, `TURSO_DATABASE_URL`, `MYSQL_DATABASE_URL`, `POSTGRES_URL`, `MONGODB_URI`
- `stripeKey`, `stripeWebhookSecret`

**Allowed keys (not redacted):**
- `baseURL`, `callbackURL`, `redirectURL`, `trustedOrigins`, `appName`

---

## 3. How Does It Connect to the Auth Instance?

### Direct Import from Core

The CLI imports directly from `@better-auth/core` and `better-auth`:

```typescript
import type { BetterAuthOptions } from "@better-auth/core";
import { BetterAuthError } from "@better-auth/core/error";
import { getAdapter } from "better-auth/db/adapter";
import { getMigrations } from "better-auth/db/migration";
```

### Schema Generation Connection

The `generate` command uses the auth configuration to generate database schemas:

```typescript
// From generate.ts
const config = await getConfig({ cwd, configPath: options.config });
const adapter = await getAdapter(config);
const schema = await generateSchema({
  adapter,
  file: options.output,
  options: config,
});
```

**Flow:**
1. Loads the auth configuration via `getConfig()`
2. Calls `getAdapter(config)` from `better-auth/db/adapter` to instantiate the configured database adapter
3. Passes the adapter and options to `generateSchema()` which routes to the appropriate ORM generator

### Supported Schema Generators

```typescript
// From generators/index.ts
export const adapters = {
  prisma: generatePrismaSchema,
  drizzle: generateDrizzleSchema,
  kysely: generateKyselySchema,
};
```

Each generator (`drizzle.ts`, `prisma.ts`, `kysely.ts`) uses:
- `getAuthTables(options)` from `better-auth/db` to extract the schema definition
- Database-specific type mappings for fields

### Migration Connection

The `migrate` command works similarly:

```typescript
// From migrate.ts
const config = await getConfig({ cwd, configPath: options.config });
const db = await getAdapter(config);
const { toBeAdded, toBeCreated, runMigrations } = await getMigrations(config);
await runMigrations();
```

**Constraints:**
- Only works with the built-in Kysely adapter
- For Prisma/Drizzle, users must use their own migration tools

### Telemetry Integration

The CLI integrates with `@better-auth/telemetry` for usage tracking:

```typescript
import {
  createTelemetry,
  getTelemetryAuthConfig,
} from "@better-auth/telemetry";

// Tracks events like:
// - cli_generate (outcome: generated, overwritten, appended, aborted, no_changes)
// - cli_migrate (outcome: migrated, aborted, no_changes, unsupported_adapter)
```

### Auth Client Generation

The `init` command also generates a client configuration file (`auth-client.ts`) with:
- Base URL configuration
- Plugin-specific client options
- Social provider configuration

---

## Key Architecture Patterns

### 1. Command Pattern with Commander.js

Each command is a separate file exporting a `Command` instance:

```typescript
// From index.ts
const program = new Command("better-auth");
program
  .addCommand(ai)
  .addCommand(init)
  .addCommand(migrate)
  .addCommand(generate)
  // ... etc
```

### 2. Configuration Pipeline

```
User Project                    CLI                          Better-Auth Core
    │                           │                                  │
    ▼                           ▼                                  │
auth.ts ──────────────────► getConfig() ──────────────────────► BetterAuthOptions
                                 │                                  │
                                 ▼                                  │
                           jiti (transpile)                        │
                                 │                                  │
                                 ▼                                  ▼
                           c12 (load) ──────────────────────► getAdapter()
                                                                  │
                                                                  ▼
                                                            SchemaGenerator
```

### 3. Plugin System Support

The CLI reads plugin configurations from `temp-plugins.config.ts` and dynamically adds CLI flags based on plugin arguments:

```typescript
// From init/index.ts
for (const plugin of Object.values(tempPluginsConfig)) {
  if (plugin.auth.arguments) {
    processArguments(plugin.auth.arguments, plugin.displayName);
  }
  if (plugin.authClient && plugin.authClient.arguments) {
    processArguments(plugin.authClient.arguments, plugin.displayName);
  }
}
```

### 4. Framework-Specific Handling

The CLI has framework-specific code generation in:
- `temp/better-auth/packages/cli/src/commands/init/generate-auth-client.ts`
- `temp/better-auth/packages/cli/src/utils/add-svelte-kit-env-modules.ts`
- `temp/better-auth/packages/cli/src/utils/add-cloudflare-modules.ts`

Supports special import path resolution for:
- SvelteKit (`$lib` alias)
- Hono (relative imports)
- Path aliases from `tsconfig.json`

---

## Summary

Better-auth's CLI is a well-architected, production-ready tool that:

1. **Has comprehensive commands** covering init, generate, migrate, info, and more
2. **Handles configuration intelligently** through auto-discovery, path alias resolution, and multiple export pattern support
3. **Connects to the auth instance** by loading the actual `BetterAuthOptions` configuration and using core library functions like `getAdapter()` and `getAuthTables()`
4. **Supports multiple databases** with schema generators for Drizzle, Prisma, and Kysely
5. **Integrates with the ecosystem** through MCP support, AI agent setup, and telemetry
