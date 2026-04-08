/**
 * db:push command
 *
 * Generates auth schema and pushes to database with drizzle-kit.
 * Always recreates drizzle config to ensure correct schema path.
 */

import { execSync } from 'node:child_process';
import { createDrizzleConfig } from '../../lib/db/schema.js';
import { generateAuthSchema } from '../../lib/db/auth-schema.js';
import * as dotenv from 'dotenv';

export interface DbPushOptions {
  force?: boolean;
  cwd?: string;
}

export async function dbPush(options: DbPushOptions = {}): Promise<void> {
  const { force = false, cwd = process.cwd() } = options;

  // Generate auth schema (mandatory in DeesseJS)
  await generateAuthSchema(cwd);

  // Always recreate drizzle config to ensure correct schema path
  console.warn('Setting up drizzle.config.ts...');
  await createDrizzleConfig(cwd);

  console.warn('Pushing schema to database with drizzle-kit...');

  // Load .env file if it exists
  dotenv.config();

  const args = ['npx drizzle-kit', 'push'];
  if (force) {
    args.push('--force');
  }

  try {
    execSync(args.join(' '), {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('drizzle-kit not found. Please install it: npm install drizzle-kit');
    }
    throw error;
  }
}
