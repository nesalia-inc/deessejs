# DeesseJS v0.0.1 - Repository Structure

> **Status:** Work in Progress
> **Last Updated:** 2025-02-16
> **Phase:** Project Initialization

---

## 📁 Complete Repository Structure

```
deessejs/
│
├── packages/                          # 📦 Monorepo packages
│   ├── create-deesse-app/            # CLI to bootstrap projects
│   │   ├── package.json
│   │   ├── bin/
│   │   │   └── index.js              # Executable with shebang
│   │   ├── src/
│   │   │   ├── index.ts              # Main entry point
│   │   │   ├── prompts.ts            # User questions (@clack/prompts)
│   │   │   ├── templates.ts          # Template selection logic
│   │   │   └── utils/
│   │   │       ├── copy.ts           # Copy template files
│   │   │       ├── placeholders.ts   # Replace {{projectName}}
│   │   │       ├── git.ts            # git init + commit
│   │   │       └── install.ts        # npm/pnpm/yarn install
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── core/                         # ⏳ Future: @deessejs/core
│   │   ├── src/
│   │   │   ├── collections/          # Collection system
│   │   │   ├── config/               # Configuration handling
│   │   │   └── plugins/              # Plugin system
│   │   └── package.json
│   │
│   ├── orm/                          # ⏳ Future: @deessejs/orm
│   │   ├── src/
│   │   │   ├── drizzle/              # Drizzle ORM wrapper
│   │   │   ├── migrations/           # Migration system
│   │   │   └── queries/              # Auto-generated queries
│   │   └── package.json
│   │
│   └── admin/                        # ⏳ Future: @deessejs/admin
│       ├── src/
│       │   ├── app/                  # Next.js admin dashboard
│       │   │   └── admin/
│       │   │       └── [...slug]/
│       │   └── components/           # Admin components
│       └── package.json
│
├── templates/                        # 🆕 Project templates
│   ├── minimal/                      # Minimal Next.js setup
│   │   ├── package.json
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── ...
│   │
│   ├── default/                      # Recommended setup with tests
│   │   ├── package.json
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── ...
│   │
│   └── full-stack/                   # Production-ready setup
│       ├── package.json
│       ├── src/
│       ├── .github/
│       │   └── workflows/           # CI/CD workflows
│       └── ...
│
├── apps/
│   └── web/                          # ✅ Documentation website (existing)
│       ├── package.json
│       ├── next.config.mjs
│       ├── src/
│       │   ├── app/
│       │   │   ├── (home)/
│       │   │   └── docs/
│       │   └── components/
│       └── ...
│
├── docs/                             # ✅ Markdown documentation (existing)
│   ├── versions/
│   │   └── 0.0.1/
│   │       ├── cli-roadmap.md       # CLI architecture
│   │       └── repository-structure.md # This file
│   ├── 01-getting-started/
│   ├── 02-core-concepts/
│   ├── 03-features/
│   ├── 04-nextjs-integration/
│   ├── 05-enhancements/
│   ├── 06-api-reference/
│   ├── 07-guides/
│   ├── 08-resources/
│   └── README.md
│
├── pnpm-workspace.yaml               # 🆕 Monorepo configuration
├── package.json                      # 🆕 Root package.json
├── .gitignore
├── .npmrc
├── README.md
└── LICENSE
```

---

## 📦 Package Details

### `packages/create-deesse-app/`

**Purpose:** CLI tool to bootstrap new DeesseJS projects

**Key Files:**

- `bin/index.js` - Executable entry point (shebang: `#!/usr/bin/env node`)
- `src/index.ts` - Main CLI logic
- `src/prompts.ts` - Interactive questions using `@clack/prompts`
- `src/templates.ts` - Template selection and metadata
- `src/utils/copy.ts` - Copy template files to target directory
- `src/utils/placeholders.ts` - Replace variables like `{{projectName}}`
- `src/utils/git.ts` - Initialize git repository
- `src/utils/install.ts` - Run package manager install

**Dependencies:**

- `@clack/prompts` - Interactive prompts
- `commander` - CLI argument parsing
- `picocolors` - Terminal colors
- `fs-extra` or `cpy` - File operations
- `replace-in-file` - String replacement

**Usage:**

```bash
# Local development
pnpm --filter create-deesse-app dev

# Execute CLI
node packages/create-deesse-app/bin/index.js

# After npm publish
npx create-deesse-app@latest
```

---

### `packages/core/` ⏳ Future

**Purpose:** Core DeesseJS framework

**Responsibilities:**

- Collection system
- Configuration management
- Plugin system
- Type generation

**Will export:**

```typescript
import { defineConfig, defineCollection } from '@deessejs/core';
```

---

### `packages/orm/` ⏳ Future

**Purpose:** ORM layer on top of Drizzle

**Responsibilities:**

- Drizzle ORM wrapper
- Auto-generated CRUD methods
- Migration system
- Type-safe queries

**Will export:**

```typescript
import { db } from '@deessejs/orm'

// Auto-generated methods
db.posts.findMany()
db.posts.create({ data: {...} })
db.posts.update({ where: {...}, data: {...} })
db.posts.delete({ where: {...} })
```

---

### `packages/admin/` ⏳ Future

**Purpose:** Admin dashboard for content management

**Structure:**

- Next.js 15+ App Router
- Accessible at `/admin/[...slug]`
- Plugin system for extensions

**Will provide:**

- Content management UI
- Collection management
- Media management
- Settings pages

---

## 🎨 Templates

### Template: `minimal`

**Purpose:** Rapid prototyping and learning

**Contents:**

- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- No shadcn/ui
- No testing tools
- No linters

**Size:** ~50MB
**Install time:** ~30s

---

### Template: `default` ⭐

**Purpose:** Standard projects (recommended)

**Contents:**

- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components (button, card, input)
- ESLint + Prettier
- Vitest + Testing Library
- Playwright (E2E)
- MSW (API mocking)

**Size:** ~150MB
**Install time:** ~60s

---

### Template: `full-stack`

**Purpose:** Production-ready applications

**Contents:**

- Everything from `default`
- Vitest UI mode
- Test coverage
- Husky (pre-commit hooks)
- lint-staged
- Commitlint
- GitHub Actions workflows

**Size:** ~180MB
**Install time:** ~90s

---

## 🔧 Root Configuration Files

### `pnpm-workspace.yaml`

Defines the monorepo structure:

```yaml
packages:
  - 'packages/*'
  - 'templates/*'
  - 'apps/*'
```

**Why pnpm?**

- Fast installation
- Efficient disk space usage
- Strict dependency management
- Built-in monorepo support

---

### Root `package.json`

```json
{
  "name": "deessejs",
  "version": "0.0.1",
  "private": true,
  "description": "A modern headless CMS for Next.js",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=18.17.0",
    "pnpm": ">=8.0.0"
  }
}
```

---

### `.gitignore`

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/
out/

# Environment
.env
.env*.local

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
playwright-report/
test-results/

# Misc
.turbo/
```

---

## 📊 Directory Summary

| Directory                     | Purpose             | Status       |
| ----------------------------- | ------------------- | ------------ |
| `packages/create-deesse-app/` | CLI tool            | 🆕 To create |
| `packages/core/`              | Core framework      | ⏳ Future    |
| `packages/orm/`               | ORM layer           | ⏳ Future    |
| `packages/admin/`             | Admin dashboard     | ⏳ Future    |
| `templates/minimal/`          | Minimal template    | 🆕 To create |
| `templates/default/`          | Default template    | 🆕 To create |
| `templates/full-stack/`       | Full-stack template | 🆕 To create |
| `apps/web/`                   | Documentation site  | ✅ Existing  |
| `docs/`                       | Markdown docs       | ✅ Existing  |

---

## 🚀 Development Workflow

### Adding a New Package

```bash
# Create package directory
mkdir packages/new-package

# Initialize package
cd packages/new-package
pnpm init

# Add to root package.json scripts
# Add to pnpm-workspace.yaml (if needed)
```

### Working with Templates

```bash
# Create a new template
mkdir templates/new-template

# Copy base structure from an existing template
cp -r templates/default/* templates/new-template/

# Modify package.json
# Update dependencies
# Adjust configuration files
```

### Running the CLI (Development)

```bash
# From repository root
pnpm --filter create-deesse-app dev

# Or directly with node
node packages/create-deesse-app/bin/index.js

# Test template creation
cd /tmp
node /path/to/deessejs/packages/create-deesse-app/bin/index.js
```

---

## 🎯 Next Steps

### Phase 1: Foundation ✅

- [x] Architecture design
- [x] Documentation (v0.0.1)
- [ ] Create `pnpm-workspace.yaml`
- [ ] Create root `package.json`
- [ ] Set up TypeScript configuration

### Phase 2: CLI Package

- [ ] Create `packages/create-deesse-app/` structure
- [ ] Implement basic CLI with `@clack/prompts`
- [ ] Add template copying logic
- [ ] Add placeholder replacement
- [ ] Add git initialization

### Phase 3: Templates

- [ ] Create `minimal` template
- [ ] Create `default` template
- [ ] Create `full-stack` template

### Phase 4: Testing

- [ ] Test CLI with all templates
- [ ] Test generated projects
- [ ] Add CI/CD for CLI

---

## 🔗 Related Documentation

- [CLI Roadmap](./cli-roadmap.md) - Detailed CLI architecture
- [Getting Started](../../01-getting-started/overview.md) - User-facing docs
- [Core Concepts](../../02-core-concepts/architecture.md) - Framework architecture

---

**Note:** This document will be updated as the repository structure evolves.
