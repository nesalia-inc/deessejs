#!/usr/bin/env node

import * as p from '@clack/prompts';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const getVersion = () => {
  try {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
    );
    return packageJson.version;
  } catch {
    return '0.0.1';
  }
};

const showHelp = () => {
  console.log(`
DeesseJS CLI v${getVersion()}

Usage: npx deesse <command>

Commands:
  help     Show this help message
  init     Initialize a new DeesseJS project in current directory

Examples:
  npx deesse help
  npx deesse init

More commands coming soon!

For more information, visit: https://github.com/nesalia-inc/deessejs
  `);
};

const runInit = async () => {
  try {
    p.intro(`DeesseJS CLI v${getVersion()}`);

    const confirm = await p.confirm({
      message: 'Initialize a new DeesseJS project in the current directory?',
    });

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Initialization cancelled.');
      process.exit(0);
    }

    // Use create-deesse-app with current directory
    p.log.info('Running create-deesse-app in current directory...');
    execSync('npx create-deesse-app@latest .', { stdio: 'inherit' });

    p.outro('Project initialized successfully!');
  } catch (error) {
    p.cancel('Failed to initialize project');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    case 'init':
      await runInit();
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Run "npx deesse help" for usage information.');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('An error occurred:');
  console.error(error);
  process.exit(1);
});
