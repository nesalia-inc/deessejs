"use client";

import { createContext, useContext } from "react";
import type { SidebarItem } from "./to-sidebar-items";

export const SidebarItemsContext = createContext<SidebarItem[]>([]);

export function SidebarItemsProvider({
  children,
  items,
}: {
  children: React.ReactNode;
  items: SidebarItem[];
}) {
  return (
    <SidebarItemsContext.Provider value={items}>
      {children}
    </SidebarItemsContext.Provider>
  );
}

export function useSidebarItems() {
  return useContext(SidebarItemsContext);
}