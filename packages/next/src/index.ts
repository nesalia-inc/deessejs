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

// Page creation helpers
export { serverPage, clientPage, dynamicPage } from "@deessejs/admin";
export type { ServerPageHandler, ClientPageHandler, DynamicPageContent } from "@deessejs/admin";
export { parseSlug, extractParamNames } from "@deessejs/admin";
export type { SlugSegment, StaticSlugSegment, DynamicSlugSegment } from "@deessejs/admin";

// Lib exports
export { createAuthContext } from "./lib/auth-context";
export type { AuthContext, CreateAuthContextOptions } from "./lib/auth-context";
export { findAdminPage } from "./lib/page-finder";
export type { PageFinderResult } from "./lib/page-finder";
export { LOGIN_SLUG, ADMIN_LOGIN_PATH, ADMIN_HOME_PATH } from "./lib/auth-context";

// Database helpers
export { getValidTables, getTableSchema, queryTable, validateTableName } from "./lib/database";
export type { ColumnInfo, TableQueryResult } from "./lib/database";

export { REST_GET, REST_POST } from "./routes";
