# Turbopack First-Class Support Analysis

## Overview

Turbopack is Next.js's Rust-based bundler that provides significantly faster builds and dev server startup. For DeesseJS, we want **first-class Turbopack support** with webpack as a secondary fallback.

---

## 1. Fundamental Difference: Turbopack vs Webpack

### Webpack

- Uses `webpack.externals` for externalizing packages
- `externals` configuration works for both direct and transitive dependencies
- Full flexibility but slower

### Turbopack

- **Does NOT support `webpack.externals`** — only `serverExternalPackages`
- `serverExternalPackages` only works for packages **directly installed** in user's `package.json`
- **Transitive dependencies cannot be externalized** unless their entry-point package is in `serverExternalPackages`

```javascript
// webpack.config.js (webpack only)
{
  externals: [
    'drizzle-kit',      // Works in webpack, IGNORED in Turbopack
    'sharp',
  ]
}

// next.config.ts (Turbopack + webpack)
{
  serverExternalPackages: [
    'better-auth',      // Works in BOTH
    '@libsql/client',    // Works in BOTH
  ],
  webpack: (config) => ({
    ...config,
    externals: ['sharp', 'pino']  // Only webpack uses this
  })
}
```

---

## 2. Turbopack Externalization Rules

### The Critical Constraint

From Payload's `withPayload.js`:

```javascript
/**
 * Turbopack support: Unlike webpack.externals, we cannot use
 * serverExternalPackages to externalize packages that are not
 * resolvable from the project root.
 *
 * Including a package like "drizzle-kit" in serverExternalPackages
 * would do NOTHING — Next.js will ignore it and still bundle it
 * because it detects that the package is not resolvable from the
 * project root (= not directly installed by the user).
 *
 * We can only use serverExternalPackages for entry-point packages
 * that ARE installed directly by the user (e.g., db-postgres, which
 * then installs drizzle-kit as a dependency).
 */
```

### Rule Summary

| Package Type | Can Externalize? | How |
|--------------|-----------------|-----|
| Direct dependency (in user's `package.json`) | ✅ Yes | `serverExternalPackages` |
| Transitive dependency | ❌ No | Must externalize via parent package |
| Not installed | ❌ No | N/A |

### Practical Example

```json
// User's package.json
{
  "dependencies": {
    "better-auth": "^1.0.0",
    "@libsql/client": "^0.6.0"
  }
}
```

```typescript
// next.config.ts
{
  serverExternalPackages: [
    'better-auth',       // ✅ Externalized (direct dep)
    '@libsql/client',    // ✅ Externalized (direct dep)
    // 'drizzle-kit'     // ❌ IGNORED - not a direct dep
  ]
}
```

When Turbopack bundles `better-auth`:
```
better-auth
  └── drizzle-kit (transitive) → Bundled inside better-auth
        └── pg (transitive) → Bundled inside better-auth
```

---

## 3. Version Requirements

| Feature | Minimum Version |
|---------|----------------|
| Turbopack dev mode | Next.js 15+ |
| Turbopack production builds | **Next.js 16.1.0+** |
| Externalize transitive deps | **Next.js 16.1.0-canary.3+** |

### Version Detection

From `withPayload.utils.js`:

```javascript
export function supportsTurbopackExternalizeTransitiveDependencies(version) {
  if (major > 16) return true
  if (major === 16) {
    if (minor > 1) return true
    if (minor === 1) {
      if (patch > 0) return true      // 16.1.1+ supports this
      if (canaryVersion >= 3) return true  // 16.1.0-canary.3+
    }
  }
  return false
}
```

### Error Handling for Unsupported Versions

```javascript
const isBuild = process.env.NODE_ENV === 'production'
const isTurbopack = process.env.TURBOPACK === '1' || process.env.TURBOPACK === 'auto'

if (isBuild && isTurbopack && !supportsTurbopackExternalizeTransitiveDependencies(version)) {
  throw new Error(
    'Your Next.js version does not support using Turbopack for production builds. ' +
    'The *minimum* Next.js version required is 16.1.0. ' +
    'Please upgrade to the latest supported Next.js version.'
  )
}
```

---

## 4. Turbopack-First Configuration Pattern

### Recommended `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Transpile monorepo packages
  // These are transpiled but NOT externalized (treated as part of the app)
  transpilePackages: ["better-auth", "@better-auth/core"],

  // 2. Turbopack-first: serverExternalPackages
  // These are externalized in BOTH Turbopack and webpack
  serverExternalPackages: [
    // Auth library (direct dependency)
    "better-auth",

    // Database drivers (direct dependencies)
    "@libsql/client",
    "postgres",
    "mysql2",
    "better-sqlite3",

    // Native modules
    "sharp",
    "pino",
    "bcrypt",
  ],

  // 3. Turbopack config (enables Turbopack when present)
  turbopack: {
    // Empty is fine - presence of this object enables Turbopack
  },

  // 4. Webpack fallback (only used when NOT using Turbopack)
  webpack: (config, { dev, isServer }) => {
    if (!dev && isServer) {
      return {
        ...config,
        externals: [
          ...config.externals,
          // Additional webpack externals if needed
          // These are IGNORED by Turbopack
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
```

### Development vs Production Strategy

```typescript
// In withPayload.js pattern (dev vs build)
if (process.env.NODE_ENV === 'development' && !options.devBundleServerPackages) {
  // During dev: externalize for faster Turbopack HMR
  serverExternalPackages: [
    'payload',
    '@payloadcms/db-mongodb',
    '@payloadcms/db-postgres',
    // ...
  ]
} else {
  // During build: bundle everything for optimal size
  serverExternalPackages: []
}
```

---

## 5. better-auth Cookie Handling with Turbopack

### Cookie Detection Pattern

From `nextCookies` plugin in better-auth:

```typescript
export const nextCookies = () => {
  return {
    id: "next-cookies",
    hooks: {
      before: [
        {
          matcher(ctx) { return ctx.path === "/get-session"; },
          handler: createAuthMiddleware(async () => {
            let cookieStore;
            try {
              // Try to use next/headers (works in Route Handlers)
              const { cookies } = await import("next/headers.js");
              cookieStore = await cookies();

              // Verify it works
              cookieStore.set("__better-auth-cookie-store", "1", { maxAge: 0 });
              cookieStore.delete("__better-auth-cookie-store");
            } catch {
              // Failed = we're in a Server Component context
              // Skip session cookie refresh
              await setShouldSkipSessionRefresh(true);
            }
          }),
        },
      ],
      after: [
        {
          matcher(ctx) { return true; },
          handler: createAuthMiddleware(async (ctx) => {
            // Set cookies from response
            const setCookies = ctx.context.responseHeaders?.get("set-cookie");
            if (setCookies) {
              const parsed = parseSetCookieHeader(setCookies);
              const { cookies } = await import("next/headers.js");
              parsed.forEach((value, key) => {
                if (!key) return;
                cookieHelper.set(key, value.value, { /* options */ });
              });
            }
          }),
        },
      ],
    },
  };
};
```

### Why This Works with Turbopack

1. **Standard APIs**: Uses `Request`/`Response` objects — bundler agnostic
2. **Dynamic detection**: Detects Server Component vs Route Handler at runtime
3. **No bundler-specific code**: Works with both webpack and Turbopack

### Cookie Chunking

When session data exceeds **4093 bytes**, better-auth chunks cookies:

```typescript
const ALLOWED_COOKIE_SIZE = 4093;
const ESTIMATED_EMPTY_COOKIE_SIZE = 200;
const CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE;

if (data.length > 4093) {
  const sessionStore = createSessionStore(name, options, ctx);
  const cookies = sessionStore.chunk(data, options);
  sessionStore.setCookies(cookies);
}
```

---

## 6. Request/Response Pattern

### Handler Pattern (Bundler-Agnostic)

```typescript
export function toNextJsHandler(
  auth:
    | { handler: (request: Request) => Promise<Response> }
    | ((request: Request) => Promise<Response>),
) {
  const handler = async (request: Request) => {
    return "handler" in auth ? auth.handler(request) : auth(request);
  };
  return {
    GET: handler,
    POST: handler,
    PATCH: handler,
    PUT: handler,
    DELETE: handler,
  };
}
```

### Key Points

- Uses standard `Request` and `Response` — no Next.js-specific types
- Bundler-agnostic by design
- Works with Turbopack, webpack, and other bundlers

---

## 7. For Library Authors: `withDeesse` Pattern

If DeesseJS provides a `withDeesse` helper:

```javascript
// packages/next/src/withDeesse.js
import { getNextjsVersion, supportsTurbopackExternalizeTransitiveDependencies } from './utils.js';

export const withDeesse = (nextConfig = {}, options = {}) => {
  const nextjsVersion = getNextjsVersion();
  const supportsTurbopackExternalize =
    supportsTurbopackExternalizeTransitiveDependencies(nextjsVersion);

  // Determine which packages to externalize
  const packagesToExternalize = options.devBundleServerPackages !== true
    ? getServerExternalPackages()
    : [];

  return {
    ...nextConfig,

    // 1. Transpile monorepo packages
    transpilePackages: [
      ...(nextConfig.transpilePackages || []),
      '@deessejs/core',
      '@deessejs/server',
      'better-auth',
    ],

    // 2. Turbopack-first: serverExternalPackages
    serverExternalPackages: [
      ...(nextConfig.serverExternalPackages || []),
      // Auth
      'better-auth',
      // Database (direct dependencies user installs)
      '@libsql/client',
      'postgres',
      'mysql2',
      // Native modules
      'sharp',
      'pino',
      ...packagesToExternalize,
    ],

    // 3. Turbopack config
    turbopack: {
      ...(nextConfig.turbopack || {}),
    },

    // 4. Webpack fallback
    webpack: (config, webpackOptions) => {
      const userWebpackConfig =
        typeof nextConfig.webpack === 'function'
          ? nextConfig.webpack(config, webpackOptions)
          : config;

      return {
        ...userWebpackConfig,
        externals: [
          ...(userWebpackConfig.externals || []),
          // Webpack-only externals (ignored by Turbopack)
          ...getWebpackExternals(),
        ],
      };
    },
  };
};

function getServerExternalPackages() {
  // Return array of packages to externalize
  return [
    'payload',
    '@payloadcms/db-postgres',
    '@payloadcms/db-sqlite',
    '@payloadcms/graphql',
    // ...
  ];
}

function getWebpackExternals() {
  return [
    'sharp',
    'pino',
    'require-in-the-middle',
  ];
}
```

---

## 8. Configuration Comparison

### Turbopack-First vs Webpack-First

| Aspect | Turbopack-First | Webpack-First |
|--------|-----------------|---------------|
| Primary bundler | Turbopack | Webpack |
| Secondary | Webpack (fallback) | N/A |
| Dev speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Build speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Production support | Next.js 16.1.0+ | All versions |
| Transitive deps | Via parent packages | Direct + transitive |
| `serverExternalPackages` | ✅ Primary | ✅ Supported |
| `webpack.externals` | ❌ Ignored | ✅ Primary |

### Recommendation

**Turbopack-first is the right choice** because:
1. Better dev experience (HMR speed)
2. Better build times
3. Future-proof (Next.js is investing in Turbopack)
4. better-auth's architecture is already bundler-agnostic

---

## 9. Key Files

| File | Purpose |
|------|---------|
| `temp/payload/packages/next/src/withPayload/withPayload.js` | Reference implementation |
| `temp/payload/packages/next/src/withPayload/withPayload.utils.js` | Version detection |
| `temp/payload/packages/next/src/withPayload/withPayloadLegacy.js` | Legacy fallback |
| `temp/better-auth/src/integrations/next-js.ts` | better-auth Next.js handler |
| `temp/better-auth/src/cookies/index.ts` | Cookie handling |

---

## 10. Summary

### Turbopack Rules

1. **Use `serverExternalPackages`** — webpack `externals` are ignored
2. **Only direct dependencies** — transitive deps must be pulled in by parent
3. **Next.js 16.1.0+ for production** — dev works from 15+
4. **Standard Request/Response APIs** — better-auth pattern is correct

### For DeesseJS

```typescript
// next.config.ts - Turbopack-first
{
  transpilePackages: ['better-auth', '@better-auth/core'],
  serverExternalPackages: [
    'better-auth',
    '@libsql/client',
    'postgres',
    'sharp',
  ],
  turbopack: {},
}
```

### What We DON'T Need

- **No custom webpack loader** (Payload confirmed)
- **No webpack-specific code** in server-side auth handlers
- **No bundler-specific cookies** — use standard Web APIs

### What We DO Need

1. Direct dependencies listed in `serverExternalPackages`
2. Version detection for Turbopack capability
3. Error messages for unsupported Next.js versions
4. Dynamic cookie detection (Server Component vs Route Handler)
