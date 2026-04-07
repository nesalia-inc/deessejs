// Deesse factory - creates and caches Deesse instances

import type { Config } from "./config/define";
import { createDeesse, type Deesse } from "./server";
import { createCache } from "./cache";

const deesseFactory = createCache<Deesse, Config>(async (config) => {
  return createDeesse(config);
});

export const getDeesse = async (config: Config): Promise<Deesse> => {
  return deesseFactory.get("main", config);
};

export const clearDeesseCache = (): void => {
  deesseFactory.clear();
};
