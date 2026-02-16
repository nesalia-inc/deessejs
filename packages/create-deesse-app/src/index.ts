#!/usr/bin/env node

import * as p from '@clack/prompts';
import path from 'node:path';
import { copyTemplate } from './copy.js';

const getVersion = () => '0.0.1';

async function main() {
  console.clear();

  p.intro(`create-deesse-app v${getVersion()}`);

  // Get project name
  const projectName = await p.text({
    message: 'What is your project named?',
    placeholder: 'my-deesse-app',
    validate: (value) => {
      if (!value) return 'Project name is required';
      if (!/^[a-z0-9-]+$/.test(value)) {
        return 'Project name must be lowercase and contain only letters, numbers, and hyphens';
      }
      return undefined;
    },
  });

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
  p.note(
    `Project: ${projectName}
Template: ${template}
Location: ./${projectName}`,
    'Configuration'
  );

  // Copy template
  const s = p.spinner();
  s.start('Creating project...');

  try {
    const targetDir = path.join(process.cwd(), projectName);
    const createdFiles = await copyTemplate(template as 'minimal' | 'default', projectName, targetDir);

    s.stop(`Project created with ${createdFiles.length} files`);

    // Next steps
    const nextSteps = [
      `cd ${projectName}`,
      'pnpm install',
      'pnpm dev',
    ];

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
