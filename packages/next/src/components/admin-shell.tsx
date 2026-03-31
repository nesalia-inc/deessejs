"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  header: React.ReactNode;
}

export function AdminShell({ items, children, header }: AdminShellProps) {
  return (
    <SidebarProvider>
      <Sidebar>
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
        <SidebarInset>
          <header className="flex min-h-13 shrink-0 items-center gap-2 border-b px-4">
            {header}
          </header>
          {children}
        </SidebarInset>
      </Sidebar>
    </SidebarProvider>
  );
}
