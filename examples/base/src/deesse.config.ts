import { defineConfig } from 'deesse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { deessePages } from './deesse.pages';

export const config = defineConfig({
  name: "DeesseJS App",
  database: drizzle({
    client: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
  pages: deessePages,
  secret: process.env.DEESSE_SECRET,
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
});
