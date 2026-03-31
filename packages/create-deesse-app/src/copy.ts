import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Template = 'minimal' | 'default';

export async function copyTemplate(
  template: Template,
  projectName: string,
  targetDir: string,
  isCurrentDir = false,
  force = false
): Promise<string[]> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templateDir = path.resolve(__dirname, '../../templates', template);

  // Check if template exists
  if (!existsSync(templateDir)) {
    throw new Error(`Template "${template}" not found. Available templates: minimal, default`);
  }

  // Create target directory if it doesn't exist (skip for current directory)
  if (!isCurrentDir) {
    mkdirSync(targetDir, { recursive: true });

    // Check if target directory is empty (skip if --force)
    if (!force) {
      const files = readdirSync(targetDir);
      if (files.length > 0) {
        throw new Error(
          `Target directory "${targetDir}" is not empty. Please choose an empty directory or use --force to overwrite.`
        );
      }
    }
  } else {
    // For current directory, check if it's empty (skip if --force)
    if (!force) {
      const files = readdirSync(targetDir);
      if (files.length > 0) {
        throw new Error(
          'Current directory is not empty. Please choose an empty directory or use a subdirectory. Use --force to overwrite.'
        );
      }
    }
  }

  // Variables to replace in template files
  const vars = {
    PROJECT_NAME: projectName,
  };

  // Copy template files
  cpSync(templateDir, targetDir, { recursive: true });

  // Get list of created files
  const createdFiles = getAllFiles(targetDir);

  // Apply variable replacements
  for (const file of createdFiles) {
    const content = readFileSync(file, 'utf-8');
    let modified = content;
    for (const [key, value] of Object.entries(vars)) {
      modified = modified.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    if (modified !== content) {
      writeFileSync(file, modified, 'utf-8');
    }
  }

  return createdFiles.filter((file) => !path.basename(file).startsWith('.gitkeep'));
}

function getAllFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}