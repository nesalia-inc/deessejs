/**
 * db:push command
 *
 * Pushes schema changes directly to the database by spawning drizzle-kit CLI.
 *
 * Flow:
 * 1. Verify schema exists at ./src/db/schema.ts
 * 2. Spawn drizzle-kit push command
 */

import { execSync } from 'node:child_process';
import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';

export interface DbPushOptions {
  force?: boolean;
  cwd?: string;
}

export async function dbPush(options: DbPushOptions = {}): Promise<void> {
  const { force = false, cwd = process.cwd() } = options;

  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:push requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  console.warn('Pushing schema changes to database using drizzle-kit...');

  // Build the command
  const args = ['drizzle-kit', 'push'];

  if (force) {
    args.push('--force');
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
