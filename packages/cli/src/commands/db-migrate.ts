/**
 * db:migrate command
 *
 * Applies pending migrations by spawning drizzle-kit CLI.
 *
 * Flow:
 * 1. Verify schema exists at ./src/db/schema.ts
 * 2. Spawn drizzle-kit migrate command
 */

import { execSync } from 'node:child_process';
import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';

export interface DbMigrateOptions {
  cwd?: string;
  dryRun?: boolean;
}

export async function dbMigrate(options: DbMigrateOptions = {}): Promise<void> {
  const { cwd = process.cwd(), dryRun = false } = options;

  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:migrate requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  console.warn('Applying migrations using drizzle-kit...');

  // Build the command
  const args = ['drizzle-kit', 'migrate'];

  if (dryRun) {
    args.push('--dry-run');
  }

  try {
    execSync(`npx ${args.join(' ')}`, {
      cwd,
      stdio: 'inherit',
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('drizzle-kit not found. Please install it: npm install drizzle-kit');
    }
    throw error;
  }
}
