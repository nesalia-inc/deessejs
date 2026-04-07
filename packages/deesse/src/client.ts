import { createAuthClient } from "better-auth/react";

export interface DeesseClientOptions {
  /**
   * Auth server URL. Defaults to `/api/auth`.
   */
  baseURL?: string;

  /**
   * Custom base path for API routes
   */
  apiPath?: string;

  /**
   * Client plugins to extend functionality
   */
  plugins?: any[];
}

export interface DeesseClient {
  auth: ReturnType<typeof createAuthClient>;
}

/**
 * Creates a type-safe authentication client.
 * Wraps better-auth's createAuthClient with a simpler API.
 *
 * @example
 * ```typescript
 * import { createClient } from "deesse";
 *
 * export const client = createClient();
 *
 * // In a component:
 * const { data, isPending } = client.auth.useSession();
 * ```
 */
export function createClient(options: DeesseClientOptions = {}): DeesseClient {
  const { baseURL = "/api/auth", apiPath, plugins = [] } = options;

  const auth = createAuthClient({
    baseURL,
    ...(apiPath && { basePath: apiPath }),
    plugins,
  });

  return { auth };
}
