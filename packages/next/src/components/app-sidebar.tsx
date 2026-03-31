"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@deessejs/ui/sidebar";
import type { SidebarItem } from "../lib/to-sidebar-items";
import { SidebarNav } from "./sidebar-nav";

export interface AppSidebarProps {
  items: SidebarItem[];
}

export function AppSidebar({ items }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-14 border-sidebar-border">
        <div className="flex items-center px-4">
          <span className="font-semibold">DeesseJS Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav items={items} />
      </SidebarContent>
      <SidebarFooter className="border-t h-14 border-sidebar-border">
        <div className="flex items-center px-4">
          {/* SidebarTrigger will be placed here by parent */}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
