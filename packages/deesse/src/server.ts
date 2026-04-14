import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Auth } from "better-auth";
import type { InternalConfig } from "./config/define";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

export type Deesse = {
  auth: Auth;
  database: PostgresJsDatabase;
};

export function createDeesse(config: InternalConfig): Deesse {
  const auth = betterAuth({
    database: drizzleAdapter(config.database, {
      provider: "pg",
    }),
    baseURL: config.auth.baseURL,
    secret: config.secret,
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [config.auth.baseURL],
    plugins: config.auth.plugins,
  }) as Auth;

  return {
    auth,
    database: config.database,
  };
}
