import type { BetterAuthPlugin } from "better-auth";
import type { Plugin } from "./plugin.js";
import type { PageTree } from "./page.js";
import type { AdminHeaderConfig } from "./header.js";

/**
 * Admin-specific config type.
 * Uses unknown for database since it comes from the deesse package.
 */
export type AdminConfig = {
  database: unknown;
  secret: string;
  auth: {
    baseURL: string;
  };
  plugins?: Plugin[];
  pages?: PageTree[];
  admin?: {
    header?: AdminHeaderConfig;
  };
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
