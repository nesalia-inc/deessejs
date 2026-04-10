"use client";

import { SidebarProvider, SidebarInset, Avatar, AvatarFallback } from "@deessejs/ui";
import type { SidebarItem } from "../../lib/to-sidebar-items";
import { AppSidebar } from "../ui/app-sidebar";

export interface AdminDashboardUser {
  name?: string | null;
  email?: string | null;
}

export interface AdminDashboardLayoutProps {
  name?: string;
  items: SidebarItem[];
  header?: React.ReactNode;
  user?: AdminDashboardUser;
  children: React.ReactNode;
}

export function AdminDashboardLayout({
  name,
  items,
  header,
  user,
  children,
}: AdminDashboardLayoutProps) {
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <SidebarProvider>
      <AppSidebar name={name} items={items} />
      <SidebarInset className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          {header}
          <div className="ml-auto flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
