# Config System Patterns in TypeScript

## Source

Based on research of TypeScript config system best practices and patterns used in major frameworks.

## What

Config systems manage application settings through merging user input with sensible defaults, validating types, and providing a clean API for access throughout the application.

## Why It Matters

1. **User experience** - Clean config API reduces boilerplate and cognitive load
2. **Type safety** - Invalid configs should fail fast with clear errors
3. **Extensibility** - Plugins and modules should be able to extend config
4. **Documentation** - TypeScript types serve as documentation

## Senior Approach

### 1. Use a Define Pattern for Configuration

```typescript
// Define function creates a type-safe config with defaults
export function defineConfig<T extends ConfigShape>(
  userConfig: Partial<DeepPartial<T>>
): T {
  return mergeWithDefaults(userConfig);
}

// User gets full autocomplete and type safety
const config = defineConfig({
  auth: {
    session: {
      maxAge: 3600, // Override just what needed
    },
  },
});
```

### 2. Separate Schema from Values

```typescript
// Schema defines the shape
interface ConfigSchema {
  readonly auth: {
    readonly session: {
      readonly name: string;
      readonly maxAge: number;
      readonly secure: boolean;
    };
    readonly providers: readonly string[];
  };
}

// Default values as separate constant
const defaultConfig: ConfigSchema = {
  auth: {
    session: {
      name: "session",
      maxAge: 86400,
      secure: true,
    },
    providers: ["google", "github"],
  },
};
```

### 3. Deep Merge with Type Inference

```typescript
import { merge } from "ts-deepmerge";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function mergeWithDefaults<T extends object>(
  defaults: T,
  userConfig: DeepPartial<T>
): T {
  return merge(defaults, userConfig as Partial<T>);
}

// Result type is fully inferred - no casting needed
const config = mergeWithDefaults(defaultConfig, {
  auth: { session: { maxAge: 3600 } },
});
// Type: ConfigSchema (not DeepPartial<ConfigSchema>)
```

### 4. Config Validation with Zod

```typescript
import { z } from "zod";

const sessionSchema = z.object({
  name: z.string().default("session"),
  maxAge: z.number().positive().default(86400),
  secure: z.boolean().default(true),
});

const authSchema = z.object({
  session: sessionSchema,
  providers: z.array(z.string()).default([]),
});

const configSchema = z.object({
  auth: authSchema,
});

// Validate at boundary - runtime and compile time
function validateConfig(input: unknown): ConfigSchema {
  return configSchema.parse(input);
}
```

### 5. Module-Based Config Registration

For frameworks, allow modules to register their own config:

```typescript
// Each module defines its own config piece
const authModuleConfig = defineModule({
  name: "auth",
  schema: authSchema,
  defaults: defaultAuthConfig,
});

// Main config collects all module configs
const appConfig = defineApp({
  modules: [authModuleConfig],
  // Cross-module config
  server: {
    port: 3000,
  },
});
```

### 6. Immutability by Default

```typescript
// Config should be immutable after creation
type ReadonlyConfig<T> = {
  readonly [P in keyof T]: T[P] extends object ? ReadonlyConfig<T[P]> : T[P];
};

// Freeze at creation
function createImmutableConfig<T extends object>(config: T): ReadonlyConfig<T> {
  return Object.freeze(config) as ReadonlyConfig<T>;
}
```

## Examples

### NestJS Pattern

NestJS uses a configuration module with these patterns:
- `ConfigModule.forRoot()` - Global config with defaults
- `ConfigModule.register()` - Per-module config
- Merge strategy for combining configs

```typescript
// NestJS pattern - register with options
ConfigModule.register({
  envFilePath: ".env",
  isGlobal: true,
});

// Then inject where needed
@Injectable()
export class DatabaseService {
  constructor(@Inject(CONFIG_TOKEN) private config: DatabaseConfig) {}
}
```

### Next.js Pattern

Next.js uses a defineConfig approach:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ... Type-safe config
};

export default nextConfig;
```

### Our DeesseJS Pattern

```typescript
// packages/deesse/src/config/define.ts

export interface ConfigShape {
  auth: AuthConfig;
  database: DatabaseConfig;
  ui: UIConfig;
}

export function defineConfig<T extends ConfigShape>(
  config: DeepPartial<T>
): T {
  // Merge with defaults and validate
  return mergeWithDefaults(defaultConfig, config);
}

// packages/deesse/src/config/defaults.ts

export const defaultConfig: ConfigShape = {
  auth: {
    session: {
      name: "session",
      maxAge: 86400,
      secure: true,
    },
    providers: ["google", "github"],
  },
  database: {
    type: "postgres",
    url: process.env.DATABASE_URL,
  },
  ui: {
    theme: "light",
    sidebar: {
      collapsed: false,
    },
  },
};
```

### With Plugin Extension

```typescript
// Allow plugins to extend config
export function extendConfig<T extends ConfigShape, Ext extends object>(
  baseConfig: T,
  extension: DeepPartial<Ext>,
  path: string
): T & Ext {
  return setAtPath(baseConfig, path, extension);
}

// Usage by plugin
const config = extendConfig(baseConfig, {
  plugins: ["my-plugin"],
}, "auth");
```

## Key Takeaways

1. **Define pattern provides type safety** - `defineConfig()` with TypeScript generics
2. **Deep merge for partial overrides** - Users should only specify what changes
3. **Separate schema from values** - Defaults as constants, schema as types
4. **Validate at boundaries** - Zod or similar for runtime validation
5. **Immutable after creation** - Freeze config to prevent accidental mutation
6. **Modules can extend config** - Plugin architecture should allow config extension
7. **Types are documentation** - Interface definitions serve as documentation
8. **Fail fast with clear errors** - Zod provides descriptive validation errors
