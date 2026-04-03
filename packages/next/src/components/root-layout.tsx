import type { Config } from "deesse";
import { toSidebarItems } from "../lib/to-sidebar-items";
import { AdminShell } from "./admin-shell";

export function RootLayout({
  config,
  children,
}: {
  config: Config;
  children: React.ReactNode;
}) {
  const items = toSidebarItems(config.pages ?? []);

  return (
    <AdminShell name={config.name} items={items} header={<span className="font-semibold">Dashboard</span>}>
      {children}
    </AdminShell>
  );
}
