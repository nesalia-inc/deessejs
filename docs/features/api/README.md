# API

This is an internal document outlining the API system for DeesseJS.

## Overview

DeesseJS generates an API layer automatically based on the application's configuration. All API routes are exposed through a single catch-all route handler.

## Route Handler

The main API route is defined at `app/(deesse)/api/[[...route]]/route.ts`. This file serves as the entry point for all API endpoints.

```typescript
/* THIS FILE WAS GENERATED AUTOMATICALLY BY DEESSEJS. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */

import config from '@deesse-config';
import '@deessejs/next/css';
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@deessejs/next/routes';

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
```

This route handler automatically routes requests to the appropriate handlers based on the URL path and HTTP method.
