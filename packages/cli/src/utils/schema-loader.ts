/**
 * Schema loader utility
 *
 * Dynamically imports the user's schema from ./src/db/schema.ts
 * This is required because drizzle-kit's programmatic API takes schema objects,
 * not file paths.
 */

import * as path from 'node:path';
import * as url from 'node:url';

const SCHEMA_PATH = './src/db/schema.ts';
export { SCHEMA_PATH };

export interface SchemaLoaderResult {
  schema: Record<string, unknown>;
  schemaPath: string;
}

export async function loadSchema(): Promise<SchemaLoaderResult> {
  const schemaPath = path.resolve(process.cwd(), SCHEMA_PATH);

  // Dynamic import of the schema file
  // This works because the user's tsconfig.json has @deesse-config alias
  // and schema is at ./src/db/schema.ts
  const schemaModule = await import(url.pathToFileURL(schemaPath).href);

  // Extract all exports that are schema objects (tables, etc.)
  const schema: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schemaModule)) {
    // Skip non-schema exports (like imports, types, etc.)
    if (key === '__esModule' || key === 'default') continue;
    if (typeof value !== 'object' && typeof value !== 'function') continue;

    schema[key] = value;
  }

  if (Object.keys(schema).length === 0) {
    throw new Error(
      `No schema objects found in ${SCHEMA_PATH}. ` +
      `Please export your Drizzle tables from this file.`
    );
  }

  return { schema, schemaPath };
}

export async function verifySchemaPath(): Promise<string> {
  const { stat } = await import('node:fs/promises');
  const schemaPath = path.resolve(process.cwd(), SCHEMA_PATH);

  try {
    await stat(schemaPath);
    return schemaPath;
  } catch {
    throw new Error(
      `Schema file not found: ${SCHEMA_PATH}\n` +
      `Please create this file and export your Drizzle tables.`
    );
  }
}
