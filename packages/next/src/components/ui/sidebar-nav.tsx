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
  basePath,
  sectionSlug,
}: {
  page: SidebarPage;
  currentSlug: string[];
  basePath: string;
  sectionSlug?: string;
}) {
  // If page has empty slug, use basePath directly (strips "general" section prefix for orphan pages)
  // This ensures /admin/general maps to /admin for empty-slug pages
  // Skip "general" artificial section slug to get clean URLs
  const effectiveBase = sectionSlug === "general" ? "" : basePath;
  const fullPath = page.slug === "" ? effectiveBase : (effectiveBase ? `${effectiveBase}/${page.slug}` : page.slug);
  const href = `/admin/${fullPath}`.replace(/\/$/, "") || "/admin";
  const active = isActive(currentSlug, fullPath);

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
  basePath,
}: {
  section: SidebarSection;
  currentSlug: string[];
  basePath: string;
}) {
  const fullBasePath = basePath ? `${basePath}/${section.slug}` : section.slug;
  return (
    <SidebarGroup>
      {!section.isFooter && (
        <SidebarGroupLabel>
          {section.name}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {section.children.map((child) =>
          child.type === "page" ? (
            <PageItem key={`${fullBasePath}/${child.name}`} page={child} currentSlug={currentSlug} basePath={fullBasePath} sectionSlug={section.slug} />
          ) : (
            <SectionItem
              key={`${fullBasePath}/${child.name}`}
              section={child as SidebarSection}
              currentSlug={currentSlug}
              basePath={fullBasePath}
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

  const topItems = items.filter((item) => !(item.type === "section" && item.isFooter));
  const bottomItems = items.filter((item) => item.type === "section" && item.isFooter);

  return (
    <>
      <SidebarMenu>
        {topItems.map((item, index) =>
          item.type === "page" ? (
            <PageItem key={`root-${index}-${item.slug}`} page={item} currentSlug={currentSlug} basePath="" />
          ) : (
            <SectionItem key={`root-${index}-${item.slug}`} section={item} currentSlug={currentSlug} basePath="" />
          )
        )}
      </SidebarMenu>
      {bottomItems.length > 0 && (
        <div className="mt-auto">
          <SidebarMenu>
            {bottomItems.map((item, index) =>
              item.type === "section" ? (
                <SectionItem key={`footer-${index}-${item.slug}`} section={item} currentSlug={currentSlug} basePath="" />
              ) : null
            )}
          </SidebarMenu>
        </div>
      )}
    </>
  );
}
