import { RootLayout } from "@deessejs/next/root-layout";
import { toSidebarItems } from "@deessejs/next/to-sidebar-items";
import { config } from "@deesse-config";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const items = toSidebarItems(config.pages ?? []);
  return (
    <RootLayout items={items} header={<span className="font-semibold">Dashboard</span>}>
      {children}
    </RootLayout>
  );
}
