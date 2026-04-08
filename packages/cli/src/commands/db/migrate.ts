/**
 * db:migrate command
 *
 * Verifies schema and config exist, then delegates to drizzle-kit CLI.
 *
 * Requirements:
 * - src/db/schema.ts: Your Drizzle tables
 * - drizzle.config.ts: Standard drizzle-kit config with schema and dbCredentials
 * - .env: Should contain DATABASE_URL
 */

import { spawn } from 'node:child_process';
import { verifySchemaPath, DEFAULT_SCHEMA_PATH } from '../../lib/db/schema.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

const DRIZZLE_CONFIG_PATH = './drizzle.config.ts';
const SCHEMA_PATH = DEFAULT_SCHEMA_PATH;

export interface DbMigrateOptions {
  cwd?: string;
  dryRun?: boolean;
}

export async function dbMigrate(options: DbMigrateOptions = {}): Promise<void> {
  const { cwd = process.cwd(), dryRun = false } = options;

  // Verify schema file exists
  try {
    await verifySchemaPath(cwd);
  } catch {
    throw new Error(
      `db:migrate requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  // Verify drizzle.config.ts exists
  const drizzleConfigPath = path.join(cwd, DRIZZLE_CONFIG_PATH);
  try {
    await fs.access(drizzleConfigPath);
  } catch {
    throw new Error(
      `db:migrate requires ${DRIZZLE_CONFIG_PATH} to exist.\n` +
      `Please create this file with your drizzle-kit configuration.\n\n` +
      `Example:\n` +
      `import { defineConfig } from 'drizzle-kit';\n` +
      `export default defineConfig({\n` +
      `  schema: './src/db/schema.ts',\n` +
      `  out: './src/db/migrations',\n` +
      `  dialect: 'postgresql',\n` +
      `  dbCredentials: {\n` +
      `    url: process.env.DATABASE_URL!,\n` +
      `  },\n` +
      `});`
    );
  }

  console.warn('Applying migrations with drizzle-kit...');

  // Load .env file
  dotenv.config();

  // Build command
  const cmd = dryRun ? 'npx drizzle-kit migrate --dry' : 'npx drizzle-kit migrate';

  // Use spawn with shell:true so .env is inherited
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: npx drizzle-kit migrate${dryRun ? ' --dry' : ''}`));
      }
    });

    child.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('drizzle-kit not found. Please install it: npm install drizzle-kit'));
      }
      reject(error);
    });
  });
}
