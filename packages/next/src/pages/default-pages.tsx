import { Home, Database, Settings, Puzzle, Users } from "lucide-react";

import { page, section } from "@deessejs/admin";

import { DatabasePage } from "../components/pages/database-page";
import { HomePage } from "../components/pages/home-page";
import { PluginsPage } from "../components/pages/plugins-page";
import { SettingsPage } from "../components/pages/settings-page";
import { UsersPage } from "../components/pages/users-page";

export const defaultPages = [
  page({
    name: "Home",
    slug: "",
    icon: Home,
    content: <HomePage />,
  }),
  section({
    name: "Users",
    slug: "users",
    children: [
      page({
        name: "List",
        slug: "",
        icon: Users,
        content: <UsersPage />,
      }),
    ],
  }),
  page({
    name: "Database",
    slug: "database",
    icon: Database,
    content: <DatabasePage />,
  }),
  section({
    name: "Settings",
    slug: "settings",
    bottom: true,
    children: [
      page({
        name: "Settings",
        slug: "",
        icon: Settings,
        content: <SettingsPage />,
      }),
      page({
        name: "Plugins",
        slug: "plugins",
        icon: Puzzle,
        content: <PluginsPage />,
      }),
    ],
  }),
];
