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

interface AdminHeaderProps {
  name?: string;
  items: SidebarItem[];
}

function getBreadcrumbFromPathname(pathname: string, items: SidebarItem[]): { section: string; page: string } | null {
  const slugParts = pathname.split("/").filter(Boolean).slice(1);

  if (slugParts.length === 0) {
    return { section: "Home", page: "" };
  }

  const [sectionSlug, ...pageSlugParts] = slugParts;
  const pageSlug = pageSlugParts.join("/") || "";

  for (const item of items) {
    if (item.type === "section" && item.slug === sectionSlug) {
      for (const child of item.children) {
        if (child.type === "page") {
          if (child.slug === pageSlug || (child.slug === "" && pageSlug === "")) {
            return { section: item.name, page: child.name };
          }
        } else if (child.type === "section") {
          for (const grandchild of child.children) {
            if (grandchild.type === "page" && grandchild.slug === pageSlug) {
              return { section: item.name, page: grandchild.name };
            }
          }
        }
      }
      return { section: item.name, page: "" };
    }
  }

  return null;
}

export function AdminHeader({ name, items }: AdminHeaderProps) {
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
    </header>
  );
}