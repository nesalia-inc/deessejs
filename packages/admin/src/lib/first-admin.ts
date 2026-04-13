import type { Auth } from "better-auth";
import { hasAdminUsers } from "./admin.js";
import { validateAdminEmailDomain } from "./validation.js";

/**
 * Input for creating the first admin user.
 */
export type FirstAdminInput = {
  name: string;
  email: string;
  password: string;
};

/**
 * Result of creating the first admin user.
 */
export type FirstAdminResult =
  | { success: true; userId: string }
  | { success: false; code: string; message: string };

/**
 * Create the first admin user.
 *
 * Logic:
 * 1. Check if admin exists (hasAdminUsers)
 * 2. Validate email domain (validateAdminEmailDomain)
 * 3. Validate password length >= 8
 * 4. Create user via auth.api.createUser
 */
export async function createFirstAdmin(
  auth: Auth,
  input: FirstAdminInput
): Promise<FirstAdminResult> {
  // Check if admin users already exist
  const adminExists = await hasAdminUsers(auth);
  if (adminExists) {
    return {
      success: false,
      code: "ADMIN_EXISTS",
      message: "Admin users already exist. Cannot create first admin.",
    };
  }

  // Validate email domain
  const emailValidation = validateAdminEmailDomain(input.email);
  if (!emailValidation.valid) {
    return {
      success: false,
      code: emailValidation.code,
      message: emailValidation.message,
    };
  }

  // Validate password length
  if (input.password.length < 8) {
    return {
      success: false,
      code: "INVALID_PASSWORD",
      message: "Password must be at least 8 characters",
    };
  }

  // Validate required fields
  if (!input.name || !input.email || !input.password) {
    return {
      success: false,
      code: "MISSING_FIELDS",
      message: "Missing required fields: name, email, password",
    };
  }

  try {
    // Create admin user (internal call without headers - bypasses auth)
    const result = await (auth.api as any).createUser({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
        role: "admin",
      },
    });

    return {
      success: true,
      userId: result.user?.id,
    };
  } catch (error) {
    return {
      success: false,
      code: "CREATE_USER_FAILED",
      message:
        error instanceof Error ? error.message : "Failed to create admin user",
    };
  }
}
