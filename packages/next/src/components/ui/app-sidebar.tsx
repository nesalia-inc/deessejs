"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@deessejs/ui/sidebar";

import type { SidebarItem } from "@deessejs/admin";

import { NavUser } from "./nav-user";
import { SidebarNav } from "./sidebar-nav";
import { getIcon } from "../lib/sidebar-nav";

export interface AppSidebarProps {
  name?: string;
  icon?: string;
  items: SidebarItem[];
}

function renderIcon(icon?: string, large = false) {
  if (!icon) return null;
  const size = large ? 32 : 28;
  const className = large ? "size-8" : "size-7";
  // If it looks like a path (starts with / or contains .), render as image
  if (icon.startsWith("/") || icon.includes(".")) {
    return <Image src={icon} alt="" width={size} height={size} className={className} loading="eager" />;
  }
  // Otherwise assume it's a Lucide icon name
  return getIcon(icon);
}

export const AppSidebar = ({ name, icon, items }: AppSidebarProps) => {
  const { state } = useSidebar();
  const displayName = name ?? "DeesseJS Admin";
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-12 border-sidebar-border p-0">
        {isCollapsed ? (
          <div className="flex h-full w-full items-center justify-center">
            {renderIcon(icon, true)}
          </div>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild isActive={false} tooltip={displayName}>
                <Link href="/admin" className="flex gap-3">
                  {renderIcon(icon)}
                  <span className="font-semibold text-base truncate bg-muted-foreground">{displayName}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
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
};