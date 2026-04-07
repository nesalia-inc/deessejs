import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { InternalConfig } from "./config/define";
import { betterAuth } from "better-auth";
// @ts-expect-error - @better-auth/drizzle-adapter is a valid package
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

export type Deesse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: any;
  database: PostgresJsDatabase;
};

export function createDeesse(config: InternalConfig): Deesse {
  const auth = config.auth
    ? betterAuth({
        database: drizzleAdapter(config.database, {
          provider: "pg",
        }),
        baseURL: config.auth.baseURL,
        secret: config.auth.secret,
        plugins: config.auth.plugins,
      })
    : undefined;

  return {
    auth,
    database: config.database,
  };
}
