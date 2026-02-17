import copy from 'copy-template-dir';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import extract from 'extract-zip';
import { rm } from 'node:fs/promises';

export type Template = 'minimal' | 'default';

const TEMPLATES_VERSION = 'main';
const TEMPLATES_REPO = 'nesalia-inc/deessejs';
const CACHE_DIR = path.join(homedir(), '.deessejs', 'templates');

async function downloadTemplate(template: Template): Promise<string> {
  const cacheKey = `${template}-${TEMPLATES_VERSION}`;
  const cachedPath = path.join(CACHE_DIR, cacheKey);

  // Check if template is already cached
  if (existsSync(cachedPath)) {
    return cachedPath;
  }

  // Download template from GitHub (main branch)
  const url = `https://github.com/${TEMPLATES_REPO}/archive/refs/heads/${TEMPLATES_VERSION}.zip`;

  // Create cache directory
  await fs.mkdir(CACHE_DIR, { recursive: true });

  // Download zip file
  const zipPath = path.join(CACHE_DIR, `${cacheKey}.zip`);
  const tempDir = path.join(CACHE_DIR, `temp-${cacheKey}`);

  await fs.mkdir(tempDir, { recursive: true });

  // Download zip file using fetch (follows redirects automatically)
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download template: ${response.statusText}`);
  }

  // Write to file
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(zipPath, buffer);

  // Extract zip
  await extract(zipPath, { dir: tempDir });

  // Move template to cache (templates are in root of repo)
  const extractedPath = path.join(tempDir, `deessejs-${TEMPLATES_VERSION}`, 'templates', template);
  await fs.mkdir(cachedPath, { recursive: true });

  const files = await fs.readdir(extractedPath);
  for (const file of files) {
    await fs.rename(
      path.join(extractedPath, file),
      path.join(cachedPath, file)
    );
  }

  // Cleanup
  await rm(zipPath, { force: true });
  await rm(tempDir, { force: true, recursive: true });

  return cachedPath;
}

export async function copyTemplate(
  template: Template,
  projectName: string,
  targetDir: string,
  isCurrentDir = false
): Promise<string[]> {
  // Download template from GitHub
  const templateDir = await downloadTemplate(template);

  // Create target directory if it doesn't exist (skip for current directory)
  if (!isCurrentDir) {
    await fs.mkdir(targetDir, { recursive: true });

    // Check if target directory is empty
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      throw new Error(
        `Target directory "${targetDir}" is not empty. Please choose an empty directory.`
      );
    }
  } else {
    // For current directory, check if it's empty
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      throw new Error(
        `Current directory is not empty. Please choose an empty directory or use a subdirectory.`
      );
    }
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
