import type { Config, PageTree } from "deesse";

export interface RootPageProps {
  config: Config;
  params: Record<string, string | string[]>;
  searchParams: Record<string, string | string[]>;
}

function findPage(pages: PageTree[] | undefined, slugParts: string[]): { page: Extract<PageTree, { type: "page" }> } | null {
  if (!pages || slugParts.length === 0) return null;

  const [first, ...rest] = slugParts;

  for (const item of pages) {
    if (item.type === "section") {
      if (item.slug === first) {
        if (rest.length === 0) return null; // section itself, not a page
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

export function RootPage({ config, params, searchParams: _searchParams }: RootPageProps) {
  const slugParts = params["slug"]
    ? Array.isArray(params["slug"])
      ? params["slug"]
      : [params["slug"]]
    : [];

  const result = findPage(config.pages, slugParts);

  if (!result) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">The requested page does not exist.</p>
      </div>
    );
  }

  return <>{result.page.content}</>;
}
