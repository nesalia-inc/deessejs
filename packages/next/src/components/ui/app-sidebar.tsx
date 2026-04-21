"use client";

import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@deessejs/ui/sidebar";
import type { SidebarItem } from "@deessejs/admin";
import { SidebarNav } from "./sidebar-nav";
import { NavUser } from "./nav-user";

export interface AppSidebarProps {
  name?: string;
  icon?: string;
  items: SidebarItem[];
}

export function AppSidebar({ name, icon, items }: AppSidebarProps) {
  const { state } = useSidebar();
  const displayName = name ?? "DeesseJS Admin";
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-12 border-sidebar-border">
        <div className={`flex items-center justify-center ${isCollapsed ? "w-full" : "px-4 gap-2"}`}>
          {icon ? (
            <Image src={icon} alt="Logo" width={isCollapsed ? 32 : 24} height={isCollapsed ? 32 : 24} className="shrink-0" loading="eager" />
          ) : (
            <span className="flex items-center justify-center size-6 rounded-md bg-sidebar-border">
              <span className="text-xs font-bold">D</span>
            </span>
          )}
          {!isCollapsed && <span className="font-semibold truncate">{displayName}</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav items={items} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}