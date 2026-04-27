/**
 * Checks if the session user has admin role.
 * Helper for reusable authorization checks.
 */
export function isAdminUser(session: { user?: { role?: string | null } } | null): boolean {
  return session?.user?.role === "admin";
}

/**
 * Checks if the given context indicates an admin user.
 */
export function requireAdmin(context: { isAdminUser: boolean }): boolean {
  return context.isAdminUser;
}
