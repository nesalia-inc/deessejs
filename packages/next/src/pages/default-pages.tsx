import { page, section } from "deesse";
import { Home, Users, Database, Settings, Puzzle } from "lucide-react";
import { HomePage } from "../components/pages/home-page";
import { UsersPage } from "../components/pages/users-page";
import { DatabasePage } from "../components/pages/database-page";
import { SettingsPage } from "../components/pages/settings-page";
import { PluginsPage } from "../components/pages/plugins-page";

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
    children: [
      page({
        name: "General",
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
