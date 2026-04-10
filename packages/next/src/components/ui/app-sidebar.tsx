"use client";

import { SparklesIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@deessejs/ui/sidebar";
import type { SidebarItem } from "../../lib/to-sidebar-items";
import { SidebarNav } from "./sidebar-nav";

export interface AppSidebarProps {
  name?: string;
  items: SidebarItem[];
}

export function AppSidebar({ name, items }: AppSidebarProps) {
  const { state } = useSidebar();
  const displayName = name ?? "DeesseJS Admin";
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-12 border-sidebar-border">
        <div className={`flex items-center px-4 gap-2 ${isCollapsed ? "justify-center" : "justify-start"}`}>
          {isCollapsed ? (
            <span className="flex items-center justify-center size-8 rounded-md bg-sidebar-border"><SparklesIcon className="size-4" /></span>
          ) : (
            <span className="font-semibold truncate">{displayName}</span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav items={items} />
      </SidebarContent>
      <SidebarFooter className="border-t h-12 border-sidebar-border">
        <div className={`flex w-full items-center px-4 ${isCollapsed ? "justify-center" : "justify-start"}`}>
          <SidebarTrigger />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
