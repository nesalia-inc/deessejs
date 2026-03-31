"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@deessejs/ui/sidebar";
import { Separator } from "@deessejs/ui/separator";
import type { SidebarItem } from "../lib/to-sidebar-items";
import { AppSidebar } from "./app-sidebar";

export interface AdminShellProps {
  items: SidebarItem[];
  header?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({
  items,
  header,
  children,
}: AdminShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar items={items} />
      <SidebarInset className="flex h-full flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            {header}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
