# Hot Reload & Migrations

## Collection Hot Reload

When a collection is modified in `deesse.config.ts`, changes are applied automatically.

## Automatic Drizzle Migrations

Collection modifications trigger:
1. Automatic Drizzle schema generation
2. Automatic migration creation
3. Automatic migration application

## Developer Experience

- Modify collection definition in `deesse.config.ts`
- Changes detected automatically
- Drizzle migrations generated and applied
- New types generated
- Custom operations regenerated
- Development server hot reloads

## Flow

```
Edit Collection in deesse.config.ts
    ↓
DeesseJS Detects Change
    ↓
Generate Drizzle Schema Changes
    ↓
Create Migration
    ↓
Apply Migration
    ↓
Regenerate Types
    ↓
Regenerate Custom Operations
    ↓
Hot Reload
```

## Benefits

- **Zero Manual Migration Steps**: No manual migration commands needed
- **Instant Feedback**: See changes immediately in development
- **Type Safety**: Types always stay in sync with schema
- **No Context Switching**: Stay in the config file, everything else happens automatically
