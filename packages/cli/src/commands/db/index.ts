/**
 * db command dispatcher
 *
 * Handles all db:* subcommands:
 * - db:generate   Generate migrations from schema changes
 * - db:push       Push schema changes directly (dev only)
 * - db:migrate    Apply pending migrations to database
 */

import { dbGenerate } from './generate.js';
import { dbPush } from './push.js';
import { dbMigrate } from './migrate.js';

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

    case 'push': {
      const opts = parseDbPushArgs(args);
      await dbPush(opts);
      break;
    }

    case 'migrate': {
      const opts = parseDbMigrateArgs(args);
      await dbMigrate(opts);
      break;
    }

    default:
      throw new Error(
        `Unknown db command: ${subcommand}\n` +
        `Valid commands: generate, push, migrate`
      );
  }
}

function parseDbGenerateArgs(args: string[]): { cwd?: string } {
  const opts: { cwd?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cwd' && i + 1 < args.length) {
      opts.cwd = args[++i];
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

export function showDbHelp(): void {
  console.warn(`
Deesse DB Commands

Usage: npx deesse db:<command> [options]

Commands:
  db:generate    Generate migrations from schema changes
  db:push        Push schema changes directly to database
  db:migrate     Apply pending migrations to database

Options:

  db:generate
    --cwd <path>              Set working directory

  db:push
    --cwd <path>              Set working directory
    --force, -f               Force push without confirmation

  db:migrate
    --cwd <path>              Set working directory
    --dry-run                 Show what would be migrated without executing

Examples:
  npx deesse db:generate
  npx deesse db:push
  npx deesse db:push --force
  npx deesse db:migrate
  npx deesse db:migrate --dry-run
`);
}
