# Implement `toNextJsHandler(config)` in `@deessejs/next`

## Context

Currently, `@deessejs/next` exposes separate handlers that must be composed manually:

```typescript
// Current pattern (multiple exports)
import { REST_GET, REST_POST, handleFirstAdmin } from "@deessejs/next/routes";

export const GET = REST_GET({ auth: deesse.auth });
export const POST = REST_POST({ auth: deesse.auth });
```

The goal is to simplify this to:

```typescript
// Target pattern (single unified handler)
import { toNextJsHandler } from "@deessejs/next/routes";
import config from "@deesse-config";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = toNextJsHandler(config);
```

## Current Architecture

```
packages/next/src/routes.ts
├── Exports: REST_GET, REST_POST, handleFirstAdmin
│
packages/next/src/api/rest/index.ts
├── REST_GET → toNextJsHandler(config.auth).GET (from better-auth)
├── REST_POST → wrapped better-auth POST + first-admin interception
└── handleFirstAdmin → standalone handler

packages/next/src/api/rest/admin/first-admin.ts
└── handleFirstAdmin(auth, request) → NextResponse
```

## Route Namespace

DRPC and better-auth use distinct path namespaces. Routes are routed as follows:

| Path | Handler | Notes |
|------|---------|-------|
| `/api/auth/*` | better-auth | All auth routes (login, logout, session) |
| `/api/first-admin` | first-admin handler | Development only |
| `/api/*` (other) | DRPC if configured | via `@deessejs/server-next` |

**Important:** If DRPC is configured and receives a request, its response is final. DRPC and better-auth never share the same paths.

## Implementation Plan

### Step 1: Add `routes` field to `Config` type

Before implementing `toNextJsHandler`, the `Config` type in `packages/deesse/src/config/types.ts` must include the `routes` field:

```typescript
import type { APIInstance } from "@deessejs/server";

export type Config<TSchema extends Record<string, unknown> = Record<string, never>> = {
  name?: string;
  database: PostgresJsDatabase<TSchema>;
  plugins?: Plugin[];
  pages?: PageTree[];
  secret: string;
  auth: Omit<BetterAuthOptions, "database"> & { baseURL: string };
  admin?: { header?: AdminHeaderConfig };
  routes?: APIInstance;  // DRPC procedures
};
```

This aligns the implementation with the documentation in `docs/internal/features/api/`.

### Step 2: Create `packages/next/src/routes/to-next-js-handler.ts`

```typescript
import type { InternalConfig } from "deesse";
import { toNextJsHandler as baToNextJsHandler } from "better-auth/next-js";
import { createNextHandler } from "@deessejs/server-next";
import { handleFirstAdmin } from "../api/rest/admin/first-admin";

export function toNextJsHandler(config: InternalConfig) {
  const baHandler = baToNextJsHandler(config.auth);

  let drpcHandler: ReturnType<typeof createNextHandler> | null = null;
  if (config.routes) {
    drpcHandler = createNextHandler(config.routes);
  }

  async function routeRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Route: /api/auth/* → better-auth
    if (pathname.startsWith("/api/auth/")) {
      return baHandler(request);
    }

    // Route: /api/first-admin → first-admin handler
    if (pathname === "/api/first-admin" || pathname.endsWith("/first-admin")) {
      return handleFirstAdmin(config.auth, request);
    }

    // Route: DRPC procedures → @deessejs/server-next
    // DRPC uses POST for all operations. Non-POST to DRPC routes returns 405.
    if (drpcHandler) {
      const method = request.method;
      if (method !== "POST") {
        return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      return drpcHandler(request);
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
```

**Key points:**
- DRPC is final — if configured and route matches, its response is returned directly
- DRPC returns 405 for non-POST methods (DRPC only supports POST)
- No fallback from DRPC to better-auth — namespaces are distinct
- Unknown routes without DRPC return 404

### Step 3: Restructure `packages/next/src/routes/`

Create new folder structure:

```
packages/next/src/routes/
├── index.ts              # re-exports toNextJsHandler + legacy
└── to-next-js-handler.ts # the new unified handler
```

`index.ts`:

```typescript
export { toNextJsHandler } from "./to-next-js-handler";

// Legacy exports for backward compatibility
export {
  REST_GET,
  REST_POST,
  handleFirstAdmin,
  type DeesseAPIConfig,
} from "../api/rest";
```

### Step 4: Update `packages/next/src/index.ts`

Mark legacy exports as deprecated:

```typescript
// @deessejs/next package

// ... existing exports ...

// Legacy routes (deprecated, use toNextJsHandler instead)
export {
  REST_GET,
  REST_POST,
  handleFirstAdmin,
  type DeesseAPIConfig,
} from "./routes";
```

### Step 5: Verify `package.json` exports

Ensure the `routes` subpath export exists:

```json
{
  "exports": {
    "./routes": {
      "import": "./dist/routes/index.js",
      "types": "./dist/routes/index.d.ts"
    }
  }
}
```

### Step 6: Build and type-check

```bash
pnpm run build --filter=@deessejs/next
pnpm run type-check --filter=@deessejs/next
```

## Files to Modify

| File | Change |
|------|--------|
| `packages/deesse/src/config/types.ts` | Add `routes?: APIInstance` to `Config` type |
| `packages/next/src/routes/to-next-js-handler.ts` | **New file** — implements `toNextJsHandler` |
| `packages/next/src/routes/index.ts` | **New file** — re-exports |
| `packages/next/src/routes.ts` | **Delete** — replaced by `routes/` folder |
| `packages/next/src/index.ts` | Add deprecation notice for legacy exports |
| `packages/next/package.json` | Ensure `routes` subpath export exists |

## Key Dependencies

| Package | Version | Source | Purpose |
|---------|---------|--------|---------|
| `better-auth/next-js` | latest | npm | better-auth HTTP handler |
| `@deessejs/server` | 1.2.0 | npm | Core RPC protocol + `APIInstance` type |
| `@deessejs/server-next` | 1.3.1 | npm | Next.js adapter (`createNextHandler`) |

## Verification

After implementation:

```typescript
// app/(deesse)/api/[[...route]]/route.ts
import { toNextJsHandler } from "@deessejs/next/routes";
import config from "@deesse-config";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = toNextJsHandler(config);
```

And:

```typescript
// deesse.config.ts
export const config = defineConfig({
  routes: publicAPI,  // Now works — Config type includes routes field
});
```
