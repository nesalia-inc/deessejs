import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { BetterAuthOptions } from 'better-auth';
import type { Auth } from 'better-auth';
import type { Plugin } from '../plugin/index.js';
import type { PageTree } from '@deessejs/admin/config';
import type { AdminHeaderConfig } from '@deessejs/admin';

/**
 * User-facing config type.
 * Uses generics to preserve Drizzle type safety.
 */
export type Config<TSchema extends Record<string, unknown> = Record<string, never>> = {
  name?: string;
  database: PostgresJsDatabase<TSchema>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: Omit<BetterAuthOptions, 'database'> & {
    baseURL: string;
  };
  admin?: {
    header?: AdminHeaderConfig;
  };
};

/**
 * Internal config type used at runtime.
 */
export type InternalConfig<TSchema extends Record<string, unknown> = Record<string, never>> = Config<TSchema>;

/**
 * Deesse instance type - returned by createDeesse and getDeesse.
 */
export type Deesse = {
  auth: Auth;
  database: PostgresJsDatabase;
};
