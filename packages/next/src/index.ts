// @deessejs/next package

export { RootPage } from "./root-page";
export { RootLayout } from "./components/root-layout";
export * from "./components/pages";
export { AdminDashboardLayout } from "./components/layouts";
export type { AdminDashboardUser } from "./components/layouts";
export { AppSidebar, SidebarNav } from "./components/ui";

// Re-export from @deessejs/admin for convenience
export { toSidebarItems } from "@deessejs/admin";
export type { SidebarItem, SidebarPage, SidebarSection } from "@deessejs/admin";
export { findPage, extractSlugParts } from "@deessejs/admin";
export type { FindPageResult } from "@deessejs/admin";
export { SidebarItemsProvider, useSidebarItems } from "@deessejs/admin";

export { REST_GET, REST_POST } from "./routes";
