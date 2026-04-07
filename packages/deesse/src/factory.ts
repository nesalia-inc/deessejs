// Deesse factory - creates and caches Deesse instances

import type { Config } from "./config/define";
import { createDeesse, type Deesse } from "./server";
import { createCache } from "./cache";

const deesseFactory = createCache<Deesse, Config>(async (config) => {
  return createDeesse(config);
});

export const getDeesse = (config: Config): Deesse => {
  const cached = deesseFactory.getState().instances.get("main");
  if (cached) return cached;
  return createDeesse(config);
};

export const clearDeesseCache = (): void => {
  deesseFactory.clear();
};
