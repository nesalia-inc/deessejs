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

To configure authentication in DeesseJS, pass the better-auth configuration directly in `deesse.config.ts`:

```typescript
import { defineConfig } from '@deessejs/core';

export const config = defineConfig({
  auth: {
    // better-auth configuration
  },
});
```

## Why better-auth?

- Actively maintained
- Rich feature set needed for plugins (organizations, SSO, multi-session, etc.)
- If needed in the future, the system can be forked to support additional providers
