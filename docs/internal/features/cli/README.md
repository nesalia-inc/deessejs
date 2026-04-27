# CLI

This is an internal document outlining the DeesseJS CLI.

## Overview

DeesseJS comes with a built-in CLI to help you manage database schemas, initialize projects, generate secret keys, and gather diagnostic information.

## Commands

### Generate

The `generate` command creates the database schema for **plugin settings**. Each plugin can define settings via a Zod schema, and this command generates the corresponding database schema (Prisma, Drizzle, etc.).

```bash
npx deesse@latest generate
```

Options:
- `--output` - Where to save the generated schema
- `--config` - Path to your Deesse config file
- `--yes` - Skip confirmation prompts

### Migrate

The `migrate` command applies the DeesseJS schema directly to your database (for Kysely adapter). For other adapters, use your ORM's migration tool.

```bash
npx deesse@latest migrate
```

Options:
- `--config` - Path to your Deesse config file
- `--yes` - Skip confirmation prompts

### Init

The `init` command initializes DeesseJS in your project.

```bash
npx deesse@latest init
```

Options:
- `--name` - Your application name
- `--template` - Template to use (blank, with-example, etc.)
- `--database` - Database provider (drizzle, prisma, etc.)
- `--package-manager` - Package manager (npm, pnpm, yarn, bun)

### Info

The `info` command provides diagnostic information about your DeesseJS setup.

```bash
npx deesse@latest info
```

Options:
- `--config` - Path to your Deesse config file
- `--json` - Output as JSON

Output includes:
- System info (OS, CPU, memory, Node.js version)
- Package manager
- DeesseJS version and configuration
- Database clients and ORMs

### Secret

Generate a secret key for your DeesseJS instance.

```bash
npx deesse@latest secret
```
