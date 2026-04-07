// Generic cache utility with immutable state

export type CacheState<T> = {
  instances: Map<string, T>;
  promises: Map<string, Promise<T>>;
};

export const emptyCache = <T>(): CacheState<T> => ({
  instances: new Map(),
  promises: new Map(),
});

export const setCacheInstance = <T>(state: CacheState<T>, key: string, instance: T): CacheState<T> => ({
  instances: new Map(state.instances).set(key, instance),
  promises: (() => {
    const m = new Map(state.promises);
    m.delete(key);
    return m;
  })(),
});

export const setCachePromise = <T>(state: CacheState<T>, key: string, promise: Promise<T>): CacheState<T> => ({
  instances: state.instances,
  promises: new Map(state.promises).set(key, promise),
});

export const getCacheEntry = <T>(state: CacheState<T>, key: string): T | Promise<T> | undefined => {
  const instance = state.instances.get(key);
  if (instance !== undefined) return instance;
  return state.promises.get(key);
};

export const removeCachePromise = <T>(state: CacheState<T>, key: string): CacheState<T> => ({
  instances: state.instances,
  promises: (() => {
    const m = new Map(state.promises);
    m.delete(key);
    return m;
  })(),
});

export type CreateCache = <T, Options>(
  createInstance: (options: Options) => Promise<T>
) => {
  get(key: string, options: Options): Promise<T>;
  getState(): Readonly<CacheState<T>>;
  clear(): void;
};

export const createCache: CreateCache = <T, Options>(
  createInstance: (options: Options) => Promise<T>
) => {
  let state: CacheState<T> = emptyCache<T>();

  return {
    async get(key: string, options: Options): Promise<T> {
      const cached = getCacheEntry(state, key);
      if (cached !== undefined) return cached as T;

      const promise = createInstance(options);
      state = setCachePromise(state, key, promise);

      try {
        const instance = await promise;
        state = setCacheInstance(state, key, instance);
        return instance;
      } catch (err) {
        state = removeCachePromise(state, key);
        throw err;
      }
    },

    getState(): Readonly<CacheState<T>> {
      return state;
    },

    clear(): void {
      state = emptyCache<T>();
    },
  };
};
