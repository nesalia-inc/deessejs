# Better-Auth Types Deep Dive

## Overview

This document provides a detailed analysis of the `BetterAuthOptions` types that are relevant to DeesseJS configuration, specifically `BetterAuthOptions['session']` and `BetterAuthOptions['emailAndPassword']`.

## `BetterAuthOptions['session']`

```typescript
session?:
  | (BetterAuthDBOptions<"session", keyof BaseSession> & {
      /**
       * Expiration time for the session token. The value
       * should be in seconds.
       * @default 7 days (60 * 60 * 24 * 7)
       */
      expiresIn?: number;
      /**
       * How often the session should be refreshed. The value
       * should be in seconds.
       * If set 0 the session will be refreshed every time it is used.
       * @default 1 day (60 * 60 * 24)
       */
      updateAge?: number;
      /**
       * Disable session refresh so that the session is not updated
       * regardless of the `updateAge` option.
       *
       * @default false
       */
      disableSessionRefresh?: boolean;
      /**
       * Defer session refresh writes to POST requests.
       * When enabled, GET is read-only and POST performs refresh.
       * Useful for read-replica database setups.
       *
       * @default false
       */
      deferSessionRefresh?: boolean;
      /**
       * By default if secondary storage is provided
       * the session is stored in the secondary storage.
       *
       * Set this to true to store the session in the database
       * as well.
       *
       * Reads are always done from the secondary storage.
       *
       * @default false
       */
      storeSessionInDatabase?: boolean;
      /**
       * By default, sessions are deleted from the database when secondary storage
       * is provided when session is revoked.
       *
       * Set this to true to preserve session records in the database,
       * even if they are deleted from the secondary storage.
       *
       * @default false
       */
      preserveSessionInDatabase?: boolean;
      /**
       * Enable caching session in cookie
       */
      cookieCache?: {
        /**
         * max age of the cookie
         * @default 5 minutes (5 * 60)
         */
        maxAge?: number;
        /**
         * Enable caching session in cookie
         * @default false
         */
        enabled?: boolean;
        /**
         * Strategy for encoding/decoding cookie cache
         *
         * - "compact": Uses base64url encoding with HMAC-SHA256 signature
         * - "jwt": Uses JWT with HMAC signature
         * - "jwe": Uses JWE with A256CBC-HS512
         *
         * @default "compact"
         */
        strategy?: "compact" | "jwt" | "jwe";
        /**
         * Controls stateless cookie cache refresh behavior.
         *
         * @default false
         */
        refreshCache?:
          | boolean
          | {
              updateAge?: number;
            };
        /**
         * Version of the cookie cache
         *
         * @default "1"
         */
        version?:
          | string
          | ((
              session: Session & Record<string, any>,
              user: User & Record<string, any>,
            ) => string)
          | ((
              session: Session & Record<string, any>,
              user: User & Record<string, any>,
            ) => Promise<string>);
      };
      /**
       * The age of the session to consider it fresh.
       *
       * @default 1 day (60 * 60 * 24)
       */
      freshAge?: number;
    })
  | undefined;
```

## `BetterAuthOptions['emailAndPassword']`

```typescript
emailAndPassword?:
  | {
      /**
       * Enable email and password authentication
       *
       * @default false
       */
      enabled: boolean;
      /**
       * Disable email and password sign up
       *
       * @default false
       */
      disableSignUp?: boolean;
      /**
       * Require email verification before a session
       * can be created for the user.
       */
      requireEmailVerification?: boolean;
      /**
       * The maximum length of the password.
       *
       * @default 128
       */
      maxPasswordLength?: number;
      /**
       * The minimum length of the password.
       *
       * @default 8
       */
      minPasswordLength?: number;
      /**
       * send reset password
       */
      sendResetPassword?: (
        data: { user: User; url: string; token: string },
        request?: Request,
      ) => Promise<void>;
      /**
       * Number of seconds the reset password token is
       * valid for.
       * @default 1 hour (60 * 60)
       */
      resetPasswordTokenExpiresIn?: number;
      /**
       * A callback function that is triggered
       * when a user's password is changed successfully.
       */
      onPasswordReset?: (
        data: { user: User },
        request?: Request,
      ) => Promise<void>;
      /**
       * Password hashing and verification
       *
       * By default Scrypt is used for password hashing and
       * verification. You can provide your own hashing and
       * verification function.
       */
      password?: {
        hash?: (password: string) => Promise<string>;
        verify?: (data: {
          hash: string;
          password: string
        }) => Promise<boolean>;
      };
      /**
       * Automatically sign in the user after sign up
       *
       * @default true
       */
      autoSignIn?: boolean;
      /**
       * Whether to revoke all other sessions when resetting password
       * @default false
       */
      revokeSessionsOnPasswordReset?: boolean;
      /**
       * A callback function that is triggered when a user tries to sign up
       * with an email that already exists.
       */
      onExistingUserSignUp?: (
        data: { user: User },
        request?: Request,
      ) => Promise<void>;
      /**
       * Build a custom synthetic user for email enumeration
       * protection.
       */
      customSyntheticUser?: (params: {
        coreFields: {
          name: string;
          email: string;
          emailVerified: boolean;
          image: string | null;
          createdAt: Date;
          updatedAt: Date;
        };
        additionalFields: Record<string, unknown>;
        id: string;
      }) => Record<string, unknown>;
    }
  | undefined;
```

## User-Facing Simplification

The above types are complex with many options. For DeesseJS, we can provide a simplified user-facing config:

```typescript
// Simplified user config
auth: {
  session: {
    maxAge: 60 * 60 * 24 * 7,   // expiresIn in better-auth
    updateAge: 60 * 60 * 24,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
}
```

## Type Inference Challenge

When we use these types directly, TypeScript's structural typing causes issues:

- `defaultAuth.session = { maxAge: 604800 }` infers as `{ maxAge: number }`
- Merging with user config `{ updateAge: 86400 }` requires `Partial<{ maxAge: number }>`
- But `BetterAuthOptions['session']` has `expiresIn`, `cookieCache`, `freshAge`, etc.

The intersection signature solution (`T & S`) resolves this by allowing both types to contribute properties.
