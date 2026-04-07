// Deesse factory - creates and caches Deesse instances

import type { InternalConfig } from "./config/define";
import { createDeesse, type Deesse } from "./server";
import { createCache } from "./cache";

const deesseFactory = createCache<Deesse, InternalConfig>(async (config) => {
  return createDeesse(config);
});

export const getDeesse = async (config: InternalConfig): Promise<Deesse> => {
  return deesseFactory.get("main", config);
};

export const clearDeesseCache = (): void => {
  deesseFactory.clear();
};
