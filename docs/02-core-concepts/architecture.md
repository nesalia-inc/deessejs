# Technical Architecture

## Collections - Drizzle ORM Overlay

### Foundation
DeesseJS collections are built as an overlay on top of Drizzle ORM.

### Why Drizzle?
- Simple internal migration management
- Type generation capabilities
- Modern TypeScript-first approach

### Custom Operations Layer

While Drizzle provides the foundation, DeesseJS adds its own operation layer:

```typescript
// Drizzle operations (under the hood)
db.query.posts.findMany()

// DeesseJS custom operations
db.posts.find()
db.posts.create()
db.posts.update()
db.posts.delete()
```

The custom operations abstract and enhance Drizzle functionality.

### Type Generation
- Automatic type generation based on collection definitions
- Full TypeScript type safety
- Types derived from Drizzle schema

## Authentication

### Better Auth Integration
DeesseJS uses **Better Auth** as its authentication solution.

- Integrated auth system
- Works seamlessly with the admin dashboard
- Configured via `deesse.config.ts`

## Stack Summary

- **ORM Foundation**: Drizzle ORM
- **Auth**: Better Auth
- **Framework**: Next.js
- **Collections**: Custom layer over Drizzle with auto-generated methods
