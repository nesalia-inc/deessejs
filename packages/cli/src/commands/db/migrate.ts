import { command } from '@drizzle-team/brocli';
import { execSync } from 'child_process';

export const migrateCommand = command({
  name: 'migrate',
  desc: 'Apply migrations to the database',
  handler: async () => {
    execSync('drizzle-kit migrate', { stdio: 'inherit' });
  },
});
