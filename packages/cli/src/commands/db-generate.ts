/**
 * db:generate command
 *
 * Generates migrations from schema changes using drizzle-kit's programmatic API.
 *
 * Flow:
 * 1. Load schema from ./src/db/schema.ts
 * 2. Get current schema snapshot using generateDrizzleJson
 * 3. Get previous snapshot from ./src/db/meta/_snapshot.json (if exists)
 * 4. Generate migration SQL using generateMigration
 * 5. Save new snapshot and migration files
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  generateDrizzleJson,
  generateMigration,
} from 'drizzle-kit/api';
import { loadSchema, verifySchemaPath } from '../utils/schema-loader.js';

const SCHEMA_PATH = './src/db/schema.ts';
const MIGRATIONS_DIR = './src/db/migrations';
const SNAPSHOT_DIR = './src/db/meta';
const SNAPSHOT_FILE = '_snapshot.json';

export interface DbGenerateOptions {
  cwd?: string;
}

export async function dbGenerate(options: DbGenerateOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:generate requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  // Ensure migrations directory exists
  await fs.mkdir(path.join(cwd, MIGRATIONS_DIR), { recursive: true });

  // Ensure snapshot directory exists
  await fs.mkdir(path.join(cwd, SNAPSHOT_DIR), { recursive: true });

  // Load the schema
  const { schema } = await loadSchema();

  // Generate current schema snapshot
  const currentSchema = generateDrizzleJson(schema);

  // Load previous snapshot (if exists)
  let prevSchema = null;
  const snapshotPath = path.join(cwd, SNAPSHOT_DIR, SNAPSHOT_FILE);

  try {
    const snapshotContent = await fs.readFile(snapshotPath, 'utf-8');
    prevSchema = JSON.parse(snapshotContent);
  } catch {
    // No previous snapshot - this is the first migration
    console.warn('No previous snapshot found. This will be the first migration.');
  }

  // Generate migration SQL
  const migrationSql = await generateMigration(
    prevSchema ?? undefined,
    currentSchema
  );

  if (!migrationSql || migrationSql.length === 0) {
    console.warn('No changes detected. No migration to generate.');
    return;
  }

  // Generate migration file name based on timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const migrationName = `${timestamp}_migration.sql`;
  const migrationPath = path.join(cwd, MIGRATIONS_DIR, migrationName);

  // Save migration file
  await fs.writeFile(migrationPath, migrationSql.join('\n\n'));

  // Save new snapshot
  await fs.writeFile(
    snapshotPath,
    JSON.stringify(currentSchema, null, 2)
  );

  console.warn(`Generated migration: ${migrationName}`);
  console.warn(`Migration saved to: ${MIGRATIONS_DIR}/${migrationName}`);
}
