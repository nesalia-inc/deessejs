"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@deessejs/ui/sidebar";

interface SidebarPage {
  type: "page";
  name: string;
  slug: string;
  iconName?: string;
}

interface SidebarSection {
  type: "section";
  name: string;
  slug: string;
  isFooter?: boolean;
  children: SidebarItem[];
}

type SidebarItem = SidebarPage | SidebarSection;

interface SidebarNavProps {
  items: SidebarItem[];
}

function getIcon(iconName?: string) {
  if (!iconName) return null;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Icon = icons[iconName];
  return Icon ? <Icon className="size-4" /> : null;
}

function isActive(currentSlug: string[], targetSlug: string): boolean {
  return currentSlug.join("/") === targetSlug;
}

function PageItem({
  page,
  currentSlug,
}: {
  page: SidebarPage;
  currentSlug: string[];
}) {
  const href = `/admin/${page.slug}`;
  const active = isActive(currentSlug, page.slug);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <Link href={href}>
          {getIcon(page.iconName)}
          <span>{page.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SectionItem({
  section,
  currentSlug,
}: {
  section: SidebarSection;
  currentSlug: string[];
}) {
  return (
    <SidebarGroup className={section.isFooter ? "mt-auto" : undefined}>
      <SidebarGroupLabel>
        {section.name}
      </SidebarGroupLabel>
      <SidebarMenu>
        {section.children.map((child) =>
          child.type === "page" ? (
            <PageItem key={child.slug} page={child} currentSlug={currentSlug} />
          ) : (
            <SectionItem
              key={child.slug}
              section={child as SidebarSection}
              currentSlug={currentSlug}
            />
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();
  const currentSlug = pathname
    .split("/")
    .filter(Boolean)
    .slice(1);

  return (
    <SidebarMenu>
      {items.map((item) =>
        item.type === "page" ? (
          <PageItem key={item.slug} page={item} currentSlug={currentSlug} />
        ) : (
          <SectionItem key={item.slug} section={item} currentSlug={currentSlug} />
        )
      )}
    </SidebarMenu>
  );
}
