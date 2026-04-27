import type { BetterAuthPlugin } from 'better-auth';
import { admin } from 'better-auth/plugins';
import type { Config, InternalConfig } from './types.js';

/**
 * Deduplicate plugins by ID, keeping the first occurrence.
 */
const deduplicatePlugins = (plugins: BetterAuthPlugin[]): BetterAuthPlugin[] => {
  return plugins.filter((plugin, index) =>
    plugins.findIndex(p => p && p.id === plugin.id) === index
  );
};

/**
 * Global config storage for getDeesse() without arguments.
 * Stored at module level to persist across HMR.
 */
let globalConfig: InternalConfig<Record<string, unknown>> | undefined;

export const defineConfig = <TSchema extends Record<string, unknown>>(
  config: Config<TSchema>
): InternalConfig<TSchema> => {
  // Default auth configuration - admin() is always first
  const defaultAuth = {
    plugins: [admin()],
    emailAndPassword: { enabled: true } as const,
    session: { maxAge: 60 * 60 * 24 * 7 },
    trustedOrigins: [config.auth.baseURL] as string[],
  };

  // Check if user config includes admin() plugin
  const userPlugins = config.auth.plugins || [];
  const hasAdminPlugin = userPlugins.some(p => p && p.id === 'admin');

  // Apply deduplication to plugins BEFORE the warning and merge
  const deduplicatedUserPlugins = deduplicatePlugins([...defaultAuth.plugins, ...userPlugins]);

  if (hasAdminPlugin) {
    console.warn(
      '[deesse] The `admin()` plugin is included by default. ' +
      'You can safely remove it from your `auth.plugins` config.'
    );
  }

  // Merge user config with defaults
  const mergedAuth = {
    ...defaultAuth,
    plugins: deduplicatedUserPlugins,
    emailAndPassword: config.auth.emailAndPassword ?? defaultAuth.emailAndPassword,
    session: config.auth.session ?? defaultAuth.session,
    trustedOrigins: config.auth.trustedOrigins ?? defaultAuth.trustedOrigins,
  };

  const internalConfig: InternalConfig<TSchema> = {
    ...config,
    auth: {
      ...config.auth,
      plugins: mergedAuth.plugins,
      emailAndPassword: mergedAuth.emailAndPassword as InternalConfig<TSchema>['auth']['emailAndPassword'],
      session: mergedAuth.session as InternalConfig<TSchema>['auth']['session'],
      trustedOrigins: mergedAuth.trustedOrigins,
    },
  };

  // Store globally for getDeesse() without arguments
  globalConfig = internalConfig;

  return internalConfig;
}

/**
 * Get the global config stored by defineConfig().
 * Throws if defineConfig() has not been called.
 */
export const getGlobalConfig = <TSchema extends Record<string, unknown> = Record<string, never>>(): InternalConfig<TSchema> => {
  if (!globalConfig) {
    throw new Error(
      "Deesse config not defined. Call defineConfig() before accessing getDeesse() without arguments."
    );
  }
  return globalConfig as InternalConfig<TSchema>;
}