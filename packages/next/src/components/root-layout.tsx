import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from "@deessejs/ui/sidebar";
import type { Config } from "deesse";
import { toSidebarItems } from "../lib/to-sidebar-items";
import { SidebarNav } from "./sidebar-nav";

export function RootLayout({
  config,
  children,
}: {
  config: Config;
  children: React.ReactNode;
}) {
  const items = toSidebarItems(config.pages ?? []);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-14 items-center px-4">
            <span className="font-semibold">DeesseJS Admin</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav items={items} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex h-14 items-center px-4">
            <SidebarTrigger />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex min-h-13 shrink-0 items-center gap-2 border-b px-4">
          <span className="font-semibold">Dashboard</span>
        </header>
        {children}
      </SidebarInset>
      <SidebarRail />
    </SidebarProvider>
  );
}
