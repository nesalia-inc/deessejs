import type { Config } from "deesse";
import { extractSlugParts, findPage } from "./lib/find-page";

export interface RootPageProps {
  config: Config;
  params: Record<string, string | string[]>;
  searchParams: Record<string, string | string[]>;
}

export function RootPage({ config, params, searchParams: _searchParams }: RootPageProps) {
  const slugParts = extractSlugParts(params);
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
