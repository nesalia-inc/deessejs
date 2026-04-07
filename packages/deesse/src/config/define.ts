import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Plugin } from './plugin';
import type { PageTree } from './page';

export type Config = {
  name?: string;
  database: PostgresJsDatabase;
  plugins?: Plugin[];
  pages?: PageTree[];
};

export function defineConfig(config: Config) {
  return config;
}
