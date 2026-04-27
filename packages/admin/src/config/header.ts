import type { ReactNode } from "react";

/**
 * Configuration for admin header actions.
 * Allows adding custom components to the right side of the admin header.
 */
export type AdminHeaderConfig = {
  /**
   * React components to render on the right side of the header.
   * Typically buttons, icons, or dropdown menus.
   */
  actions?: ReactNode;
};
