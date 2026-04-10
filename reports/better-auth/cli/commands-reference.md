# CLI Commands Reference

## Global Options

These options are available on all commands:

| Option | Description |
|--------|-------------|
| `-V, --version` | Output the version number |
| `-h, --help` | Display help for command |

---

## `init` Command

Interactive project initialization for Better Auth.

### Synopsis

```bash
better-auth init [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--framework <name>` | string | auto-detect | Framework to use |
| `--database <adapter>` | string | prompt | Database adapter |
| `--plugins <plugins>` | string | prompt | Comma-separated plugin list |
| `--social-providers <providers>` | string | none | Comma-separated provider list |
| `--email-and-password` | boolean | true | Enable email/password auth |
| `--base-url <url>` | string | prompt | Base URL for auth |
| `--app-name <name>` | string | none | Application name |
| `--skip-install` | boolean | false | Skip dependency installation |
| `--skip-git` | boolean | false | Skip git initialization |
| `--package-manager <manager>` | string | auto-detect | Package manager to use |

### Examples

```bash
# Interactive setup (will prompt for all options)
better-auth init

# Non-interactive with all options
better-auth init \
  --framework next \
  --database drizzle-sqlite-better-sqlite3 \
  --plugins twoFactor,username \
  --email-and-password \
  --base-url http://localhost:3000

# Skip dependency installation
better-auth init --skip-install
```

### Interactive Prompts

If not all options are provided, the CLI will prompt for:

1. **Framework Selection** - List of supported frameworks
2. **Database Selection** - ORM and dialect selection
3. **Plugin Selection** - Multi-select of available plugins
4. **Social Provider Selection** - Multi-select of OAuth providers
5. **Email/Password** - Enable/disable
6. **Base URL** - Application base URL
7. **App Name** - Application display name

### Output Files

The init command generates:

1. **Auth Config** - `auth.ts` (or framework-specific path)
2. **Auth Client Config** - `auth-client.ts` (if client needed)
3. **Route Handler** - Framework-specific API route file
4. **Database Schema** - ORM schema file (for Drizzle/Prisma/Kysely)

### Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Error (user cancellation, invalid options, etc.) |

---

## `generate` Command

Generate auth configuration files.

### Subcommands

#### `generate auth`

Generate server-side auth configuration.

```bash
better-auth generate auth [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-o, --output <path>` | string | auth.ts | Output file path |
| `--database <adapter>` | string | required | Database adapter |
| `--plugins <plugins>` | string | none | Plugin list |
| `--email-and-password` | boolean | false | Enable email/password |
| `--social-providers <providers>` | string | none | OAuth providers |

**Example:**
```bash
better-auth generate auth \
  --output ./lib/auth.ts \
  --database drizzle-postgresql \
  --plugins twoFactor \
  --email-and-password \
  --social-providers google,github
```

**Generated Code:**
```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { twoFactor } from "better-auth/plugins";
import * as schema from "./auth-schema";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  plugins: [twoFactor({...})],
  emailAndPassword: { enabled: true },
});
```

---

#### `generate auth-client`

Generate client-side auth configuration.

```bash
better-auth generate auth-client [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-o, --output <path>` | string | auth-client.ts | Output file path |
| `--framework <name>` | string | auto-detect | Target framework |
| `--plugins <plugins>` | string | none | Plugin list |
| `--base-url <url>` | string | required | Base URL |

**Example:**
```bash
better-auth generate auth-client \
  --output ./lib/auth-client.ts \
  --framework next \
  --plugins twoFactor \
  --base-url http://localhost:3000
```

**Generated Code:**
```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
  baseURL: "http://localhost:3000",
});
```

---

## `migrate` Command

Run database migrations for auth tables.

### Synopsis

```bash
better-auth migrate [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--database <adapter>` | string | required | Database adapter |
| `--schema <path>` | string | required | Path to schema file |
| `--out <directory>` | string | ./drizzle | Output directory |
| `--dev` | boolean | false | Generate development migration |
| `--push` | boolean | false | Push schema to database |
| `--drop` | boolean | false | Drop tables before creating |

### Examples

```bash
# Generate migration files
better-auth migrate \
  --database drizzle-postgresql \
  --schema ./lib/auth-schema.ts \
  --out ./drizzle

# Push schema directly (Drizzle only)
better-auth migrate \
  --database drizzle-sqlite-better-sqlite3 \
  --schema ./lib/auth-schema.ts \
  --push

# Drop and recreate
better-auth migrate \
  --database drizzle-sqlite-better-sqlite3 \
  --schema ./lib/auth-schema.ts \
  --push --drop
```

### Supported ORM/Adapters

| ORM | Migration Support |
|-----|------------------|
| Drizzle | Full migration generation + push |
| Prisma | `prisma migrate dev` |
| Kysely | Schema generation only |
| MongoDB | Not supported |

---

## `mcp` Command

MCP (Model Context Protocol) related commands.

### Subcommands

#### `mcp generate-key`

Generate an MCP API key for Better Auth.

```bash
better-auth mcp generate-key [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--expires-in <duration>` | string | 30d | Key expiration time |

**Example:**
```bash
# Generate key expiring in 30 days
better-auth mcp generate-key

# Generate key expiring in 7 days
better-auth mcp generate-key --expires-in 7d

# Generate key expiring in 1 year
better-auth mcp generate-key --expires-in 1y
```

**Output:**
```
MCP API Key generated successfully!
Key: mcp_sk_live_xxxxxxxxxxxxxxxxxxxx
Expires: 2025-01-09
```

---

#### `mcp start`

Start the MCP server for Better Auth.

```bash
better-auth mcp start [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--port <number>` | number | 3000 | Server port |
| `--host <address>` | string | localhost | Server host |
| `--api-key <key>` | string | required | MCP API key |

**Example:**
```bash
better-auth mcp start --port 3000 --api-key mcp_sk_live_xxx
```

---

## `login` Command

Login to Better Auth to access cloud features.

### Synopsis

```bash
better-auth login [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--email <email>` | string | prompt | Email address |
| `--password <password>` | string | prompt | Password |
| `--remember` | boolean | false | Remember credentials |

### Examples

```bash
# Interactive login
better-auth login

# Non-interactive login
better-auth login --email user@example.com --password secret --remember
```

### Output

```
Logging in to Better Auth...
✓ Logged in successfully as user@example.com
Token saved to ~/.better-auth/credentials
```

---

## `secret` Command

Manage Better Auth secrets.

### Subcommands

#### `secret set`

Store a secret.

```bash
better-auth secret set <key> <value> [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--global` | boolean | false | Store globally (not project-specific) |

**Example:**
```bash
better-auth secret set DATABASE_URL "postgresql://..."
better-auth secret set API_KEY "xxx" --global
```

---

#### `secret get`

Retrieve a secret value.

```bash
better-auth secret get <key> [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--global` | boolean | false | Get global secret |

**Example:**
```bash
better-auth secret get DATABASE_URL
```

---

#### `secret list`

List all stored secrets.

```bash
better-auth secret list [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--global` | boolean | false | List global secrets |

---

#### `secret delete`

Delete a stored secret.

```bash
better-auth secret delete <key> [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--global` | boolean | false | Delete global secret |

---

## `upgrade` Command

Upgrade Better Auth packages to the latest version.

### Synopsis

```bash
better-auth upgrade [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--to <version>` | string | latest | Target version |
| `--packages <packages>` | string | all | Packages to upgrade |
| `--dry-run` | boolean | false | Preview changes |
| `--force` | boolean | false | Skip confirmation |

### Examples

```bash
# Upgrade to latest version
better-auth upgrade

# Upgrade to specific version
better-auth upgrade --to 1.5.0

# Dry run to see what would change
better-auth upgrade --dry-run

# Upgrade only specific packages
better-auth upgrade --packages better-auth,@better-auth/cli
```

---

## `info` Command

Display Better Auth version and configuration information.

### Synopsis

```bash
better-auth info [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--show-secret` | boolean | false | Show secret values |
| `--json` | boolean | false | Output as JSON |

### Examples

```bash
# Basic info
better-auth info

# JSON output
better-auth info --json

# Show secrets (masked)
better-auth info --show-secret
```

**Sample Output:**
```
Better Auth CLI v1.0.3
Better Auth Core v1.4.2

Configuration:
  Config File: ./auth.ts
  Database: drizzle-postgresql
  Plugins: twoFactor, username
  Base URL: http://localhost:3000

Installed Packages:
  better-auth: 1.4.2
  @better-auth/cli: 1.0.3
  better-auth/adapters/drizzle: 1.4.2
  better-auth/plugins: 1.4.2
```

---

## `ai` Command

AI-related commands for Better Auth.

### Subcommands

#### `ai chat`

Interactive chat with Better Auth AI assistant.

```bash
better-auth ai chat [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--prompt <text>` | string | interactive | Initial prompt |
| `--model <name>` | string | gpt-4 | AI model to use |
| `--stream` | boolean | true | Enable streaming |

### Examples

```bash
# Interactive chat
better-auth ai chat

# Single prompt
better-auth ai chat --prompt "How do I add Google OAuth?"

# Use specific model
better-auth ai chat --model claude-3
```

---

## Help and Troubleshooting

### Getting Help

```bash
# Global help
better-auth --help

# Command-specific help
better-auth init --help
better-auth generate --help
```

### Debug Mode

Enable verbose output:

```bash
DEBUG=better-auth:* better-auth init
```

### Common Issues

#### "Config file not found"

The CLI couldn't find an auth config. Use `init` to create one or specify `--config <path>`.

#### "Framework not detected"

Auto-detection failed. Use `--framework <name>` to specify manually.

#### "Database adapter not supported"

The specified database adapter is not recognized. Check spelling or use `better-auth info` to see supported adapters.

#### "Plugin not found"

A specified plugin doesn't exist. Run `better-auth info` to see available plugins.

---

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Configuration error |
| 4 | Network error |
| 5 | Authentication error |
