# Validation

The validation system supports multiple validation libraries (Zod, Valibot, ArkType, Typia). The core `@deessejs/server` has **zero validation dependencies** - you choose which library to use.

## Overview

The framework uses the **Standard Schema** interface, which means any library implementing this interface is supported. This gives you flexibility to choose the validator that best fits your needs.

## Supported Libraries

| Library | Bundle Size | Performance | Notes |
|---------|-------------|-------------|-------|
| **Zod** | ~30KB | Good | Most popular, great ecosystem |
| **Valibot** | ~6KB | Excellent | Lightweight alternative to Zod |
| **ArkType** | ~12KB | Excellent | Best TypeScript inference |
| **Typia** | ~0KB* | Fastest | Compile-time validation, no runtime |

*Typia generates validation code at compile time via a TypeScript plugin.

## Basic Usage

### With Zod (Recommended)

```typescript
import { defineContext } from "@deessejs/server"
import { z } from "zod"

const { t } = defineContext({
  context: { db: myDatabase }
})

const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => {
    // args.id is typed as number
    const user = await ctx.db.users.find(args.id)
    return ok(user)
  }
})
```

### With Valibot

```typescript
import { v } from "valibot"

const getUser = t.query({
  args: v.object({
    id: v.number(),
    include: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    // args.id is typed as number
    const user = await ctx.db.users.find(args.id)
    return ok(user)
  }
})
```

### With ArkType

```typescript
import { type } from "arktype"

const getUser = t.query({
  args: type({
    id: "number",
    include: "string?"
  }),
  handler: async (ctx, args) => {
    // args.id is typed as number
    const user = await ctx.db.users.find(args.id)
    return ok(user)
  }
})
```

### With Typia

```typescript
import { typia } from "typia"

const getUser = t.query({
  args: typia<{ id: number }>(),
  handler: async (ctx, args) => {
    // args is typed as { id: number }
    const user = await ctx.db.users.find(args.id)
    return ok(user)
  }
})
```

> **Note:** Typia requires additional setup with a TypeScript plugin or Vite plugin.

## Type Inference

Types are automatically inferred from your schemas:

```typescript
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2),
    email: z.string().email()
  }),
  handler: async (ctx, args) => {
    // args is typed as { name: string; email: string }
    // No manual type annotation needed!
    return ok(await ctx.db.users.create(args))
  }
})
```

## Complex Schemas

### Nested Objects

```typescript
const createOrder = t.mutation({
  args: z.object({
    items: z.array(z.object({
      productId: z.number(),
      quantity: z.number().min(1)
    })).min(1),
    shippingAddress: z.object({
      street: z.string(),
      city: z.string(),
      country: z.string(),
      zip: z.string()
    }),
    couponCode: z.string().optional()
  }),
  handler: async (ctx, args) => {
    // Full type safety for nested structures
    return ok(await ctx.db.orders.create(args))
  }
})
```

### Transformations

```typescript
import { z } from "zod"

const createUser = t.mutation({
  args: z.object({
    // Trim whitespace and convert to lowercase
    email: z.string().transform(val => val.trim().toLowerCase()),
    // Parse string to number
    age: z.string().transform(val => parseInt(val, 10)),
    // Coerce and transform
    registeredAt: z.string().pipe(z.coerce.date())
  }),
  handler: async (ctx, args) => {
    // args.email is already lowercase
    // args.age is already a number
    // args.registeredAt is already a Date
  }
})
```

### Refinements

```typescript
const createTeam = t.mutation({
  args: z.object({
    name: z.string().min(2).max(50),
    members: z.array(z.string()).min(2).max(10),
    // Custom refinement
    ownerId: z.string().refine(
      (val) => ctx.db.users.exists(val),
      { message: "Owner must be an existing user" }
    )
  }),
  handler: async (ctx, args) => {
    // All validations passed
    return ok(await ctx.db.teams.create(args))
  }
})
```

## Validation in Client Code

You can use the same schema for client-side validation:

```typescript
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

// Client-side validation (before API call)
const result = createUserSchema.safeParse({ name: "J", email: "invalid" })
if (!result.success) {
  // Show error immediately - no network request needed!
  return setError("email", result.error.issues[0].message)
}

// Only send if valid
await client.users.create(result.data)
```

## Error Normalization

All validators produce a unified error format:

```typescript
// Zod: result.error.issues
// Valibot: result.issues
// ArkType: result.errors

// All normalized to:
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": "email", "message": "Invalid email format" },
      { "path": "name", "message": "Must be at least 2 characters" }
    ]
  }
}
```

## Schema Manipulation

Since the framework is validator-agnostic, use your validator's native API for schema manipulation:

### With Zod

```typescript
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email()
})

// Partial for updates
const updateSchema = userSchema.partial().omit({ id: true })

// Required for creation
const createSchema = userSchema.omit({ id: true })
```

### With Valibot

```typescript
import { v } from "valibot"

const userSchema = v.object({
  id: v.number(),
  name: v.string(),
  email: v.pipe(v.string(), v.email())
})

// Partial for updates
const updateSchema = v.partial(userSchema)

// Required for creation
const createSchema = v.omit(userSchema, ["id"])
```

## Performance Comparison

| Configuration | Bundle Size | Parse Time (10k iterations) |
|---------------|-------------|------------------------------|
| Zod | ~40KB | 45ms |
| Valibot | ~16KB | 15ms |
| ArkType | ~22KB | 12ms |
| Typia | ~10KB* | 2ms |

*Typia has 0KB runtime footprint - validation is generated at compile time.

## Recommendations

### Use Valibot When:
- Bundle size is critical (mobile, edge)
- You need excellent TypeScript inference
- You want fast validation without build complexity

### Use ArkType When:
- You want the best TypeScript inference
- You need excellent performance
- You're starting a new project

### Use Zod When:
- You have existing Zod schemas
- You need ecosystem compatibility
- You prefer mature tooling

### Use Typia When:
- Performance is critical (compile-time validation)
- You don't mind build complexity
- You want zero runtime overhead

## See Also

- [Queries](features/queries.md) - Using validation in queries
- [Mutations](features/mutations.md) - Using validation in mutations
- [@deesse-fp skill](../deesse-fp/SKILL.md) - Result type with ok/err