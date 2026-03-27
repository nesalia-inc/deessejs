import type { Config } from "deesse";

export interface RootPageProps {
  config: Config;
  params: Record<string, string | string[]>;
  searchParams: Record<string, string | string[]>;
}

export function RootPage({ config: _config, params: _params, searchParams: _searchParams }: RootPageProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-muted-foreground">Dummy admin page</p>
    </div>
  );
}
