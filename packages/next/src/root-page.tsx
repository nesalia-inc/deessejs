import { notFound } from "next/navigation";

import type { InternalConfig } from "deesse";

import { AdminDashboardLayout } from "./components/layouts/admin-shell";
import { createAuthContext } from "./lib/auth-context";
import { findAdminPage } from "./lib/page-finder";
import { FirstAdminSetup } from "./components/pages/first-admin-setup";
import { LoginPage } from "./components/pages/login-page";
import { defaultPages } from "./pages/default-pages";

export interface RootPageProps {
  config: InternalConfig;
  params: Record<string, string | string[]>;
}

export const RootPage = async ({ config, params }: RootPageProps) => {
  const { user, adminExists, isLoginPage, isAdminUser, slugParts } = await createAuthContext({ config, params });

  if (isLoginPage) {
    return <LoginPage />;
  }

  // In production, if no admin exists, block all admin routes with 404
  if (process.env["NODE_ENV"] === "production" && !adminExists) {
    return notFound();
  }

  // In dev mode, if no admin exists, show only FirstAdminSetup (no sidebar/layout)
  if (!adminExists) {
    return <FirstAdminSetup />;
  }

  // Admin exists - check authorization
  if (!isAdminUser) {
    return notFound();
  }

  const allPages = [...defaultPages, ...(config.pages ?? [])];
  const { result, sidebarItems } = findAdminPage(allPages, slugParts);

  if (!result) {
    return notFound();
  }

  return (
    <AdminDashboardLayout config={{ name: config.name, icon: "/nesalia.svg" }} items={sidebarItems} user={user} headerActions={config.admin?.header?.actions}>
      {result.page.content}
    </AdminDashboardLayout>
  );
}
