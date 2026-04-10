"use client";

import type { SidebarItem } from "../../lib/to-sidebar-items";
import { useSidebarItems } from "../../lib/sidebar-items-context";
import { AdminDashboardLayout, type AdminDashboardUser } from "../layouts/admin-shell";

interface DashboardPageProps {
  name?: string;
  items?: SidebarItem[];
  header?: React.ReactNode;
  user?: AdminDashboardUser;
  children: React.ReactNode;
}

export function DashboardPage({ name, items, header, user, children }: DashboardPageProps) {
  const contextItems = useSidebarItems();
  const sidebarItems = items ?? contextItems;

  return (
    <AdminDashboardLayout name={name} items={sidebarItems} header={header} user={user}>
      {children}
    </AdminDashboardLayout>
  );
}
