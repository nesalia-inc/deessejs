import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Auth, BetterAuthOptions } from "better-auth";
import type { Config } from "deesse";
import { extractSlugParts, findPage } from "./lib/find-page";
import { NotFoundPage } from "./components/not-found-page";

export interface RootPageProps<
  Options extends BetterAuthOptions = BetterAuthOptions,
> {
  config: Config;
  auth: Auth<Options>;
  params: Record<string, string | string[]>;
  searchParams: Record<string, string | string[]>;
}

export async function RootPage<Options extends BetterAuthOptions>({
  config,
  auth,
  params,
  searchParams: _searchParams,
}: RootPageProps<Options>) {
  const session = await (auth.api as any).getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/admin/login");
  }

  const slugParts = extractSlugParts(params);
  const result = findPage(config.pages, slugParts);

  if (!result) {
    return <NotFoundPage slug={slugParts.join("/")} />;
  }

  return <>{result.page.content}</>;
}
