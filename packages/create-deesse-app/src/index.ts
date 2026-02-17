#!/usr/bin/env node

import * as p from '@clack/prompts';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { copyTemplate } from './copy.js';

const getVersion = () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
  );
  return packageJson.version;
};

async function main() {
  console.clear();

  p.intro(`create-deesse-app v${getVersion()}`);

  // Parse CLI args
  const args = process.argv.slice(2);
  const cliProjectName = args[0];
  const forceFlag = args.includes('--force') || args.includes('-f');

  let projectName: string | symbol;

  if (cliProjectName) {
    projectName = cliProjectName;
  } else {
    projectName = await p.text({
      message: 'What is your project named?',
      placeholder: 'my-deesse-app',
      validate: (value) => {
        if (!value) return 'Project name is required';
        // Allow "." for current directory
        if (value !== '.' && !/^[a-z0-9-]+$/.test(value)) {
          return 'Project name must be lowercase and contain only letters, numbers, and hyphens (or use "." for current directory)';
        }
        return undefined;
      },
    });
  }

  if (p.isCancel(projectName)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  // Select template
  const template = await p.select({
    message: 'Which template would you like to use?',
    options: [
      { value: 'minimal', label: 'Minimal' },
      { value: 'default', label: 'Default (Tailwind + shadcn/ui)' },
    ],
    initialValue: 'default',
  });

  if (p.isCancel(template)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }

  // Show summary
  const isCurrentDir = projectName === '.';
  const location = isCurrentDir ? 'Current directory' : `./${projectName}`;

  p.note(
    `Project: ${projectName}
Template: ${template}
Location: ${location}`,
    'Configuration'
  );

  // Copy template
  const s = p.spinner();
  s.start('Creating project...');

  try {
    const targetDir = isCurrentDir ? process.cwd() : path.join(process.cwd(), projectName);
    const createdFiles = await copyTemplate(
      template as 'minimal' | 'default',
      projectName,
      targetDir,
      isCurrentDir,
      forceFlag
    );

    s.stop(`Project created with ${createdFiles.length} files`);

    // Next steps
    const nextSteps = isCurrentDir
      ? ['pnpm install', 'pnpm dev']
      : [`cd ${projectName}`, 'pnpm install', 'pnpm dev'];

    p.note(nextSteps.join('\n'), 'Next steps');

    p.outro('Happy coding!');
  } catch (error) {
    s.stop('Failed to create project');
    p.cancel(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch((error) => {
  p.cancel('An error occurred:');
  console.error(error);
  process.exit(1);
});
