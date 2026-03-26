/**
 * db:introspect command
 *
 * Introspects the database and generates a schema.ts file.
 *
 * Flow:
 * 1. Load config to verify database is configured
 * 2. Spawn drizzle-kit introspect command
 * 3. Note: Introspection result needs to be processed manually
 */

import { execSync } from 'node:child_process';
import { loadConfig } from '../utils/config.js';
import { detectDialect } from '../utils/dialect.js';
import { SCHEMA_PATH } from '../utils/schema-loader.js';
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
  console.warn('');
  console.warn(`Note: db:introspect requires drizzle-kit CLI introspection.`);
  console.warn(`This command will attempt to use 'npx drizzle-kit introspect'.`);
  console.warn('');

  // Build the command
  const args = [
    'drizzle-kit',
    'introspect',
  ];

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

  try {
    // Try to run drizzle-kit introspect
    // Note: This requires drizzle.config.ts to be configured properly
    execSync(`npx ${args.join(' ')}`, {
      cwd,
      stdio: 'inherit',
    });

    console.warn('');
    console.warn('Introspection complete!');
    console.warn('');
    console.warn('Note: drizzle-kit generates a drizzle schema file, not src/db/schema.ts.');
    console.warn('You may need to manually copy the generated schema to src/db/schema.ts');

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('drizzle-kit not found. Please install it: npm install drizzle-kit');
    }

    console.warn('');
    console.warn('Drizzle Kit introspection requires a drizzle.config.ts file.');
    console.warn('For full introspection support, please:');
    console.warn('1. Create a drizzle.config.ts file');
    console.warn('2. Run: npx drizzle-kit introspect');
    console.warn('');
    throw error;
  }
}
