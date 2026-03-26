/**
 * db:migrate command
 *
 * Verifies schema setup and provides instructions for applying migrations.
 *
 * For Drizzle, run:
 *   npx drizzle-kit migrate
 */

import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';

export interface DbMigrateOptions {
  cwd?: string;
  dryRun?: boolean;
}

export async function dbMigrate(_options: DbMigrateOptions = {}): Promise<void> {
  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:migrate requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  console.warn(`
Database Schema OK: ${SCHEMA_PATH}

To apply pending migrations with Drizzle, run:

  npx drizzle-kit migrate

Use --dry-run to see what would be applied:

  npx drizzle-kit migrate --dry

Note: This command requires a drizzle.config.ts file. See 'deesse db:generate' for setup.
`);
}
