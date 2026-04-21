import type { Config } from "deesse";

export function RootLayout({ children }: { config: Config; children: React.ReactNode }) {
  return <>{children}</>;
}
