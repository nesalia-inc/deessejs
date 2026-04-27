import type { Auth, BetterAuthOptions } from "better-auth";

import { NextResponse } from "next/server";

import type { FirstAdminInput } from "@deessejs/admin";
import { createFirstAdmin } from "@deessejs/admin";

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

    // Parse body
    const body = await request.json();
    const { name, email, password } = body;

    const input: FirstAdminInput = { name, email, password };
    const result = await createFirstAdmin(auth, input);

    if (result.success) {
      return NextResponse.json(
        { message: "Admin user created successfully", userId: result.userId },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: 400 }
    );
  } catch (error) {
    console.error("[first-admin]", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
