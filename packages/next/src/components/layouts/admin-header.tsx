"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Separator,
  SidebarTrigger,
} from "@deessejs/ui";

import { useSidebar } from "@deessejs/ui/sidebar";

import type { SidebarItem } from "@deessejs/admin";

import { getBreadcrumbFromPathname } from "../lib/admin-header";

interface AdminHeaderProps {
  name?: string;
  items: SidebarItem[];
  headerActions?: React.ReactNode;
}

export const AdminHeader = ({ name, items, headerActions }: AdminHeaderProps) => {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const breadcrumb = getBreadcrumbFromPathname(pathname, items);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 transition-[width,height] ease-linear">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" onClick={toggleSidebar} />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">
                {name ?? "Admin"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumb && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumb.page || breadcrumb.section}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {headerActions && (
        <div className="ml-auto flex items-center gap-2">
          {headerActions}
        </div>
      )}
    </header>
  );
};