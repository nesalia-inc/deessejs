import { toNextJsHandler } from 'better-auth/next-js';
import type { Auth, BetterAuthOptions } from 'better-auth';
import { handleFirstAdmin } from "./admin/first-admin";

export interface DeesseAPIConfig<
  Options extends BetterAuthOptions = BetterAuthOptions,
> {
  auth: Auth<Options>;
}

export function REST_GET<
  Options extends BetterAuthOptions = BetterAuthOptions,
>(config: DeesseAPIConfig<Options>) {
  return toNextJsHandler(config.auth).GET;
}

export function REST_POST<
  Options extends BetterAuthOptions = BetterAuthOptions,
>(config: DeesseAPIConfig<Options>) {
  const betterAuthHandler = toNextJsHandler(config.auth).POST;

  return async (request: Request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Intercept /api/first-admin route
    if (pathname === "/api/first-admin" || pathname.endsWith("/first-admin")) {
      return handleFirstAdmin(config.auth as any, request);
    }

    // Delegate all other routes to better-auth
    return betterAuthHandler(request);
  };
}

// Re-export the first-admin handler for direct access if needed
export { handleFirstAdmin };
