import { toNextJsHandler } from "@deessejs/next/routes";
import { config } from "@deesse-config";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = toNextJsHandler(config);