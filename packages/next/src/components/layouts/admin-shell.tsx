import * as React from "react";

import { SidebarInset, SidebarProvider, TooltipProvider } from "@deessejs/ui";

import type { SidebarItem } from "@deessejs/admin";

import { AdminHeader } from "./admin-header";
import { AppSidebar } from "../ui/app-sidebar";
import type { AdminDashboardUser } from "../lib/types";

const AdminDashboardContent = ({
  config,
  items,
  children,
  headerActions,
}: {
  config?: { name?: string; icon?: string };
  items: SidebarItem[];
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}) => {
  return (
    <>
      <AppSidebar name={config?.name} icon={config?.icon} items={items} />
      <SidebarInset className="flex h-full flex-col">
        <AdminHeader name={config?.name} items={items} headerActions={headerActions} />
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </>
  );
};

interface AdminDashboardConfig {
  name?: string;
  icon?: string;
}

export interface AdminDashboardLayoutProps {
  config?: AdminDashboardConfig;
  items: SidebarItem[];
  user?: AdminDashboardUser;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminDashboardLayout = ({
  config,
  items,
  children,
  headerActions,
}: AdminDashboardLayoutProps) => {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <AdminDashboardContent config={config} items={items} headerActions={headerActions}>
          {children}
        </AdminDashboardContent>
      </SidebarProvider>
    </TooltipProvider>
  );
};