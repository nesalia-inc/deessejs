"use client";

import { SidebarProvider, SidebarInset } from "@deessejs/ui/sidebar";
import type { SidebarItem } from "../lib/to-sidebar-items";
import { AppSidebar } from "./app-sidebar";

export interface AdminShellProps {
  name?: string;
  items: SidebarItem[];
  header?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({
  name,
  items,
  header,
  children,
}: AdminShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar name={name} items={items} />
      <SidebarInset className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          {header}
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
