/**
 * db:studio command
 *
 * Verifies schema setup and provides instructions for opening Drizzle Studio.
 *
 * For Drizzle, run:
 *   npx drizzle-kit studio
 */

import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';
import { detectDialect } from '../utils/dialect.js';
import { loadConfig } from '../utils/config.js';

export interface DbStudioOptions {
  port?: number;
  host?: string;
  cwd?: string;
}

export async function dbStudio(options: DbStudioOptions = {}): Promise<void> {
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

  console.warn(`
Database Schema OK: ${SCHEMA_PATH}

To open Drizzle Studio, run:

  npx drizzle-kit studio

Or with custom host/port:

  npx drizzle-kit studio --host ${host} --port ${port}

Note: This command requires a drizzle.config.ts file. See 'deesse db:generate' for setup.
`);
}
