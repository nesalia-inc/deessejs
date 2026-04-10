#!/usr/bin/env node

import { run } from '@drizzle-team/brocli';
import { dbCommand } from './commands/db/index.js';

const version = '0.6.45';

run([dbCommand], {
  name: 'deesse',
  version,
  help: () => {
    console.log(`
@deessejs/cli v${version}

Usage: deesse <command>

Available commands:
  db          Database commands (generate, migrate, push)

Run 'deesse <command> --help' for more information on a command.
    `.trim());
  },
});
