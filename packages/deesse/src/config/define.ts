import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Plugin } from './plugin';

export type Config = {
  database: PostgresJsDatabase;
  plugins?: Plugin[];
};

export function defineConfig(config: Config) {
  return config;
}
