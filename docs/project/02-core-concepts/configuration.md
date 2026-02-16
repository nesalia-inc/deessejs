# Configuration

## deesse.config.ts

All DeesseJS configuration is centralized in a single file: `deesse.config.ts`

## Structure

```typescript
export const config = defineConfig({
  // Configuration options
})
```

## Configuration Sections

### Database Connection
- Database connection string
- Database provider selection

### Collections
- Define all data collections
- Configure collection schemas
- Set collection relationships

### Plugins
- Register plugins for admin dashboard
- Configure plugin settings
- Enable/disable features

## Single Source of Truth

The `deesse.config.ts` file serves as the single source of truth for:
- Data persistence layer
- Data model definitions
- Extensibility points

All CMS behavior is configured through this centralized configuration file.
