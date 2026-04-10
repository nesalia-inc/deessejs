import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Auth, BetterAuthOptions } from "better-auth";
import type { Config } from "deesse";
import { extractSlugParts, findPage } from "./lib/find-page";
import { toSidebarItems } from "./lib/to-sidebar-items";
import { SidebarItemsProvider } from "./lib/sidebar-items-context";
import { NotFoundPage } from "./components/pages/not-found-page";
import { AdminNotConfigured } from "./components/pages/admin-not-configured";
import { LoginPage } from "./components/pages/login-page";
import { FirstAdminSetup } from "./components/pages/first-admin-setup";
import { hasAdminUsers } from "deesse";
import { defaultPages } from "./pages/default-pages";
import { ProductionOnly } from "./components/ui/production-only";
import { DevelopmentOnly } from "./components/ui/development-only";
import { AdminDashboardLayout } from "./components/layouts/admin-shell";

export interface RootPageProps<
  Options extends BetterAuthOptions = BetterAuthOptions,
> {
  config: Config;
  auth: Auth<Options>;
  params: Record<string, string | string[]>;
  searchParams?: Record<string, string | string[]>;
}

export async function RootPage<Options extends BetterAuthOptions>({
  config,
  auth,
  params,
}: RootPageProps<Options>) {
  const slugParts = extractSlugParts(params);

  // Check if this is the login page
  const isLoginPage = slugParts.length === 1 && slugParts[0] === "login";

  // If this is the login page, always show LoginPage
  if (isLoginPage) {
    return <LoginPage />;
  }

  // Get the request headers
  const requestHeaders = await headers();

  // Check if session exists
  const session = await (auth.api as any).getSession({
    headers: requestHeaders,
  });

  // If no session exists, redirect to login
  if (!session) {
    redirect("/admin/login");
  }

  // In development: check if we need to show first-admin-setup
  const adminExists = await hasAdminUsers(auth as any);

  // If no admin users exist, show first admin setup (development only)
  const showFirstAdminSetup = !adminExists;

  // Show the protected page
  const result = findPage([...defaultPages, ...(config.pages ?? [])], slugParts);

  if (!result) {
    return <NotFoundPage slug={slugParts.join("/")} />;
  }

  // Generate sidebar items for context
  const sidebarItems = toSidebarItems([...defaultPages, ...(config.pages ?? [])]);

  return (
    <SidebarItemsProvider items={sidebarItems}>
      <AdminDashboardLayout items={sidebarItems}>
        <DevelopmentOnly>
          {showFirstAdminSetup && <FirstAdminSetup />}
        </DevelopmentOnly>
        <ProductionOnly>
          {!adminExists && <AdminNotConfigured />}
        </ProductionOnly>
        {result.page.content}
      </AdminDashboardLayout>
    </SidebarItemsProvider>
  );
}
