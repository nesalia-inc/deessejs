import React from 'react';
import { page, section } from 'deesse';
import { Home, LayoutDashboard } from 'lucide-react';
import { DashboardPage } from '@deessejs/next';

export const deessePages = [
  page({
    name: 'Home',
    slug: '',
    icon: Home,
    content: <div>Home</div>,
  }),
  page({
    name: 'Dashboard',
    slug: 'dashboard',
    icon: LayoutDashboard,
    content: (
      <DashboardPage name="DeesseJS Admin">
        <div>Dashboard content</div>
      </DashboardPage>
    ),
  }),
  section({
    name: 'Settings',
    slug: 'settings',
    bottom: true,
    children: [
      page({
        name: 'General',
        slug: 'general',
        content: <div>General Settings</div>,
      }),
    ],
  }),
];
