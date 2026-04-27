# CLI Admin Create Command

**Parent:** [auth-architecture-report.md](./auth-architecture-report.md)
**Date:** 2026-04-14
**Status:** Implementation Detail

---

## Overview

The CLI command `npx @deessejs/cli admin create` provides an alternative way to create the first admin user, intended for automation and CI/CD scenarios.

**Two complementary bootstrap methods:**

| Method | Command | Use Case |
|--------|---------|----------|
| **API Route** | `POST /api/admin/create-first-admin` | Development, UI-based setup |
| **CLI Command** | `npx @deessejs/cli admin create` | Automation, CI/CD, before server runs |

---

## Command Design

### Usage

```bash
npx @deessejs/cli admin create [options]
```

### Options

| Flag | Required | Description |
|------|----------|-------------|
| `--email` | Yes | Admin email address |
| `--password` | Yes | Admin password (min 8 chars) |
| `--name` | No | Admin display name |
| `--database-url` | No | Override DATABASE_URL env var |
| `--force` | No | Force create even if admins exist (dangerous) |

### Examples

```bash
# Basic usage
npx @deessejs/cli admin create --email admin@example.com --password "secure123"

# With name
npx @deessejs/cli admin create --email admin@example.com --password "secure123" --name "Admin User"

# With custom database URL
npx @deessejs/cli admin create --email admin@example.com --password "secure123" --database-url "postgresql://..."
```

---

## Implementation

### Files to Modify

| File | Change |
|------|--------|
| `packages/create-deesse-app/src/index.ts` | Add `admin` subcommand to CLI |
| `packages/admin/src/lib/first-admin.ts` | Expose for CLI usage (DB adapter passed in) |

### Command Structure

```
packages/create-deesse-app/src/
├── index.ts                    # Main CLI entry (add 'admin' command)
└── commands/
    └── admin.ts                # Admin subcommand handler (new)
```

### Implementation Code

```typescript
// packages/create-deesse-app/src/commands/admin.ts

import type { Argument, Option } from '@commander-js/extra-typings';

interface AdminCreateOptions {
  email: string;
  password: string;
  name?: string;
  databaseUrl?: string;
  force?: boolean;
}

export async function adminCreateCommand(options: AdminCreateOptions) {
  const { email, password, name, databaseUrl, force } = options;

  // 1. Validate inputs
  if (!email || !isValidEmail(email)) {
    error('Invalid email format');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    error('Password must be at least 8 characters');
    process.exit(1);
  }

  // 2. Production guard
  if (process.env.NODE_ENV === 'production' && !force) {
    error('Cannot create admin in production. Use --force to override.');
    process.exit(1);
  }

  // 3. Load environment
  loadEnv(databaseUrl);

  // 4. Check if admins already exist
  const { hasAdminUsers } = await import('@deessejs/admin');
  const adminExists = await hasAdminUsers();

  if (adminExists && !force) {
    error('Admin users already exist. Use --force to create anyway.');
    process.exit(1);
  }

  // 5. Create admin
  const { createFirstAdmin } = await import('@deessejs/admin');

  try {
    await createFirstAdmin({ email, password, name });
    success(`Admin ${email} created successfully`);
  } catch (error) {
    error(`Failed to create admin: ${error.message}`);
    process.exit(1);
  }
}

// Helper functions
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadEnv(databaseUrl?: string) {
  // Load .env file if exists
  // Override DATABASE_URL if provided
  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
  }

  if (!process.env.DATABASE_URL) {
    error('DATABASE_URL is required. Set it in .env or use --database-url flag.');
    process.exit(1);
  }
}

function error(message: string) {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
}

function success(message: string) {
  console.log(`\x1b[32mSuccess:\x1b[0m ${message}`);
}
```

### CLI Entry Point Update

```typescript
// packages/create-deesse-app/src/index.ts (add to existing)

import { program } from '@commander-js/extra-typings';
import { adminCreateCommand } from './commands/admin';

program
  .command('admin')
  .description('Admin-related commands')
  .addCommand(
    program
      .command('create')
      .description('Create the first admin user')
      .requiredOption('--email <email>', 'Admin email address')
      .requiredOption('--password <password>', 'Admin password (min 8 chars)')
      .option('--name <name>', 'Admin display name')
      .option('--database-url <url>', 'Database connection URL')
      .option('--force', 'Force create even if admins exist', false)
      .action(adminCreateCommand)
  );

program.parse();
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  npx @deessejs/cli admin create --email admin@example.com ...  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Parse arguments (email, password, name, database-url, force)│
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Validate: email format, password length >= 8                │
│     ❌ Invalid → error + exit(1)                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. NODE_ENV === 'production'?                                  │
│     ❌ production + no --force → error + exit(1)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Load .env, get DATABASE_URL (from env or --database-url)   │
│     ❌ No DATABASE_URL → error + exit(1)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. hasAdminUsers() → check if admins exist                     │
│     ❌ admins exist + no --force → error + exit(1)             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. createFirstAdmin({ email, password, name })                │
│     - Hash password                                              │
│     - Validate email domain (ADMIN_ALLOWED_DOMAINS)             │
│     - Insert user with role="admin"                             │
│     ❌ Error → error + exit(1)                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. success("Admin admin@example.com created")                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

| Concern | Protection |
|---------|------------|
| **Production accident** | BLOCKED by default in production (must use `--force`) |
| **Duplicate admin** | BLOCKED by default if admins exist (must use `--force`) |
| **Email enumeration** | Only succeeds if email domain is allowed |
| **Password in history** | Use `HISTCONTROL=ignorespace` + prefix space to hide |
| **Credential logging** | Never log passwords, mask in error messages |

---

## Error Messages

| Scenario | Exit Code | Message |
|----------|-----------|---------|
| Invalid email | 1 | `Error: Invalid email format` |
| Password too short | 1 | `Error: Password must be at least 8 characters` |
| Production without --force | 1 | `Error: Cannot create admin in production. Use --force to override.` |
| No DATABASE_URL | 1 | `Error: DATABASE_URL is required...` |
| Admins exist without --force | 1 | `Error: Admin users already exist. Use --force to create anyway.` |
| Database connection failed | 1 | `Error: Failed to create admin: <reason>` |
| Success | 0 | `Success: Admin admin@example.com created` |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes* | PostgreSQL connection string |
| `ADMIN_ALLOWED_DOMAINS` | No | Comma-separated allowed email domains |
| `NODE_ENV` | No | Set to "production" to enable production guard |

*Required unless `--database-url` flag is provided

---

## Use Cases

### 1. Initial Setup (Development)

```bash
# After running the app for the first time
npx @deessejs/cli admin create --email admin@localhost --password "devadmin123"
```

### 2. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Create admin user
  run: |
    npx @deessejs/cli admin create \
      --email "$ADMIN_EMAIL" \
      --password "$ADMIN_PASSWORD" \
      --database-url "$DATABASE_URL"
  env:
    ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 3. Docker/Container Orchestration

```dockerfile
# Dockerfile
RUN npx @deessejs/cli admin create \
  --email "admin@${DOMAIN}" \
  --password "${ADMIN_PASSWORD}" \
  --database-url "${DATABASE_URL}"
```

### 4. Force Create (Emergency Recovery)

```bash
# When you need to create a new admin after losing access
npx @deessejs/cli admin create \
  --email recovery@admin.com \
  --password "RecoveryPass123!" \
  --force
```

---

## Relationship to API Route

The CLI command and API route share the same core logic (`@deessejs/admin`'s `createFirstAdmin()`), but differ in how they're invoked:

| Aspect | CLI Command | API Route |
|--------|-------------|-----------|
| **Invokes** | `createFirstAdmin()` directly | `POST /api/admin/create-first-admin` |
| **Auth context** | No HTTP context needed | Requires HTTP request |
| **Use case** | Before server runs, CI/CD | During server runtime |
| **Protection** | `--force` flag required in prod | `NODE_ENV !== 'production'` check |
| **User feedback** | stdout/stderr | JSON response |
| **Entry point** | `packages/create-deesse-app/src/commands/admin.ts` | `packages/deesse/src/app/api/admin/create-first-admin/route.ts` |

---

## Files Reference

| File | Purpose |
|------|---------|
| `packages/create-deesse-app/src/index.ts` | CLI entry point (add `admin` subcommand) |
| `packages/create-deesse-app/src/commands/admin.ts` | `admin create` command implementation |
| `packages/admin/src/lib/first-admin.ts` | Core logic: `createFirstAdmin()`, `hasAdminUsers()` |
| `packages/admin/src/schema/index.ts` | Database schema (for drizzle initialization) |
