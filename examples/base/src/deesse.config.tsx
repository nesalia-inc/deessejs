import { defineConfig } from 'deesse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { deessePages } from './deesse.pages';
import { schema } from './db/schema/auth-schema';
import { ThemeToggle } from './components/theme-toggle';
import { publicAPI } from './server/index';

export const config = defineConfig({
  name: "DeesseJS App",
  database: drizzle({
    client: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
    schema,
  }),
  pages: deessePages,
  secret: process.env.DEESSE_SECRET!,
  auth: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
  admin: {
    header: {
      actions: <ThemeToggle />
    }
  },
  routes: publicAPI,
});
