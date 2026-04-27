import { createClient } from "deesse";

export const client = createClient({
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
});