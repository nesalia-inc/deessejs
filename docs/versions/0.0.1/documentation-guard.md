# Documentation Guard System

> **Version:** 1.0
> **Last Updated:** 2025-02-16
> **Purpose:** Ensuring documentation stays synchronized with code changes

---

## 🎯 Overview

The **Documentation Guard** is an automated system that enforces documentation updates alongside code changes. It prevents Pull Requests from merging if documentation has not been updated to reflect code modifications.

### Core Principle

**Code changes require corresponding documentation updates.**

If you modify code, you must also update the relevant documentation. The Documentation Guard system enforces this rule through automated checks.

---

## 🚀 Why We Need This System

### Problems Without Documentation Guard

1. **Outdated Documentation**
   - Code evolves but docs don't
   - Users encounter old patterns
   - Confusion and frustration

2. **Documentation Debt**
   - Docs lag behind features
   - "We'll update docs later" never happens
   - Technical debt accumulates

3. **Inconsistent Quality**
   - Some features documented, others not
   - Depends on individual developer diligence
   - No enforcement mechanism

### How Documentation Guard Solves These Problems

- ✅ **Enforces** documentation updates at PR time
- ✅ **Prevents** merging undocumented changes
- ✅ **Automates** the verification process
- ✅ **Provides** clear feedback when docs are missing

---

## 🔒 How It Works

### High-Level Flow

```
Developer creates PR
        ↓
Code changes detected
        ↓
Documentation Guard runs
        ↓
Documentation updated?
        ↓
    ┌─────┴─────┐
   NO            YES
    ↓             ↓
BLOCK PR     Allow merge
```

### Implementation Layers

The Documentation Guard operates at multiple layers:

#### Layer 1: File Change Detection

Identifies which files have changed in a PR:

- Source code files (`packages/`, `src/`)
- Documentation files (`docs/`, `web/content/docs/`)

#### Layer 2: Correlation Check

Determines if code changes have corresponding documentation changes:

- Which packages/modules changed
- Which documentation sections should be updated
- Whether documentation was actually updated

#### Layer 3: Enforcement

Takes action based on the check:

- **Pass:** PR can proceed to review
- **Fail:** PR is blocked, clear error message provided

---

## 📋 Documentation Coverage Rules

### Package → Documentation Mapping

Different parts of the codebase map to different documentation sections:

#### `packages/create-deesse-app/`

**Maps to:** `web/content/docs/cli/`

**When to update:**

- Adding new CLI commands
- Changing CLI options
- Modifying template structure
- Fixing CLI bugs

**Required documentation:**

- Command reference
- Usage examples
- Option explanations
- Template descriptions

#### `packages/core/`

**Maps to:** `web/content/docs/guides/`

**When to update:**

- New collection types
- API changes
- New hooks or events
- Breaking changes

**Required documentation:**

- Feature guides
- API reference
- Migration guides (for breaking changes)

#### `packages/orm/`

**Maps to:** `web/content/docs/guides/` + Technical docs

**When to update:**

- New query methods
- Schema changes
- Performance improvements

**Required documentation:**

- Query examples
- Schema documentation
- Technical notes (in `docs/@versions/0.0.1/`)

#### `packages/admin/`

**Maps to:** `web/content/docs/admin-dashboard/`

**When to update:**

- New admin features
- UI changes
- Configuration options

**Required documentation:**

- Feature overview
- Configuration guide
- Screenshots (for UI changes)

---

## 🤖 Automated Verification Process

### GitHub Actions Workflow

The Documentation Guard runs as a GitHub Actions workflow on every Pull Request.

#### What It Checks

1. **Changed Files Analysis**
   - Identifies modified files
   - Categorizes changes (code vs docs)

2. **Coverage Verification**
   - Checks if code packages have corresponding doc updates
   - Verifies doc sections are modified

3. **Compliance Check**
   - Validates documentation completeness
   - Ensures doc changes are meaningful (not just whitespace)

#### Example Scenarios

**Scenario 1: Code Change Without Doc Update**

```
Changed Files:
- packages/create-deesse-app/src/index.ts (NEW)
- packages/create-deesse-app/src/prompts.ts (MODIFIED)

Documentation Changes:
- None

Result: ❌ BLOCKED
Error: "CLI package changed but documentation was not updated.
       Please update web/content/docs/cli/ and add examples."
```

**Scenario 2: Code Change With Doc Update**

```
Changed Files:
- packages/create-deesse-app/src/index.ts (MODIFIED)
- web/content/docs/cli/overview.mdx (MODIFIED)

Result: ✅ PASSED
Note: "Documentation updated for CLI changes"
```

**Scenario 3: Doc-Only Change**

```
Changed Files:
- web/content/docs/cli/overview.mdx (MODIFIED)
- web/content/docs/cli/examples.mdx (CREATED)

Code Changes:
- None

Result: ✅ PASSED
Note: "Documentation-only change, no code guard check needed"
```

---

## 📝 Workflow for Developers

### Step-by-Step Process

#### 1. Make Your Code Changes

```bash
# Develop your feature
git checkout -b feature/new-cli-option

# Make code changes
vim packages/create-deesse-app/src/prompts.ts
git add packages/create-deesse-app/src/prompts.ts
git commit -m "feat: add new interactive mode"
```

#### 2. Update Documentation

```bash
# Identify which docs need updating
# Based on the mapping rules above

# Update user documentation
vim web/content/docs/cli/overview.mdx
git add web/content/docs/cli/overview.mdx
git commit -m "docs: add interactive mode to CLI overview"
```

#### 3. Create Pull Request

```bash
git push
gh pr create --title "feat: add CLI interactive mode"
```

#### 4. CI Verification

The Documentation Guard automatically runs:

- ✅ **If docs updated:** PR proceeds to review
- ❌ **If docs missing:** PR blocked with clear error

#### 5. Fix If Blocked

If your PR is blocked:

```
❌ Documentation Guard: Documentation not updated

Required documentation sections:
- web/content/docs/cli/overview.mdx

Please update documentation and push again.
```

Update the docs, push, and CI will re-run automatically.

---

## 🎯 Documentation Guard Rules

### Rule 1: Public API Changes

**Trigger:** Changes to public APIs, commands, options

**Requirement:** Update user-facing documentation

**Examples:**

- New CLI command → Update `web/content/docs/cli/`
- New config option → Update `web/content/docs/guides/configuration.md`
- Breaking change → Update migration guide

### Rule 2: Internal Architecture Changes

**Trigger:** Changes to internal implementation, architecture

**Requirement:** Update technical documentation

**Examples:**

- New package structure → Update `docs/@versions/0.0.1/development/repository-structure.md`
- Build process changes → Update `docs/@versions/0.0.1/development/developer-experience.md`

### Rule 3: Bug Fixes

**Trigger:** Bug fixes that affect user behavior

**Requirement:** Document the fix if user-visible

**Examples:**

- Fixed crash → Update troubleshooting guide
- Performance improvement → Mention in release notes
- Fixed edge case → Add note to relevant docs

### Rule 4: New Features

**Trigger:** New features added

**Requirement:** Comprehensive documentation

**Examples:**

- New feature → Create getting started guide
- New capability → Add examples
- Enhancement → Update feature overview

---

## 🔧 Configuration and Customization

### Guard Strictness Levels

The Documentation Guard can operate at different strictness levels:

#### Level 1: Warning (Non-Blocking)

Documentation issues generate warnings but don't block PRs.

**Use when:**

- Early development
- Experimental features
- Documentation migration in progress

#### Level 2: Soft Block (Default)

Documentation issues block PRs but can be overridden.

**Use when:**

- Normal development
- Most features
- Standard workflow

#### Level 3: Hard Block

Documentation issues strictly block PRs with no override.

**Use when:**

- Public APIs
- Breaking changes
- User-facing features

### Exemptions

Certain changes may be exempt from documentation requirements:

**Exempt Changes:**

- Internal test updates
- Refactoring that doesn't affect behavior
- Typo fixes in code
- Performance improvements (transparent to users)
- Dependency updates (unless behavior changes)

**How to Exempt:**
Add a commit message tag: `[nodoc]` or `[docs-not-required]`

```bash
git commit -m "chore: update dependencies [docs-not-required]"
```

---

## 📊 Guard Effectiveness Metrics

### What We Measure

1. **Documentation Coverage**
   - Percentage of code changes with doc updates
   - Identification of poorly documented areas

2. **PR Block Rate**
   - How often PRs are blocked for missing docs
   - Trends over time

3. **Time to Unblock**
   - How quickly blocked PRs are fixed
   - Average number of retries

4. **Documentation Quality**
   - Completeness of updates
   - Accuracy of information

### Continuous Improvement

Based on metrics, we can:

- **Adjust** strictness levels
- **Identify** documentation gaps
- **Provide** better guidance
- **Automate** more documentation generation

---

## 🚨 Troubleshooting Documentation Guard Issues

### Problem: False Positive - Guard Blocks Unnecessarily

**Symptom:** PR blocked but documentation doesn't need updating

**Solutions:**

1. Use exemption tag: `[docs-not-required]`
2. Update guard rules if this happens often
3. Adjust strictness level temporarily

### Problem: False Negative - Guard Should Block But Doesn't

**Symptom:** PR passes but documentation was needed

**Solutions:**

1. Review guard rules for gaps
2. Add new mapping rules
3. Increase strictness level

### Problem: Unclear What Documentation to Update

**Symptom:** PR blocked but error message doesn't specify which docs

**Solutions:**

1. Check the Package → Documentation mapping above
2. Review similar PRs for examples
3. Ask in team chat for guidance

---

## 🎓 Best Practices

### For Developers

#### Before Creating PR

1. **Identify Affected Documentation**
   - Which packages changed?
   - Which user-facing features changed?
   - What docs map to these changes?

2. **Update Documentation Early**
   - Don't leave docs to the end
   - Commit docs alongside code

3. **Test Documentation**
   - Verify examples work
   - Check instructions are clear
   - Ensure accuracy

#### During PR Review

1. **Respond to Documentation Feedback**
   - Update docs as requested
   - Clarify documentation choices

2. **Keep Docs in Sync**
   - If code changes during review, update docs too

### For Maintainers

#### During Review

1. **Check Documentation Quality**
   - Is it accurate?
   - Is it complete?
   - Are examples clear?

2. **Provide Specific Feedback**
   - Point to exact sections needing updates
   - Suggest improvements

3. **Be Consistent**
   - Apply documentation guard rules fairly
   - Don't make exceptions unless necessary

---

## 🔮 Future Enhancements

### Potential Improvements

1. **Automatic Documentation Generation**
   - Generate API docs from TypeScript types
   - Extract examples from tests
   - Auto-create doc stubs

2. **Smart Documentation Detection**
   - AI-powered identification of needed doc updates
   - Suggest which sections to modify

3. **Interactive Documentation Assistant**
   - CLI tool to guide documentation updates
   - Check docs locally before pushing

4. **Documentation Coverage Dashboard**
   - Visual representation of doc coverage
   - Identify gaps and trends

---

## 📚 Related Documentation

- [Development Methodology](../guidelines/development-methodology.md)
- [Development Experience](./development/developer-experience.md)
- [CI/CD & Versioning](./cicd/ci-cd.md)
- [Repository Structure](./development/repository-structure.md)

---

## 📝 Summary

### The Documentation Guard System Ensures

- ✅ Documentation stays synchronized with code
- ✅ No undocumented code reaches production
- ✅ Clear requirements for contributors
- ✅ Automated enforcement
- ✅ Consistent quality across the project

### Key Takeaways

1. **Code changes require documentation updates**
2. **The guard blocks PRs without documentation**
3. **Clear mapping exists between packages and docs**
4. **Exemptions exist for internal changes**
5. **System is continuously improved based on metrics**

---

**Remember:** The Documentation Guard is here to help, not hinder. It ensures high-quality, well-documented software for all DeesseJS users.

---

**Last Updated:** 2025-02-16
**Version:** 0.0.1
**Maintained By:** DeesseJS Core Team
