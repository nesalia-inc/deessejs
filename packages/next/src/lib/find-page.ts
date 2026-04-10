import type { PageTree } from "deesse";

export type FindPageResult = { page: Extract<PageTree, { type: "page" }> } | null;

export function findPage(pages: PageTree[] | undefined, slugParts: string[]): FindPageResult {
  if (!pages) return null;

  // Handle empty slugParts: match pages with empty slug
  if (slugParts.length === 0) {
    for (const item of pages) {
      if (item.type === "page" && item.slug === "") {
        return { page: item };
      }
    }
    return null;
  }

  const [first, ...rest] = slugParts;

  for (const item of pages) {
    if (item.type === "section") {
      if (item.slug === first) {
        // If no more parts, return first child page if exists
        if (rest.length === 0) {
          for (const child of item.children) {
            if (child.type === "page") {
              return { page: child };
            }
          }
          return null;
        }
        return findPage(item.children, rest);
      }
    } else if (item.type === "page") {
      if (item.slug === first && rest.length === 0) {
        return { page: item };
      }
    }
  }

  return null;
}

export function extractSlugParts(params: Record<string, string | string[]>): string[] {
  const slug = params["slug"];
  if (!slug) return [];
  return Array.isArray(slug) ? slug : [slug];
}
