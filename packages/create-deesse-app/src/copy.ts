import copy from 'copy-template-dir';
import path from 'node:path';
import { promises as fs } from 'node:fs';

export type Template = 'minimal' | 'default';

export async function copyTemplate(
  template: Template,
  projectName: string,
  targetDir: string
): Promise<string[]> {
  const templateDir = path.join(__dirname, '../templates', template);

  // Verify template exists
  try {
    await fs.access(templateDir);
  } catch {
    throw new Error(`Template "${template}" not found at ${templateDir}`);
  }

  // Create target directory if it doesn't exist
  await fs.mkdir(targetDir, { recursive: true });

  // Check if target directory is empty
  const files = await fs.readdir(targetDir);
  if (files.length > 0) {
    throw new Error(
      `Target directory "${targetDir}" is not empty. Please choose an empty directory.`
    );
  }

  // Variables to replace in template files
  const vars = {
    PROJECT_NAME: projectName,
  };

  // Copy template
  return new Promise((resolve, reject) => {
    copy(templateDir, targetDir, vars, (err, createdFiles) => {
      if (err) {
        reject(err);
      } else {
        // Filter out .gitkeep files from the created files list
        const filteredFiles = createdFiles.filter(
          (file) => !path.basename(file).startsWith('.gitkeep')
        );
        resolve(filteredFiles);
      }
    });
  });
}
