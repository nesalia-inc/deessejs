# Metadata

The metadata system extracts information about API routes for documentation, OpenAPI generation, and tooling.

## Overview

Metadata includes input/output schemas, descriptions, and examples for all routes. This enables automatic documentation generation and SDK generation.

## Extract Metadata

### Basic Usage

```typescript
import { createAPI, extractMetadata } from "@deessejs/server"

const api = createAPI({
  router: t.router({
    users: t.router({
      get: getUser,
      create: createUser,
      delete: deleteUser
    })
  })
})

// Extract metadata
const metadata = extractMetadata(api)

console.log(metadata)
```

### Output Format

```json
{
  "routes": {
    "users.get": {
      "path": "users.get",
      "type": "query",
      "args": { "id": "number" },
      "output": { "id": "number", "name": "string" },
      "description": "Get a user by ID"
    },
    "users.create": {
      "path": "users.create",
      "type": "mutation",
      "args": { "name": "string", "email": "string" },
      "output": { "id": "number", "name": "string" }
    }
  }
}
```

## Route Descriptions

Add descriptions to procedures:

```typescript
const getUser = t.query({
  description: "Get a user by their unique ID",
  args: z.object({
    id: z.number().describe("The user's unique identifier")
  }),
  handler: async (ctx, args) => { ... }
})

const createUser = t.mutation({
  description: "Create a new user",
  summary: "Create User",
  deprecated: false,
  tags: ["users", "crud"],
  args: z.object({
    name: z.string().describe("The user's full name"),
    email: z.string().email().describe("The user's email address")
  }),
  handler: async (ctx, args) => { ... }
})
```

## OpenAPI Generation

```typescript
import { generateOpenAPI } from "@deessejs/server"

const openapi = generateOpenAPI(api, {
  info: {
    title: "My API",
    version: "1.0.0",
    description: "User management API"
  },
  servers: [
    { url: "https://api.example.com", description: "Production" },
    { url: "https://staging.example.com", description: "Staging" }
  ]
})
```

## List Routes

```typescript
import { listRoutes } from "@deessejs/server"

const routes = listRoutes(api)

console.log(routes)
// [
//   { path: "users.get", type: "query", internal: false },
//   { path: "users.create", type: "mutation", internal: false },
//   { path: "users.delete", type: "internalMutation", internal: true },
//   { path: "users.adminStats", type: "internalQuery", internal: true }
// ]
```

### Filter Routes

```typescript
// Only public routes
const publicRoutes = listRoutes(api, { internal: false })

// Only queries
const queries = listRoutes(api, { type: "query" })

// Only mutations
const mutations = listRoutes(api, { type: "mutation" })

// By tag
const userRoutes = listRoutes(api, { tags: ["users"] })
```

## Schema Information

### Extract Input/Output Schema

```typescript
import { getInputSchema, getOutputSchema } from "@deessejs/server"

const inputSchema = getInputSchema(api.users.get)
const outputSchema = getOutputSchema(api.users.get)
```

### Convert to JSON Schema

```typescript
import { toJsonSchema } from "@deessejs/server"

const jsonSchema = toJsonSchema(z.object({
  name: z.string(),
  email: z.string().email()
}))

// Output:
// {
//   type: "object",
//   properties: {
//     name: { type: "string" },
//     email: { type: "string", format: "email" }
//   },
//   required: ["name", "email"]
// }
```

## Documentation Generation

### HTML Documentation

```typescript
import { generateDocs } from "@deessejs/server"

const html = generateDocs(api, {
  title: "API Documentation",
  theme: "dark",
  sidebar: true
})

await writeFile("./docs/index.html", html)
```

### Markdown Generation

```typescript
import { generateMarkdown } from "@deessejs/server"

const markdown = generateMarkdown(api)
```

## Client SDK Generation

### TypeScript Client

```typescript
import { generateClient } from "@deessejs/server"

const clientCode = generateClient(api, {
  language: "typescript",
  clientName: "MyApiClient"
})

console.log(clientCode)
// export class MyApiClient {
//   async users_get(args: { id: number }) {
//     return fetch('/api/users.get', { body: JSON.stringify(args) })
//   }
//   async users_create(args: { name: string; email: string }) {
//     return fetch('/api/users.create', { body: JSON.stringify(args) })
//   }
// }
```

### JavaScript Client

```typescript
import { generateClient } from "@deessejs/server"

const clientCode = generateClient(api, {
  language: "javascript",
  clientName: "MyApiClient"
})
```

## Use Cases

### API Explorer UI

```typescript
app.get("/explorer", (c) => {
  const routes = listRoutes(api)
  return c.html(renderExplorer(routes))
})
```

### Postman Collection

```typescript
import { generatePostmanCollection } from "@deessejs/server"

const collection = generatePostmanCollection(api, {
  name: "My API",
  baseUrl: "https://api.example.com"
})
```

### TypeScript Types

```typescript
import { generateTypes } from "@deessejs/server"

const types = generateTypes(api)

console.log(types)
// export type UsersGetArgs = { id: number }
// export type UsersGetOutput = { id: number; name: string }
// export type UsersCreateArgs = { name: string; email: string }
// export type UsersCreateOutput = { id: number; name: string }
```

## Best Practices

### Document Routes

```typescript
// Always add descriptions
const getUser = t.query({
  description: "Retrieves a user by their unique identifier",
  summary: "Get User",
  tags: ["users"],
  args: z.object({
    id: z.number().describe("The user's unique ID")
  }),
  handler: async (ctx, args) => { ... }
})
```

### Version Your API

```typescript
const api = createAPI({
  router: t.router({ ... }),
  metadata: {
    version: "1.0.0"
  }
})
```

### Deprecate Gracefully

```typescript
const oldEndpoint = t.query({
  deprecated: true,
  deprecatedMessage: "Use users.getV2 instead",
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => { ... }
})
```

## See Also

- [Queries](features/queries.md) - Query procedure definition
- [Mutations](features/mutations.md) - Mutation procedure definition
- [Validation](features/validation.md) - Multi-engine validation