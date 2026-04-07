import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Plugin } from './plugin';
import type { PageTree } from './page';
import { admin } from 'better-auth/plugins';

export type Config = {
  name?: string;
  database: PostgresJsDatabase;
  plugins?: Plugin[];
  pages?: PageTree[];
  auth?: {
    baseURL: string;
  };
};

/**
 * Internal config type used at runtime - includes admin plugin
 */
export type InternalConfig = Config & {
  auth?: {
    baseURL: string;
    plugins: any[];
  };
};

export function defineConfig(config: Config): InternalConfig {
  // Always include admin plugin - user cannot remove it
  const authPlugins = [admin()];

  return {
    ...config,
    auth: config.auth
      ? {
          ...config.auth,
          plugins: authPlugins,
        }
      : undefined,
  } as InternalConfig;
}
