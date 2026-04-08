/**
 * Admin create command - CLI interface
 *
 * Handles user interaction and delegates to backend logic.
 */

import * as p from '@clack/prompts';
import { z } from 'zod';
import { loadMinimalConfig, ConfigLoaderError } from '../../lib/config/loader.js';
import { createAdminUser, AdminCreationError } from '../../lib/admin/create.js';
import { drizzle } from 'drizzle-orm/node-postgres';

// Load environment variables
import 'dotenv/config';

const AdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').default('Admin'),
});

type AdminInput = z.infer<typeof AdminSchema>;

export interface AdminCreateOptions {
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

function handleError(error: unknown): never {
  if (error instanceof AdminCreationError) {
    p.log.error(error.message);
    if (error.suggestion) {
      p.log.info(error.suggestion);
    }
    process.exit(1);
  }

  if (error instanceof ConfigLoaderError) {
    p.log.error(error.message);
    process.exit(1);
  }

  // Fallback for unknown errors
  p.log.error('Unexpected error: ' + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
}

function printSuccess(result: { user: { id: string; email: string; name: string } }): void {
  p.log.success('Admin user created successfully!');
  p.log.info(`Email: ${result.user.email}`);
  p.log.info(`Name: ${result.user.name}`);
  p.log.info(`ID: ${result.user.id.slice(0, 8)}...`);
}

export async function adminCreate(options: AdminCreateOptions): Promise<void> {
  try {
    const cwd = options.cwd || process.cwd();

    // Load minimal config (does not execute config, only extracts secret and auth.baseURL)
    p.log.info('Loading config...');
    const { config } = await loadMinimalConfig(cwd);

    // Validate DATABASE_URL
    if (!process.env['DATABASE_URL']) {
      p.log.error('DATABASE_URL not found in environment. Check your .env file.');
      process.exit(1);
    }

    // Create database directly from env
    // @ts-expect-error - pg module does not have TypeScript declarations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pg: any = await import('pg');
    const database = drizzle({
      client: new pg.Pool({
        connectionString: process.env['DATABASE_URL'],
      }),
    });

    // Get admin input
    let adminInput: AdminInput;

    if (options.email && options.password) {
      p.log.info('Creating admin user with provided credentials...');
      adminInput = validateInput({
        email: options.email,
        password: options.password,
        name: options.name || 'Admin',
      });
    } else {
      adminInput = await promptForAdminDetails();
    }

    // Warn about public email
    if (isPublicEmailDomain(adminInput.email)) {
      p.log.warn(
        `Warning: ${adminInput.email} is a public email domain.\n` +
          '   Admin accounts should use organizational email addresses.'
      );
    }

    // Create admin user via backend logic
    const result = await createAdminUser({
      email: adminInput.email,
      password: adminInput.password,
      name: adminInput.name,
      database,
      secret: config.secret,
      baseURL: config.auth?.baseURL,
      plugins: config.auth?.plugins || [],
    });
    printSuccess(result);
  } catch (error) {
    handleError(error);
  }
}
