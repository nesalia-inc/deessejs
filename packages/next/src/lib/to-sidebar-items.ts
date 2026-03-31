import type { PageTree } from "deesse";

export interface SidebarPage {
  type: "page";
  name: string;
  slug: string;
  iconName?: string;
}

export interface SidebarSection {
  type: "section";
  name: string;
  slug: string;
  bottom?: boolean;
  children: SidebarItem[];
}

export type SidebarItem = SidebarPage | SidebarSection;

function getIconName(icon: unknown): string | undefined {
  if (!icon) return undefined;
  // Extract icon name from lucide component (e.g., "House" from HouseIcon)
  const iconAny = icon as { displayName?: string; name?: string };
  return iconAny.displayName || iconAny.name || undefined;
}

function toSidebarItem(item: PageTree): SidebarItem {
  if (item.type === "page") {
    return {
      type: "page",
      name: item.name,
      slug: item.slug,
      iconName: getIconName(item.icon),
    };
  }

  return {
    type: "section",
    name: item.name,
    slug: item.slug,
    bottom: item.bottom,
    children: item.children.map(toSidebarItem),
  };
}

export function toSidebarItems(pageTree: PageTree[]): SidebarItem[] {
  const orphanPages = pageTree.filter((item): item is Extract<PageTree, { type: "page" }> => item.type === "page");
  const sections = pageTree.filter((item): item is Extract<PageTree, { type: "section" }> => item.type === "section");

  const items: SidebarItem[] = [];

  if (orphanPages.length > 0) {
    items.push({
      type: "section",
      name: "General",
      slug: "general",
      children: orphanPages.map(toSidebarItem),
    });
  }

  // Sort sections: bottom sections go last
  const mappedSections = sections.map(toSidebarItem) as SidebarSection[];
  const sortedSections = mappedSections.sort((a, b) => {
    if (a.bottom && !b.bottom) return 1;
    if (!a.bottom && b.bottom) return -1;
    return 0;
  });

  items.push(...sortedSections);

  return items;
}
