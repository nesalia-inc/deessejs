/**
 * db command dispatcher
 *
 * Handles all db:* subcommands:
 * - db:generate   Generate migrations from schema changes
 * - db:migrate    Apply pending migrations to database
 * - db:push       Push schema changes directly (dev only)
 * - db:studio     Open Drizzle Studio (database browser)
 * - db:introspect Introspect database and generate schema
 */

import { dbGenerate } from './db-generate.js';
import { dbMigrate } from './db-migrate.js';
import { dbPush } from './db-push.js';
import { dbStudio } from './db-studio.js';
import { dbIntrospect } from './db-introspect.js';

export interface DbCommandOptions {
  subcommand: string;
  args: string[];
}

export async function runDbCommand(options: DbCommandOptions): Promise<void> {
  const { subcommand, args } = options;

  switch (subcommand) {
    case 'generate': {
      const opts = parseDbGenerateArgs(args);
      await dbGenerate(opts);
      break;
    }

    case 'migrate': {
      const opts = parseDbMigrateArgs(args);
      await dbMigrate(opts);
      break;
    }

    case 'push': {
      const opts = parseDbPushArgs(args);
      await dbPush(opts);
      break;
    }

    case 'studio': {
      const opts = parseDbStudioArgs(args);
      await dbStudio(opts);
      break;
    }

    case 'introspect': {
      const opts = parseDbIntrospectArgs(args);
      await dbIntrospect(opts);
      break;
    }

    default:
      throw new Error(
        `Unknown db command: ${subcommand}\n` +
        `Valid commands: generate, migrate, push, studio, introspect`
      );
  }
}

// Argument parsers for each subcommand

function parseDbGenerateArgs(args: string[]): { cwd?: string } {
  const opts: { cwd?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cwd' && i + 1 < args.length) {
      opts.cwd = args[++i];
    }
  }

  return opts;
}

function parseDbMigrateArgs(args: string[]): { cwd?: string; dryRun?: boolean } {
  const opts: { cwd?: string; dryRun?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cwd' && i + 1 < args.length) {
      opts.cwd = args[++i];
    } else if (args[i] === '--dry-run') {
      opts.dryRun = true;
    }
  }

  return opts;
}

function parseDbPushArgs(args: string[]): { cwd?: string; force?: boolean } {
  const opts: { cwd?: string; force?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cwd' && i + 1 < args.length) {
      opts.cwd = args[++i];
    } else if (args[i] === '--force' || args[i] === '-f') {
      opts.force = true;
    }
  }

  return opts;
}

function parseDbStudioArgs(args: string[]): {
  cwd?: string;
  port?: number;
  host?: string;
} {
  const opts: { cwd?: string; port?: number; host?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cwd' && i + 1 < args.length) {
      opts.cwd = args[++i];
    } else if (args[i] === '--port' && i + 1 < args.length) {
      opts.port = parseInt(args[++i], 10);
    } else if (args[i] === '--host' && i + 1 < args.length) {
      opts.host = args[++i];
    }
  }

  return opts;
}

function parseDbIntrospectArgs(args: string[]): { cwd?: string; force?: boolean } {
  const opts: { cwd?: string; force?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cwd' && i + 1 < args.length) {
      opts.cwd = args[++i];
    } else if (args[i] === '--force' || args[i] === '-f') {
      opts.force = true;
    }
  }

  return opts;
}

export function showDbHelp(): void {
  console.warn(`
Deesse DB Commands

Usage: npx deesse db:<command> [options]

Commands:
  db:generate    Generate migrations from schema changes
  db:migrate     Apply pending migrations to database
  db:push        Push schema changes directly (dev only)
  db:studio      Open Drizzle Studio (database browser)
  db:introspect  Introspect database and generate schema

Options:

  db:generate
    --cwd <path>              Set working directory

  db:migrate
    --cwd <path>              Set working directory
    --dry-run                 Show what would be migrated without executing

  db:push
    --cwd <path>              Set working directory
    --force, -f               Force push without confirmation

  db:studio
    --cwd <path>              Set working directory
    --port <port>             Set studio port (default: 4983)
    --host <host>             Set studio host (default: 127.0.0.1)

  db:introspect
    --cwd <path>              Set working directory
    --force, -f               Overwrite existing schema file

Examples:
  npx deesse db:generate
  npx deesse db:migrate --dry-run
  npx deesse db:push --force
  npx deesse db:studio --port 5000
  npx deesse db:introspect --force
`);
}
