import React from 'react';
import { defineConfig, page, section } from 'deesse';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Home, Settings } from 'lucide-react';

export const config = defineConfig({
  database: drizzle({
    client: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
  pages: [
    page({
      name: 'Home',
      slug: '',
      icon: Home,
      content: () => <div>Home</div>,
    }),
    section({
      name: 'Settings',
      slug: 'settings',
      icon: Settings,
      children: [
        page({
          name: 'General',
          slug: 'general',
          content: () => <div>General Settings</div>,
        }),
      ],
    }),
  ],
});
