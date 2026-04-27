# CLI Internal API Reference

## Core API Functions

### `packages/cli/src/api.ts`

The internal API module provides programmatic access to CLI functionality.

#### `initProject(options)`

Initialize a Better Auth project programmatically.

```typescript
async function initProject(options: {
  cwd?: string;
  framework?: string;
  database?: string;
  plugins?: string[];
  socialProviders?: string[];
  emailAndPassword?: boolean;
  baseURL?: string;
  appName?: string;
  skipInstall?: boolean;
  skipGit?: boolean;
  packageManager?: "npm" | "yarn" | "pnpm" | "bun";
}): Promise<InitResult>
```

**Returns:** `Promise<InitResult>`

**Example:**
```typescript
import { initProject } from "@better-auth/cli/api";

const result = await initProject({
  cwd: "./my-project",
  framework: "next",
  database: "drizzle-sqlite-better-sqlite3",
  plugins: ["twoFactor", "username"],
  emailAndPassword: true,
});
```

---

#### `generateAuth(options)`

Generate server-side auth configuration.

```typescript
async function generateAuth(options: {
  cwd?: string;
  output?: string;
  database?: DatabaseAdapter;
  plugins?: Plugin[];
  appName?: string;
  baseURL?: string;
  emailAndPassword?: boolean;
  socialProviders?: string[];
}): Promise<GenerateResult>
```

**Returns:** `Promise<GenerateResult>`

---

#### `generateAuthClient(options)`

Generate client-side auth configuration.

```typescript
async function generateAuthClient(options: {
  cwd?: string;
  output?: string;
  framework?: Framework;
  plugins?: Plugin[];
  baseURL?: string;
}): Promise<GenerateResult>
```

**Returns:** `Promise<GenerateResult>`

---

#### `getVersion()`

Get the installed Better Auth version.

```typescript
function getVersion(): string
```

---

#### `getConfig(cwd?)`

Load and return the Better Auth configuration.

```typescript
async function getConfig(cwd?: string): Promise<BetterAuthConfig | null>
```

---

## Type Definitions

### `packages/cli/src/api.d.ts`

```typescript
export type InitResult = {
  success: boolean;
  configPath?: string;
  clientPath?: string;
  routeHandlerPath?: string;
  errors?: string[];
};

export type GenerateResult = {
  success: boolean;
  outputPath?: string;
  generatedCode?: string;
  errors?: string[];
};

export type BetterAuthConfig = {
  $schema?: string;
  database: DatabaseAdapter;
  plugins: Plugin[];
  socialProviders?: string[];
  emailAndPassword?: boolean;
  baseURL?: string;
  appName?: string;
};

export type DatabaseAdapter =
  | "prisma-sqlite"
  | "prisma-mysql"
  | "prisma-postgresql"
  | "drizzle-sqlite-better-sqlite3"
  | "drizzle-sqlite-bun"
  | "drizzle-sqlite-node"
  | "drizzle-mysql"
  | "drizzle-postgresql"
  | "sqlite-better-sqlite3"
  | "sqlite-bun"
  | "sqlite-node"
  | "mysql"
  | "postgresql"
  | "mssql"
  | "mongodb";

export type Plugin = keyof typeof tempPluginsConfig;

export type Framework = (typeof FRAMEWORKS)[number];
```

---

## Configuration Utilities

### `packages/cli/src/utils/get-config.ts`

#### `getConfig(cwd, options?)`

Loads Better Auth configuration using cascading strategies.

```typescript
async function getConfig(
  cwd?: string,
  options?: { packageManager?: boolean; throwNotFound?: boolean }
): Promise<{
  config: ResolvedConfig | null;
  packageManager?: PackageManager;
}>
```

**Strategies (in order):**
1. `envConfigStrategy` - Check `BETTER_AUTH_CONFIG` env var
2. `cliOptionStrategy` - Check CLI options
3. `fileSystemStrategy` - Load from config file
4. `defaultStrategy` - Use defaults

**Config File Formats Supported:**
- `auth.ts` / `auth.tsx`
- `auth.js` / `auth.jsx`
- `auth.config.ts`
- `better-auth.config.ts`
- `betterAuth(...)` in `package.json`

---

#### `resolveConfig(config, options)`

Resolves and validates a configuration object.

```typescript
function resolveConfig(
  config: GenericConfig,
  options?: { schema?: ZodSchema }
): ResolvedConfig
```

---

### `packages/cli/src/utils/config-paths.ts`

#### Constants

```typescript
const possibleAuthConfigPaths: string[]
const possibleClientConfigPaths: string[]
```

Default paths searched for configuration files (in precedence order).

---

### `packages/cli/src/utils/get-package-info.ts`

#### `findMonorepoRoot(cwd)`

Find the root of a monorepo workspace.

```typescript
async function findMonorepoRoot(cwd: string): Promise<string | null>
```

#### `hasDependency(packageJson, dependency)`

Check if a package depends on a dependency.

```typescript
function hasDependency(
  packageJson: PackageJson,
  dependency: string
): boolean
```

#### `getPackageManager(cwd, packageJson)`

Detect the package manager in use.

```typescript
async function getPackageManager(
  cwd: string,
  packageJson: PackageJson
): Promise<{
  packageManager: PackageManager;
  version?: string;
}>
```

---

## Package Manager Utilities

### `packages/cli/src/utils/check-package-managers.ts`

#### `checkPackageManagers()`

Check which package managers are installed.

```typescript
async function checkPackageManagers(): Promise<{
  hasPnpm: boolean | null;
  hasBun: boolean | null;
  hasYarn: boolean | null;
}>
```

#### `detectPackageManager(cwd, packageJson)`

Detect the package manager using cascading strategies.

```typescript
async function detectPackageManager(
  cwd: string,
  packageJson: PackageJson
): Promise<{
  packageManager: PackageManager;
  version?: string;
}>
```

**Strategies:**
1. `envStrategy` - Check `npm_config_user_agent` env var
2. `packageJsonStrategy` - Check `packageManager` field
3. `lockFileStrategy` - Check for lock files
4. `configStrategy` - Check for config files
5. `cliStrategy` - Check installed CLIs

#### `getVersion(pkgManager)`

Get the version of a package manager.

```typescript
async function getVersion(
  pkgManager: PackageManager
): Promise<string | null>
```

#### `getPkgManagerStr(packageManager, version)`

Format package manager string.

```typescript
function getPkgManagerStr(
  packageManager: PackageManager,
  version?: string | null
): string
// Returns: "pnpm@8.0.0" or just "pnpm"
```

---

## Dependency Installation

### `packages/cli/src/utils/install-dependencies.ts`

#### `installDependencies(dependencies, options)`

Install npm dependencies.

```typescript
async function installDependencies(
  dependencies: string | string[],
  options?: {
    cwd?: string;
    dev?: boolean;
    packageManager?: PackageManager;
    silent?: boolean;
  }
): Promise<{ success: boolean; installed: string[]; errors?: string[] }>
```

---

## Framework Detection

### `packages/cli/src/commands/init/utility/framework.ts`

#### `detectFramework(cwd, packageJson)`

Detect the project framework using cascading strategies.

```typescript
async function detectFramework(
  cwd: string,
  packageJson: PackageJson
): Promise<Framework | null>
```

**Strategies:**
1. `packageJsonStrategy` - Check for framework dependencies
2. `fileStrategy` - Check for config files

---

### `packages/cli/src/commands/init/configs/frameworks.config.ts`

#### `FRAMEWORKS`

Array of all supported frameworks with metadata.

```typescript
const FRAMEWORKS: readonly [{
  name: string;
  id: string;
  dependency: string;
  authClient: { importPath: string } | null;
  routeHandler: { path: string; code: string } | null;
  configPaths: string[] | null;
}, ...]
```

**Example:**
```typescript
{
  name: "Next.js",
  id: "next",
  dependency: "next",
  authClient: { importPath: "better-auth/react" },
  routeHandler: {
    path: "api/auth/[...all]/route.ts",
    code: `import { auth } from "@/lib/auth"; ...`
  },
  configPaths: ["next.config.js", "next.config.ts", ...]
}
```

---

## Database Configuration

### `packages/cli/src/commands/init/configs/databases.config.ts`

#### `databasesConfig`

Array of all supported database adapters.

```typescript
const databasesConfig: DatabasesConfig[]
```

**Structure:**
```typescript
type DatabasesConfig = {
  adapter: DatabaseAdapter;
  imports: ImportGroup[];
  preCode?: string;
  code: (attributes: { additionalOptions?: Record<string, any> }) => string;
  dependencies: string[];
  devDependencies?: string[];
};
```

---

### `packages/cli/src/commands/init/utility/database.ts`

#### `getDatabaseCode(adapter)`

Get database configuration code.

```typescript
function getDatabaseCode<A extends DatabaseAdapter | null>(
  adapter: A
): A extends DatabaseAdapter ? DatabasesConfig : null
```

#### `getORMFromAdapter(adapter)`

Extract ORM name from adapter string.

```typescript
function getORMFromAdapter(adapter: DatabaseAdapter): string
// "drizzle-postgresql" -> "drizzle"
// "sqlite-better-sqlite3" -> "kysely"
```

#### `getAvailableORMs()`

Get all unique ORMs.

```typescript
function getAvailableORMs(): Array<{
  value: string;
  label: string;
  adapter?: DatabaseAdapter;
}>
```

#### `getDialectsForORM(orm)`

Get available dialects for an ORM.

```typescript
function getDialectsForORM(
  orm: string
): Array<{ value: string; label: string; adapter: DatabaseAdapter }>
```

---

## Plugin Configuration

### `packages/cli/src/commands/init/configs/temp-plugins.config.ts`

#### `tempPluginsConfig`

Configuration for all plugins.

```typescript
const tempPluginsConfig: Record<Plugin, PluginConfig>
```

---

### `packages/cli/src/commands/init/utility/plugin.ts`

#### `getPluginConfigs(plugins)`

Get plugin configurations.

```typescript
function getPluginConfigs(plugins: Plugin[]): PluginConfig[]
```

#### `getAuthPluginsCode(options)`

Generate plugin code for auth config.

```typescript
async function getAuthPluginsCode(options: {
  plugins?: PluginConfig[];
  options?: Record<string, unknown>;
  installDependency: InstallDependencyFn;
}): Promise<string | undefined>
```

#### `getAuthClientPluginsCode(options)`

Generate plugin code for client config.

```typescript
async function getAuthClientPluginsCode(options: {
  plugins?: PluginConfig[];
  options?: Record<string, unknown>;
  installDependency: InstallDependencyFn;
}): Promise<string | undefined>
```

---

## Social Providers

### `packages/cli/src/commands/init/configs/social-providers.config.ts`

#### `SOCIAL_PROVIDERS`

Array of supported OAuth providers.

```typescript
const SOCIAL_PROVIDERS: readonly [
  "apple", "atlassian", "cognito", "discord", "dropbox",
  "facebook", "figma", "github", "gitlab", "google",
  "huggingface", "kakao", "kick", "line", "linear",
  "linkedin", "microsoft", "naver", "notion", "paybin",
  "paypal", "polar", "reddit", "roblox", "salesforce",
  "slack", "spotify", "tiktok", "twitch", "twitter",
  "vercel", "vk", "zoom"
]
```

#### `SOCIAL_PROVIDER_CONFIGS`

Configuration for each provider.

```typescript
const SOCIAL_PROVIDER_CONFIGS: Record<SocialProvider, ProviderConfig>
// Where ProviderConfig = { options: ProviderOption[] }
// And ProviderOption = { name: string; envVar: string }
```

---

## Code Generation

### `packages/cli/src/commands/init/generate-auth.ts`

#### `generateAuthConfigCode(options)`

Generate complete auth configuration code.

```typescript
async function generateAuthConfigCode(options: {
  plugins: Plugin[];
  database: DatabaseAdapter | null;
  framework: Framework;
  appName?: string;
  baseURL?: string;
  emailAndPassword?: boolean;
  socialProviders?: string[];
  installDependency: InstallDependencyFn;
  options?: Record<string, unknown>;
}): Promise<string>
```

---

### `packages/cli/src/commands/init/generate-auth-client.ts`

#### `generateAuthClientConfigCode(options)`

Generate complete auth client configuration code.

```typescript
async function generateAuthClientConfigCode(options: {
  plugins: Plugin[];
  database: DatabaseAdapter | null;
  framework: Framework;
  options?: Record<string, unknown>;
  installDependency: InstallDependencyFn;
}): Promise<string>
```

---

## Import Utilities

### `packages/cli/src/commands/init/utility/imports.ts`

#### `createImport(options)`

Create an import object.

```typescript
function createImport(options: {
  name: string;
  alias?: string;
  asType?: boolean;
}): Import
```

#### `getImportString(imports)`

Convert imports to import statement strings.

```typescript
async function getImportString(imports: ImportGroup[]): Promise<string>
```

#### `groupImports(imports)`

Group imports by path.

```typescript
function groupImports(imports: ImportGroup[]): ImportGroup[]
```

---

## Environment Utilities

### `packages/cli/src/commands/init/utility/env.ts`

#### `getEnvFiles(cwd)`

Get list of env files in directory.

```typescript
async function getEnvFiles(cwd: string): Promise<string[]>
```

#### `parseEnvFiles(envFiles)`

Parse env file contents.

```typescript
async function parseEnvFiles(
  envFiles: string[]
): Promise<Map<string, string[]>>
```

#### `updateEnvFiles(envFiles, envs)`

Add environment variables to files.

```typescript
async function updateEnvFiles(
  envFiles: string[],
  envs: string[]
): Promise<void>
```

#### `getMissingEnvVars(envFiles, envVar)`

Check for missing environment variables.

```typescript
async function getMissingEnvVars(
  envFiles: Map<string, string[]>,
  envVar: string | string[]
): Promise<{ file: string; var: string[] }[]>
```

#### `createEnvFile(cwd, envVariables)`

Create a new .env file.

```typescript
async function createEnvFile(
  cwd: string,
  envVariables: string[]
): Promise<void>
```

---

## Prompt Utilities

### `packages/cli/src/commands/init/utility/prompt.ts`

#### `getFlagVariable(flag)`

Convert kebab-case flag to camelCase.

```typescript
function getFlagVariable(flag: string): string
// "two-factor-enabled" -> "twoFactorEnabled"
```

#### `getArgumentsPrompt(options, plugins, target)`

Create an arguments prompt function.

```typescript
async function getArgumentsPrompt(
  options: Record<string, unknown>,
  plugins: PluginConfig[],
  target: "auth" | "authClient"
): Promise<GetArgumentsFn>
```

---

## Formatting

### `packages/cli/src/commands/init/utility/format.ts`

#### `formatCode(code)`

Format TypeScript code with Prettier.

```typescript
async function formatCode(code: string): Promise<string>
```

---

## Generators

### `packages/cli/src/generators/drizzle.ts`

#### `generateDrizzleAuthSchema(options)`

Generate Drizzle ORM schema for auth tables.

```typescript
function generateDrizzleAuthSchema(options: {
  database: DatabaseAdapter;
}): string
```

---

### `packages/cli/src/generators/prisma.ts`

#### `generatePrismaAuthSchema(options)`

Generate Prisma schema for auth tables.

```typescript
function generatePrismaAuthSchema(options: {
  database: DatabaseAdapter;
}): string
```

---

### `packages/cli/src/generators/kysely.ts`

#### `generateKyselyAuthSchema(options)`

Generate Kysely schema for auth tables.

```typescript
function generateKyselyAuthSchema(options: {
  database: DatabaseAdapter;
}): string
```

---

## Version Utilities

### `packages/cli/src/utils/fetch-latest-version.ts`

#### `fetchLatestVersion(packageName)`

Fetch the latest version from npm.

```typescript
async function fetchLatestVersion(
  packageName: string
): Promise<string | null>
```
