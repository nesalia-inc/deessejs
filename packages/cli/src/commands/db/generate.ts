import { command } from '@drizzle-team/brocli';
import { execSync } from 'child_process';

export const generateCommand = command({
  name: 'generate',
  desc: 'Generate migration files from schema changes',
  handler: async () => {
    execSync('drizzle-kit generate', { stdio: 'inherit' });
  },
});
