/**
 * Backend logic for creating admin users
 *
 * This module contains the pure business logic for creating an admin user
 * via better-auth. It has no CLI dependencies (@clack/prompts, etc.).
 */

export interface CreateAdminOptions {
  email: string;
  password: string;
  name: string;
  database: unknown;
  secret: string;
  baseURL?: string;
  plugins?: unknown[];
}

export interface CreateAdminResult {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export class AdminCreationError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'AdminCreationError';
  }
}

export async function createAdminUser(options: CreateAdminOptions): Promise<CreateAdminResult> {
  const { email, password, name, database, secret, baseURL, plugins } = options;

  // Require better-auth packages
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const betterAuth: any = require('better-auth');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const betterAuthDrizzleAdapter: any = require('@better-auth/drizzle-adapter');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const pg: any = require('pg');

  const Pool = pg.Pool;

  // Create database client
  const pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
  });

  try {
    // Create better-auth instance with the config's database and auth settings
    const auth = betterAuth.betterAuth({
      database: betterAuthDrizzleAdapter.drizzleAdapter(database),
      baseURL,
      secret,
      plugins: plugins || [],
    });

    // Create admin user via better-auth API
    const result = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role: 'admin',
      },
    });

    return result as CreateAdminResult;
  } finally {
    await pool.end();
  }
}
