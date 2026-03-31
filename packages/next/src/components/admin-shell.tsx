"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@deessejs/ui/sidebar";
import { SidebarNav } from "./sidebar-nav";
import type { SidebarItem } from "../lib/to-sidebar-items";

interface AdminShellProps {
  items: SidebarItem[];
  children: React.ReactNode;
}

export function AdminShell({ items, children }: AdminShellProps) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-14 items-center px-4">
            <SidebarTrigger />
            <span className="ml-2 font-semibold">DeesseJS Admin</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav items={items} />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
