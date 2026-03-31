import React from 'react';
import { page, section } from 'deesse';
import { Home } from 'lucide-react';

export const deessePages = [
  page({
    name: 'Home',
    slug: '',
    icon: Home,
    content: () => <div>Home</div>,
  }),
  section({
    name: 'Settings',
    slug: 'settings',
    bottom: true,
    children: [
      page({
        name: 'General',
        slug: 'general',
        content: () => <div>General Settings</div>,
      }),
    ],
  }),
];
