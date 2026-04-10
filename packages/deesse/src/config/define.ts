import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { BetterAuthPlugin } from 'better-auth';
import type { Plugin } from './plugin';
import type { PageTree } from './page';
import { admin } from 'better-auth/plugins';

export type Config = {
  name?: string;
  database: PostgresJsDatabase<any>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: {
    baseURL: string;
  };
};

/**
 * Internal config type used at runtime - includes admin plugin
 */
export type InternalConfig = Config & {
  auth: {
    baseURL: string;
    plugins: BetterAuthPlugin[];
  };
};

export function defineConfig(config: Config): InternalConfig {
  // Always include admin plugin - user cannot remove it
  const authPlugins: BetterAuthPlugin[] = [admin()];

  return {
    ...config,
    auth: {
      ...config.auth,
      plugins: authPlugins,
    },
  } as InternalConfig;
}
