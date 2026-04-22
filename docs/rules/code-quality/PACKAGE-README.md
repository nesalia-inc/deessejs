# Package README Rule

## Rule

Every package must have a `README.md` file in English that:
1. Explains the package purpose
2. Guides a new developer on how to get started
3. Must always be **kept up to date**

## Why

- **Onboarding** — New developers can understand a package without asking questions
- **Documentation** — Reduces documentation debt
- **Context** — Explains the "why" behind the code
- **Trust** — An outdated README is worse than no README

## Required Sections

Every package README must include:

```markdown
# [Package Name]

Brief description of what this package does and why it exists.

## Purpose

Explain the domain this package covers and its responsibilities.

## Installation

```bash
npm install @deessejs/[package-name]
```

## Usage

Basic usage example with code snippets.

## API

Key exports and how to use them.

## Configuration

Any configuration options or environment variables needed.

## Dependencies

List key dependencies and why they are needed.

## Contributing

(If applicable) How to work with this package during development.
```

## Example: `@deessejs/admin`

```markdown
# @deessejs/admin

React-agnostic admin configuration and utilities for the Deesse admin dashboard.

## Purpose

This package provides:
- Admin configuration builders (`defineAdminConfig`)
- Page tree structure definitions
- Navigation helpers (`findPage`, `toSidebarItems`)
- Admin user validation utilities

This package is **framework-agnostic** — it has no Next.js or React-specific imports.

## Usage

```typescript
import { defineAdminConfig, page, section } from "@deessejs/admin";

export const adminConfig = defineAdminConfig({
  pages: [
    page({
      name: "Dashboard",
      slug: "",
      icon: Home,
      content: <DashboardPage />,
    }),
  ],
});
```

## API

### `defineAdminConfig(options)`

Creates the admin configuration object.

### `page({ name, slug, icon, content })`

Creates a page entry for the admin navigation tree.

### `section({ name, slug, children })`

Creates a section that groups multiple pages.

## Dependencies

- `better-auth` — Authentication and user management
- `react` — Peer dependency for React types

## Key Files

| File | Purpose |
|------|---------|
| `src/default-pages.ts` | Default admin pages (Home, Users, Database, Settings) |
| `src/config/` | Configuration builders and types |
| `src/lib/` | Admin utilities (validation, navigation, first-admin setup) |
```

## Updatability Checklist

Before merging a PR that changes package behavior, verify:

- [ ] README reflects new/changed API
- [ ] Code examples still work
- [ ] Configuration options are documented
- [ ] Dependencies list is accurate
- [ ] No "TODO" or "FIXME" comments about documentation

## Anti-Pattern (Bad)

```markdown
# @deessejs/admin

Admin stuff.

## Usage

See the code.
```

Problems:
- Vague description
- No examples
- "See the code" is not documentation
- No guidance for new developers

## Template

Use this template for new packages:

```markdown
# @deessejs/[package-name]

Brief one-sentence description.

## Purpose

Explain what this package does and why it exists.

## Installation

```bash
npm install @deessejs/[package-name]
```

## Usage

Basic usage with code example.

## API

### [Export Name]

Description and example.

## Configuration

Environment variables or config options.

## Dependencies

Key dependencies explained.
```

## Enforcement

- New packages must include a README
- PR reviews should check if README needs updating
- Consider adding a CI check that warns if README is missing
