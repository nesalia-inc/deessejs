import { command, boolean } from '@drizzle-team/brocli';
import { execSync } from 'child_process';

export const pushCommand = command({
  name: 'push',
  desc: 'Push schema changes directly to the database',
  options: {
    strict: boolean(),
    force: boolean(),
    verbose: boolean(),
  },
  handler: async (opts) => {
    const args = ['drizzle-kit', 'push'];
    if (opts?.strict) args.push('--strict');
    if (opts?.force) args.push('--force');
    if (opts?.verbose) args.push('--verbose');
    execSync(args.join(' '), { stdio: 'inherit' });
  },
});
