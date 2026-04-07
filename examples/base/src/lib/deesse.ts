// src/lib/deesse.ts
import { getDeesse } from "deesse";
import { config } from "../deesse.config";

const deesse = await getDeesse(config);

export const { auth, database } = deesse;
