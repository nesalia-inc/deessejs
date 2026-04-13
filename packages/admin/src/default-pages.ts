import { page, section } from "./config/page.js";
import type { PageTree } from "./config/page.js";
import { Home, Users, Database, Settings, Puzzle } from "lucide-react";

export const defaultPageStructure: PageTree[] = [
  page({ name: "Home", slug: "", icon: Home, content: null }),
  section({
    name: "Users",
    slug: "users",
    children: [page({ name: "List", slug: "", icon: Users, content: null })],
  }),
  page({ name: "Database", slug: "database", icon: Database, content: null }),
  section({
    name: "Settings",
    slug: "settings",
    children: [
      page({ name: "General", slug: "", icon: Settings, content: null }),
      page({ name: "Plugins", slug: "plugins", icon: Puzzle, content: null }),
    ],
  }),
];
