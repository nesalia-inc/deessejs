import { createAuthClient } from "better-auth/react";
import type { BetterAuthClientOptions } from "better-auth/client";

export interface DeesseClientOptions {
  auth: BetterAuthClientOptions;
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
export const createClient = (
  options: DeesseClientOptions,
) => {
  return { auth: createAuthClient(options.auth) };
}
