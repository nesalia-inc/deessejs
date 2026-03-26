# Configuration Analysis: Better Auth & Drizzle ORM

This document analyzes the configuration systems of better-auth and drizzle-orm to inform the design of `packages/deesse/src/config/define.ts`.

---

## 1. Better Auth Configuration

### Entry Point
```typescript
import { betterAuth } from "better-auth/auth/full";
const auth = betterAuth(options);
```

**File:** `better-auth/packages/better-auth/src/auth/full.ts`

### Main Configuration Type: `BetterAuthOptions`

**File:** `better-auth/packages/core/src/types/init-options.ts`

```typescript
export type BetterAuthOptions = {
  // Core
  appName?: string;
  baseURL: BaseURLConfig | undefined;
  basePath?: string;
  secret: string;
  secrets?: Array<{ version: number; value: string }>;

  // Database
  database:
    | PostgresPool
    | MysqlPool
    | SqliteDatabase
    | Dialect
    | DBAdapterInstance
    | BunDatabase
    | DatabaseSync
    | D1Database
    | {
        dialect: Dialect;
        type: KyselyDatabaseType;
        casing?: "snake" | "camel";
        debugLogs?: DBAdapterDebugLogOption;
        transaction?: boolean;
      }
    | {
        db: Kysely<any>;
        type: KyselyDatabaseType;
        casing?: "snake" | "camel";
        debugLogs?: DBAdapterDebugLogOption;
        transaction?: boolean;
      };

  // Secondary storage for sessions
  secondaryStorage?: SecondaryStorage;

  // Email
  emailVerification?: EmailVerificationConfig;
  emailAndPassword?: EmailAndPasswordConfig;

  // OAuth
  socialProviders?: SocialProviders;

  // Plugins
  plugins?: BetterAuthPlugin[];

  // Model configuration
  user?: UserConfig;
  session?: SessionConfig;
  account?: AccountConfig;
  verification?: VerificationConfig;

  // Security
  trustedOrigins?: string[] | function;
  rateLimit?: BetterAuthRateLimitOptions;

  // Advanced
  advanced?: BetterAuthAdvancedOptions;
  logger?: Logger;
  databaseHooks?: DatabaseHooks;
  onAPIError?: OnAPIErrorConfig;
  hooks?: HooksConfig;
  disabledPaths?: string[];
  telemetry?: TelemetryConfig;
  experimental?: ExperimentalConfig;
};
```

### BaseURLConfig Type
```typescript
export type BaseURLConfig = string | DynamicBaseURLConfig;

export type DynamicBaseURLConfig = {
  allowedHosts: string[];
  fallback?: string;
  protocol?: "http" | "https" | "auto";
};
```

### Database Configuration (Drizzle-specific)
```typescript
database: {
  dialect: "pg" | "mysql" | "sqlite" | "mssql";
  type: KyselyDatabaseType;
  casing?: "snake" | "camel";
  debugLogs?: DBAdapterDebugLogOption;
  transaction?: boolean;
};
```

### Drizzle Adapter Configuration

**File:** `better-auth/packages/drizzle-adapter/src/drizzle-adapter.ts`

```typescript
export interface DrizzleAdapterConfig {
  schema?: Record<string, any>;
  provider: "pg" | "mysql" | "sqlite";
  usePlural?: boolean;
  debugLogs?: DBAdapterDebugLogOption;
  camelCase?: boolean;
  transaction?: boolean;
}

export const drizzleAdapter = (db: DB, config: DrizzleAdapterConfig) => { ... };
```

### Advanced Options
```typescript
export type BetterAuthAdvancedOptions = {
  ipAddress?: {
    ipAddressHeaders?: string[];
    disableIpTracking?: boolean;
    ipv6Subnet?: 128 | 64 | 48 | 32;
  };
  useSecureCookies?: boolean;
  disableCSRFCheck?: boolean;
  disableOriginCheck?: boolean;
  crossSubDomainCookies?: {
    enabled: boolean;
    additionalCookies?: string[];
    domain?: string;
  };
  cookies?: Record<string, { name?: string; attributes?: CookieOptions }>;
  defaultCookieAttributes?: CookieOptions;
  cookiePrefix?: string;
  database?: {
    defaultFindManyLimit?: number;
    generateId?: GenerateIdFn | false | "serial" | "uuid";
  };
  trustedProxyHeaders?: boolean;
  backgroundTasks?: { handler: (promise: Promise<unknown>) => void };
  skipTrailingSlashes?: boolean;
};
```

---

## 2. Drizzle ORM Configuration

### Entry Point
```typescript
import { drizzle } from "drizzle-orm/node-postgres"; // or other driver
const db = drizzle(client, config);
```

**File:** `drizzle-orm/drizzle-orm/src/utils.ts`

### Main Configuration Type: `DrizzleConfig`

```typescript
export interface DrizzleConfig<TSchema extends Record<string, unknown> = Record<string, never>> {
  logger?: boolean | Logger;
  schema?: TSchema;
  casing?: Casing;  // 'snake_case' | 'camelCase'
  cache?: Cache;
}
```

### Driver-Specific Usage

**node-postgres:**
```typescript
export function drizzle<
  TSchema extends Record<string, unknown> = Record<string, never>,
  TClient extends NodePgClient = Pool,
>(
  ...params:
    | [TClient | string]
    | [TClient | string, DrizzleConfig<TSchema>]
    | [
        & DrizzleConfig<TSchema>
        & ({
            client: TClient;
          } | {
            connection: string | PoolConfig;
          }),
      ]
): NodePgDatabase<TSchema> & { $client: ... }
```

**better-sqlite3:**
```typescript
export type DrizzleBetterSQLite3DatabaseConfig =
  | ({
      source?: string | Buffer;
    } & Options)
  | string
  | undefined;

export function drizzle<TSchema extends Record<string, unknown>>(
  ...params:
    | []
    | [Database | string]
    | [Database | string, DrizzleConfig<TSchema>]
    | [
        DrizzleConfig<TSchema> & (
          | { connection?: DrizzleBetterSQLite3DatabaseConfig }
          | { client: Database }
        ),
      ]
): BetterSQLite3Database<TSchema>;
```

### Logger Interface
```typescript
export interface Logger {
  logQuery(query: string, params: unknown[]): void;
}
```

---

## 3. Common Patterns

| Aspect | Better Auth | Drizzle ORM |
|--------|-------------|-------------|
| **Schema type** | Generic `TSchema` param | `TSchema extends Record<string, unknown>` |
| **Logger** | `logger?: Logger \| boolean` | `logger?: Logger \| boolean` |
| **Casing** | `casing?: "snake" \| "camel"` | `casing?: "snake_case" \| "camelCase"` |
| **Client/Connection** | `database` property | `client` or `connection` |
| **Transactions** | `transaction?: boolean` | Native database transactions |
| **Debug logs** | `debugLogs?: DBAdapterDebugLogOption` | Via logger |
| **Schema definition** | Via model schemas | Via `pgTable`, `mysqlTable`, `sqliteTable` |

---

## 4. Key File Locations

| Component | Path |
|-----------|------|
| Better Auth main config type | `better-auth/packages/core/src/types/init-options.ts` |
| Better Auth entry point | `better-auth/packages/better-auth/src/auth/full.ts` |
| Better Auth DBAdapter interface | `better-auth/packages/core/src/db/adapter/index.ts` |
| Better Auth Adapter Factory | `better-auth/packages/core/src/db/adapter/factory.ts` |
| Drizzle Adapter for better-auth | `better-auth/packages/drizzle-adapter/src/drizzle-adapter.ts` |
| Drizzle DrizzleConfig | `drizzle-orm/drizzle-orm/src/utils.ts` |
| Drizzle node-postgres driver | `drizzle-orm/drizzle-orm/src/node-postgres/driver.ts` |
| Drizzle better-sqlite3 driver | `drizzle-orm/drizzle-orm/src/better-sqlite3/driver.ts` |

---

## 5. Design Implications for `define.ts`

### Observations

1. **Both libraries use generics for schema typing** - TypeScript inference works similarly
2. **Casing configuration is similar but different** - Better Auth uses `"snake" | "camel"`, Drizzle uses `"snake_case" | "camelCase"`
3. **Logger interface is identical** - Both accept `Logger | boolean`
4. **Better Auth is more opinionated** - It has a specific database adapter interface
5. **Drizzle is more flexible** - Works with multiple drivers and connection strings

### Proposed Config Structure

The Deesse config should support:

```typescript
// Core shared options
interface BaseConfig {
  logger?: boolean | Logger;
  casing?: "snake" | "camel";
}

// Database config (Drizzle)
interface DatabaseConfig extends BaseConfig {
  provider: "pg" | "mysql" | "sqlite";
  connection: string | PoolConfig | DatabaseClient;
  schema?: Record<string, unknown>;
}

// Auth config (Better Auth)
interface AuthConfig extends BaseConfig {
  secret: string;
  baseURL: string | { allowedHosts: string[]; fallback?: string };
  appName?: string;
  emailAndPassword?: EmailAndPasswordConfig;
  socialProviders?: SocialProviders;
  plugins?: BetterAuthPlugin[];
}

// Full Deesse Config
interface Config {
  database: DatabaseConfig;
  auth: AuthConfig;
}
```

### Alternative: Unified Config

```typescript
interface Config {
  // Common
  logger?: boolean | Logger;
  casing?: "snake" | "camel";

  // Database
  database: {
    provider: "pg" | "mysql" | "sqlite";
    url?: string;
    schema?: Record<string, unknown>;
  };

  // Auth (passes through to better-auth)
  auth: {
    secret: string;
    baseURL: string;
    appName?: string;
    [key: string]: unknown;
  };
}
```

---

## 6. Next Steps

1. Define the `Config` type in `packages/deesse/src/config/types.ts`
2. Update `defineConfig()` in `packages/deesse/src/config/define.ts` to accept and return the config
3. Consider creating adapter packages (`@deessejs/adapter-drizzle`, etc.) similar to better-auth's structure
