import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { BetterAuthPlugin } from "better-auth";
import type { InternalConfig } from "./config/define";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

export type Deesse = {
  auth: Awaited<ReturnType<typeof betterAuth<{
    database: ReturnType<typeof drizzleAdapter>;
    baseURL: string;
    secret: string;
    emailAndPassword: {
      enabled: true;
    };
    trustedOrigins: string[];
    plugins: BetterAuthPlugin[];
  }>>>;
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
  });

  return {
    auth,
    database: config.database,
  };
}
