# DeesseJS v0.0.1 - Developer Experience

> **Status:** Work in Progress
> **Last Updated:** 2025-02-16
> **Phase:** Project Initialization

---

## 🎯 Overview

This document defines the developer experience strategy for the DeesseJS monorepo, including local development tooling, linting, formatting, type checking, and testing.

For **CI/CD and version management**, see [CI/CD & Version Management](./ci-cd.md).

---

## 🏗️ Build System: Turborepo

We use **Turborepo** as our build system for the DeesseJS monorepo.

### Why Turborepo?

- ✅ Optimized for JavaScript/TypeScript
- ✅ Part of Vercel (aligned with Next.js)
- ✅ Excellent caching system
- ✅ Intelligent parallel builds
- ✅ Zero configuration to get started
- ✅ Simpler than Nx for our use case

### Repository Structure

```
deessejs/
├── turbo.json                      # Turborepo configuration
├── pnpm-workspace.yaml             # pnpm workspaces
├── package.json                    # Root package with unified scripts
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Main CI pipeline
│       ├── lint.yml                # Linting checks
│       └── release.yml             # npm publishing with Changesets
│
├── packages/
│   ├── create-deesse-app/          # CLI package
│   │   ├── eslint.config.js        # Local ESLint config
│   │   ├── prettier.config.js      # Local Prettier config
│   │   ├── tsconfig.json           # Local TypeScript config
│   │   └── vitest.config.ts        # Local Vitest config
│   │
│   ├── core/                       # Future: @deessejs/core
│   ├── orm/                        # Future: @deessejs/orm
│   └── admin/                      # Future: @deessejs/admin
│
└── templates/
    ├── minimal/
    ├── default/
    └── full-stack/
```

> **Note:** For v0.0.1, we use **local configs** in each package rather than shared `tools/` packages. This keeps the architecture simple and maintainable. We can introduce shared configs when we have 5+ packages (around v0.3.0 or v0.5.0).

---

## ⚙️ Configuration Files

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env.*local",
    ".env"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "outputs": []
    },
    "lint:fix": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts", "__tests__/**/*.ts"]
    },
    "test:e2e": {
      "dependsOn": ["^build"],
      "outputs": ["test-results/**"]
    },
    "test:coverage": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Root `package.json`

```json
{
  "name": "deessejs",
  "version": "0.0.1",
  "private": true,
  "description": "A modern headless CMS for Next.js",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "test:coverage": "turbo run test:coverage",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "prettier": "^3.4.0",
    "turbo": "^2.0.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=18.17.0",
    "pnpm": ">=8.0.0"
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'templates/*'
  - 'apps/*'
```

---

## 🔍 Linting - ESLint v9 (Flat Config)

For v0.0.1, each package manages its own **local ESLint configuration**. This keeps things simple and avoids unnecessary abstraction.

### Package Configuration

#### `packages/create-deesse-app/eslint.config.js`

```javascript
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/playwright-report/**"
    ]
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error"
    }
  }
];
```

#### `packages/create-deesse-app/package.json`

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

### For Templates (Next.js projects)

Templates include React-specific rules:

#### `templates/default/eslint.config.js`

```javascript
import tseslint from "typescript-eslint";
import eslintReact from "eslint-plugin-react";

export default [
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**"]
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: eslintReact
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": "error"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];
```

---

### When to Add Shared Configs?

Consider introducing `@deessejs/eslint-config` when:
- ✅ You have 5+ packages in the monorepo
- ✅ You find yourself copying the same config repeatedly
- ✅ Multiple developers are working on the project
- ✅ You want to publish a shareable config for the community

**Likely around v0.3.0 or v0.5.0**

---

## 🎨 Code Formatting - Prettier

Each package uses its own **local Prettier configuration**.

### Package Configuration

#### `packages/create-deesse-app/prettier.config.js`

```javascript
module.exports = {
  semi: true,
  trailingComma: "es5",
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: "always",
  endOfLine: "lf"
};
```

#### `packages/create-deesse-app/package.json`

```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "prettier": "^3.4.0"
  }
}
```

### For Templates (with Tailwind)

Templates include the Tailwind plugin:

#### `templates/default/prettier.config.js`

```javascript
module.exports = {
  semi: true,
  trailingComma: "es5",
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: "always",
  endOfLine: "lf",
  plugins: ["prettier-plugin-tailwindcss"]
};
```

#### `templates/default/package.json`

```json
{
  "devDependencies": {
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0"
  }
}
```

---

### When to Add Shared Config?

Consider introducing `@deessejs/prettier-config` when:
- ✅ You have 5+ packages with identical formatting needs
- ✅ Teams are debating formatting standards
- ✅ You want consistent formatting across all DeesseJS projects

**Likely around v0.3.0 or v0.5.0**

---

## 🔷 Type Checking - TypeScript

Each package uses its own **local TypeScript configuration**. We use `@tsconfig/strictest` as a base for strict type checking.

### Package Configuration

#### `packages/create-deesse-app/tsconfig.json`

```json
{
  "extends": "@tsconfig/strictest/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

#### `packages/create-deesse-app/package.json`

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "build": "tsc"
  },
  "devDependencies": {
    "@tsconfig/strictest": "^2.0.0",
    "typescript": "^5.7.0"
  }
}
```

### For Templates (Next.js)

Templates use Next.js-specific configuration:

#### `templates/default/tsconfig.json`

```json
{
  "extends": "@tsconfig/strictest/tsconfig.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["ES2017", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "incremental": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### When to Add Shared Config?

Consider introducing `@deessejs/typescript-config` when:
- ✅ You have 5+ packages with complex TypeScript needs
- ✅ You're frequently updating compiler options across packages
- ✅ You want to publish a reusable TypeScript config for the community

**Likely around v0.3.0 or v0.5.0**

---

## 🧪 Testing Strategy

### Unit & Component Tests (Vitest)

Each package includes its own tests:

```
packages/create-deesse-app/
├── src/
│   └── index.ts
└── __tests__/
    ├── index.test.ts
    └── setup.ts
```

#### `packages/create-deesse-app/package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "@vitest/ui": "^2.0.0",
    "vitest": "^2.0.0",
    "@testing-library/jest-dom": "^6.6.0"
  }
}
```

#### `packages/create-deesse-app/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '__tests__/',
        '**/*.test.ts',
        '**/*.config.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### E2E Tests (Playwright)

For CLI and generated templates:

```
packages/create-deesse-app/
└── e2e/
    ├── cli.spec.ts              # Test the CLI itself
    └── templates.spec.ts        # Test generated templates
```

#### `packages/create-deesse-app/e2e/cli.spec.ts`

```typescript
import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('CLI creates minimal project successfully', async ({ page }) => {
  const projectName = 'test-minimal-app';

  execSync(`node ${__dirname}/../bin/index.js ${projectName} --yes --template minimal`, {
    cwd: '/tmp',
    stdio: 'inherit'
  });

  // Verify project structure
  const fs = await import('fs/promises');
  const projectPath = `/tmp/${projectName}`;

  expect(await fs.access(`${projectPath}/package.json`)).toBeTruthy();
  expect(await fs.access(`${projectPath}/src/app/page.tsx`)).toBeTruthy();
  expect(await fs.access(`${projectPath}/tsconfig.json`)).toBeTruthy();

  // Cleanup
  execSync(`rm -rf ${projectPath}`);
});
```

---

## 📊 Tools Summary

| Category | Tool | Purpose |
|----------|------|---------|
| **Build System** | Turborepo | Monorepo build orchestration |
| **Linting** | ESLint v9 | Code linting with flat config |
| **Formatting** | Prettier | Code formatting |
| **Type Checking** | TypeScript 5.7+ | Static typing |
| **TypeScript Base Config** | @tsconfig/strictest | Strictest settings |
| **Unit Tests** | Vitest | Fast unit testing |
| **E2E Tests** | Playwright | End-to-end testing |
| **Package Manager** | pnpm | Efficient monorepo management |

**For CI/CD and version management tools, see** [CI/CD & Version Management](./ci-cd.md).

---

## 🎯 Benefits of This Architecture

✅ **Simple and maintainable** - No over-engineering for v0.0.1
✅ **Local configs** - Easy to understand and modify
✅ **Turborepo caching** - Fast builds with intelligent caching
✅ **Parallelization** - Tests/builds run in parallel
✅ **Type-safe** - Strict TypeScript everywhere
✅ **Scalable** - Easy to refactor to shared configs when needed
✅ **YAGNI principle** - We only add complexity when we actually need it

---

## 🚀 Getting Started with Development

### First Time Setup

```bash
# Clone repository
git clone https://github.com/deessejs/deessejs.git
cd deessejs

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Daily Development

```bash
# Watch mode for development
pnpm dev

# Type check while coding
pnpm type-check --watch

# Lint and fix
pnpm lint:fix

# Run tests in watch mode
pnpm test --watch

# Format code
pnpm format
```

### Before Committing

```bash
# Run full check
pnpm lint
pnpm type-check
pnpm test

# Or use turbo to run all
pnpm build && pnpm lint && pnpm test
```

---

## 📚 Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [ESLint v9 Flat Config](https://eslint.org/latest/latest/blog/2024/07/eslint-v9.10.0-released#flat-config-stable)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [@tsconfig/strictest](https://www.npmjs.com/package/@tsconfig/strictest)

For CI/CD resources, see [CI/CD & Version Management](./ci-cd.md).

---

## 📝 Next Steps

### Phase 1: Foundation
- [ ] Set up Turborepo (`turbo.json`)
- [ ] Set up `pnpm-workspace.yaml`
- [ ] Configure root `package.json` scripts
- [ ] Add local configs to `create-deesse-app`:
  - [ ] `eslint.config.js`
  - [ ] `prettier.config.js`
  - [ ] `tsconfig.json`
  - [ ] `vitest.config.ts`

### Phase 2: CI/CD
See [CI/CD & Version Management](./ci-cd.md) for complete CI/CD setup.

- [ ] Create GitHub Actions workflows
- [ ] Set up Changesets
- [ ] Configure npm tokens

### Phase 3: Package Development
- [ ] Implement `create-deesse-app` CLI
- [ ] Create templates (minimal, default, full-stack)
- [ ] Add tests to CLI package

### Phase 4: Future Enhancement (v0.3.0+)
- [ ] Evaluate need for shared configs
- [ ] Create `tools/` if we have 5+ packages
- [ ] Publish `@deessejs/*` configs if useful for community

---

**Note:** This document will be updated as the development experience evolves.
