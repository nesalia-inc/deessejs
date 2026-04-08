/**
 * Configuration loader for Deesse projects
 *
 * Handles loading and processing of deesse.config.ts files.
 * Uses tsx to support TypeScript imports natively.
 */

import * as path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const CONFIG_PATHS = ['src/deesse.config.ts', 'deesse.config.ts', 'config/deesse.ts'];

// Minimal type definitions for config objects (avoid importing from deesse)
interface Config {
  name?: string;
  database?: unknown;
  plugins?: unknown[];
  pages?: unknown[];
  secret?: string;
  auth?: {
    baseURL?: string;
    plugins?: unknown[];
  };
}

interface InternalConfig extends Config {
  auth?: {
    baseURL: string;
    plugins: unknown[];
  };
}

export class ConfigLoaderError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ConfigLoaderError';
  }
}

export interface MinimalConfig {
  secret: string;
  auth?: {
    baseURL?: string;
    plugins?: unknown[];
  };
}

export interface LoadConfigResult {
  rawConfig: Config;
  processedConfig: InternalConfig;
  configPath: string;
}

/**
 * Load the raw config from a deesse.config.ts file using tsx
 *
 * Uses tsx to execute the config file directly and export the config object.
 * This properly handles TypeScript imports and module context.
 */
export async function loadRawConfig(cwd: string): Promise<{ config: Config; configPath: string }> {
  let configPath = '';

  for (const configFile of CONFIG_PATHS) {
    configPath = path.resolve(cwd, configFile);
    try {
      // Try to access the file
      const { access } = await import('node:fs/promises');
      await access(configPath);
      // File exists, break out of loop
      break;
    } catch {
      // Try next path
      configPath = '';
    }
  }

  if (!configPath) {
    throw new ConfigLoaderError(
      `Config file not found. Searched paths:\n${CONFIG_PATHS.map((p) => `  - ${p}`).join('\n')}\nRun 'deesse init' to create a new project.`
    );
  }

  // Use tsx to load and execute the TypeScript config file directly
  // The config file is run as a module, and we export the config to stdout
  const loaderScript = `
import { pathToFileURL } from 'node:url';
const configPath = pathToFileURL(${JSON.stringify(configPath)}).href;
const mod = await import(configPath);
const config = mod.config || mod.default;
if (!config) {
  console.error('No config export found');
  process.exit(1);
}
// Serialize to JSON (handles plain data, not functions)
console.log(JSON.stringify(config));
`;

  try {
    // Execute with tsx, preserving the current environment
    const result = execSync(`node --import tsx -e ${JSON.stringify(loaderScript)}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const rawConfig = JSON.parse(result.trim());

    if (!rawConfig) {
      throw new ConfigLoaderError(`No config found in ${configPath}`);
    }

    return { config: rawConfig as Config, configPath };
  } catch (error) {
    const err = error as { message?: string; stderr?: string };
    throw new ConfigLoaderError(
      `Failed to load config from ${configPath}: ${err.stderr || err.message || String(error)}`
    );
  }
}

/**
 * Process raw config via defineConfig to get InternalConfig
 */
export function processConfig(rawConfig: Config): InternalConfig {
  const require = createRequire(import.meta.url);

  try {
    const deesse = require('deesse');
    if (typeof deesse.defineConfig !== 'function') {
      throw new ConfigLoaderError('deesse package does not export defineConfig');
    }
    return deesse.defineConfig(rawConfig) as InternalConfig;
  } catch (error) {
    if (error instanceof ConfigLoaderError) {
      throw error;
    }
    throw new ConfigLoaderError(
      `Failed to process config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Load and process a deesse config
 */
export async function loadConfig(cwd: string): Promise<LoadConfigResult> {
  const { config: rawConfig, configPath } = await loadRawConfig(cwd);
  const processedConfig = processConfig(rawConfig);
  return { rawConfig, processedConfig, configPath };
}

/**
 * Load minimal config without executing the config file
 *
 * Extracts only secret and auth.baseURL via regex to avoid loading
 * pages and other runtime-only config that would fail during CLI use.
 */
export async function loadMinimalConfig(cwd: string): Promise<{ config: MinimalConfig; configPath: string }> {
  const { configPath } = await findConfigPath(cwd);

  // Read file content directly
  const { readFile } = await import('node:fs/promises');
  const content = await readFile(configPath, 'utf-8');

  const config: MinimalConfig = { secret: '' };

  // Extract secret: matches `secret: process.env.DEESSE_SECRET!` or similar patterns
  const secretMatch = content.match(/secret\s*:\s*process\.env\.(\w+)!/);
  if (secretMatch) {
    const envVar = secretMatch[1];
    const value = process.env[envVar];
    if (!value) {
      throw new ConfigLoaderError(
        `Environment variable ${envVar} is not set. Make sure your .env file contains ${envVar}`
      );
    }
    config.secret = value;
  } else {
    // Try matching `secret: 'value'` or `secret: "value"`
    const secretLiteralMatch = content.match(/secret\s*:\s*['"]([^'"]+)['"]/);
    if (secretLiteralMatch) {
      config.secret = secretLiteralMatch[1];
    }
  }

  if (!config.secret) {
    throw new ConfigLoaderError(
      `Could not extract 'secret' from ${configPath}. ` +
        'Make sure your config has: secret: process.env.DEESSE_SECRET!'
    );
  }

  // Extract auth.baseURL: matches `baseURL: process.env.VAR || 'default'` or `baseURL: 'https://...'`
  const baseURLMatch = content.match(/baseURL\s*:\s*(?:process\.env\.(\w+)\s*\|\|\s*)?['"]([^'"]+)['"]/);
  if (baseURLMatch) {
    const envVar = baseURLMatch[1];
    const defaultValue = baseURLMatch[2];
    config.auth = {
      baseURL: envVar && process.env[envVar] ? process.env[envVar] : defaultValue,
    };
  }

  return { config, configPath };
}

/**
 * Find the config file path without loading content
 */
async function findConfigPath(cwd: string): Promise<{ configPath: string }> {
  for (const configFile of CONFIG_PATHS) {
    const configPath = path.resolve(cwd, configFile);
    try {
      const { access } = await import('node:fs/promises');
      await access(configPath);
      return { configPath };
    } catch {
      // Try next path
    }
  }

  throw new ConfigLoaderError(
    `Config file not found. Searched paths:\n${CONFIG_PATHS.map((p) => `  - ${p}`).join('\n')}\nRun 'deesse init' to create a new project.`
  );
}

/**
 * Check if the admin plugin is configured in the config
 */
export function hasAdminPlugin(config: InternalConfig): boolean {
  if (!config.auth?.plugins) {
    return false;
  }

  return config.auth.plugins.some((plugin: unknown) => {
    // Check if plugin has a name property indicating it's the admin plugin
    if (plugin && typeof plugin === 'object' && 'name' in plugin) {
      const name = (plugin as { name: unknown }).name;
      return name === 'admin' || String(name).includes('admin');
    }
    // Fallback to string representation check
    const pluginStr = String(plugin);
    return pluginStr.includes('admin') || pluginStr.includes('Admin');
  });
}

/**
 * Verify admin plugin is configured, throw if not
 */
export function verifyAdminPlugin(config: InternalConfig): void {
  if (!hasAdminPlugin(config)) {
    throw new ConfigLoaderError(
      'Admin plugin not configured. The admin plugin is automatically included by defineConfig,\n' +
        'but your config must have an auth section configured.\n\n' +
        'Example deesse.config.ts:\n' +
        '  export const config = defineConfig({\n' +
        '    auth: {\n' +
        '      baseURL: process.env.NEXT_PUBLIC_BASE_URL,\n' +
        '    },\n' +
        '    // ... other config\n' +
        '  });'
    );
  }
}
