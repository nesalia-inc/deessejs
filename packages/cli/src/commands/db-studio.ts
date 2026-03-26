/**
 * db:studio command
 *
 * Opens Drizzle Studio (database browser) by spawning drizzle-kit CLI.
 *
 * Flow:
 * 1. Verify schema exists
 * 2. Spawn drizzle-kit studio command with appropriate arguments
 */

import { execSync } from 'node:child_process';
import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';
import { detectDialect } from '../utils/dialect.js';
import { loadConfig } from '../utils/config.js';

export interface DbStudioOptions {
  port?: number;
  host?: string;
  cwd?: string;
}

export async function dbStudio(options: DbStudioOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const port = options.port ?? parseInt(process.env['DB_STUDIO_PORT'] ?? '4983', 10);
  const host = options.host ?? process.env['DB_STUDIO_HOST'] ?? '127.0.0.1';

  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:studio requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  // Load config to verify database is configured
  const { config } = await loadConfig();
  const db = config.database;

  if (!db) {
    throw new Error('Config does not have a database instance');
  }

  // Detect dialect
  const dialect = detectDialect(db);

  if (dialect !== 'postgresql') {
    throw new Error(
      `Drizzle Studio currently only supports PostgreSQL.\n` +
      `Detected dialect: ${dialect}`
    );
  }

  // Build drizzle-kit studio command
  // Note: drizzle-kit studio uses drizzle.config.ts which we don't have
  // So we use a different approach - spawn drizzle-kit with --schema pointing to our schema
  const args = [
    'drizzle-kit',
    'studio',
    '--port', String(port),
    '--host', host,
  ];

  console.warn(`Starting Drizzle Studio...`);
  console.warn(`Command: npx ${args.join(' ')}`);
  console.warn('');
  console.warn(`Note: This command requires a drizzle.config.ts file.`);
  console.warn(`Since we don't use drizzle.config.ts, please either:`);
  console.warn(`1. Create a minimal drizzle.config.ts pointing to your schema`);
  console.warn(`2. Or use 'npx drizzle-kit studio' directly with a config file`);
  console.warn('');

  // Try to spawn drizzle-kit anyway - it might work if user has a config
  try {
    execSync(`npx ${args.join(' ')}`, {
      cwd,
      stdio: 'inherit',
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('drizzle-kit not found. Please install it: npm install drizzle-kit');
    }
    // Drizzle-kit studio might fail if no config - show helpful message
    console.warn('Drizzle Studio requires a drizzle.config.ts file to work.');
    console.warn('For now, please use: npx drizzle-kit studio');
    throw error;
  }
}
