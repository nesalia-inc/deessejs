# CONFIG-EXPORT Rule

## Rule

**Use named export for Deesse configuration.** Always export your config as `export const config = defineConfig(...)`. Never use `export default`.

## Why Named Export

1. **Consistent imports** - All internal packages import from `@deesse-config` alias, not varying default exports
2. **Tree-shaking friendly** - Named exports are easier for bundlers to analyze
3. **Self-documenting** - `import { config }` is clearer than `import config`

## Alias: `@deesse-config`

The config file is aliased to `@deesse-config` in `tsconfig.json` and can be imported consistently across all packages:

```typescript
// Instead of relative imports
import { getDeesse } from "../../../deesse/src/index";

// Use the alias
import { getDeesse } from "@deesse-config";
```

## Correct Usage

```typescript
// ✅ deesse.config.ts — Named export
import { defineConfig } from "deesse";
import { db } from "./db";

export const config = defineConfig({
  database: db,
  secret: process.env.AUTH_SECRET!,
  auth: {
    baseURL: "http://localhost:3000",
  },
});
```

```typescript
// ✅ Any file importing the config
import { getDeesse } from "@deesse-config";
// or
import { config } from "@deesse-config";
```

## Incorrect Usage

```typescript
// ❌ Default export — not allowed
export default defineConfig({
  database: db,
  secret: process.env.AUTH_SECRET!,
});
```

```typescript
// ❌ Different names — must be exactly `config`
export const myConfig = defineConfig({ ... });
```

## tsconfig.json Alias Setup

```json
{
  "compilerOptions": {
    "paths": {
      "@deesse-config": ["./deesse.config.ts"]
    }
  }
}
```

## Enforcement

This rule is enforced through:
1. Code reviews — check all `defineConfig` calls
2. Import validation — verify `@deesse-config` alias is used for internal imports

## Rationale

Using `export const config` with a consistent alias ensures:
- All packages reference the same config file
- No relative path complexity
- Clear contract: `@deesse-config` = the app's Deesse configuration
