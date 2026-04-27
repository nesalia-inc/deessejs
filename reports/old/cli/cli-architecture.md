# CLI Architecture

## Overview

The Better Auth CLI (`@better-auth/cli`) is a comprehensive command-line tool for initializing, configuring, and managing Better Auth authentication in TypeScript projects. It provides an interactive setup experience along with code generation, database migration, and project management capabilities.

**Version:** 1.0.3
**Entry Point:** `./dist/index.js`
**Source Location:** `packages/cli/src/`

---

## Directory Structure

```
packages/cli/
├── src/
│   ├── index.ts                    # Main CLI entry point (Commander.js)
│   ├── api.ts                      # Internal API functions
│   ├── api.d.ts                    # API type definitions
│   ├── commands/
│   │   ├── ai.ts                   # AI-related commands
│   │   ├── generate.ts             # Code generation commands
│   │   ├── info.ts                 # Display Better Auth info
│   │   ├── init/
│   │   │   ├── index.ts            # Main init command (interactive setup)
│   │   │   ├── configs/            # Configuration definitions
│   │   │   │   ├── databases.config.ts    # Database adapter configs
│   │   │   │   ├── frameworks.config.ts   # Framework configs
│   │   │   │   ├── social-providers.config.ts  # OAuth provider configs
│   │   │   │   └── temp-plugins.config.ts      # Plugin configs
│   │   │   ├── generate-auth.ts           # Auth config generation
│   │   │   ├── generate-auth-client.ts    # Client config generation
│   │   │   └── utility/                   # Init helper utilities
│   │   │       ├── auth-client-config.ts  # Client config generation
│   │   │       ├── auth-config.ts        # Server config generation
│   │   │       ├── database.ts            # Database helpers
│   │   │       ├── env.ts                 # Env file handling
│   │   │       ├── format.ts              # Code formatting (Prettier)
│   │   │       ├── framework.ts           # Framework detection
│   │   │       ├── imports.ts             # Import string generation
│   │   │       ├── plugin.ts              # Plugin code generation
│   │   │       └── prompt.ts              # Interactive prompts
│   │   ├── login.ts               # Login command
│   │   ├── mcp.ts                 # MCP (Model Context Protocol) commands
│   │   ├── migrate.ts             # Database migration
│   │   ├── secret.ts              # Secret management
│   │   └── upgrade.ts             # Upgrade command
│   ├── generators/                # Database schema generators
│   │   ├── drizzle.ts             # Drizzle ORM generator
│   │   ├── index.ts               # Generator entry
│   │   ├── kysely.ts              # Kysely query builder generator
│   │   ├── prisma.ts              # Prisma ORM generator
│   │   └── types.ts               # Generator type definitions
│   └── utils/                     # Shared utilities
│       ├── add-cloudflare-modules.ts      # Cloudflare Workers support
│       ├── add-svelte-kit-env-modules.ts   # SvelteKit env module support
│       ├── check-package-managers.ts       # Package manager detection
│       ├── config-paths.ts                 # Config file path definitions
│       ├── fetch-latest-version.ts         # NPM version fetching
│       ├── get-config.ts                   # Configuration loading
│       ├── get-package-info.ts             # Package info utilities
│       ├── helper.ts                       # General helpers
│       └── install-dependencies.ts        # Dependency installation
└── package.json
```

---

## Core Dependencies

| Package | Purpose |
|---------|---------|
| `commander` | CLI argument parsing and command definition |
| `prompts` | Interactive terminal prompts |
| `prettier` | Code formatting |
| `zod` | Schema validation |
| `@better-auth/core` | Core library types and utilities |

---

## Command Architecture

### Command Tree

```
better-auth
├── init                      # Interactive project initialization
├── generate
│   ├── auth                  # Generate server auth config
│   └── auth-client          # Generate client auth config
├── migrate                   # Run database migrations
├── mcp                       # MCP-related commands
│   ├── generate-key         # Generate MCP API key
│   └── start                # Start MCP server
├── login                     # Login to Better Auth
├── secret                    # Manage secrets
├── upgrade                   # Upgrade Better Auth packages
├── info                      # Display version and config info
└── ai                        # AI-related commands
    └── chat                  # AI chat interface
```

### Command Implementation Pattern

Each command follows a consistent pattern:

1. **Definition** - Commander.js configuration in `index.ts`
2. **Handler** - Command-specific logic in individual files under `commands/`
3. **Utilities** - Shared functionality in `utils/` or command-specific `utility/`

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Input                                │
│                    (CLI Arguments / Prompts)                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Commander.js                                  │
│                  (index.ts - Main Entry)                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Command Handler                               │
│              (e.g., commands/init/index.ts)                       │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Configuration│  │  Detection   │  │   User Prompts       │   │
│  │   Loading    │  │  Strategies  │  │   (prompts library)  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Code Generation                                │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐   │
│  │ generate-auth   │  │      generate-auth-client           │   │
│  │   (Server)      │  │        (Client)                     │   │
│  └─────────────────┘  └─────────────────────────────────────┘   │
│           │                        │                             │
│           ▼                        ▼                             │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐     │
│  │ Database Config │  │ Framework-specific imports           │     │
│  │ Plugin Config   │  │ Plugin Config                       │     │
│  │ Social Providers│  │ Base URL                            │     │
│  └─────────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Output                                      │
│              (Formatted Code Files)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Framework Detection Strategy

The CLI uses a multi-strategy approach to detect the project framework:

```typescript
// Strategy priority order:
1. packageJsonStrategy  // Check package.json dependencies
2. fileStrategy         // Check for framework config files
```

### Supported Frameworks

| Framework | Config Files | Auth Client Path |
|-----------|--------------|-----------------|
| Next.js | next.config.{js,ts,mjs} | better-auth/react |
| Nuxt | nuxt.config.{js,ts,mjs,cjs} | better-auth/vue |
| SvelteKit | svelte.config.{js,ts,mjs,cjs} | better-auth/svelte |
| Astro | astro.config.{mjs,ts,js,cjs} | better-auth/react |
| Solid Start | app.config.ts | better-auth/solid |
| React Router v7 | react-router.config.ts | better-auth/react |
| Hono | - | - |
| Fastify | - | - |
| Express | - | - |
| Elysia | - | - |
| Nitro | nitro.config.ts | - |

---

## Package Manager Detection Strategy

The CLI detects the package manager using a cascading strategy:

```typescript
// Strategy priority order:
1. envStrategy         // Check npm_config_user_agent env var
2. packageJsonStrategy // Check packageManager field
3. lockFileStrategy    // Check for lock files
4. configStrategy      // Check for config files (pnpm-workspace.yaml, etc.)
5. cliStrategy         // Check which CLIs are installed
```

**Supported Package Managers:** npm, yarn, pnpm, bun

---

## Configuration File Paths

### Server Auth Config (in order of precedence)
```
auth.ts
auth.tsx
auth.js
auth.jsx
auth.server.js
auth.server.ts
auth/index.ts
auth/index.tsx
auth/index.js
auth/index.jsx
auth/index.server.js
auth/index.server.ts
lib/server/auth.ts (and variations)
server/auth.ts (and variations)
lib/auth.ts (and variations)
utils/auth.ts (and variations)
src/auth.ts (and variations)
app/auth.ts (and variations)
```

### Client Auth Config (in order of precedence)
```
auth-client.ts
auth-client.tsx
auth-client.js
auth-client.jsx
auth-client.server.js
auth-client.server.ts
auth-client/index.ts (and variations)
lib/server/auth-client.ts (and variations)
server/auth-client.ts (and variations)
lib/auth-client.ts (and variations)
utils/auth-client.ts (and variations)
src/auth-client.ts (and variations)
app/auth-client.ts (and variations)
```

---

## Import Generation System

The CLI uses an `ImportGroup` system to manage imports:

```typescript
type NormalImportGroup = {
  path: string;           // Module path
  imports: Import[];      // Named imports from module
  isNamedImport: false;   // Default import
};

type NamedImportGroup = {
  path: string;           // Module path
  imports: Import;        // Single named import
  isNamedImport: true;    // Named import
};

type Import = {
  name: string;           // Original name
  alias: string | null;   // Optional alias
  asType: boolean;        // Type-only import
};
```

**Import Sorting:** Default imports first, named imports last, alphabetically by path.

---

## Plugin System Architecture

### Plugin Configuration Structure

```typescript
type PluginConfig = {
  displayName: string;
  auth: {
    function: string;           // Plugin function name
    imports: ImportGroup[];     // Required imports
    arguments?: GetArgumentsOptions[];  // CLI arguments
  } & DependenciesConfig;
  authClient: ({
    function: string;
    imports: ImportGroup[];
    arguments?: GetArgumentsOptions[];
  } & DependenciesConfig) | null;
} & DependenciesConfig;

type DependenciesConfig = {
  dependencies?: string[];
  devDependencies?: string[];
};
```

### Supported Plugins

1. **twoFactor** - Two-factor authentication (TOTP/OTP)
2. **username** - Username-based authentication
3. **magicLink** - Magic link email authentication
4. **emailOTP** - Email-based OTP
5. **genericOAuth** - Generic OAuth provider
6. **anonymous** - Anonymous/guest users
7. **phoneNumber** - Phone number authentication
8. **passkey** - WebAuthn/FIDO2 passkeys
9. **oidc** - OpenID Connect
10. **admin** - Admin role management
11. **apiKey** - API key authentication
12. **bearer** - Bearer token authentication
13. **captcha** - CAPTCHA verification
14. **customSession** - Custom session data
15. **deviceAuthorization** - OAuth device authorization flow
16. **haveIBeenPwned** - Password breach checking
17. **jwt** - JWT support
18. **lastLoginMethod** - Track last login method
19. **mcp** - Model Context Protocol
20. **multiSession** - Multiple concurrent sessions
21. **oauthProxy** - OAuth proxy for development
22. **oneTap** - Google One Tap
23. **oneTimeToken** - One-time tokens
24. **openAPI** - OpenAPI documentation
25. **organization** - Multi-tenant organizations
26. **siwe** - Sign-In With Ethereum
27. **scim** - SCIM user provisioning (external)
28. **sso** - Single Sign-On (external)
29. **stripe** - Stripe payment integration (external)
30. **i18n** - Internationalization (external)

---

## Code Generation Pipeline

### Auth Config Generation (`generate-auth.ts`)

1. Collects database adapter configuration
2. Collects plugin configurations with arguments
3. Builds import list from plugins and database
4. Generates plugin code via `getAuthPluginsCode()`
5. Combines all parts into `betterAuth({...})` call
6. Formats output with Prettier

### Auth Client Generation (`generate-auth-client.ts`)

1. Gets framework-specific import path
2. Collects plugin client configurations
3. Builds import list
4. Generates plugin client code via `getAuthClientPluginsCode()`
5. Combines into `createAuthClient({...})` call
6. Formats output with Prettier

---

## Environment Variable Handling

### Social Provider Env Variables

Each social provider requires specific environment variables:

| Provider | Required Variables |
|----------|-------------------|
| google | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| github | GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET |
| discord | DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET |
| apple | APPLE_CLIENT_ID, APPLE_CLIENT_SECRET |
| cognito | COGNITO_CLIENT_ID, COGNITO_DOMAIN, COGNITO_REGION, COGNITO_USERPOOL_ID |
| ... | (30+ providers total) |

### Env File Operations

```typescript
// Read existing env files
getEnvFiles(cwd: string): Promise<string[]>

// Parse env file contents
parseEnvFiles(envFiles: string[]): Promise<Map<string, string[]>>

// Add new variables to existing files
updateEnvFiles(envFiles: string[], envs: string[]): Promise<void>

// Create new .env file
createEnvFile(cwd: string, envVariables: string[]): Promise<void>

// Check for missing variables
getMissingEnvVars(envFiles: Map<string, string[]>, envVar: string | string[]): Promise<...>
```

---

## Error Handling

### Validation with Zod

Plugin arguments use Zod schemas for validation:

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

### Error Recovery

- **Config loading failures**: Fall back to next strategy
- **Framework detection failures**: Return null, allow manual selection
- **Prompt cancellations**: Clean exit with `process.exit(0)`
- **Missing dependencies**: Prompt to install

---

## Cloudflare Workers Support

Special module aliases are added for Cloudflare Workers compatibility:

```typescript
// Stub modules for:
cloudflare:workers
cloudflare:test
```

These provide stub implementations of Workers-specific APIs for use during CLI operations.

---

## SvelteKit Support

SvelteKit-specific environment modules are stubbed:

```typescript
// Environment modules:
$env/dynamic/private
$env/dynamic/public
$env/static/private
$env/static/public

// App modules:
$app/server

// Path aliases:
$lib, $lib/server, $lib/utils, etc.
```

---

## Version Information Flow

```typescript
// Fetch latest version from npm
fetchLatestVersion(packageName: string): Promise<string | null>

// Uses npm registry API
GET https://registry.npmjs.org/{packageName}/latest
```

---

## Extensibility Points

### Adding a New Database Adapter

1. Add entry to `databases.config.ts` with:
   - Adapter name
   - Import groups
   - Pre-code (e.g., client initialization)
   - Code generator function
   - Dependencies

### Adding a New Plugin

1. Add entry to `temp-plugins.config.ts` with:
   - `displayName`
   - `auth` function, imports, arguments
   - `authClient` function, imports, arguments
   - Dependencies

### Adding a New Framework

1. Add entry to `frameworks.config.ts` with:
   - `name`, `id`, `dependency`
   - `authClient` configuration
   - `routeHandler` code template
   - `configPaths` array

### Adding a New Social Provider

1. Add entry to `social-providers.config.ts` with:
   - Provider options array
   - Each option: `{ name, envVar }`

---

## Summary

The Better Auth CLI is a well-structured, extensible tool that:

1. Uses **Commander.js** for command parsing
2. Uses **prompts** for interactive configuration
3. Uses **Prettier** for code formatting
4. Uses **Zod** for schema validation
5. Follows a **strategy pattern** for detection (framework, package manager)
6. Provides **comprehensive framework support** (10+ frameworks)
7. Supports **30+ plugins** with argument-driven configuration
8. Supports **30+ social/OAuth providers**
9. Generates **type-safe, formatted code** for both server and client
