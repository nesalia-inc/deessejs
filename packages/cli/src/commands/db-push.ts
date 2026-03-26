/**
 * db:push command
 *
 * Verifies schema setup and provides instructions for pushing schema to database.
 *
 * For Drizzle, run:
 *   npx drizzle-kit push
 */

import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';

export interface DbPushOptions {
  force?: boolean;
  cwd?: string;
}

export async function dbPush(_options: DbPushOptions = {}): Promise<void> {
  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:push requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  console.warn(`
Database Schema OK: ${SCHEMA_PATH}

To push schema changes to your database with Drizzle, run:

  npx drizzle-kit push

Use --force flag to skip confirmation:

  npx drizzle-kit push --force

Note: This command requires a drizzle.config.ts file. See 'deesse db:generate' for setup.
`);
}
