/**
 * db:push command
 *
 * Pushes schema changes directly to the database (dev only).
 * Uses drizzle-kit's pushSchema programmatic API.
 *
 * Flow:
 * 1. Load schema from ./src/db/schema.ts
 * 2. Load config to get database instance
 * 3. Call pushSchema with the schema
 * 4. Show warnings and apply if confirmed (or force)
 */

import { pushSchema } from 'drizzle-kit/api';
import { loadConfig } from '../utils/config.js';
import { loadSchema, verifySchemaPath, SCHEMA_PATH } from '../utils/schema-loader.js';
import * as p from '@clack/prompts';

export interface DbPushOptions {
  force?: boolean;
  cwd?: string;
}

export async function dbPush(options: DbPushOptions = {}): Promise<void> {
  const { force = false } = options;

  // Verify schema file exists
  try {
    await verifySchemaPath();
  } catch {
    throw new Error(
      `db:push requires ${SCHEMA_PATH} to exist.\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }

  // Load config to get database instance
  const { config } = await loadConfig();
  const db = config.database;

  if (!db) {
    throw new Error('Config does not have a database instance');
  }

  // Load the schema
  const { schema } = await loadSchema();

  // Push schema to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await pushSchema(schema, db as any);

  // Check for data loss
  if (result.hasDataLoss && !force) {
    p.note('The following changes may cause data loss:', 'Warning');
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`);
    }
    console.warn('');

    const confirm = await p.confirm({
      message: 'Do you want to apply these changes anyway?',
      initialValue: false,
    });

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Push cancelled.');
      return;
    }
  } else if (result.warnings.length > 0) {
    p.note(result.warnings.join('\n'), 'Warnings');
  }

  // Show statements that will be executed
  if (result.statementsToExecute.length > 0) {
    console.warn('The following SQL will be executed:');
    for (const stmt of result.statementsToExecute) {
      console.warn(`  ${stmt}`);
    }
    console.warn('');
  }

  // Apply the changes
  await result.apply();

  console.warn(`Successfully pushed ${result.statementsToExecute.length} changes to the database.`);
}
