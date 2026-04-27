---
name: project-analysis
description: Analyze the deessejs project structure, conventions, and state. Use at session start to understand the codebase.
---

## Project Analysis

When you start working with this project, perform a structured analysis:

### 1. Structure Overview

List the packages in `packages/`:
- `deesse` — Core package
- `next` — Next.js integration
- `admin` — Admin dashboard components
- `ui` — Shared UI components
- `cli` — Command-line tools
- `create-deesse-app` — Project scaffolding

List the examples:
- `base` — Full example with admin
- `without-admin` — Minimal example

### 2. Tech Stack

Check key files to identify versions:
- Next.js (check `packages/next/package.json`)
- React (check root `package.json`)
- Drizzle ORM for database
- better-auth for authentication
- TypeScript throughout

### 3. Project Conventions

From CLAUDE.md and `docs/rules/`:

**Config pattern:**
```typescript
export const config = defineConfig({ ... })
// NO export default
// Import via @deesse-config alias
```

**Code style:**
- No classes — functions and modules only
- Pure functions, immutability
- Dependency injection
- No TODO comments

**Quality:**
- Tests via Vitest
- Run `pnpm test` before completing
- No modification to bypass validation

### 4. Project State

Run these commands and report:
```bash
git status --short
git log --oneline -5
```

Check for:
- Uncommitted changes
- Recent work on branches
- Any blocking issues

### 5. Documentation Structure

Check `docs/`:
- `rules/` — Code quality rules
- `reports/` — Exploratory analysis
- `plans/` — Feature plans (required before implementation)
- `learnings/` — Discovered insights
- `internal/` — Contibutor docs

### 6. Summary Report

End with a concise bullet list:
- Package structure
- Key tech versions
- Active conventions
- Current project state
- Any issues or blockers