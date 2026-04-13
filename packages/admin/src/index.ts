// @deessejs/admin - React-agnostic admin logic for DeesseJS

// Config
export { defineAdminConfig } from "./config/index.js";
export type { AdminConfig, InternalAdminConfig } from "./config/index.js";
export { plugin } from "./config/index.js";
export type { Plugin } from "./config/index.js";

// Page types
export { page, section } from "./config/index.js";
export type { Page, Section, PageTree } from "./config/index.js";

// Admin utilities
export { isDatabaseEmpty, requireDatabaseNotEmpty, hasAdminUsers } from "./lib/admin.js";

// Email validation
export {
  PUBLIC_EMAIL_DOMAINS,
  isPublicEmailDomain,
  getAllowedDomains,
  isAllowedAdminEmail,
  validateAdminEmailDomain,
} from "./lib/validation.js";

// First admin
export { createFirstAdmin } from "./lib/first-admin.js";
export type { FirstAdminInput, FirstAdminResult } from "./lib/first-admin.js";

// Sidebar
export { toSidebarItems } from "./lib/sidebar.js";
export type { SidebarItem, SidebarPage, SidebarSection } from "./lib/sidebar.js";

// Navigation
export { findPage, extractSlugParts } from "./lib/navigation.js";
export type { FindPageResult } from "./lib/navigation.js";

// Context
export { SidebarItemsProvider, useSidebarItems } from "./context/sidebar-items-context.js";

// Default pages
export { defaultPageStructure } from "./default-pages.js";