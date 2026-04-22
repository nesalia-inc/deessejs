import type { SidebarItem } from "@deessejs/admin";

export function getBreadcrumbFromPathname(
  pathname: string,
  items: SidebarItem[]
): { section: string; page: string } | null {
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
