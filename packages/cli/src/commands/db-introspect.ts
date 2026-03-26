/**
 * db:introspect command
 *
 * Introspects the database by spawning drizzle-kit CLI.
 *
 * Flow:
 * 1. Verify schema exists at ./src/db/schema.ts
 * 2. Spawn drizzle-kit introspect command
 */

import { execSync } from 'node:child_process';
import { SCHEMA_PATH } from '../utils/schema-loader.js';
import { loadConfig } from '../utils/config.js';
import { detectDialect } from '../utils/dialect.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as p from '@clack/prompts';

export interface DbIntrospectOptions {
  cwd?: string;
  force?: boolean;
}

export async function dbIntrospect(options: DbIntrospectOptions = {}): Promise<void> {
  const { cwd = process.cwd(), force = false } = options;

  // Load config to verify database is configured
  const { config } = await loadConfig();
  const db = config.database;

  if (!db) {
    throw new Error('Config does not have a database instance');
  }

  // Detect dialect
  const dialect = detectDialect(db);

  console.warn(`Introspecting ${dialect} database...`);

  // Check if schema file exists and warn
  const schemaPath = path.join(cwd, SCHEMA_PATH);
  try {
    await fs.access(schemaPath);
    if (!force) {
      const confirm = await p.confirm({
        message: `Warning: ${SCHEMA_PATH} already exists. Overwrite?`,
        initialValue: false,
      });

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Introspect cancelled.');
        return;
      }
    }
  } catch {
    // File doesn't exist, that's fine
  }

  console.warn('Introspecting database using drizzle-kit...');

  try {
    execSync('npx drizzle-kit introspect', {
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
