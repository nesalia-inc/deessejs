# DeesseJS v0.0.1 - CI/CD & Version Management

> **Status:** Work in Progress
> **Last Updated:** 2025-02-16
> **Phase:** Project Initialization

---

## 🎯 Overview

This document defines the complete CI/CD and version management strategy for the DeesseJS monorepo, including GitHub Actions workflows and automated publishing with Changesets.

---

## 🚀 CI/CD - GitHub Actions

### Workflow Structure

```
.github/
└── workflows/
    ├── ci.yml                  # Main CI pipeline
    ├── lint.yml                # Linting checks
    └── release.yml             # npm publishing with Changesets
```

---

### Main CI Pipeline

#### `.github/workflows/ci.yml`

Runs on every push and pull request to the `main` branch.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-test:
    name: Build and Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Type check
        run: pnpm type-check

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./packages/**/coverage/coverage-final.json
          fail_ci_if_error: false
```

**What it checks:**

- ✅ Code linting (ESLint)
- ✅ Code formatting (Prettier)
- ✅ Type checking (TypeScript)
- ✅ Unit tests (Vitest)
- ✅ Build passes
- ✅ Test coverage upload

---

### Lint Workflow

#### `.github/workflows/lint.yml`

Separate workflow for quick linting feedback.

```yaml
name: Lint

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint Code
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Type check
        run: pnpm type-check
```

**Why separate?**

- Faster feedback on PRs
- Can run independently
- Focus only on code quality checks

---

### Release Workflow

#### `.github/workflows/release.yml`

Handles version management and npm publishing.

```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, 'ci skip')"

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**What it does:**

1. Triggers on push to `main`
2. Checks for Changesets
3. If changesets exist: Creates "Version Packages" PR
4. If PR is merged: Publishes to npm
5. Generates changelogs automatically

---

## 📦 Version Management - Changesets

We use **Changesets** for version management and publishing. It's the standard tool for monorepos.

### Why Changesets?

- ✅ Designed for monorepos
- ✅ Automated versioning
- ✅ Changelog generation
- ✅ Supports independent versioning
- ✅ Works with npm publish
- ✅ Great DX with CLI

---

### Installation

```bash
pnpm add -D @changesets/cli
pnpm changeset init
```

This creates:

- `.changeset/` directory
- `.changeset/config.json`

---

### Configuration

#### `.changeset/config.json`

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["web"]
}
```

**Configuration explained:**

| Option                       | Value     | Purpose                              |
| ---------------------------- | --------- | ------------------------------------ |
| `access`                     | `public`  | Packages are publicly scoped         |
| `baseBranch`                 | `main`    | Branch to trigger releases           |
| `updateInternalDependencies` | `patch`   | Bump internal deps on patch versions |
| `ignore`                     | `["web"]` | Don't publish web package            |

---

### Workflow

#### 1. Make Changes

Develop normally, make changes to packages.

#### 2. Create a Changeset

```bash
pnpm changeset
```

**Interactive prompts:**

```
? Which packages would you like to include?
  ○ create-deesse-app
  ● core
  ○ orm

? What kind of change is this for core?
  ○ patch
  ● minor
  ○ major

? Please enter a summary for this change:
  Add new collection system
```

This creates a file like `.changeset/cool-words.md`:

```markdown
---
'@deessejs/core': minor
---

Add new collection system
```

#### 3. Commit the Changeset

```bash
git add .changeset/cool-words.md
git commit -m "feat: add collection system"
git push
```

#### 4. CI Creates PR

Changesets GitHub Action detects new changesets and creates a PR:

```
"Version Packages"
```

The PR includes:

- Updated `package.json` versions
- Generated CHANGELOG.md files
- Lockfile updates

#### 5. Merge PR

When you merge the "Version Packages" PR:

1. Changesets publishes to npm
2. Creates GitHub release
3. Pushes git tag

---

### Example Changesets

#### Single Package (Patch)

```markdown
---
'@deessejs/create-deesse-app': patch
---

Fix template copy bug on Windows
```

#### Multiple Packages

```markdown
---
'@deessejs/core': minor
'@deessejs/orm': minor
---

Add new collection system and update ORM
```

#### Major Version

```markdown
---
'@deessejs/core': major
---

BREAKING: Redesign collection API
```

---

### Version Bump Types

| Type      | Meaning                            | Example           |
| --------- | ---------------------------------- | ----------------- |
| **patch** | Bug fixes                          | `1.0.0` → `1.0.1` |
| **minor** | New features, backwards compatible | `1.0.0` → `1.1.0` |
| **major** | Breaking changes                   | `1.0.0` → `2.0.0` |

---

## 🔐 Required Secrets

Configure these in your GitHub repository settings:

### For Releases

```
NPM_TOKEN=your_npm_token
```

**How to generate:**

1. Go to [npmjs.com](https://www.npmjs.com/)
2. Account settings → Access Tokens
3. Create new token → Automation
4. Add to GitHub: Settings → Secrets → New secret

### For Coverage (Optional)

```
CODECOV_TOKEN=your_codecov_token
```

**How to generate:**

1. Go to [codecov.io](https://codecov.io/)
2. Add your repository
3. Get token from settings
4. Add to GitHub: Settings → Secrets → New secret

---

## 📊 CI/CD Pipeline Flow

```
┌─────────────────────────────────────────┐
│  Developer pushes code                  │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  CI Workflow triggered                  │
│  • Lint                                │
│  • Format check                         │
│  • Type check                           │
│  • Unit tests                           │
│  • Build                                │
└─────────────────────────────────────────┘
                  │
                  ▼
            All checks pass?
                  │
         ┌────────┴────────┐
         │                 │
        YES              NO
         │                 │
         ▼                 ▼
┌──────────────────┐  ┌─────────────┐
│  PR can merge    │  │ Fix issues  │
└──────────────────┘  └─────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Create changeset for changes           │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Push to main                           │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Release Workflow triggered             │
│  • Detects changesets                   │
│  • Creates "Version Packages" PR        │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Merge "Version Packages" PR            │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Changesets Action                      │
│  • Bumps versions                       │
│  • Generates CHANGELOGs                │
│  • Publishes to npm                     │
│  • Creates GitHub Release               │
└─────────────────────────────────────────┘
```

---

## 🚀 Release Checklist

### Before Creating a Changeset

- [ ] Code is reviewed and merged
- [ ] All CI checks pass
- [ ] Tests are passing
- [ ] Documentation is updated
- [ ] Breaking changes are documented

### Creating the Changeset

- [ ] Run `pnpm changeset`
- [ ] Select affected packages
- [ ] Choose correct version bump (patch/minor/major)
- [ ] Write clear summary
- [ ] Commit the changeset file

### After PR Merge

- [ ] Check "Version Packages" PR
- [ ] Verify version bumps are correct
- [ ] Review CHANGELOG.md changes
- [ ] Merge PR when ready
- [ ] Verify npm packages are published
- [ ] Check GitHub release is created

---

## 🎯 Best Practices

### Version Bumping

1. **Be conservative with majors**
   - Only for true breaking changes
   - Document migration guide

2. **Use minors for new features**
   - Backwards compatible additions
   - New APIs, features

3. **Use patches for fixes**
   - Bug fixes
   - Performance improvements
   - Documentation updates

### Changeset Messages

Good examples:

```
"Add new collection system API"
"Fix template copy on Windows"
"Update dependencies to latest versions"
```

Bad examples:

```
"update"
"stuff"
"fix bug"
```

### Multiple Changesets

You can create multiple changesets in one PR:

```
.changeset/
├── feature-a.md    # Adds new feature (minor)
├── bug-fix-b.md    # Fixes bug (patch)
└── breaking-c.md   # Breaking change (major)
```

---

## 📚 Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Changesets Action](https://github.com/changesets/action)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Turborepo CI/CD Guide](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)

---

## 📝 Next Steps

### Phase 1: Setup

- [ ] Create `.github/workflows/` directory
- [ ] Add `ci.yml` workflow
- [ ] Add `lint.yml` workflow
- [ ] Add `release.yml` workflow

### Phase 2: Changesets

- [ ] Install `@changesets/cli`
- [ ] Initialize Changesets
- [ ] Configure `.changeset/config.json`
- [ ] Add `NPM_TOKEN` to GitHub secrets

### Phase 3: Testing

- [ ] Test CI workflow with a PR
- [ ] Create a test changeset
- [ ] Verify "Version Packages" PR creation
- [ ] Test npm publish (on test package first)

---

**Note:** This document will be updated as the CI/CD setup evolves.
