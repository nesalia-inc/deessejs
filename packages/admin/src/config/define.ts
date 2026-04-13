import type { BetterAuthPlugin } from "better-auth";
import type { Plugin } from "./plugin.js";
import type { PageTree } from "./page.js";

export type AdminConfig = {
  database: unknown;
  secret: string;
  auth: {
    baseURL: string;
  };
  plugins?: Plugin[];
  pages?: PageTree[];
};

/**
 * Internal config type used at runtime - includes admin plugin
 */
export type InternalAdminConfig = AdminConfig & {
  auth: {
    baseURL: string;
    plugins: BetterAuthPlugin[];
  };
};

export function defineAdminConfig(config: AdminConfig): InternalAdminConfig {
  const authPlugins: BetterAuthPlugin[] = [];

  return {
    ...config,
    auth: {
      ...config.auth,
      plugins: authPlugins,
    },
  } as InternalAdminConfig;
}
