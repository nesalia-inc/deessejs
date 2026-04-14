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

// Lib exports
export { createAuthContext } from "./lib/auth-context";
export type { AuthContext, CreateAuthContextOptions } from "./lib/auth-context";
export { findAdminPage } from "./lib/page-finder";
export type { PageFinderResult } from "./lib/page-finder";
export { LOGIN_SLUG, ADMIN_LOGIN_PATH, ADMIN_HOME_PATH } from "./lib/auth-context";

export { REST_GET, REST_POST } from "./routes";
