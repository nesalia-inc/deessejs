# DeesseJS CLI Architecture Report

## 1. Entry Point

**File:** `packages/cli/bin/deesse.js`

```javascript
#!/usr/bin/env node
import('../dist/index.js');
```

The CLI is invoked via `npx deesse` (bin name: `deesse`) and simply imports the compiled `dist/index.js`.

---

## 2. Main CLI Handler

**File:** `packages/cli/src/index.ts`

This file acts as a simple command router with manual argument parsing. It supports:

| Command | Handler |
|---------|---------|
| `help`, `--help`, `-h` | `showHelp()` |
| `init` | `runInit()` - runs `create-deesse-app` |
| `db:*` | `runDbCommand()` - delegates to `commands/db/index.ts` |
| `admin` | `adminCreate()` - delegates to `commands/admin/create.ts` |

**Command routing logic:**
- Commands starting with `db:` are routed to `runDbCommand()` with the subcommand extracted (e.g., `db:generate` -> `subcommand="generate"`)
- `admin` command checks `args[1]` for subcommand (`create`)
- No use of a CLI framework (oclif, commander, etc.) - raw argument parsing

---

## 3. Command Structure

### 3.1 Database Commands (`commands/db/`)

**File:** `packages/cli/src/commands/db/index.ts`

This is the dispatcher for all `db:*` commands:

```
db:generate -> dbGenerate() from './generate.js'
db:push     -> dbPush() from './push.js'
db:migrate  -> dbMigrate() from './migrate.js'
```

Each subcommand has its own argument parser (flat switch-case, no shared parsing utility).

---

**`db:generate`** (`commands/db/generate.ts`):
1. Calls `loadMinimalConfigWithPlugins()` to get plugins array
2. Calls `generateAuthSchema(cwd, plugins)` to generate auth tables
3. Calls `createDrizzleConfig(cwd)` to (re)create `drizzle.config.ts`
4. Uses programmatic API: `preparePgMigrationSnapshot` + `generateMigration`

**`db:push`** (`commands/db/push.ts`):
1. Calls `generateAuthSchema(cwd)` - **NOTE: does NOT pass plugins**
2. Calls `createDrizzleConfig(cwd)`
3. Uses programmatic API: `fromDatabase` + `pushSchema` (optionally with `--force`)

**`db:migrate`** (`commands/db/migrate.ts`):
1. Verifies `src/db/schema.ts` exists via `verifySchemaPath()`
2. Verifies `drizzle.config.ts` exists
3. Uses programmatic API: `pushSchema` (optionally with `--dry`)

---

### 3.2 Admin Commands (`commands/admin/`)

**File:** `packages/cli/src/commands/admin/create.ts`

The `admin create` command is the most sophisticated:

**Flow:**
1. Displays intro with `@clack/prompts`
2. Loads minimal config via `loadMinimalConfig()` (extracts `secret` and `auth.baseURL`)
3. Validates `DATABASE_URL` is set in environment
4. Attempts to load auth schema from `src/db/auth-schema.ts` using `import()` with `pathToFileURL`
5. Validates schema has required tables: `user`, `session`, `account`, `verification`
6. Creates a pg Pool connection directly (not using drizzle config)
7. Validates admin email domain via `validateAdminEmailDomain()` from `deesse`
8. Calls `createAdminUser()` from `lib/admin/create.ts`

**Input handling:**
- If `--email` and `--password` flags provided: uses those directly
- Otherwise: interactive prompts via `@clack/prompts`

---

## 4. Shared Utilities (`lib/`)

### 4.1 Config Loader (`lib/config/loader.ts`)

**Current implementation uses three loading strategies:**

| Function | Purpose | Method | Issues |
|----------|---------|--------|--------|
| `loadMinimalConfig()` | Extract `secret` and `auth.baseURL` | Regex parsing | Fragile - can't handle complex TypeScript |
| `loadMinimalConfigWithPlugins()` | Extract plugins array | Executes config via tsx, parses output | Loses functions via JSON serialization |
| `loadConfig()` | Full config via `defineConfig()` | Uses `createRequire` to call `deesse.defineConfig()` | Partially works |

**Current config search paths (only 3):**
1. `src/deesse.config.ts`
2. `deesse.config.ts`
3. `config/deesse.ts`

### 4.2 Recommended Architecture (based on better-auth + Payload analysis)

**The deesse CLI should adopt the c12 + jiti approach used by better-auth.**

#### Why better-auth's approach is superior:

| Aspect | Current Deesse | better-auth |
|--------|---------------|-------------|
| Search paths | 3 hardcoded | **84 paths** |
| TypeScript execution | Regex OR JSON serialization loses functions | **jiti with Babel** - full TS support |
| Path aliases | None | **Full tsconfig resolution** |
| Framework stubs | None | **SvelteKit, Cloudflare** |
| Dotenv handling | None | **c12 built-in** |
| Caching | None | **jiti caching** |

#### Recommended config loading approach:

```typescript
// PHASE 1: Use jiti for TypeScript execution
import { jiti } from 'jiti';
import { loadConfig } from 'c12';

// Use jiti to execute config with full TypeScript support
const config = jiti('./deesse.config.ts', {
    transformOptions: {
        babel: {
            presets: [
                [babelPresetTypeScript, { isTSX: true, allExtensions: true }],
                [babelPresetReact, { runtime: "automatic" }],
            ],
        },
    },
})();

// PHASE 2: Expand search paths to 84 (like better-auth)
const possibleConfigPaths = [
    // Base names
    'deesse.config.ts', 'deesse.config.tsx', 'deesse.config.js', 'deesse.config.jsx',
    'deesse/index.ts', 'deesse/index.tsx', 'deesse/index.js', 'deesse/index.jsx',
    // With prefixes: src/, lib/, app/, config/, server/, auth/, utils/
    ...baseNames.map(n => `src/${n}`),
    ...baseNames.map(n => `lib/${n}`),
    ...baseNames.map(n => `app/${n}`),
    ...baseNames.map(n => `server/${n}`),
    ...baseNames.map(n => `config/${n}`),
    ...baseNames.map(n => `auth/${n}`),
    ...baseNames.map(n => `utils/${n}`),
];
```

#### Recommended CLI framework adoption:

```typescript
// Replace manual parsing with citty (like nuxt/vite)
import { parseArgs } from 'citty';

const program = createCommand('deesse')
    .option('-c, --cwd <path>', 'Working directory')
    .option('--config <path>', 'Config file path')
    .addCommand(createDbCommand())
    .addCommand(createAdminCommand());

parseArgs(program, { args: Bun.argv });
```

---

### 4.3 Auth Schema Generator (`lib/db/auth-schema.ts`)

**Purpose:** Generates the mandatory better-auth schema tables (user, session, account, verification).

**Key function:** `generateAuthSchema(cwd, plugins?)`

**Flow:**
1. Creates a mock adapter for drizzle with `provider: 'pg'`
2. Calls `generateDrizzleSchema()` from `auth/api` (dynamic import)
3. Writes generated code to `src/db/auth-schema.ts`
4. **Appends** `export const schema = { user, session, account, verification };`

**Problem:** The schema export is appended separately, which is a workaround because `generateDrizzleSchema()` exports named tables, not a combined schema object.

**Auth schema path:** `./src/db/auth-schema.ts` (hardcoded constant `AUTH_SCHEMA_OUTPUT`)

---

### 4.4 Drizzle Schema Utilities (`lib/db/schema.ts`)

**Key functions:**

| Function | Purpose |
|----------|---------|
| `loadSchema()` | Uses `createRequire` to dynamically import schema objects from `src/db/schema.ts` |
| `createDrizzleConfig()` | Creates `drizzle.config.ts` pointing to `auth-schema.ts` |
| `createDefaultSchema()` | Creates skeleton `src/db/schema.ts` with `...authSchema` |
| `schemaExists()`, `drizzleConfigExists()` | Check file existence |
| `verifySchemaPath()` | Throws if schema missing |

**Default paths:**
- Schema: `./src/db/schema.ts`
- Drizzle config: `./drizzle.config.ts`
- Schema directory: `./src/db`

---

### 4.5 Admin User Backend (`lib/admin/create.ts`)

**Purpose:** Pure business logic with no CLI dependencies.

**Key function:** `createAdminUser(options)`

**Flow:**
1. Creates better-auth instance with `drizzleAdapter(database, { provider: "pg", schema })`
2. Adds `admin()` plugin
3. Calls `auth.api.createUser()` with `{ email, password, name, role: 'admin' }`

**Error handling:** Wraps all errors in `AdminCreationError` with optional code and suggestion.

---

## 5. Integration Points

### 5.1 With better-auth

- Uses `better-auth` library directly
- Uses `auth/api` (`generateDrizzleSchema`) for programmatic schema generation
- Uses `@better-auth/drizzle-adapter` for database integration
- Uses `admin` plugin from `better-auth/plugins` for admin user creation

### 5.2 With Drizzle

- Creates `drizzle.config.ts` pointing to `auth-schema.ts`
- Uses `drizzle-kit` programmatic API for `generate` and `push` (see Integration Plan)
- Uses `drizzle-kit/serializer` (`serializePg`, `preparePgMigrationSnapshot`) for schema serialization
- Uses `drizzle-kit/api` (`generateMigration`, `pushSchema`) for migration generation and pushing
- Uses `drizzle-orm` types for database operations

### 5.3 With Deesse Config

- Searches for `deesse.config.ts` (or variants)
- Uses `defineConfig()` from `deesse` package to process full config
- Extracts `secret`, `auth.baseURL`, and `auth.plugins` from config

---

## 6. Identified Issues vs Recommended State

### 6.1 Plugin Field Generation Missing

**Current issue:** `db:push` does not pass plugins to `generateAuthSchema`.

**Recommended fix:** Always pass plugins array when calling `generateAuthSchema`.

---

### 6.2 Fragile Config Loading (CRITICAL)

**Current state:** Uses regex extraction which cannot handle complex TypeScript syntax.

**Recommended approach:** Replace with jiti-based TypeScript execution.

| Current (Bad) | Recommended (Good) |
|---------------|-------------------|
| `content.match(/secret\s*:\s*process\.env\.(\w+)!/)` | `jiti('./deesse.config.ts')()` |

---

### 6.3 Config Search Paths Too Limited

**Current state:** Only 3 hardcoded paths.

**Recommended approach:** Expand to 84 paths like better-auth:

```typescript
const prefixes = ['', 'src/', 'lib/', 'app/', 'config/', 'server/', 'auth/', 'utils/'];
const baseNames = ['deesse.config.ts', 'deesse.config.tsx', 'deesse.config.js', 'deesse.config.jsx'];
```

---

### 6.4 No Path Alias Resolution

**Current state:** Cannot use TypeScript path aliases like `@/*` in config.

**Recommended approach:** Extract path aliases from tsconfig.json and pass to jiti:

```typescript
const aliases = getTsconfigPathAliases(cwd);
jiti('./deesse.config.ts', { alias: aliases })();
```

---

### 6.5 No Framework Stubs

**Current state:** Config with Next.js/SvelteKit imports fails in CLI context.

**Recommended approach:** Add framework stubs like better-auth:

```typescript
// Stub Next.js modules
const nextjsStub = `
export const redirect = () => {};
export const notFound = () => {};
export const headers = () => new Headers();
`;
jiti.registerModule('next', nextjsStub);
```

---

### 6.6 No Caching

**Current state:** Every CLI invocation re-parses config.

**Recommended approach:** Cache compiled config in production:

```typescript
const cacheKey = `${configPath}:${fs.statSync(configPath).mtimeMs}`;
const cached = configCache.get(cacheKey);
if (cached && process.env.NODE_ENV === 'production') {
    return cached;
}
```

---

### 6.7 Manual Argument Parsing

**Current state:** Raw string manipulation in `index.ts`.

**Recommended approach:** Use a CLI framework like **citty** (used by Nuxt, Vite) or **commander**.

---

## 7. Phased Migration Plan

### Phase 1: Immediate (High Impact, Low Effort)

Replace regex extraction with jiti-based execution:

```typescript
// Instead of regex parsing:
const secretMatch = content.match(/secret\s*:\s*process\.env\.(\w+)!/);

// Use jiti:
const config = jiti('./deesse.config.ts')();
const secret = config.secret;
```

---

### Phase 2: Expand Search Paths

Add common directory prefixes:

```typescript
const CONFIG_PATHS = [
    // Current paths
    'src/deesse.config.ts', 'deesse.config.ts', 'config/deesse.ts',
    // Expanded (like better-auth)
    'lib/deesse.config.ts', 'app/deesse.config.ts', 'server/deesse.config.ts',
    'src/deesse/index.ts', 'lib/deesse/index.ts', 'app/deesse/index.ts',
];
```

---

### Phase 3: Add Path Alias Resolution

```typescript
function getPathAliases(cwd: string): Record<string, string> | null {
    const tsconfig = getTsconfig(cwd);
    if (!tsconfig) return null;
    const { paths = {}, baseUrl } = tsconfig.compilerOptions ?? {};
    // Resolve aliases relative to baseUrl
    return paths;
}
```

---

### Phase 4: Add Framework Stubs

```typescript
// For Next.js apps
const nextStub = `
export const redirect = () => { throw new Error('redirect called'); };
export const notFound = () => { throw new Error('notFound called'); };
`;

// For SvelteKit
const svelteStub = `
export const env = { static: {}, dynamic: {} };
`;
```

---

### Phase 5: Implement Caching

```typescript
const configCache = new Map<string, { config: any; mtime: number }>();

async function loadConfigCached(configPath: string) {
    const mtime = fs.statSync(configPath).mtimeMs;
    const cached = configCache.get(configPath);

    if (cached && mtime === cached.mtime) {
        return cached.config;
    }

    const config = await jitiImport(configPath);
    configCache.set(configPath, { config, mtime });
    return config;
}
```

---

### Phase 6: CLI Framework

Replace manual argument parsing with citty:

```typescript
import { createCommand, parseArgs } from 'citty';

const cli = createCommand('deesse')
    .option('-c, --cwd <dir>', 'Working directory')
    .option('--config <path>', 'Config path')
    .addCommand(
        createCommand('db:generate')
            .option('--no-schema', 'Skip schema generation')
            .action(async (opts) => { /* ... */ })
    )
    .addCommand(
        createCommand('admin:create')
            .option('-e, --email <email>', 'Admin email')
            .action(async (opts) => { /* ... */ })
    );

parseArgs(cli, { args: Bun.argv });
```

---

## 8. Dependencies to Add

```json
{
    "dependencies": {
        "c12": "^2.0.0",
        "jiti": "^2.0.0",
        "@babel/preset-typescript": "^7.0.0",
        "@babel/preset-react": "^7.0.0",
        "citty": "^0.1.0"
    }
}
```

---

## 9. Summary

The CLI architecture follows a simple pattern:
- **Entry point** (`index.ts`) routes commands manually
- **Command handlers** in `commands/` use **lib utilities** for shared logic
- **Config loading** has three strategies (minimal regex, minimal with plugins, full)

**Critical gaps identified:**
1. Regex parsing is fragile and cannot handle complex TypeScript
2. Only 3 config search paths (vs better-auth's 84)
3. No path alias resolution from tsconfig
4. No framework stubs for Next.js/SvelteKit
5. No config caching
6. Manual argument parsing

**Target architecture (based on better-auth):**
1. Use **c12 + jiti** for robust TypeScript config loading
2. Expand to **84 search paths** covering all common project structures
3. Add **tsconfig path alias resolution**
4. Add **framework stubs** to prevent import errors
5. Implement **config caching** for performance
6. Adopt **citty** CLI framework for argument parsing
