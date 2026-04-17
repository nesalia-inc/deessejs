import type { InternalConfig } from "deesse";
import { createAuthContext } from "./lib/auth-context";
import { findAdminPage } from "./lib/page-finder";
import { NotFoundPage } from "./components/pages/not-found-page";
import { AdminNotConfigured } from "./components/pages/admin-not-configured";
import { LoginPage } from "./components/pages/login-page";
import { FirstAdminSetup } from "./components/pages/first-admin-setup";
import { UnauthorizedPage } from "./components/pages/unauthorized-page";
import { AdminDashboardLayout } from "./components/layouts/admin-shell";
import { defaultPages } from "./pages/default-pages";

export interface RootPageProps {
  config: InternalConfig;
  params: Record<string, string | string[]>;
}

export async function RootPage({ config, params }: RootPageProps) {
  const { user, adminExists, isLoginPage, isAdminUser, slugParts } = await createAuthContext({ config, params });

  if (isLoginPage) {
    return <LoginPage />;
  }

  const allPages = [...defaultPages, ...(config.pages ?? [])];
  const { result, sidebarItems } = findAdminPage(allPages, slugParts);

  if (!result) {
    return <NotFoundPage slug={slugParts.join("/")} />;
  }

  // Check if user has admin role (only after confirming admin exists)
  if (!isAdminUser) {
    return <UnauthorizedPage />;
  }

  return (
    <AdminDashboardLayout items={sidebarItems} user={user}>
      {process.env["NODE_ENV"] !== "production" && !adminExists && <FirstAdminSetup />}
      {process.env["NODE_ENV"] === "production" && !adminExists && <AdminNotConfigured />}
      {result.page.content}
    </AdminDashboardLayout>
  );
}
