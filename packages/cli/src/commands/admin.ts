/**
 * Admin command for managing admin users
 *
 * Usage: deesse admin create [options]
 */

export interface AdminCreateOptions {
  email?: string;
  password?: string;
  name?: string;
  cwd?: string;
}

export const adminCommand = {
  name: 'admin' as const,
  description: 'Manage admin users',
  subcommands: [
    {
      name: 'create' as const,
      description: 'Create an admin user',
      options: [
        { name: '--email <email>', description: 'Admin email address' },
        { name: '--password <password>', description: 'Admin password (min 8 characters)' },
        { name: '--name <name>', description: 'Admin display name', default: 'Admin' },
        { name: '--cwd <path>', description: 'Working directory', default: process.cwd() },
      ],
    },
  ],
};
