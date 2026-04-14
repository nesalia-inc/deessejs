import type { Auth } from "better-auth";

/**
 * Check if the database has any users.
 * Returns true if the database is empty (no users).
 */
export async function isDatabaseEmpty(auth: Auth): Promise<boolean> {
  try {
    const result = await (auth.api as any).listUsers({ limit: 1 });
    return !result?.users || result.users.length === 0;
  } catch {
    // If listUsers fails, assume not empty (safer default)
    return false;
  }
}

/**
 * Require that the database is NOT empty.
 * Throws if no users exist.
 */
export async function requireDatabaseNotEmpty(auth: Auth): Promise<void> {
  if (await isDatabaseEmpty(auth)) {
    throw new Error(
      "Database is empty. Cannot proceed with this operation. " +
        "Use the First Admin Setup page to create the initial admin account."
    );
  }
}

/**
 * Check if any admin users exist in the database.
 * Returns true if at least one user with role "admin" exists.
 *
 * Uses the internal adapter directly to bypass auth checks.
 * This is necessary because the listUsers API endpoint requires admin permissions,
 * which creates a circular dependency when checking if an admin exists.
 */
export async function hasAdminUsers(auth: Auth): Promise<boolean> {
  try {
    // Access internal adapter directly - bypasses all auth middleware
    const context = await auth.$context;
    const users = await context.internalAdapter.listUsers(100);
    return users.some((u: any) => u.role === "admin") ?? false;
  } catch (error) {
    // Log the error but re-throw - we don't know if admin exists or not
    console.error("[deesse] Failed to check admin users:", error);
    throw new Error("Failed to check admin users", { cause: error });
  }
}

export interface EmailValidationOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireOrganization?: boolean;
}

/**
 * Validate an admin email against configured rules.
 */
export function validateAdminEmail(
  email: string,
  options: EmailValidationOptions = {}
): { valid: boolean; error?: string } {
  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain) {
    return { valid: false, error: "Invalid email format" };
  }

  // Check blocked domains
  if (options.blockedDomains?.includes(domain)) {
    return { valid: false, error: `Email domain ${domain} is blocked` };
  }

  // Check allowed domains (if specified)
  if (
    options.allowedDomains?.length &&
    !options.allowedDomains.includes(domain)
  ) {
    return {
      valid: false,
      error: `Email must be from: ${options.allowedDomains.join(", ")}`,
    };
  }

  // Require organization (no public email domains)
  if (options.requireOrganization) {
    const PUBLIC_DOMAINS = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
    ];
    if (PUBLIC_DOMAINS.includes(domain)) {
      return {
        valid: false,
        error:
          "Personal email domains are not allowed. Use an organizational email.",
      };
    }
  }

  return { valid: true };
}
