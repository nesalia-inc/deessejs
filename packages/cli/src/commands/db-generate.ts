/**
 * db:generate command
 *
 * Verifies schema and config exist, then delegates to drizzle-kit CLI.
 *
 * Requirements:
 * - src/db/schema.ts: Your Drizzle tables
 * - drizzle.config.ts: Standard drizzle-kit config with schema and out settings
 */

import { execSync } from 'node:child_process';
import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const DRIZZLE_CONFIG_PATH = './drizzle.config.ts';

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

  // Verify drizzle.config.ts exists
  const drizzleConfigPath = path.join(cwd, DRIZZLE_CONFIG_PATH);
  try {
    await fs.access(drizzleConfigPath);
  } catch {
    throw new Error(
      `db:generate requires ${DRIZZLE_CONFIG_PATH} to exist.\n` +
      `Please create this file with your drizzle-kit configuration.\n\n` +
      `Example:\n` +
      `import { defineConfig } from 'drizzle-kit';\n` +
      `export default defineConfig({\n` +
      `  schema: './src/db/schema.ts',\n` +
      `  out: './src/db/migrations',\n` +
      `  dialect: 'postgresql',\n` +
      `});`
    );
  }

  console.warn('Generating migrations with drizzle-kit...');

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
