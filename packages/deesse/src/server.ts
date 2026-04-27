import type { InternalConfig, Deesse } from "./config/types.js";
import type { Auth } from "better-auth";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

export const createDeesse = (config: InternalConfig): Deesse => {
  const auth = betterAuth({
    database: drizzleAdapter(config.database, {
      provider: "pg",
    }),
    baseURL: config.auth.baseURL,
    secret: config.secret,
    emailAndPassword: config.auth.emailAndPassword,
    trustedOrigins: config.auth.trustedOrigins,
    plugins: config.auth.plugins,
  }) as Auth;

  return {
    auth,
    database: config.database,
  };
}
