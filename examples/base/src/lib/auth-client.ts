import { createClient } from "deesse";

export const client = createClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
});
