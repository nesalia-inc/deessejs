/**
 * Better-Auth schema generation for db commands
 *
 * Since auth is mandatory in DeesseJS, db:generate and db:push
 * must also generate the auth schema tables.
 *
 * Uses the programmatic API (generateDrizzleSchema from auth/api)
 * instead of spawning npx auth@latest generate.
 */

import { writeFile, access, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

const AUTH_SCHEMA_OUTPUT = './src/db/auth-schema.ts';

interface DBAdapter {
  id: string;
  options: {
    adapterConfig: {
      adapterId: string;
    };
    provider?: string;
  };
}

interface SchemaGeneratorResult {
  code?: string;
  fileName: string;
  overwrite?: boolean;
  append?: boolean;
}

async function generateDrizzleSchemaInternal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: any
): Promise<SchemaGeneratorResult> {
  // Dynamic import to get the generator
  const { generateDrizzleSchema } = await import('auth/api');

  return generateDrizzleSchema(opts);
}

/**
 * Create a mock adapter for schema generation
 */
function createMockAdapter(dialect: string): DBAdapter {
  // Map postgresql to pg for drizzle
  const provider = dialect === 'postgresql' ? 'pg' : dialect;

  return {
    id: 'drizzle',
    options: {
      adapterConfig: {
        adapterId: 'drizzle',
      },
      provider,
    },
  };
}

/**
 * Ensure a directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Generate the better-auth schema using the programmatic API
 *
 * This calls generateDrizzleSchema() directly to generate the auth tables
 * (user, session, account, verification) without needing a config file.
 */
export async function generateAuthSchema(cwd: string = process.cwd()): Promise<void> {
  const outputPath = path.resolve(cwd, AUTH_SCHEMA_OUTPUT);

  console.warn('Generating better-auth schema...');

  try {
    // Create mock adapter for drizzle with postgresql dialect
    const adapter = createMockAdapter('postgresql');

    // Generate the schema using the programmatic API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = await (generateDrizzleSchemaInternal as any)({
      file: outputPath,
      adapter,
      options: {
        database: {},
        plugins: [],
      },
    });

    if (!schema.code) {
      console.warn('Auth schema is already up to date.');
      return;
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(outputPath);
    await ensureDir(parentDir);

    // Write the generated schema to file
    await writeFile(outputPath, schema.code, 'utf-8');

    // Append schema export (combined object of all auth tables)
    // This is needed because generateDrizzleSchema exports named tables,
    // but drizzle expects a schema object with all tables
    // Named 'schema' to match drizzle-kit's expectation
    const schemaExport = `\nexport const schema = { user, session, account, verification };\n`;
    await writeFile(outputPath, schemaExport, { flag: 'a' });

    console.warn(`Auth schema generated: ${outputPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        'better-auth schema generation failed. Please ensure better-auth is installed:\n' +
          '  npm install better-auth'
      );
    }
    throw error;
  }
}

/**
 * Check if auth schema file exists
 */
export async function authSchemaExists(cwd: string = process.cwd()): Promise<boolean> {
  const outputPath = path.resolve(cwd, AUTH_SCHEMA_OUTPUT);
  try {
    await access(outputPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the path to the auth schema file
 */
export function getAuthSchemaPath(cwd: string = process.cwd()): string {
  return path.resolve(cwd, AUTH_SCHEMA_OUTPUT);
}
