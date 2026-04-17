import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { InternalConfig } from "deesse";
import { getDeesse } from "deesse";
import { extractSlugParts, hasAdminUsers } from "@deessejs/admin";
import type { FindPageResult } from "@deessejs/admin";

const LOGIN_SLUG = "login";
const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_HOME_PATH = "/admin";

export interface AuthContext {
  auth: Awaited<ReturnType<typeof getDeesse>>["auth"];
  session: Awaited<ReturnType<Awaited<ReturnType<typeof getDeesse>>["auth"]["api"]["getSession"]>>;
  user: AuthContext["session"] extends { user: infer U } ? U : undefined;
  adminExists: boolean;
  isLoginPage: boolean;
  isAdminUser: boolean;
  slugParts: string[];
}

export interface CreateAuthContextOptions {
  config: InternalConfig;
  params: Record<string, string | string[]>;
}

export async function createAuthContext({
  config,
  params,
}: CreateAuthContextOptions): Promise<AuthContext> {
  let deesse;
  let requestHeaders;

  try {
    [deesse, requestHeaders] = await Promise.all([
      getDeesse(config),
      headers(),
    ]);
  } catch (error) {
    console.error("[deesse] Failed to initialize:", error);
    redirect(`${ADMIN_LOGIN_PATH}?error=init_failed`);
  }

  const auth = deesse.auth;
  const slugParts = extractSlugParts(params);

  // Check if session exists with error handling
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: requestHeaders,
    });
  } catch (error) {
    console.error("[deesse] Session check failed:", error);
    session = null;
  }

  // Check if this is the login page
  const isLoginPage = slugParts.length === 1 && slugParts[0] === LOGIN_SLUG;

  // If this is the login page, check if user is already authenticated
  if (isLoginPage) {
    if (session) {
      redirect(ADMIN_HOME_PATH);
    }
    // Return early - login page will be rendered by caller
    return {
      auth,
      session,
      user: (session as any)?.user ?? undefined,
      adminExists: false,
      isLoginPage: true,
      isAdminUser: false,
      slugParts,
    };
  }

  // If no session exists, redirect to login
  if (!session) {
    redirect(ADMIN_LOGIN_PATH);
  }

  // Check if admin users exist
  let adminExists = false;
  try {
    adminExists = await hasAdminUsers(auth);
  } catch {
    adminExists = process.env["NODE_ENV"] !== "production";
  }

  return {
    auth,
    session,
    user: (session as any)?.user ?? undefined,
    adminExists,
    isLoginPage: false,
    isAdminUser: (session as any)?.user?.role === "admin",
    slugParts,
  };
}

export { LOGIN_SLUG, ADMIN_LOGIN_PATH, ADMIN_HOME_PATH };
export type { FindPageResult };
