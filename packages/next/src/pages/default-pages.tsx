import { Home, Database, Settings, Puzzle, Users, Table } from "lucide-react";

import { page, section, dynamicPage } from "@deessejs/admin";

import { DatabasePage } from "../components/pages/database-page";
import { HomePage } from "../components/pages/home-page";
import { PluginsPage } from "../components/pages/plugins-page";
import { SettingsPage } from "../components/pages/settings-page";
import { TableViewPage } from "../components/pages/table-view-page";
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
  section({
    name: "Database",
    slug: "database",
    children: [
      page({
        name: "Tables",
        slug: "",
        icon: Database,
        content: <DatabasePage />,
      }),
      dynamicPage({
        name: "Table View",
        slug: "[table_slug]",
        icon: Table,
        content: (params) => <TableViewPage tableName={params["table_slug"]} />,
      }),
    ],
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
