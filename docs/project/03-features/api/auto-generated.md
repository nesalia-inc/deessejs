# Auto-Generated API

## Automatic API Generation

DeesseJS automatically generates a complete API based on your collection definitions.

## Collection-Driven API

For each collection defined in `deesse.config.ts`, DeesseJS generates:

### CRUD Endpoints

- **Create**: Add new documents
- **Read**: Fetch single or multiple documents
- **Update**: Modify existing documents
- **Delete**: Remove documents

### Advanced Operations

- Filtering and sorting
- Pagination
- Relationships and joins
- Aggregations
- Custom queries

## How It Works

```
Define Collection in deesse.config.ts
    ↓
DeesseJS Analyzes Schema
    ↓
Generate Type-Safe API Endpoints
    ↓
Auto-Generate API Documentation
    ↓
API Ready to Use
```

## Benefits

- **Zero Boilerplate**: No manual API endpoint creation
- **Type-Safe**: Full TypeScript types for requests/responses
- **Consistent**: Predictable API structure across all collections
- **Documented**: Auto-generated API documentation
- **Scalable**: Handles complex queries and relationships

## Integration

The auto-generated API works seamlessly with:

- Custom operations layer (`db.posts.find()`)
- Cache and reactivity system
- Permissions and roles
- Admin dashboard
