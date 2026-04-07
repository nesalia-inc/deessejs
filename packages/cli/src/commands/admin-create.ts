/**
 * Admin user creation command
 *
 * Implements the `deesse admin create` command for creating admin users
 * via better-auth's admin plugin.
 */

import * as p from '@clack/prompts';
import { z } from 'zod';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';

// Load environment variables
import 'dotenv/config';

const AdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').default('Admin'),
});

type AdminInput = z.infer<typeof AdminSchema>;

interface AdminOptions {
  email?: string;
  password?: string;
  name?: string;
  cwd?: string;
}

// Public email domains that should warn users
const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'mail.com',
  'aol.com',
];

function isPublicEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return PUBLIC_EMAIL_DOMAINS.includes(domain);
}

function warnPublicEmail(email: string): void {
  p.log.warn(
    `Warning: ${email} is a public email domain.\n` +
      '   Admin accounts should use organizational email addresses.'
  );
}

const ERROR_MAP: Record<string, { message: string; suggestion: string }> = {
  USER_ALREADY_EXISTS: {
    message: 'A user with this email already exists',
    suggestion: 'Use a different email or check if an admin already exists',
  },
  DATABASE_ERROR: {
    message: 'Cannot connect to database',
    suggestion: 'Check DATABASE_URL in your .env file and ensure PostgreSQL is running',
  },
  INVALID_PASSWORD: {
    message: 'Password must be at least 8 characters',
    suggestion: 'Choose a longer password',
  },
  CONNECTION_REFUSED: {
    message: 'Database connection refused',
    suggestion: 'Ensure PostgreSQL is running and DATABASE_URL is correct',
  },
};

function handleError(error: unknown): never {
  const err = error as Error & { code?: string };
  const code = err.code || '';
  const mapped = ERROR_MAP[code];

  if (mapped) {
    p.log.error(mapped.message);
    p.log.info(mapped.suggestion);
    process.exit(1);
  }

  // Fallback for unknown errors
  p.log.error('Unexpected error: ' + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
}

function validateEmail(value: string): string | undefined {
  if (!value) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return 'Invalid email format';
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (value.length < 8) return 'Password must be at least 8 characters';
  return undefined;
}

async function promptForAdminDetails(): Promise<AdminInput> {
  p.intro('Creating admin user');

  const emailResult = await p.text({
    message: 'Admin email:',
    validate: validateEmail,
  });

  if (p.isCancel(emailResult)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  if (isPublicEmailDomain(emailResult as string)) {
    p.log.warn(
      `Warning: ${emailResult} is a public email domain.\n` +
        '   Admin accounts should use organizational email addresses.'
    );
  }

  const passwordResult = await p.password({
    message: 'Admin password:',
    mask: true as unknown as string,
    validate: validatePassword,
  });

  if (p.isCancel(passwordResult)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  const nameResult = await p.text({
    message: 'Admin display name:',
    defaultValue: 'Admin',
  });

  if (p.isCancel(nameResult)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  return {
    email: emailResult as string,
    password: passwordResult as string,
    name: (nameResult as string) || 'Admin',
  };
}

function validateInput(options: Record<string, unknown>): AdminInput {
  const result = AdminSchema.safeParse(options);

  if (!result.success) {
    const error = result.error.errors[0];
    throw new Error(`${error.path.join('.')}: ${error.message}`);
  }

  return result.data;
}

async function loadConfig(cwd: string) {
  const CONFIG_PATHS = ['src/deesse.config.ts', 'deesse.config.ts', 'config/deesse.ts'];

  let configModule: Record<string, unknown> | null = null;
  let configPath = '';

  for (const configFile of CONFIG_PATHS) {
    configPath = path.resolve(cwd, configFile);
    try {
      // Windows ESM compatibility: use file:// URL
      const url = pathToFileURL(configPath).toString();
      configModule = await import(url);
      break;
    } catch (error) {
      const err = error as { code?: string };
      if (err.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  if (!configModule) {
    throw new Error(
      `Config file not found. Searched paths:\n` +
        CONFIG_PATHS.map((p) => `  - ${p}`).join('\n') +
        `\nRun 'deesse init' to create a new project.`
    );
  }

  const rawConfig = (configModule as { default?: unknown; config?: unknown }).default ||
    (configModule as { config?: unknown }).config;

  if (!rawConfig) {
    throw new Error(`No config found in ${configPath}`);
  }

  return rawConfig;
}

async function createAdminUser(options: AdminInput & { cwd?: string }): Promise<{ user: { id: string; email: string; name: string } }> {
  const { email, password, name, cwd = process.cwd() } = options;

  // Load the deesse config
  const rawConfig = await loadConfig(cwd);

  // Dynamically import defineConfig to process the config
  const require = createRequire(import.meta.url);
  let defineConfig: ((config: unknown) => { auth?: { plugins?: unknown[] }; database?: unknown }) | null = null;
  try {
    // Use require for CJS module
    const deesse = require('deesse');
    defineConfig = deesse.defineConfig;
  } catch {
    // defineConfig not available, we'll do basic checks
  }

  let config: { auth?: { plugins?: unknown[] }; database?: unknown } | null = null;

  if (defineConfig) {
    config = defineConfig(rawConfig);
  } else {
    // If we can't load defineConfig, assume rawConfig is already processed or use it directly
    config = rawConfig as unknown as typeof config;
  }

  // Check if admin plugin is configured
  const hasAdminPlugin =
    config?.auth?.plugins?.some((p) => {
      const pluginStr = String(p);
      return pluginStr.includes('admin') || pluginStr.includes('Admin');
    }) ?? false;

  if (!hasAdminPlugin) {
    throw new Error(
      'Admin plugin not configured. Add admin() to your auth.plugins in deesse.config.ts:\n\n' +
        '  import { admin } from "better-auth/plugins";\n\n' +
        '  export const config = defineConfig({\n' +
        '    auth: {\n' +
        '      plugins: [admin()],\n' +
        '    },\n' +
        '  });'
    );
  }

  // Get better-auth instance - using require for better module resolution
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const betterAuth: any = require('better-auth');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const betterAuthDrizzleAdapter: any = require('@better-auth/drizzle-adapter');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drizzleOrm: any = require('drizzle-orm');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pg: any = require('pg');

  const Pool = pg.Pool;

  // Create database client
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in environment. Check your .env file.');
  }

  // Create better-auth instance with admin plugin
  const pool = new Pool({ connectionString: databaseUrl });
  const auth = betterAuth.betterAuth({
    database: betterAuthDrizzleAdapter.drizzleAdapter(drizzleOrm.drizzle(pool)),
    plugins: [],
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

  await pool.end();

  return result as { user: { id: string; email: string; name: string } };
}

function printSuccess(result: { user: { id: string; email: string; name: string } }): void {
  p.log.success('Admin user created successfully!');
  p.log.info(`Email: ${result.user.email}`);
  p.log.info(`Name: ${result.user.name}`);
  p.log.info(`ID: ${result.user.id.slice(0, 8)}...`);
}

export async function adminCreate(options: AdminOptions): Promise<void> {
  try {
    // Normalize options
    const opts: Record<string, unknown> = {
      name: options.name || 'Admin',
      cwd: options.cwd || process.cwd(),
    };

    // If email and password provided via CLI args, use them directly
    // Otherwise prompt interactively
    let adminInput: AdminInput;

    if (options.email && options.password) {
      opts['email'] = options.email;
      opts['password'] = options.password;

      p.log.info('Creating admin user with provided credentials...');
      adminInput = validateInput(opts);
    } else {
      adminInput = await promptForAdminDetails();
    }

    // Validate email domain
    if (isPublicEmailDomain(adminInput.email)) {
      warnPublicEmail(adminInput.email);
    }

    // Create the admin user
    const result = await createAdminUser({ ...adminInput, cwd: opts['cwd'] as string });
    printSuccess(result);
  } catch (error) {
    handleError(error);
  }
}
