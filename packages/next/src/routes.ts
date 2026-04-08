import { toNextJsHandler } from 'better-auth/next-js';
import type { Auth, BetterAuthOptions } from 'better-auth';

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
  return toNextJsHandler(config.auth).POST;
}
