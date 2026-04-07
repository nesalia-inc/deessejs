# CLI Admin Creation Integration

## Overview

This document describes how to add admin user creation commands to the DeesseJS CLI using `deesse admin create`. It covers:

1. How better-auth's admin plugin works
2. How to create a `deesse admin create` CLI command
3. How to integrate admin creation into the `init` command

**Important:** The CLI uses **better-auth directly** since the `deesse` package currently only exports config types, not `createDeesse`. See `packages/deesse/src/index.ts`:

```typescript
// Current deesse package exports:
export { defineConfig } from "./config";
export { plugin } from "./config";
export { page, section } from "./config";
export { z } from "zod";
// NOT: createDeesse, createClient
```

---

## 1. Better-Auth Admin Plugin

### Plugin Structure

The admin plugin is split into two parts:

| Part | File | Purpose |
|------|------|---------|
| Server | `plugins/admin/admin.ts` | 13 API endpoints, database hooks, middleware |
| Client | `plugins/admin/client.ts` | `adminClient()` for client-side operations |

### API Endpoints

| Endpoint | Method | Server Action | Client Action |
|----------|--------|---------------|---------------|
| `/admin/set-role` | POST | `auth.api.setRole` | `client.admin.setRole` |
| `/admin/get-user` | GET | `auth.api.getUser` | `client.admin.getUser` |
| `/admin/create-user` | POST | `auth.api.createUser` | `client.admin.createUser` |
| `/admin/update-user` | POST | `auth.api.adminUpdateUser` | `client.admin.updateUser` |
| `/admin/list-users` | GET | `auth.api.listUsers` | `client.admin.listUsers` |
| `/admin/ban-user` | POST | `auth.api.banUser` | `client.admin.banUser` |
| `/admin/unban-user` | POST | `auth.api.unbanUser` | `client.admin.unbanUser` |
| `/admin/remove-user` | POST | `auth.api.removeUser` | `client.admin.removeUser` |
| `/admin/set-user-password` | POST | `auth.api.setUserPassword` | `client.admin.setUserPassword` |

### Creating an Admin User with better-auth

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/drizzle-adapter";
import { admin } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  plugins: [admin()],
});

// Create admin user
const result = await auth.api.createUser({
  body: {
    email: "admin@example.com",
    password: "TempPassword123!",
    name: "Admin User",
    role: "admin"
  }
});
```

---

## 2. DeesseJS CLI Structure

### No CLI Framework

The CLI uses **raw `process.argv` parsing** with a switch-based dispatcher. No commander or oclif.

### Current Command Dispatcher

```typescript
// packages/cli/src/index.ts
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  if (command.startsWith('db:')) {
    // Handle db:* subcommands
    await runDbCommand({ subcommand: command.slice(3), args: args.slice(1) });
    return;
  }

  // Handle admin:* subcommands
  if (command === 'admin') {
    const subcommand = args[1];
    await runAdminCommand({ subcommand, args: args.slice(2) });
    return;
  }

  switch (command) {
    case 'help':    showHelp(); break;
    case 'init':    await runInit(); break;
    default:        showHelp();
  }
}
```

### File Structure

```
packages/cli/
├── bin/
│   └── deesse.js          # Entry point
├── src/
│   ├── index.ts           # Main dispatcher
│   ├── commands/
│   │   ├── db.ts          # db:* subcommand dispatcher
│   │   ├── db-generate.ts
│   │   ├── db-push.ts
│   │   ├── db-migrate.ts
│   │   ├── admin.ts        # admin:* subcommand dispatcher (NEW)
│   │   └── admin-create.ts # deesse admin create (NEW)
│   └── utils/
│       └── schema-loader.ts
└── package.json
```

### Help Output

```
DeesseJS CLI v0.6.3

Usage: npx deesse <command>

Commands:
  help       Show this help message
  init       Initialize a new DeesseJS project
  admin      Admin management commands
  db         Database management commands (db:generate, db:push, etc.)

Admin Commands:
  deesse admin create     Create an admin user

Examples:
  npx deesse help
  npx deesse init
  npx deesse admin create
  npx deesse admin create --email admin@example.com --password Secur3P@ss!
  npx deesse db:generate
```

---

## 3. Creating `deesse admin create` Command

### Admin Command Dispatcher

```typescript
// packages/cli/src/commands/admin.ts
import { runAdminCreate } from './admin-create.js';

export interface AdminCommandOptions {
  subcommand?: string;
  args: string[];
}

export async function runAdminCommand(options: AdminCommandOptions): Promise<void> {
  const { subcommand, args } = options;

  switch (subcommand) {
    case 'create':
      await runAdminCreate(args);
      break;
    case 'help':
    case '--help':
    case '-h':
      showAdminHelp();
      break;
    default:
      console.error(`Unknown admin command: ${subcommand}`);
      showAdminHelp();
      process.exit(1);
  }
}

function showAdminHelp() {
  console.log(`
Admin Commands:
  deesse admin create     Create an admin user

Options:
  --email <email>     Admin email address
  --password <pass>   Admin password
  --name <name>       Admin display name (default: "Admin")
  --cwd <path>        Working directory (default: current directory)

Examples:
  deesse admin create
  deesse admin create --email admin@example.com --password Secur3P@ss!
  `);
}
```

### Admin Create Implementation

```typescript
// packages/cli/src/commands/admin-create.ts
import * as p from '@clack/prompts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/drizzle-adapter';
import { admin } from 'better-auth/plugins';
import * as dotenv from 'dotenv';
import path from 'node:path';

export interface AdminCreateOptions {
  email?: string;
  password?: string;
  name?: string;
  cwd?: string;
}

export async function runAdminCreate(args: string[]): Promise<void> {
  const opts = parseArgs(args);

  // Load environment
  dotenv.config({ path: path.join(opts.cwd, '.env') });

  p.intro('Creating admin user...');

  // Prompt for missing values
  const email = opts.email || await promptEmail();
  const password = opts.password || await promptPassword();
  const name = opts.name || 'Admin';

  try {
    // Create better-auth instance
    const auth = createAuth();

    // Check if admin already exists
    const existingUsers = await auth.api.listUsers({});
    const adminExists = existingUsers.users.some(
      u => u.email === email && u.role?.includes('admin')
    );

    if (adminExists) {
      p.cancel(`Admin user ${email} already exists.`);
      return;
    }

    // Create admin user
    const result = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role: 'admin',
      },
    });

    p.outro(`Admin user created successfully!
  Email: ${result.user.email}
  Name: ${result.user.name}
  ID: ${result.user.id}`);
  } catch (error) {
    p.cancel('Failed to create admin user');
    console.error(error);
    process.exit(1);
  }
}

function createAuth() {
  const db = drizzle({
    client: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    emailAndPassword: { enabled: true },
    plugins: [admin()],
  });
}

function parseArgs(args: string[]): AdminCreateOptions {
  const opts: AdminCreateOptions = { cwd: process.cwd() };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && i + 1 < args.length) {
      opts.email = args[++i];
    } else if (args[i] === '--password' && i + 1 < args.length) {
      opts.password = args[++i];
    } else if (args[i] === '--name' && i + 1 < args.length) {
      opts.name = args[++i];
    } else if (args[i] === '--cwd' && i + 1 < args.length) {
      opts.cwd = args[++i];
    }
  }
  return opts;
}

async function promptEmail(): Promise<string> {
  const email = await p.text({
    message: 'Admin email:',
    validate: (value) => {
      if (!value.includes('@')) return 'Please enter a valid email';
      return true;
    },
  });
  return email;
}

async function promptPassword(): Promise<string> {
  const password = await p.password({
    message: 'Admin password:',
    validate: (value) => {
      if (value.length < 8) return 'Password must be at least 8 characters';
      return true;
    },
  });
  return password;
}
```

### Register in Main Dispatcher

```typescript
// packages/cli/src/index.ts
import { runAdminCommand } from './commands/admin.js';

// In main():
if (command === 'admin') {
  const subcommand = args[1];
  await runAdminCommand({ subcommand, args: args.slice(2) });
  return;
}
```

---

## 4. Integrating into `init` Command

### Modified Init Flow

```typescript
// In runInit() after create-deesse-app succeeds:

const shouldCreateAdmin = await p.confirm({
  message: 'Do you want to create an admin user now?',
});

if (p.isCancel(shouldCreateAdmin) || !shouldCreateAdmin) {
  p.outro('Project initialized! Run "deesse admin create" later.');
  return;
}

// Run admin create
p.log.info('Creating admin user...');
await runAdminCreate([]);  // Interactive mode

p.outro('Project initialized with admin user!');
```

### Non-Interactive Init

```typescript
export interface InitOptions {
  skipAdmin?: boolean;
  adminEmail?: string;
  adminPassword?: string;
  adminName?: string;
}

export async function runInit(options: InitOptions = {}) {
  // ... create-deesse-app ...

  if (options.skipAdmin) {
    p.outro('Project initialized!');
    return;
  }

  if (options.adminEmail && options.adminPassword) {
    await runAdminCreate([
      '--email', options.adminEmail,
      '--password', options.adminPassword,
      '--name', options.adminName || 'Admin',
    ]);
    p.outro('Project initialized with admin user!');
  } else {
    const shouldCreateAdmin = await p.confirm({
      message: 'Do you want to create an admin user now?',
    });

    if (shouldCreateAdmin) {
      await runAdminCreate([]);
      p.outro('Project initialized with admin user!');
    } else {
      p.outro('Project initialized! Run "deesse admin create" later.');
    }
  }
}
```

### Usage

```bash
# Interactive init (prompts for admin)
deesse init

# Non-interactive init with admin
deesse init --admin-email admin@example.com --admin-password Secur3P@ss!

# Skip admin creation
deesse init --skip-admin
```

---

## 5. Dependencies

### Required Packages

The CLI already uses:
- `@clack/prompts` - For interactive prompts
- `dotenv` - For loading .env

New dependencies needed for admin creation:
- `better-auth` - Auth library
- `better-auth/drizzle-adapter` - Database adapter
- `drizzle-orm` - Database ORM
- `pg` - PostgreSQL driver

### Installation

```bash
pnpm add better-auth better-auth/drizzle-adapter drizzle-orm pg
```

---

## 6. Security Considerations

### Password Handling

- Never log passwords
- Use secure prompts (`p.password` - no echo)
- Validate minimum length

```typescript
const password = await p.password({
  message: 'Admin password:',
  validate: (value) => {
    if (value.length < 8) return 'Password must be at least 8 characters';
    return true;
  },
});
```

### Admin Email Validation

```typescript
const PUBLIC_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

function isPublicEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return PUBLIC_EMAIL_DOMAINS.includes(domain);
}

if (isPublicEmail(email)) {
  p.log.warn('Warning: Public email domains are not recommended for admin accounts.');
}
```

### Error Handling

```typescript
try {
  await auth.api.createUser({ ... });
} catch (error: any) {
  if (error.code === 'USER_ALREADY_EXISTS') {
    console.error('User with this email already exists.');
  } else if (error.code === 'INVALID_PASSWORD') {
    console.error('Password does not meet requirements.');
  } else {
    console.error('Failed to create admin:', error.message);
  }
  process.exit(1);
}
```

---

## 7. Summary

### Command Structure

| Command | Description |
|---------|-------------|
| `deesse admin create` | Create admin user (interactive) |
| `deesse admin create --email x --password y` | Create with credentials |
| `deesse init` | Init project (prompts for admin) |
| `deesse init --admin-email x --admin-password y` | Init with admin |

### Files to Create/Modify

| File | Action |
|------|--------|
| `packages/cli/src/commands/admin.ts` | Create |
| `packages/cli/src/commands/admin-create.ts` | Create |
| `packages/cli/src/index.ts` | Modify |

### Data Flow

```
deesse admin create
  → runAdminCommand({ subcommand: 'create', args })
    → runAdminCreate(args)
      → dotenv.config()
      → createAuth() [better-auth instance]
      → auth.api.listUsers() [check existing]
      → auth.api.createUser() [create admin]
```

### Dependencies

```json
{
  "better-auth": "latest",
  "better-auth/drizzle-adapter": "latest",
  "drizzle-orm": "latest",
  "pg": "latest"
}
```
