/**
 * db:generate command
 *
 * Generates migrations from schema changes by spawning drizzle-kit CLI.
 *
 * Flow:
 * 1. Verify schema exists at ./src/db/schema.ts
 * 2. Spawn drizzle-kit generate command
 */

import { execSync } from 'node:child_process';
import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';

export interface DbGenerateOptions {
  cwd?: string;
}

export async function dbGenerate(options: DbGenerateOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:generate requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  console.warn('Generating migrations using drizzle-kit...');

  try {
    execSync('npx drizzle-kit generate', {
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
