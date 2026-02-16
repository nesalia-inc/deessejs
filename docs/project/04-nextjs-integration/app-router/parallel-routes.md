# Parallel Routes & Intercepts Integration

## Overview

Deep integration with Next.js Parallel Routes and Intercepts for advanced admin dashboard patterns.

## Features

### Automatic default.js Generation

- Auto-generate `default.js` files for Parallel Routes slots
- Fallback UI when active state cannot be recovered
- Handle hard navigation (full-page load) vs soft navigation
- Support for named slots (`@team`, `@analytics`, etc.)
- Preserve old behavior with 404 if needed

### Admin Dashboard Parallel Routes

- Pre-configured slots for admin sections
- `@analytics` - Analytics and metrics
- `@content` - Content management
- `@settings` - Settings and configuration
- `@team` - Team and user management
- Maintain independent navigation states per slot

### Intercepts for Modals

- Intercept routes for modal patterns
- Preview modals (preview content without leaving list)
- Edit modals (edit in place)
- Delete confirmations
- Form submissions without navigation
- Deep linking with modal states

### Route State Management

- Soft navigation state tracking
- Hard navigation recovery with defaults
- URL-based modal states
- Back button support
- Clean URL structure

## Examples

### Admin Slot Structure

```
app/
  @analytics/
    page.tsx
    default.tsx (auto-generated)
  @content/
    page.tsx
    default.tsx (auto-generated)
  @settings/
    page.tsx
    default.tsx (auto-generated)
  layout.tsx
```

### Intercept Pattern for Preview

```
app/
  (.)
    blog/
      [slug]/
        page.tsx
  (.)photo/
    @modal/
      (.)
        blog/
          [slug]/
            page.tsx (preview modal)
```

## Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  admin: {
    parallelRoutes: {
      slots: ['analytics', 'content', 'settings', 'team'],
      intercepts: {
        preview: true,
        edit: true,
        delete: true,
      },
    },
  },
});
```

## Benefits

- **Advanced UX Patterns**: Modal-based workflows without leaving context
- **Independent States**: Each slot maintains its own navigation state
- **Clean URLs**: Intercept routes don't change visible URL
- **Deep Linking**: Direct links to modal states
- **Performance**: Independent loading per slot
