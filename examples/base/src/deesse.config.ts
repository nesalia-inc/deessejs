import { defineConfig } from 'deesse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { deessePages } from './deesse.pages';

export const config = defineConfig({
  database: drizzle({
    client: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
  pages: deessePages,
});
