"use client";

import { SidebarProvider, SidebarInset, Avatar, AvatarFallback, AvatarImage } from "@deessejs/ui";
import type { SidebarItem } from "@deessejs/admin";
import { AppSidebar } from "../ui/app-sidebar";

export interface AdminDashboardUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

function getAvatarUrl(email: string | null | undefined): string {
  if (!email) return "";
  const encoded = encodeURIComponent(email);
  return `https://avatar.vercel.sh/${encoded}?rounded=60`;
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
  const avatarUrl = getAvatarUrl(user?.email);

  return (
    <SidebarProvider>
      <AppSidebar name={name} items={items} />
      <SidebarInset className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          {header}
          <div className="ml-auto flex items-center gap-3">
            <Avatar>
              <AvatarImage src={avatarUrl} alt={user?.name ?? "User"} />
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
