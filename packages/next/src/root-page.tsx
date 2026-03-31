import type { Config } from "deesse";
import { extractSlugParts, findPage } from "./lib/find-page";
import { NotFoundPage } from "./lib/not-found-page";

export interface RootPageProps {
  config: Config;
  params: Record<string, string | string[]>;
  searchParams: Record<string, string | string[]>;
}

export function RootPage({ config, params, searchParams: _searchParams }: RootPageProps) {
  const slugParts = extractSlugParts(params);
  const result = findPage(config.pages, slugParts);

  if (!result) {
    return <NotFoundPage />;
  }

  return <>{result.page.content}</>;
}
