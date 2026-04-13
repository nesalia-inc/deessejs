import { getDeesse } from "deesse";
import { config } from "../deesse.config";

export const deesse = await getDeesse(config);
export const deesseAuth = deesse.auth;