"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { SidebarItem } from "../lib/sidebar.js"

type SidebarItemsContextValue = {
  items: SidebarItem[]
}

const SidebarItemsContext = createContext<SidebarItemsContextValue | null>(null)

export function SidebarItemsProvider({
  items,
  children,
}: {
  items: SidebarItem[]
  children: ReactNode
}) {
  return (
    <SidebarItemsContext.Provider value={{ items }}>
      {children}
    </SidebarItemsContext.Provider>
  )
}

export function useSidebarItems(): SidebarItem[] {
  const context = useContext(SidebarItemsContext)
  if (!context) {
    throw new Error("useSidebarItems must be used within a SidebarItemsProvider")
  }
  return context.items
}
