# What is Changesets? - Complete Guide

> **A comprehensive guide to understanding Changesets for monorepo version management**
>
> **Last Updated:** 2025-02-16

---

## 🎯 The Problem: Why Do We Need Changesets?

### Managing Versions in a Monorepo is Hard

Imagine you have a monorepo with 3 packages:

```
my-monorepo/
├── packages/
│   ├── package-a/     (version 1.0.0)
│   ├── package-b/     (version 2.3.0) - depends on package-a
│   └── package-c/     (version 0.5.0) - depends on package-a and package-b
```

### Scenario: You Make Changes

You fix a bug in `package-a` and add a new feature to `package-b`.

#### Without Changesets (Manual Nightmare):

1. **Decide version bumps:**
   - `package-a`: 1.0.0 → 1.0.1 (bug fix = patch)
   - `package-b`: 2.3.0 → 2.4.0 (new feature = minor)

2. **Update dependencies manually:**
   - `package-c` depends on `package-a@^1.0.0`
   - Should you update it to `^1.0.1`? What if the bug fix breaks `package-c`?

3. **Update package.json files:**

   ```json
   // packages/package-a/package.json
   {
     "name": "package-a",
     "version": "1.0.1"  // ← Manually updated
   }

   // packages/package-b/package.json
   {
     "name": "package-b",
     "version": "2.4.0",  // ← Manually updated
     "dependencies": {
       "package-a": "^1.0.1"  // ← Manually updated
     }
   }

   // packages/package-c/package.json
   {
     "name": "package-c",
     "version": "0.5.0",
     "dependencies": {
       "package-a": "^1.0.1",  // ← Manually updated
       "package-b": "^2.4.0"   // ← Manually updated
     }
   }
   ```

4. **Generate CHANGELOGs manually:**
   - Create/append to `CHANGELOG.md` for each package
   - Remember what changed
   - Format it consistently

5. **Publish to npm:**

   ```bash
   npm publish --workspace=package-a
   npm publish --workspace=package-b
   npm publish --workspace=package-c
   ```

6. **Create git tags:**
   ```bash
   git tag package-a@1.0.1
   git tag package-b@2.4.0
   git tag package-c@0.5.0
   git push --tags
   ```

#### Problems with Manual Approach:

- ❌ **Error-prone** - Easy to forget to update a dependency
- ❌ **Time-consuming** - Lots of manual steps
- ❌ **Inconsistent** - Different developers might do it differently
- ❌ **No traceability** - Hard to know WHY a version was bumped
- ❌ **No documentation** - Changelogs often forgotten or incomplete

---

## ✅ The Solution: What is Changesets?

**Changesets** is a tool that automates version management in monorepos. It solves all the problems above.

### Core Concept

Changesets introduces a simple idea: **declare your changes first, automate everything else later.**

### How It Works (30-Second Overview)

```
1. Developer makes changes
   ↓
2. Developer runs: pnpm changeset
   ↓
3. Changeset asks: What changed? What version bump?
   ↓
4. Changeset creates a file: .changeset/cool-words.md
   ↓
5. Developer commits the changeset file
   ↓
6. CI/CD detects changeset files
   ↓
7. Changesets automatically:
   - Bumps versions
   - Updates dependencies
   - Generates CHANGELOGs
   - Publishes to npm
   - Creates git tags
```

---

## 📝 What is a "Changeset"?

A **changeset** is just a Markdown file that describes a change:

```markdown
---
'package-a': patch
'package-b': minor
---

Fixed a bug in package-a and added new feature to package-b
```

### Location

```
my-monorepo/
└── .changeset/
    ├── cool-words.md          # ← Your changeset
    ├── another-change.md      # ← Another changeset
    └── config.json            # ← Changesets configuration
```

### Structure

```markdown
---
'package-name': version-type
---

Human-readable description of the change
```

**Example:**

```markdown
---
'@deessejs/core': minor
'@deessejs/orm': patch
---

Added new collection system and fixed ORM bug with TypeScript types
```

---

## 🔄 The Complete Changesets Workflow

### Step 1: Make Your Changes

```bash
# Work on your packages
git checkout -b feature/new-collection-system

# Make changes to packages
# ... code code code ...

# Test locally
pnpm test
pnpm build
```

### Step 2: Create a Changeset

```bash
pnpm changeset
```

**Interactive CLI appears:**

```
? Which packages would you like to include? ›
  ◯ @deessejs/create-deesse-app
  ◯ @deessejs/core
  ◯ @deessejs/orm
```

**Select packages with space:**

```
? Which packages would you like to include? ›
  ◯ @deessejs/create-deesse-app
  ● @deessejs/core           ← Selected
  ● @deessejs/orm            ← Selected
```

**Press Enter to continue**

```
? What kind of change is this for @deessejs/core? ›
  ○ patch   (bug fixes)
  ● minor   (new features, backward compatible) ← Selected
  ○ major   (breaking changes)
```

```
? What kind of change is this for @deessejs/orm? ›
  ● patch   (bug fixes) ← Selected
  ○ minor   (new features, backward compatible)
  ○ major   (breaking changes)
```

```
? Please enter a summary for this change: ›
Added new collection system to core and fixed type inference bug in ORM
```

**Press Enter**

### Step 3: Changeset File Created

```markdown
---
'@deessejs/core': minor
'@deessejs/orm': patch
---

Added new collection system to core and fixed type inference bug in ORM
```

File saved as: `.changeset/tall-rabbits-fly.md`

### Step 4: Commit Your Changes

```bash
git add .
git commit -m "feat: add collection system and fix ORM types"
git push
```

### Step 5: Create Pull Request

```bash
gh pr create --title "feat: add collection system" --body "Implements new collection system"
```

### Step 6: Merge PR to Main

When your PR is merged to `main`, the **Changesets GitHub Action** detects your changeset file.

### Step 7: Automatic "Version Packages" PR

Changesets Action creates a new PR:

```
PR Title: "Version Packages"
PR Body:
This PR was opened by Changesets action

@deessejs/core: 1.2.3 → 1.3.0
@deessejs/orm: 2.0.1 → 2.0.2

⚠️  This is a automated PR. DO NOT edit manually ⚠️
```

**What the PR contains:**

1. **Updated package.json files:**

   ```json
   // packages/core/package.json
   {
     "version": "1.3.0"  // ← Bumped from 1.2.3
   }

   // packages/orm/package.json
   {
     "version": "2.0.2",  // ← Bumped from 2.0.1
     "dependencies": {
       "@deessejs/core": "^1.3.0"  // ← Automatically updated!
     }
   }
   ```

2. **Generated CHANGELOG.md files:**

   ```markdown
   # @deessejs/core

   ## 1.3.0

   ### Minor Changes

   - abc123: Added new collection system to core

   # @deessejs/orm

   ## 2.0.2

   ### Patch Changes

   - def456: Fixed type inference bug in ORM
   ```

3. **Deleted consumed changeset files:**
   - `.changeset/tall-rabbits-fly.md` is deleted

### Step 8: Review and Merge

**Review the PR:**

- Check version bumps are correct
- Check CHANGELOGs look good
- Verify dependency updates

**Merge the "Version Packages" PR**

### Step 9: Automatic Publish

When merged, the Changesets Action:

1. Publishes all packages to npm
2. Creates git tags
3. Creates a GitHub Release

```bash
# Automated by CI
npm publish --workspace=@deessejs/core  # Publishes v1.3.0
npm publish --workspace=@deessejs/orm   # Publishes v2.0.2

git tag @deessejs/core@1.3.0
git tag @deessejs/orm@2.0.2
git push --tags
```

---

## 🎭 Visual Example: From Code to Release

### Initial State

```json
// packages/core/package.json
{
  "name": "@deessejs/core",
  "version": "1.2.3"
}

// packages/orm/package.json
{
  "name": "@deessejs/orm",
  "version": "2.0.1",
  "dependencies": {
    "@deessejs/core": "^1.2.3"
  }
}

// packages/create-deesse-app/package.json
{
  "name": "@deessejs/create-deesse-app",
  "version": "0.5.0",
  "dependencies": {
    "@deessejs/core": "^1.2.3"
  }
}
```

### You Create a Changeset

```bash
pnpm changeset
```

Select: `@deessejs/core` → `minor`

Message: `Add new collection API`

**File created:** `.changeset/proud-cats-rule.md`

```markdown
---
'@deessejs/core': minor
---

Add new collection API
```

### After "Version Packages" PR

```json
// packages/core/package.json
{
  "name": "@deessejs/core",
  "version": "1.3.0"  // ← 1.2.3 → 1.3.0 (minor bump)
}

// packages/orm/package.json
{
  "name": "@deessejs/orm",
  "version": "2.0.1",
  "dependencies": {
    "@deessejs/core": "^1.3.0"  // ← Automatically updated!
  }
}

// packages/create-deesse-app/package.json
{
  "name": "@deessejs/create-deesse-app",
  "version": "0.5.0",
  "dependencies": {
    "@deessejs/core": "^1.3.0"  // ← Automatically updated!
  }
}
```

**All dependent packages updated automatically!** ✨

---

## 🔢 Semantic Versioning Refresher

Changesets uses **Semantic Versioning (SemVer)**.

### Format: `MAJOR.MINOR.PATCH`

Examples: `1.3.0`, `2.0.1`, `0.5.2`

### When to Bump What

| Type      | Bump              | Meaning                            | Example                          |
| --------- | ----------------- | ---------------------------------- | -------------------------------- |
| **PATCH** | `1.0.0` → `1.0.1` | Bug fixes, no breaking changes     | Fix typo, fix crash bug          |
| **MINOR** | `1.0.0` → `1.1.0` | New features, backwards compatible | Add new function, add new option |
| **MAJOR** | `1.0.0` → `2.0.0` | Breaking changes                   | Remove function, change API      |

### Real Examples

```
Bug fix:        1.2.3 → 1.2.4 (patch)
New feature:    1.2.3 → 1.3.0 (minor)
Breaking API:   1.2.3 → 2.0.0 (major)
```

---

## 🆚 Changesets vs Alternatives

### Changesets vs Lerna

| Feature          | Changesets      | Lerna          |
| ---------------- | --------------- | -------------- |
| **Complexity**   | Simple          | More complex   |
| **Approach**     | Changeset files | CLI commands   |
| **Changelogs**   | Auto-generated  | Manual         |
| **Dependencies** | Auto-updates    | Manual         |
| **Active**       | ✅ Yes          | ⚠️ Less active |

### Changesets vs Manual

| Task         | Manual             | Changesets      |
| ------------ | ------------------ | --------------- |
| Version bump | Manual file edit   | One CLI command |
| Dep updates  | Manual             | Automatic       |
| CHANGELOG    | Manual write       | Auto-generated  |
| Publishing   | Manual per package | One command     |
| Traceability | ❌ None            | ✅ Git history  |

---

## 🎓 Why Changesets is Awesome

### 1. **Declarative**

You declare WHAT changed, not HOW to version it.

```markdown
---
'@deessejs/core': minor
---

Add new collection API
```

That's it! Changesets figures out the rest.

### 2. **Traceable**

Every version bump has a history:

```bash
git log --follow packages/core/CHANGELOG.md
```

Shows you exactly why each version was bumped.

### 3. **Collaborative**

Changeset files are just Markdown:

```
.changeset/
├── feature-a.md    # Created by Alice
├── bug-fix-b.md    # Created by Bob
└── refactor-c.md   # Created by Charlie
```

Anyone can create changesets in their PRs.

### 4. **Safe**

Changesets doesn't modify `package.json` until you merge the "Version Packages" PR.

### 5. **Automated**

No manual version bumping, no manual dependency updates, no manual CHANGELOG writing.

---

## 🚀 Quick Reference Commands

```bash
# Initialize Changesets in your repo
pnpm add -D @changesets/cli
pnpm changeset init

# Create a changeset
pnpm changeset

# See what versions will be bumped (dry run)
pnpm changeset version --snapshot

# Generate CHANGELOGs and bump versions (consumes changesets)
pnpm changeset version

# Publish packages to npm
pnpm changeset publish

# Enter "preview mode" (for testing)
pnpm changeset pre enter <tag>
```

---

## 📚 Real-World Examples

### Example 1: Bug Fix

```markdown
---
'@deessejs/orm': patch
---

Fixed query builder not handling null values correctly
```

**Result:** `@deessejs/orm`: `1.0.0` → `1.0.1`

### Example 2: New Feature

```markdown
---
'@deessejs/core': minor
---

Added support for MongoDB adapter
```

**Result:** `@deessejs/core`: `1.0.0` → `1.1.0`

### Example 3: Breaking Change

```markdown
---
'@deessejs/core': major
---

BREAKING: Removed deprecated `find()` method, use `query()` instead
```

**Result:** `@deessejs/core`: `1.0.0` → `2.0.0`

### Example 4: Multiple Packages

```markdown
---
'@deessejs/core': minor
'@deessejs/orm': minor
'@deessejs/admin': patch
---

Added new collection system to core, updated ORM to use it, fixed admin UI bug
```

**Result:**

- `@deessejs/core`: `1.0.0` → `1.1.0`
- `@deessejs/orm`: `2.0.0` → `2.1.0`
- `@deessejs/admin`: `0.5.0` → `0.5.1`

---

## 🤔 Common Questions

### Q: What if I forget to create a changeset?

**A:** The CI will fail! Changesets Action checks for unreleased changesets.

### Q: Can I edit a changeset after creating it?

**A:** Yes! Just edit the Markdown file in `.changeset/`.

### Q: What if multiple PRs have changesets?

**A:** They all get merged into one "Version Packages" PR.

### Q: Can I skip the CI and version manually?

**A:** Yes, but not recommended. Use `pnpm changeset version` to consume changesets.

### Q: Do I have to use GitHub Actions?

**A:** No, but it's the easiest integration. Works with GitLab CI, CircleCI, etc.

---

## 🔗 Resources

- [Official Changesets GitHub](https://github.com/changesets/changesets)
- [Changesets Documentation](https://github.com/changesets/changesets/blob/main/docs/README.md)
- [Semantic Versioning Spec](https://semver.org/)
- [LogRocket: Guide to Changesets](https://blog.logrocket.com/version-management-changesets/)
- [Changesets Action](https://github.com/changesets/action)

---

## 📝 Summary

**Changesets = Monorepo Version Management on Autopilot**

1. **Declare changes** with simple Markdown files
2. **Automatically updates** dependencies
3. **Generates** CHANGELOGs
4. **Publishes** to npm
5. **Creates** git tags and releases

**No more manual version management hell!** 🎉

---

**Want to see Changesets in action?** Check out [CI/CD & Version Management](./ci-cd.md) for the DeesseJS setup.
