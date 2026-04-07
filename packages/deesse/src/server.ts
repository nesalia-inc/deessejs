import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Config } from "./config/define";

export type Deesse = {
  database: PostgresJsDatabase;
};

export function createDeesse(config: Config): Deesse {
  return {
    database: config.database,
  };
}
