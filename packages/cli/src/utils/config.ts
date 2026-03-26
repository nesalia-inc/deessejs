/**
 * Config loader utility
 *
 * Dynamically imports the user's deesse.config.ts to get the database instance.
 */

import * as path from 'node:path';
import * as url from 'node:url';

export interface DeesseConfig {
  database: unknown;
}

export interface LoadedConfig {
  config: DeesseConfig;
  configPath: string;
}

const CONFIG_PATH = './src/deesse.config.ts';

export async function loadConfig(): Promise<LoadedConfig> {
  const configPath = path.resolve(process.cwd(), CONFIG_PATH);

  // Try to load the config file
  let configModule: { config?: DeesseConfig; default?: { config?: DeesseConfig } };

  try {
    configModule = await import(url.pathToFileURL(configPath).href);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Config file not found: ${CONFIG_PATH}\n` +
        `Please create this file with your database configuration.`
      );
    }
    throw error;
  }

  // Handle both named export and default export patterns
  const config = configModule.config ?? configModule.default?.config;

  if (!config) {
    throw new Error(
      `Config file ${CONFIG_PATH} does not export a 'config' object.\n` +
      `Please ensure your config file contains: export const config = defineConfig({ ... })`
    );
  }

  if (!config.database) {
    throw new Error(
      `Config does not have a 'database' property.\n` +
      `Please add a database configuration using drizzle().`
    );
  }

  return { config, configPath };
}

export async function verifyConfigPath(): Promise<string> {
  const { stat } = await import('node:fs/promises');
  const configPath = path.resolve(process.cwd(), CONFIG_PATH);

  try {
    await stat(configPath);
    return configPath;
  } catch {
    throw new Error(
      `Config file not found: ${CONFIG_PATH}\n` +
      `Please create this file with your database configuration.`
    );
  }
}
