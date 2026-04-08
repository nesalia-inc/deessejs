/**
 * db:generate command
 *
 * Generates auth schema and user migrations with drizzle-kit.
 * Always recreates drizzle config to ensure correct schema path.
 */

import { execSync } from 'node:child_process';
import { createDrizzleConfig } from '../../lib/db/schema.js';
import { generateAuthSchema } from '../../lib/db/auth-schema.js';

export interface DbGenerateOptions {
  cwd?: string;
}

export async function dbGenerate(options: DbGenerateOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // Generate auth schema (mandatory in DeesseJS)
  await generateAuthSchema(cwd);

  // Always recreate drizzle config to ensure correct schema path
  console.warn('Setting up drizzle.config.ts...');
  await createDrizzleConfig(cwd);

  console.warn('Generating migrations with drizzle-kit...');

  try {
    execSync('npx drizzle-kit generate', {
      cwd,
      stdio: 'inherit',
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('drizzle-kit not found. Please install it: npm install drizzle-kit');
    }
    throw error;
  }
}
