import type { PageTree } from "../config/page.js";

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
  isFooter?: boolean;
  children: SidebarItem[];
}

export type SidebarItem = SidebarPage | SidebarSection;

function getIconName(icon: unknown): string | undefined {
  if (!icon) return undefined;
  // Extract icon name from lucide component (e.g., "House" from HouseIcon)
  const iconAny = icon as { displayName?: string; name?: string };
  return iconAny.displayName || iconAny.name || undefined;
}

function toSidebarItem(item: PageTree): SidebarItem | null {
  if (item.type === "page") {
    // Skip dynamic pages (those with [param] patterns) - they're not in the sidebar
    if (item.slug.includes("[")) {
      return null;
    }
    return {
      type: "page",
      name: item.name,
      slug: item.slug,
      iconName: getIconName(item.icon),
    };
  }

  // For sections, filter out null children
  const filteredChildren = item.children
    .map(toSidebarItem)
    .filter((child): child is SidebarItem => child !== null);

  return {
    type: "section",
    name: item.name,
    slug: item.slug,
    isFooter: item.bottom,
    children: filteredChildren,
  };
}

export function toSidebarItems(pageTree: PageTree[]): SidebarItem[] {
  const orphanPages = pageTree.filter(
    (item): item is Extract<PageTree, { type: "page" }> => item.type === "page"
  );
  const sections = pageTree.filter(
    (item): item is Extract<PageTree, { type: "section" }> =>
      item.type === "section"
  );

  const items: SidebarItem[] = [];

  if (orphanPages.length > 0) {
    // Deduplicate orphan pages by name (later pages override earlier ones with same name)
    const seenPageNames = new Set<string>();
    const uniqueOrphanPages = orphanPages.filter((page) => {
      if (!seenPageNames.has(page.name)) {
        seenPageNames.add(page.name);
        return true;
      }
      return false;
    });

    items.push({
      type: "section",
      name: "General",
      slug: "general",
      children: uniqueOrphanPages.map(toSidebarItem).filter((child): child is SidebarItem => child !== null),
    });
  }

  // Deduplicate sections by slug (later pages override earlier ones with same slug)
  const seenSlugs = new Set<string>();
  const uniqueSections: typeof sections = [];
  for (const section of sections) {
    if (!seenSlugs.has(section.slug)) {
      seenSlugs.add(section.slug);
      uniqueSections.push(section);
    }
  }

  // Sort sections: bottom sections go last
  const mappedSections = uniqueSections.map(toSidebarItem) as SidebarSection[];
  const sortedSections = mappedSections.sort((a, b) => {
    if (a.isFooter && !b.isFooter) return 1;
    if (!a.isFooter && b.isFooter) return -1;
    return 0;
  });

  items.push(...sortedSections);

  return items;
}
