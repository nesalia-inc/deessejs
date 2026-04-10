import { command } from '@drizzle-team/brocli';
import { generateCommand } from './generate.js';
import { migrateCommand } from './migrate.js';
import { pushCommand } from './push.js';

export const dbCommand = command({
  name: 'db',
  desc: 'Database commands (generate, migrate, push)',
  subcommands: [generateCommand, migrateCommand, pushCommand],
});
