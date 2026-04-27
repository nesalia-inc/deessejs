import type { PageTree } from "../config/page.js";
import { parseSlug } from "../config/page.js";

export interface FindPageResult {
  page: Extract<PageTree, { type: "page" }> | null;
  params: Record<string, string>;
}

/**
 * Match a slug pattern against a URL segment.
 * Handles both static ("users") and dynamic ("[table_slug]") patterns.
 */
function matchSegment(
  slug: string,
  segment: string
): { matched: boolean; params: Record<string, string> } {
  // Check if slug has dynamic segments by looking for [ and ]
  if (!slug.includes("[")) {
    // Pure static match
    return {
      matched: slug === segment,
      params: {},
    };
  }

  // Parse into segments
  const slugSegments = parseSlug(slug);

  // Single dynamic segment: matches anything, capture the value
  if (slugSegments.length === 1 && slugSegments[0].type === "dynamic") {
    return {
      matched: true,
      params: { [slugSegments[0].name]: segment },
    };
  }

  // Multi-segment slug: first segment must match the segment
  // This handles pages like "database/[table_slug]" where the first part
  // is the section prefix
  if (slugSegments[0].type === "static") {
    return {
      matched: slugSegments[0].value === segment,
      params: {},
    };
  } else {
    // First segment is dynamic: it matches the segment
    return {
      matched: true,
      params: { [slugSegments[0].name]: segment },
    };
  }
}

/**
 * Recursively find a page in the page tree.
 */
function findPageRecursive(
  pages: PageTree[] | undefined,
  slugParts: string[]
): FindPageResult {
  if (!pages) return { page: null, params: {} };

  // Handle empty slugParts: match pages with empty slug (including inside sections)
  if (slugParts.length === 0) {
    for (const item of pages) {
      if (item.type === "page" && item.slug === "") {
        return { page: item, params: {} };
      }
      // Search inside sections for orphan pages wrapped in "General"
      if (item.type === "section") {
        for (const child of item.children) {
          if (child.type === "page" && child.slug === "") {
            return { page: child, params: {} };
          }
        }
      }
    }
    return { page: null, params: {} };
  }

  const [first, ...rest] = slugParts;

  for (const item of pages) {
    if (item.type === "section") {
      const sectionResult = matchSegment(item.slug, first);
      if (sectionResult.matched) {
        if (rest.length === 0) {
          // Return first child page
          for (const child of item.children) {
            if (child.type === "page") {
              return { page: child, params: sectionResult.params };
            }
          }
          return { page: null, params: {} };
        }
        const childResult = findPageRecursive(item.children, rest);
        if (childResult.page) {
          return {
            page: childResult.page,
            params: { ...sectionResult.params, ...childResult.params },
          };
        }
      }
    } else if (item.type === "page") {
      const pageResult = matchSegment(item.slug, first);
      if (pageResult.matched && rest.length === 0) {
        return { page: item, params: pageResult.params };
      }
    }
  }

  return { page: null, params: {} };
}

export function findPage(
  pages: PageTree[] | undefined,
  slugParts: string[]
): FindPageResult | null {
  const result = findPageRecursive(pages, slugParts);
  if (!result.page) return null;
  return result;
}

export function extractSlugParts(
  params: Record<string, string | string[]>
): string[] {
  const slug = params["slug"];
  if (!slug) return [];
  return Array.isArray(slug) ? slug : [slug];
}
