/**
 * db:migrate command
 *
 * Applies pending migrations to the database.
 *
 * Flow:
 * 1. Load config to get database instance
 * 2. Get migration files from ./src/db/migrations
 * 3. Execute each migration in order
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { loadConfig } from '../utils/config.js';

const MIGRATIONS_DIR = './src/db/migrations';

interface MigrationFile {
  name: string;
  path: string;
}

async function getMigrationFiles(cwd: string): Promise<MigrationFile[]> {
  const migrationsPath = path.join(cwd, MIGRATIONS_DIR);

  try {
    const files = await fs.readdir(migrationsPath);
    return files
      .filter((file) => file.endsWith('.sql'))
      .map((name) => ({
        name,
        path: path.join(migrationsPath, name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export interface DbMigrateOptions {
  cwd?: string;
  dryRun?: boolean;
}

export async function dbMigrate(options: DbMigrateOptions = {}): Promise<void> {
  const { cwd = process.cwd(), dryRun = false } = options;

  // Load config to get database instance
  const { config } = await loadConfig();
  const db = config.database as { execute?: (sql: string) => Promise<unknown> };

  if (!db) {
    throw new Error('Config does not have a database instance');
  }

  // Get migration files
  const files = await getMigrationFiles(cwd);

  if (files.length === 0) {
    console.warn('No migrations to apply.');
    return;
  }

  console.warn(`Found ${files.length} migration(s) to apply.\n`);

  if (dryRun) {
    console.warn('Dry run - showing migrations that would be applied:');
    for (const file of files) {
      console.warn(`  - ${file.name}`);
    }
    return;
  }

  // Apply each migration
  for (const file of files) {
    const sql = await fs.readFile(file.path, 'utf-8');

    console.warn(`Applying: ${file.name}`);

    try {
      // Execute the migration
      // Note: The actual execution depends on the database driver
      // For pg, we use db.execute() which returns a query result
      if (typeof db.execute === 'function') {
        await db.execute(sql);
      } else {
        throw new Error(
          'Database driver does not support execute(). ' +
          'Please use a supported driver like drizzle-orm/node-postgres.'
        );
      }

      console.warn(`  Applied successfully`);
    } catch (error) {
      console.error(`  Failed: ${(error as Error).message}`);
      throw error;
    }
  }

  console.warn(`\nSuccessfully applied ${files.length} migration(s).`);
}
