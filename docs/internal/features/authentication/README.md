# Authentication

DeesseJS integrates [better-auth](https://www.better-auth.com/) for authentication. better-auth provides a comprehensive set of features including:

- Admin functionality
- Organization support
- SSO integration
- Last login tracking
- Multi-session management
- First-class Stripe support

## Architecture Overview

The authentication system is split into two parts:

1. **Server-side**: `getDeesse(config)` returns a `Deesse` instance with `auth` (BetterAuthInstance) and `database`
2. **Client-side**: `createClient(options)` returns a client with `auth` (BetterAuthClient) for React components

## Configuration

Configure authentication in `deesse.config.ts`:

```typescript
import { defineConfig } from "deesse";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { drizzleAdapter } from "better-auth/drizzle-adapter";
import { admin } from "better-auth/plugins";

export const config = defineConfig({
  database: drizzle({
    client: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
  auth: {
    plugins: [admin()],
  },
});
```

### Config Structure

| Property | Type | Description |
|----------|------|-------------|
| `database` | `DrizzleConfig` | Drizzle ORM database configuration |
| `auth.plugins` | `Plugin[]` | Better-auth plugins (admin, oauth, etc.) |

## First-Time Setup

When you first connect to the admin dashboard, you arrive on a signup screen to create the initial admin account.

**Important**: This signup screen can never be displayed in production. You cannot deploy to production without having at least one admin user already created.

Use the CLI to create the first admin user:

```bash
deesse admin create --email admin@example.com --password Secur3P@ss!
```

## Admin Plugin

The admin plugin provides user management capabilities. Enable it in your config:

```typescript
import { admin } from "better-auth/plugins";

export const config = defineConfig({
  auth: {
    plugins: [admin()],
  },
});
```

### Admin Features

- **Create User**: Create new users
- **List Users**: View all users with filtering and pagination
- **Get User**: Fetch user details
- **Set User Role**: Assign roles to users
- **Update User**: Modify user information
- **Ban/Unban User**: Ban users with optional expiration
- **List User Sessions**: View user's active sessions
- **Revoke Sessions**: Revoke specific or all sessions

## Why better-auth?

- Actively maintained
- Rich feature set needed for plugins (organizations, SSO, multi-session, etc.)
- If needed in the future, the system can be forked to support additional providers

## Related

- [Better-Auth Integration](./better-auth/README.md)
- [Client API](./better-auth/client.md)
- [Server API](./better-auth/server.md)
- [Admin & Users](./better-auth/admin-users.md)
- [CLI Admin](./cli/admin/README.md)
