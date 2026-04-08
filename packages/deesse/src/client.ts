import { createAuthClient } from "better-auth/react";
import type {
  AuthClient,
  BetterAuthClientOptions,
} from "better-auth/client";

export interface DeesseClientOptions {
  auth: BetterAuthClientOptions;
}

export interface DeesseClient {
  auth: AuthClient<BetterAuthClientOptions>;
}

/**
 * Creates a type-safe authentication client.
 * Wraps better-auth's createAuthClient with a simpler API.
 *
 * @example
 * ```typescript
 * import { createClient } from "deesse";
 *
 * export const client = createClient({
 *   auth: {
 *     baseURL: "/api/auth",
 *   },
 * });
 *
 * // In a component:
 * const { data, isPending } = client.auth.useSession();
 * ```
 */
export function createClient(
  options: DeesseClientOptions,
): DeesseClient {
  const auth = createAuthClient(options.auth) as unknown as AuthClient<BetterAuthClientOptions>;

  return { auth };
}
