"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from "@deessejs/ui/sidebar";
import type { SidebarItem } from "../lib/to-sidebar-items";
import { SidebarNav } from "./sidebar-nav";

export interface AdminShellProps {
  items: SidebarItem[];
  children: React.ReactNode;
}

export function AdminShell({ items, children }: AdminShellProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-14 items-center px-4">
            <span className="font-semibold">DeesseJS Admin</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav items={items} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex h-14 items-center px-4">
            <SidebarTrigger />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
      <SidebarRail />
    </SidebarProvider>
  );
}
