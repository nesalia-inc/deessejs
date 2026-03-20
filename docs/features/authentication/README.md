# Authentication

This is an internal document outlining the authentication system for DeesseJS.

## Overview

DeesseJS uses [better-auth](https://www.better-auth.com/) as its authentication solution. better-auth provides a comprehensive set of features including:

- Admin functionality
- Organization support
- SSO integration
- Last login tracking
- Multi-session management
- First-class Stripe support

## Usage

To configure authentication in DeesseJS, use the `authProvider()` function in `deesse.config.ts`:

```typescript
import { defineConfig, authProvider } from '@deessejs/core';
import { betterAuth } from '@deessejs/auth-better-auth';

export const config = defineConfig({
  auth: betterAuth({
    // better-auth configuration
  }),
});
```

## Why better-auth?

- Actively maintained
- Rich feature set needed for plugins (organizations, SSO, multi-session, etc.)
- If needed in the future, the system can be forked to support additional providers
