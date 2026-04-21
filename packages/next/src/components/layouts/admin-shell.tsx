"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@deessejs/ui";
import { useSidebar } from "@deessejs/ui/sidebar";
import type { SidebarItem } from "@deessejs/admin";
import { AdminHeader } from "./admin-header";
import { AppSidebar } from "../ui/app-sidebar";

// Inner component that uses the sidebar context
function AdminDashboardContent({
  name,
  icon,
  items,
  children,
}: {
  name?: string;
  icon?: string;
  items: SidebarItem[];
  children: React.ReactNode;
}) {
  useSidebar(); // Ensure we're within provider
  return (
    <>
      <AppSidebar name={name} icon={icon} items={items} />
      <SidebarInset className="flex h-full flex-col">
        <AdminHeader name={name} items={items} />
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </>
  );
}

export interface AdminDashboardUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface AdminDashboardLayoutProps {
  name?: string;
  icon?: string;
  items: SidebarItem[];
  user?: AdminDashboardUser;
  children: React.ReactNode;
}

export function AdminDashboardLayout({
  name,
  icon,
  items,
  children,
}: AdminDashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminDashboardContent name={name} icon={icon} items={items}>
        {children}
      </AdminDashboardContent>
    </SidebarProvider>
  );
}