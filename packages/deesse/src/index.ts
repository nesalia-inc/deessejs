// @deessejs/deesse core package

import type { InternalConfig } from "./config/define";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createDeesse, type Deesse } from "./server";

export { defineConfig } from "./config";
export type { Config, InternalConfig } from "./config";
export { plugin } from "./config";
export type { Plugin } from "./config";
export { page, section } from "./config";
export type { Page, Section, PageTree } from "./config";

export { z } from "zod";
export type { ZodSchema } from "zod";

export type { Deesse } from "./server";

export { createClient } from "./client";
export type { DeesseClient, DeesseClientOptions } from "./client";

/**
 * Symbol-based global storage for Deesse instance.
 * Using Symbol.for ensures uniqueness across the process.
 */
const DEESSE_GLOBAL_KEY = Symbol.for("@deessejs/core.instance");

interface GlobalDeesseCache {
  instance: Deesse | undefined;
  config: InternalConfig | undefined;
  pool: unknown | undefined;
}

function getGlobalCache(): GlobalDeesseCache {
  const g = global as typeof global & {
    [DEESSE_GLOBAL_KEY]?: GlobalDeesseCache;
  };
  if (!g[DEESSE_GLOBAL_KEY]) {
    g[DEESSE_GLOBAL_KEY] = {
      instance: undefined,
      config: undefined,
      pool: undefined,
    };
  }
  return g[DEESSE_GLOBAL_KEY]!;
}

/**
 * Deep equality check for config comparison.
 * Required because config objects are recreated on HMR.
 */
function isConfigEqual(a: InternalConfig, b: InternalConfig): boolean {
  if (a.secret !== b.secret) return false;
  if (a.name !== b.name) return false;
  if (a.auth.baseURL !== b.auth.baseURL) return false;
  return true;
}

/**
 * Extract pool reference from database.
 * For pg Pool passed to drizzle-orm/node-postgres, the pool is stored in $client.
 */
function extractPool(db: PostgresJsDatabase): unknown {
  return (db as unknown as { $client?: unknown }).$client;
}

/**
 * Get the Deesse singleton instance.
 * Cached on global to persist across HMR.
 */
export const getDeesse = async (
  config: InternalConfig
): Promise<Deesse> => {
  const cache = getGlobalCache();

  // Case 1: Instance exists and config is semantically equal
  if (cache.instance && cache.config && isConfigEqual(cache.config, config)) {
    return cache.instance;
  }

  // Case 2: Instance exists but config changed - hot reload
  if (
    cache.instance &&
    cache.config &&
    !isConfigEqual(cache.config, config)
  ) {
    console.info("[deesse] Config changed, performing hot reload...");

    // Close old pool if it exists
    const oldPool = extractPool(cache.config.database as PostgresJsDatabase);
    if (oldPool) {
      const pool = oldPool as { end?: () => Promise<void> };
      if (typeof pool.end === "function") {
        await pool.end();
      }
    }

    cache.config = config;
    return cache.instance;
  }

  // Case 3: No instance exists - create one
  const instance = createDeesse(config);
  cache.pool = extractPool(instance.database);
  cache.instance = instance;
  cache.config = config;

  return instance;
};

/**
 * Clear the Deesse singleton cache.
 * Primarily useful for testing.
 */
export const clearDeesseCache = (): void => {
  const cache = getGlobalCache();
  cache.instance = undefined;
  cache.config = undefined;
  cache.pool = undefined;
};

/**
 * Graceful shutdown - call this on process exit.
 * Ensures all database connections are properly closed.
 */
export const shutdownDeesse = async (): Promise<void> => {
  const cache = getGlobalCache();

  if (cache.pool) {
    console.info("[deesse] Closing database pool...");
    const pool = cache.pool as { end?: () => Promise<void> };
    if (pool && typeof pool.end === "function") {
      await pool.end();
    }
    cache.pool = undefined;
  }

  cache.instance = undefined;
  cache.config = undefined;
};

// Register graceful shutdown hooks
if (process.env["NODE_ENV"] !== "test") {
  const shutdown = () => {
    shutdownDeesse()
      .catch(console.error)
      .finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
