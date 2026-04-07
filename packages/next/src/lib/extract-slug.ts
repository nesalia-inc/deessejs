/**
 * Extracts slug segments from a pathname.
 * /admin/blog/posts -> ["blog", "posts"]
 */
export function extractSlugFromPathname(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  // Remove "admin" prefix
  return segments.slice(1);
}
