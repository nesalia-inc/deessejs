import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type Config = {
  database: PostgresJsDatabase;
};

export function defineConfig(config: Config) {
  return config;
}
