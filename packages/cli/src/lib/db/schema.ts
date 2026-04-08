/**
 * Drizzle schema loader
 *
 * Dynamically imports the user's schema from ./src/db/schema.ts
 * This is required because drizzle-kit's programmatic API takes schema objects,
 * not file paths.
 */

import * as path from 'node:path';
import { createRequire } from 'node:module';
import { writeFile, access, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DEFAULT_SCHEMA_PATH = './src/db/schema.ts';
const DEFAULT_DRIZZLE_CONFIG_PATH = './drizzle.config.ts';
const DEFAULT_SCHEMA_DIR = './src/db';

export { DEFAULT_SCHEMA_PATH, DEFAULT_DRIZZLE_CONFIG_PATH };

export interface SchemaLoaderResult {
  schema: Record<string, unknown>;
  schemaPath: string;
}

export class SchemaLoaderError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'SchemaLoaderError';
  }
}

/**
 * Load Drizzle schema objects from the user's schema file
 */
export async function loadSchema(cwd: string = process.cwd()): Promise<SchemaLoaderResult> {
  const schemaPath = path.resolve(cwd, DEFAULT_SCHEMA_PATH);

  const require = createRequire(import.meta.url);

  try {
    const schemaModule = require(schemaPath);

    // Extract all exports that are schema objects (tables, etc.)
    const schema: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schemaModule)) {
      // Skip non-schema exports (like imports, types, etc.)
      if (key === '__esModule' || key === 'default') continue;
      if (typeof value !== 'object' && typeof value !== 'function') continue;

      schema[key] = value;
    }

    if (Object.keys(schema).length === 0) {
      throw new SchemaLoaderError(
        `No schema objects found in ${DEFAULT_SCHEMA_PATH}.\n` +
          `Please export your Drizzle tables from this file.`
      );
    }

    return { schema, schemaPath };
  } catch (error) {
    if (error instanceof SchemaLoaderError) {
      throw error;
    }
    const err = error as { code?: string };
    if (err.code === 'ENOENT') {
      throw new SchemaLoaderError(
        `Schema file not found: ${DEFAULT_SCHEMA_PATH}\n` +
          `Please create this file and export your Drizzle tables.`
      );
    }
    throw error;
  }
}

/**
 * Verify the schema file exists
 */
export async function verifySchemaPath(cwd: string = process.cwd()): Promise<string> {
  const { stat } = await import('node:fs/promises');
  const schemaPath = path.resolve(cwd, DEFAULT_SCHEMA_PATH);

  try {
    await stat(schemaPath);
    return schemaPath;
  } catch {
    throw new SchemaLoaderError(
      `Schema file not found: ${DEFAULT_SCHEMA_PATH}\n` +
        `Please create this file and export your Drizzle tables.`
    );
  }
}

/**
 * Check if schema file exists
 */
export async function schemaExists(cwd: string = process.cwd()): Promise<boolean> {
  const schemaPath = path.resolve(cwd, DEFAULT_SCHEMA_PATH);
  try {
    await access(schemaPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if drizzle config exists
 */
export async function drizzleConfigExists(cwd: string = process.cwd()): Promise<boolean> {
  const configPath = path.resolve(cwd, DEFAULT_DRIZZLE_CONFIG_PATH);
  try {
    await access(configPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create the default schema file with auth schema import
 */
export async function createDefaultSchema(cwd: string = process.cwd()): Promise<void> {
  const schemaDir = path.resolve(cwd, DEFAULT_SCHEMA_DIR);
  const schemaPath = path.resolve(cwd, DEFAULT_SCHEMA_PATH);

  // Ensure src/db directory exists
  if (!existsSync(schemaDir)) {
    await mkdir(schemaDir, { recursive: true });
  }

  // Auth schema is in src/db/ next to schema.ts, so same directory import
  const schemaContent = `import { authSchema } from './auth-schema';

export const schema = {
  ...authSchema,
  // your tables here
};
`;

  await writeFile(schemaPath, schemaContent, 'utf-8');
  console.warn(`Created default schema: ${schemaPath}`);
}

/**
 * Create the default drizzle config file
 */
export async function createDrizzleConfig(cwd: string = process.cwd()): Promise<void> {
  const configPath = path.resolve(cwd, DEFAULT_DRIZZLE_CONFIG_PATH);

  // Point directly to auth-schema.ts which now exports 'schema'
  const configContent = `import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/auth-schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`;

  // Always overwrite - drizzle-kit requires the correct schema path
  await writeFile(configPath, configContent, 'utf-8');
  console.warn(`Created/Updated drizzle config: ${configPath}`);
}
