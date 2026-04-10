import type { Auth, BetterAuthOptions } from 'better-auth';
import { NextResponse } from "next/server";
import { hasAdminUsers, validateAdminEmail } from "deesse";

/**
 * Handler for first-admin setup endpoint.
 * Creates the initial admin user when no admin users exist.
 * Only available in development mode.
 */
export async function handleFirstAdmin(
  auth: Auth<BetterAuthOptions>,
  request: Request
): Promise<NextResponse> {
  try {
    // Production guard
    if (process.env['NODE_ENV'] === "production") {
      return NextResponse.json(
        { message: "First admin setup is only available in development mode" },
        { status: 403 }
      );
    }

    // Check if admin users already exist
    const adminExists = await hasAdminUsers(auth as any);
    if (adminExists) {
      return NextResponse.json(
        { message: "Admin users already exist. Cannot create first admin." },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Missing required fields: name, email, password" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate email domain
    const validation = validateAdminEmail(email);
    if (!validation.valid) {
      return NextResponse.json(
        { message: validation.error },
        { status: 400 }
      );
    }

    // Create admin user (internal call without headers - bypasses auth)
    const result = await (auth.api as any).createUser({
      body: {
        email,
        password,
        name,
        role: "admin",
      },
    });

    return NextResponse.json(
      { message: "Admin user created successfully", userId: result.user?.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[first-admin]", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
