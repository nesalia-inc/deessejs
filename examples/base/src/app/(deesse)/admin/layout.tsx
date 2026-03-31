import { AdminShell } from "@deessejs/next/admin-shell";
import { toSidebarItems } from "@deessejs/next/to-sidebar-items";
import { config } from "@deesse-config";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const items = toSidebarItems(config.pages ?? []);
  return <AdminShell items={items}>{children}</AdminShell>;
}
