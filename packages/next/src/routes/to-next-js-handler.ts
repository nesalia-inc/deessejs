import type { InternalConfig } from "deesse";
import type { NextHandler } from "@deessejs/server-next";
import { toNextJsHandler as baToNextJsHandler } from "better-auth/next-js";
import { createNextHandler } from "@deessejs/server-next";
import { handleFirstAdmin } from "../api/rest/admin/first-admin";

type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Creates a unified Next.js route handler that routes requests to:
 * - `/api/auth/*` → better-auth
 * - `/api/first-admin` → first-admin handler (dev only)
 * - `/api/*` → DRPC procedures via @deessejs/server-next
 *
 * DRPC is final — if configured and a route matches, its response is returned directly.
 * No fallback from DRPC to better-auth; namespaces are distinct.
 */
export function toNextJsHandler(config: InternalConfig) {
  // Create better-auth handler with explicit type to avoid inference issues
  const baHandler = baToNextJsHandler({
    handler: config.auth as any,
  });

  let drpcHandler: NextHandler | null = null;
  if (config.routes) {
    drpcHandler = createNextHandler(config.routes as any);
  }

  async function routeRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method as HTTPMethod;

    // Route: /api/auth/* → better-auth
    if (pathname.startsWith("/api/auth/")) {
      const handler = baHandler[method];
      if (!handler) {
        return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      return handler(request);
    }

    // Route: /api/first-admin → first-admin handler (dev only)
    if (pathname === "/api/first-admin" || pathname.endsWith("/first-admin")) {
      return handleFirstAdmin(config.auth as any, request);
    }

    // Route: DRPC procedures → @deessejs/server-next
    // DRPC uses POST for all operations. Non-POST to DRPC routes returns 405.
    if (drpcHandler) {
      if (method !== "POST") {
        return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      return drpcHandler.POST(request);
    }

    // No DRPC configured and no matching better-auth route → 404
    return new Response(JSON.stringify({ error: "NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    GET: (request: Request) => routeRequest(request),
    POST: (request: Request) => routeRequest(request),
    PUT: (request: Request) => routeRequest(request),
    PATCH: (request: Request) => routeRequest(request),
    DELETE: (request: Request) => routeRequest(request),
    OPTIONS: (request: Request) => routeRequest(request),
  };
}