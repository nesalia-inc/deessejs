# Serialization

The serialization system handles converting complex JavaScript types to JSON and back while preserving type information.

## Overview

Native `JSON.stringify` destroys complex types like `Date`, `BigInt`, `Map`, and `Set`. The serialization system handles these conversions automatically, ensuring type safety between server and client.

## The Problem

```typescript
const user = {
  id: 1,
  name: "John",
  createdAt: new Date("2024-01-01"),    // Date → String
  roles: new Set(["admin", "user"]),     // Set → {}
  profile: new Map([["key", "value"]]), // Map → {}
  bigNumber: BigInt(12345678901234567890) // BigInt → String
}

// After JSON.stringify (native)
{
  "id": 1,
  "name": "John",
  "createdAt": "2024-01-01T00:00:00.000Z",  // String, not Date
  "roles": {},                                 // Lost Set type
  "profile": {},                               // Lost Map type
  "bigNumber": "12345678901234567890"          // String, not BigInt
}
```

## Supported Types

### Date

```typescript
// Server
return ok({ createdAt: new Date() })

// Client receives Date object (not string)
data.createdAt instanceof Date // ✅ true
```

### BigInt

```typescript
// Server
return ok({ bigNumber: BigInt(12345678901234567890) })

// Client receives BigInt
typeof data.bigNumber // "bigint"
```

### Map / Set

```typescript
// Server
return ok({
  roles: new Set(["admin", "user"]),
  metadata: new Map([["key", "value"]])
})

// Client receives Map/Set
data.roles instanceof Set // ✅ true
data.metadata instanceof Map // ✅ true
```

### Custom toJSON

```typescript
class User {
  constructor(public name: string) {}
  toJSON() { return { name: this.name } }
}

return ok({ user: new User("John") })

// Client receives: { user: { name: "John" } }
```

## Usage

### In Query Results

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    return ok(user)  // Automatically serialized
  }
})
```

### In Mutation Results

```typescript
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create({
      ...args,
      createdAt: new Date(),
      bigNumber: BigInt(123)
    })
    return ok(user)
  }
})
```

### In Event Data

```typescript
await ctx.send("user.created", {
  userId: 1,
  timestamp: new Date(),
  metadata: new Map([["source", "web"]])
})
```

## Configuration

### Custom Serializers

```typescript
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  serialization: {
    custom: {
      Date: (date: Date) => date.toISOString(),
      BigInt: (bigint: BigInt) => bigint.toString(),
    }
  }
})
```

### Disable Serialization

```typescript
// For performance, disable if you don't need it
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  serialization: false
})
```

## Type Safety

### Automatic Inference

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    return ok({
      id: 1,
      name: "John",
      createdAt: new Date(),
      roles: new Set(["admin"])
    })
  }
})

// On client - types are preserved!
type User = InferResult<typeof getUser>
// {
//   id: number
//   name: string
//   createdAt: Date
//   roles: Set<string>
// }
```

## Error Handling

### Non-Serializable Types

```typescript
// Throws error for functions
return ok({
  callback: () => {}  // Functions are not serializable!
})

// Solution: exclude
return ok({
  user: { ...user, callback: undefined }
})
```

## Best Practices

1. **Use sparingly** - Only serialize what you need
2. **Cache serialized data** - Don't serialize on every request
3. **Be aware of size** - Large data takes time to serialize
4. **Exclude non-serializable fields** - Functions, Symbols, etc.

## See Also

- [Queries](features/queries.md) - Returning complex types
- [Mutations](features/mutations.md) - Handling complex types
- [@deesse-fp skill](../deesse-fp/SKILL.md) - Result type with ok/err