# DeesseJS v0.0.1 - CLI & Templates Architecture

> **Status:** Work in Progress
> **Last Updated:** 2025-02-16
> **Phase:** Project Initialization

---

## 🎯 Goal

Create a `create-deesse-app` tool that allows developers to bootstrap a DeesseJS project with a single command:

```bash
npx create-deesse-app@latest
```

---

## 🏗️ Overall Architecture

### Repository Structure

```
deessejs/
├── packages/
│   ├── create-deesse-app/          # CLI package
│   ├── core/                       # @deessejs/core (future)
│   ├── orm/                        # @deessejs/orm (future)
│   └── admin/                      # @deessejs/admin (future)
├── templates/                      # 🆕 Project templates
│   ├── default/                    # Recommended template
│   ├── minimal/                    # Minimal template
│   └── full-stack/                 # Production-ready template
├── apps/
│   └── web/                        # Documentation (existing)
├── pnpm-workspace.yaml
└── package.json
```

### Package `create-deesse-app`

```
create-deesse-app/
├── package.json
├── bin/
│   └── index.js                    # Entry point (shebang)
├── src/
│   ├── index.ts                    # Main entry point
│   ├── prompts.ts                  # Interactive questions
│   ├── templates.ts                # Template selection
│   └── utils/
│       ├── copy.ts                 # File copying
│       ├── placeholders.ts         # Variable replacement
│       ├── git.ts                  # Git initialization
│       └── install.ts              # Dependency installation
├── tsconfig.json
└── README.md
```

---

## 📦 Available Templates (v0.0.1)

### Template 1: `default` ⭐ Recommended

**Complete stack for standard projects:**

- ✅ Next.js 15+ (App Router)
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ shadcn/ui (base components: button, card, input)
- ✅ ESLint + Prettier
- ✅ **Complete testing:**
  - Vitest (unit & component tests)
  - @testing-library/react
  - Playwright (E2E tests)
  - MSW (Mock Service Worker)

**Use case:** Most projects

**Installed size:** ~150MB
**Installation time:** ~60s

---

### Template 2: `minimal`

**Minimal stack for rapid prototyping:**

- ✅ Next.js 15+ (App Router)
- ✅ TypeScript
- ✅ Tailwind CSS
- ⚪ No shadcn/ui
- ⚪ No testing tools
- ⚪ No configured linters

**Use case:**

- Rapid prototyping
- Learning/education
- Personal projects
- Demonstrations

**Installed size:** ~50MB
**Installation time:** ~30s

---

### Template 3: `full-stack`

**Maximum stack for production:**

- ✅ Everything from `default` template
- ✅ **Advanced testing:**
  - Vitest + UI (watch mode with interface)
  - Test coverage
  - Integration tests
  - Playwright with visual regression
- ✅ **Code quality:**
  - Husky (pre-commit hooks)
  - lint-staged
  - Commitlint
- ✅ **CI/CD:**
  - GitHub Actions workflows
  - Automated tests on PRs

**Use case:**

- Enterprise projects
- Development teams
- Production

**Installed size:** ~180MB
**Installation time:** ~90s

---

## 🎯 Tech Stack

### CLI Tools

| Tool                    | Usage                      |
| ----------------------- | -------------------------- |
| **@clack/prompts**      | Modern interactive prompts |
| **commander**           | CLI argument parsing       |
| **picocolors**          | Terminal colors            |
| **fs-extra** or **cpy** | File/folder copying        |
| **replace-in-file**     | Placeholder replacement    |

### Testing Stack (2025)

| Tool                       | Usage                 | Why?                                    |
| -------------------------- | --------------------- | --------------------------------------- |
| **Vitest**                 | Unit/component tests  | ⚡ Faster than Jest, Vite-compatible    |
| **@testing-library/react** | React component tests | 🎯 Industry standard                    |
| **Playwright**             | E2E tests             | 🎭 Parallel execution, multi-browser    |
| **MSW**                    | API mocking           | 🎭 Mock Service Worker, modern standard |

---

## 📋 CLI Execution Flow

```
┌─────────────────────────────────────────┐
│  npx create-deesse-app@latest           │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  1. Checks                              │
│     ✓ Node.js version (>=18.17.0)       │
│     ✓ npm/pnpm/yarn/bun version         │
│     ✓ Target directory available        │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. Interactive Questions               │
│     • Project name                      │
│     • Template (default/minimal/full)   │
│     • Package manager                   │
│     • Install dependencies?             │
│     • Initialize git?                   │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. Template Copy                       │
│     • Copy template files               │
│     • Replace placeholders               │
│       - {{projectName}}                 │
│       - {{importAlias}}                 │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  4. Dependency Installation            │
│     • npm/pnpm/yarn/bun install         │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  5. Git Initialization                  │
│     • git init                          │
│     • git add .                         │
│     • git commit -m "Initial commit"    │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  6. Final Message                       │
│     • Next steps                        │
│     • Useful commands                   │
│     • Documentation links               │
└─────────────────────────────────────────┘
```

---

## 📝 Example: `default` Template Structure

```
templates/default/
├── package.json                 # Pre-configured dependencies
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── components.json              # shadcn/ui config
├── playwright.config.ts
├── vitest.config.ts
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── README.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── input.tsx
│   ├── lib/
│   │   └── utils.ts              # cn() function
│   └── __tests__/               # Example tests
│       ├── App.test.tsx
│       └── setup.ts
├── e2e/                         # E2E tests
│   ├── app.spec.ts
│   └── example.spec.ts
└── public/
    └── favicon.ico
```

---

## 🎨 CLI Questions (Prompts)

### Questions Asked to the User

```typescript
// 1. Project name
{
  type: 'text',
  name: 'projectName',
  message: 'What is your project name?',
  initial: 'my-deesse-app',
  validate: (value) => {
    if (!value) return 'Project name is required';
    if (!/^[a-z0-9-]+$/.test(value)) {
      return 'Use only lowercase letters, numbers, and dashes';
    }
    return true;
  }
}

// 2. Template
{
  type: 'select',
  name: 'template',
  message: 'Which template would you like to use?',
  options: [
    {
      value: 'default',
      label: 'Default (recommended)',
      hint: 'Complete stack with tests and shadcn/ui'
    },
    {
      value: 'minimal',
      label: 'Minimal',
      hint: 'Minimal stack, rapid prototyping'
    },
    {
      value: 'full-stack',
      label: 'Full-stack',
      hint: 'Production-ready with CI/CD'
    }
  ]
}

// 3. Package manager
{
  type: 'select',
  name: 'packageManager',
  message: 'Which package manager?',
  options: [
    { value: 'npm', label: 'npm' },
    { value: 'pnpm', label: 'pnpm' },
    { value: 'yarn', label: 'yarn' },
    { value: 'bun', label: 'bun' }
  ]
}

// 4. Install dependencies
{
  type: 'confirm',
  name: 'installDeps',
  message: 'Install dependencies now?',
  initial: true
}

// 5. Initialize git
{
  type: 'confirm',
  name: 'initGit',
  message: 'Initialize a git repository?',
  initial: true
}
```

---

## 🚀 Final User Message

Example of message displayed after project creation:

```bash
✨ Project created successfully!

📦 Template: Default
   • Next.js 15
   • TypeScript
   • Tailwind CSS
   • shadcn/ui
   • Tests (Vitest + Playwright)

📂 Next steps:

   1. cd my-deesse-app
   2. npm run dev

   🚀 Open http://localhost:3000

🧪 Tests:

   npm test              # Unit tests
   npm run test:e2e      # E2E tests

📚 Documentation:
   https://deessejs.dev
```

---

## 📊 Template Comparison

| Feature         | Minimal | Default | Full-stack |
| --------------- | ------- | ------- | ---------- |
| Next.js 15+     | ✅      | ✅      | ✅         |
| TypeScript      | ✅      | ✅      | ✅         |
| Tailwind CSS    | ✅      | ✅      | ✅         |
| shadcn/ui       | ❌      | ✅      | ✅         |
| ESLint          | ❌      | ✅      | ✅         |
| Prettier        | ❌      | ✅      | ✅         |
| Vitest          | ❌      | ✅      | ✅         |
| Testing Library | ❌      | ✅      | ✅         |
| Playwright      | ❌      | ✅      | ✅         |
| MSW             | ❌      | ✅      | ✅         |
| Husky           | ❌      | ❌      | ✅         |
| lint-staged     | ❌      | ❌      | ✅         |
| Commitlint      | ❌      | ❌      | ✅         |
| GitHub Actions  | ❌      | ❌      | ✅         |
| **Size**        | ~50MB   | ~150MB  | ~180MB     |
| **Install**     | ~30s    | ~60s    | ~90s       |

---

## 🎯 Development Roadmap

### Phase 1: Foundation ✅ (In progress)

- [x] Architecture and design
- [x] v0.0.1 documentation
- [ ] Monorepo setup (pnpm-workspace.yaml)
- [ ] Basic `create-deesse-app` package

### Phase 2: Templates

- [ ] `minimal` template
- [ ] `default` template
- [ ] `full-stack` template

### Phase 3: CLI Implementation

- [ ] Interactive prompts (@clack/prompts)
- [ ] Template copy logic
- [ ] Placeholder replacement
- [ ] Dependency installation
- [ ] Git initialization

### Phase 4: Testing

- [ ] CLI tests
- [ ] Generated template tests

### Phase 5: Publishing

- [ ] npm publishing
- [ ] User documentation
- [ ] Examples and guides

---

## 🔗 Resources

### Documentation

- [Clack Prompts - Beautiful CLIs](https://clack.cc/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [shadcn/ui CLI](https://ui.shadcn.com/docs/cli)

### References

- [GitHub Repository Best Practices](https://dev.to/pwd9000/github-repository-best-practices-23ck)
- [Node.js CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)

---

**Note:** This document is living and will be updated as development progresses.
