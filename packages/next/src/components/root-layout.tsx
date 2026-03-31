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
    <AdminShell items={items}>
      <header className="flex min-h-13 shrink-0 items-center gap-2 border-b px-4">
        <span className="font-semibold">Dashboard</span>
      </header>
      {children}
    </AdminShell>
  );
}
