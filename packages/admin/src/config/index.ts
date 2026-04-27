export { page, section } from "./page.js";
export type { Page, Section, PageTree } from "./page.js";

// Page creation helpers
export { serverPage, clientPage, dynamicPage } from "./page.js";
export type { ServerPageHandler, ClientPageHandler, DynamicPageContent } from "./page.js";

// Slug parsing utilities
export { parseSlug, extractParamNames } from "./page.js";
export type { SlugSegment, StaticSlugSegment, DynamicSlugSegment } from "./page.js";

export { defineAdminConfig } from "./define.js";
export type { AdminConfig, InternalAdminConfig } from "./types.js";

export { plugin } from "./plugin.js";
export type { Plugin } from "./plugin.js";

export type { AdminHeaderConfig } from "./header.js";
