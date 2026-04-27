# Error Handling

The error handling system maps `@deessejs/fp` errors to HTTP status codes and provides consistent error responses.

## Overview

The `Result` pattern from `@deessejs/fp` uses `ok()` and `err()` for explicit error handling. When errors are returned via HTTP, they are mapped to appropriate HTTP status codes for SEO, monitoring tools, and CDN caching.

## The Problem

With `Result<T, E>` pattern, errors are returned as HTTP 200 with a JSON body:

```typescript
// Handler returns
return err({ code: "NOT_FOUND", message: "User not found" })

// Without error mapping - Current HTTP response
HTTP/1.1 200 OK
Content-Type: application/json

{ "ok": false, "error": { "code": "NOT_FOUND", "message": "User not found" } }
```

With error mapping - Proper HTTP status:

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{ "ok": false, "error": { "code": "NOT_FOUND", "message": "User not found" } }
```

## Default Error Mapping

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `DUPLICATE` | 409 | Conflict (e.g., email already exists) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `BAD_REQUEST` | 400 | Generic bad request |

## Usage

### Basic Error Handling

```typescript
import { z } from "zod"
import { err } from "@deessejs/fp"

const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)

    if (!user) {
      return err({ code: "NOT_FOUND", message: "User not found" })
    }

    return ok(user)
  }
})
```

### Authentication Error

```typescript
const login = t.mutation({
  args: z.object({
    email: z.string(),
    password: z.string()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.authenticate(args.email, args.password)

    if (!user) {
      return err({ code: "UNAUTHORIZED", message: "Invalid credentials" })
    }

    return ok(user)
  }
})
```

### Permission Error

```typescript
const deleteUser = t.mutation({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => {
    if (!ctx.isAdmin) {
      return err({ code: "FORBIDDEN", message: "Admin access required" })
    }

    await ctx.db.users.delete(args.id)
    return ok({ success: true })
  }
})
```

### Validation Error

```typescript
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2),
    email: z.string().email()
  }),
  handler: async (ctx, args) => {
    // Check for duplicates at the handler level
    const existing = await ctx.db.users.findByEmail(args.email)
    if (existing) {
      return err({
        code: "DUPLICATE",
        message: "Email already exists",
        field: "email"
      })
    }

    return ok(await ctx.db.users.create(args))
  }
})
```

## Custom Error Mapping

### Custom Error Codes

```typescript
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  errorMapping: {
    // Custom codes
    USER_SUSPENDED: 403,
    EMAIL_NOT_VERIFIED: 403,
    ACCOUNT_LOCKED: 423,
    PAYMENT_REQUIRED: 402,

    // Standard codes
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    VALIDATION_ERROR: 400,
    DUPLICATE: 409,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  }
})
```

### Disable Mapping

```typescript
// Return all errors as 200 (for API compatibility)
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  errorMapping: false  // All errors return HTTP 200
})
```

## Error Response Format

### Success Response

```json
{
  "ok": true,
  "value": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Error Response

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "field": "id"
  }
}
```

## Using defineErrors

Define errors once and reuse them:

```typescript
import { defineErrors } from "@deessejs/server"

const errors = defineErrors({
  NOT_FOUND: { message: "Resource not found", status: 404 },
  UNAUTHORIZED: { message: "Authentication required", status: 401 },
  FORBIDDEN: { message: "Permission denied", status: 403 },
  VALIDATION_ERROR: { message: "Invalid input", status: 400 },
  DUPLICATE: { message: "Resource already exists", status: 409 },
  RATE_LIMITED: { message: "Too many requests", status: 429 },
  INTERNAL_ERROR: { message: "An error occurred", status: 500 },
})

// Usage
return err(errors.NOT_FOUND)
```

### With Metadata

```typescript
const errors = defineErrors({
  NOT_FOUND: {
    message: "User not found",
    status: 404,
    metadata: { resource: "user" }
  }
})

// Returns: { code: "NOT_FOUND", message: "User not found", metadata: { resource: "user" } }
```

## Thrown Errors

Exceptions thrown in handlers are automatically mapped:

```typescript
const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => {
    // This throws!
    throw new Error("Database connection failed")
  }
})
```

Response:

```json
{
  "ok": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Database connection failed"
  }
}
```

### Custom Exception Mapping

```typescript
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  errorMapping: {
    // Map specific exceptions to error codes
    ValidationError: "VALIDATION_ERROR",
    UnauthorizedError: "UNAUTHORIZED",
    ForbiddenError: "FORBIDDEN",
    NotFoundError: "NOT_FOUND",
  }
})
```

## Handling in Client Code

### TypeScript Errors

```typescript
const result = await client.users.get({ id: 123 })

if (!result.ok) {
  switch (result.error.code) {
    case "NOT_FOUND":
      // Handle not found
      break
    case "UNAUTHORIZED":
      // Redirect to login
      break
    case "RATE_LIMITED":
      // Show rate limit message
      break
    default:
      // Handle unexpected error
      break
  }
}
```

### Async/Await with Try-Catch

```typescript
async function fetchUser(id: number) {
  try {
    const result = await client.users.get({ id })
    if (result.ok) {
      return result.value
    }
    throw new Error(result.error.message)
  } catch (error) {
    // Handle error
    console.error("Failed to fetch user:", error)
    return null
  }
}
```

## Best Practices

### 1. Use Consistent Error Codes

```typescript
// Good: Consistent codes
return err({ code: "NOT_FOUND", message: "User not found" })
return err({ code: "NOT_FOUND", message: "Post not found" })

// Bad: Inconsistent codes
return err({ code: "USER_NOT_FOUND", message: "User not found" })
return err({ code: "POST_NOT_FOUND", message: "Post not found" })
```

### 2. Include Meaningful Messages

```typescript
// Good: Context-specific message
return err({ code: "NOT_FOUND", message: "User with id 123 not found" })

// Bad: Generic message
return err({ code: "NOT_FOUND", message: "Not found" })
```

### 3. Use Metadata for Debugging

```typescript
return err({
  code: "VALIDATION_ERROR",
  message: "Invalid user data",
  metadata: {
    field: "email",
    reason: "Invalid email format"
  }
})
```

### 4. Don't Expose Internal Details

```typescript
// Good: Generic message for internal errors
return err({ code: "INTERNAL_ERROR", message: "An error occurred" })

// Bad: Exposing internal details
return err({ code: "INTERNAL_ERROR", message: "SQL syntax error at line 42" })
```

## See Also

- [@deesse-fp skill](../deesse-fp/SKILL.md) - Result type with ok/err patterns
- [Queries](features/queries.md) - Error handling in queries
- [Mutations](features/mutations.md) - Error handling in mutations