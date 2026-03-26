/**
 * db:introspect command
 *
 * Verifies schema setup and provides instructions for introspecting database.
 *
 * For Drizzle, run:
 *   npx drizzle-kit introspect
 */

import { loadConfig } from '../utils/config.js';
import { detectDialect } from '../utils/dialect.js';

export interface DbIntrospectOptions {
  cwd?: string;
  force?: boolean;
}

export async function dbIntrospect(_options: DbIntrospectOptions = {}): Promise<void> {
  // Load config to verify database is configured
  const { config } = await loadConfig();
  const db = config.database;

  if (!db) {
    throw new Error('Config does not have a database instance');
  }

  // Detect dialect
  const dialect = detectDialect(db);

  console.warn(`
Database Config OK

Detected dialect: ${dialect}

To introspect your database and generate a schema file, run:

  npx drizzle-kit introspect

This will generate/update a schema file based on your database tables.

Note: This command requires a drizzle.config.ts file. See 'deesse db:generate' for setup.
`);
}
