/**
 * db:push command
 *
 * Verifies schema and config exist, then delegates to drizzle-kit CLI.
 *
 * Requirements:
 * - src/db/schema.ts: Your Drizzle tables
 * - drizzle.config.ts: Standard drizzle-kit config with schema and dbCredentials
 */

import { execSync } from 'node:child_process';
import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const DRIZZLE_CONFIG_PATH = './drizzle.config.ts';

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

  // Verify drizzle.config.ts exists
  const drizzleConfigPath = path.join(cwd, DRIZZLE_CONFIG_PATH);
  try {
    await fs.access(drizzleConfigPath);
  } catch {
    throw new Error(
      `db:push requires ${DRIZZLE_CONFIG_PATH} to exist.\n` +
      `Please create this file with your drizzle-kit configuration.\n\n` +
      `Example:\n` +
      `import { defineConfig } from 'drizzle-kit';\n` +
      `export default defineConfig({\n` +
      `  schema: './src/db/schema.ts',\n` +
      `  dialect: 'postgresql',\n` +
      `  dbCredentials: {\n` +
      `    url: process.env.DATABASE_URL,\n` +
      `  },\n` +
      `});`
    );
  }

  console.warn('Pushing schema to database with drizzle-kit...');

  const args = ['npx drizzle-kit', 'push'];
  if (force) {
    args.push('--force');
  }

  try {
    execSync(args.join(' '), {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('drizzle-kit not found. Please install it: npm install drizzle-kit');
    }
    throw error;
  }
}
