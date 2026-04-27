import type { BetterAuthPlugin } from "better-auth";
import type { AdminConfig, InternalAdminConfig } from "./types.js";

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
