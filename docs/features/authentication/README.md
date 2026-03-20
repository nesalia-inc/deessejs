# Authentication

This is an internal document outlining the authentication system for DeesseJS.

## Overview

DeesseJS provides an authentication system that is provider-agnostic. It defines a standard interface that any authentication provider must implement, allowing flexibility in choosing the authentication solution.

## Interface

The authentication system defines an interface that providers must implement. This ensures compatibility with the DeesseJS admin dashboard and API.

```typescript
interface AuthProvider {
  // Methods to implement
}
```

## Usage

To use authentication in DeesseJS, use the `authProvider()` wrapper function in `deesse.config.ts`:

```typescript
import { defineConfig, authProvider } from '@deessejs/core';
import { supabaseAuth } from '@deessejs/auth-supabase';

export const config = defineConfig({
  auth: supabaseAuth({
    // provider options
  }),
});
```

Each auth provider (Supabase, NextAuth, Clerk, etc.) exports its own `authProvider()` function that can be configured with provider-specific options.

This approach allows you to use any authentication provider (NextAuth.js, Clerk, custom solution, etc.) while maintaining a consistent interface across the application.
