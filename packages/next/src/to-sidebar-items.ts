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
  iconName?: string;
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
    iconName: getIconName(item.icon),
    children: item.children.map(toSidebarItem),
  };
}

export function toSidebarItems(pageTree: PageTree[]): SidebarItem[] {
  return pageTree.map(toSidebarItem);
}
