/**
 * db:generate command
 *
 * Verifies schema setup and provides instructions for generating migrations.
 *
 * For Drizzle, run these commands:
 *   npx drizzle-kit generate
 *   npx drizzle-kit push
 */

import { verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';

export interface DbGenerateOptions {
  cwd?: string;
}

export async function dbGenerate(_options: DbGenerateOptions = {}): Promise<void> {
  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:generate requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  console.warn(`
Database Schema OK: ${SCHEMA_PATH}

To generate migrations with Drizzle, run these commands:

  npx drizzle-kit generate
  npx drizzle-kit push

Note: These commands require a drizzle.config.ts file. If you don't have one,
create it with:

  import { defineConfig } from 'drizzle-kit';

  export default defineConfig({
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    dialect: 'postgresql',
  });
`);
}
