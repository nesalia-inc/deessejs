import type { PageTree, FindPageResult, SidebarItem } from "@deessejs/admin";

import { findPage, toSidebarItems } from "@deessejs/admin";

export interface PageFinderResult {
  result: FindPageResult | null;
  sidebarItems: SidebarItem[];
}

/**
 * Finds an admin page by slug parts and returns the result with sidebar items.
 * Pure function with no side effects.
 */
export function findAdminPage(
  allPages: PageTree[],
  slugParts: string[]
): PageFinderResult {
  const result = findPage(allPages, slugParts);
  const sidebarItems = toSidebarItems(allPages);

  return {
    result,
    sidebarItems,
  };
}
