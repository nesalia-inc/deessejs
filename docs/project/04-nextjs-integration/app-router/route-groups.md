# Route Groups

## Overview

Route groups for organizing DeesseJS routes by feature, team, or concern without affecting URL structure.

## Features

### Organizational Structure

- Organize by team, feature, or concern
- No impact on URL paths
- Multiple root layouts
- Opt-in layout sharing

### Team-Based Organization

- Separate code by team ownership
- Independent layouts per team
- Shared components within groups

### Feature-Based Organization

- Group related features together
- Isolated layouts per feature
- Easy feature extraction

## Route Group Patterns

### Team-Based Organization

```
app/
  (marketing)/
    layout.tsx
    about/
      page.tsx
    contact/
      page.tsx
    page.tsx
  (app)/
    layout.tsx
    dashboard/
      page.tsx
    settings/
      page.tsx
```

### Collection-Based Groups

```
app/
  (blog)/
    layout.tsx          # Blog-specific layout
    posts/
      [slug]/
        page.tsx
    page.tsx
  (shop)/
    layout.tsx          # Shop-specific layout
    products/
      [id]/
        page.tsx
    page.tsx
```

### Admin Groups

```
app/
  (admin)/
    layout.tsx          # Admin layout
    posts/
      page.tsx
      [id]/
        page.tsx
    users/
      page.tsx
    settings/
      page.tsx
  (public)/
    layout.tsx          # Public layout
    page.tsx
    about/
      page.tsx
```

## Multiple Root Layouts

### Separate App Sections

```typescript
// app/(marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <MarketingNav />
        <main>{children}</main>
        <MarketingFooter />
      </body>
    </html>
  )
}
```

```typescript
// app/(app)/layout.tsx
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <AppNav />
        <main>{children}</main>
        <AppFooter />
      </body>
    </html>
  )
}
```

### Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  routeGroups: {
    marketing: {
      layout: 'MarketingLayout',
      collections: ['pages', 'posts'],
    },
    app: {
      layout: 'AppLayout',
      collections: ['users', 'organizations'],
    },
    admin: {
      layout: 'AdminLayout',
      collections: ['all'], // Admin access to all
    },
  },
});
```

## Collection Route Groups

### Auto-Generated Groups

```
app/
  (collection-posts)/
    layout.tsx
    [slug]/
      page.tsx
  (collection-products)/
    layout.tsx
    [id]/
      page.tsx
```

### Configuration

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      routeGroup: '(posts)',
      layout: 'BlogLayout',
    },
    {
      name: 'products',
      routeGroup: '(products)',
      layout: 'ShopLayout',
    },
  ],
});
```

## Shared Layouts

### Opt-in Layout Sharing

```
app/
  (common)/
    layout.tsx          # Shared layout
    (with-sidebar)/
      layout.tsx        # Adds sidebar
      page1/
        page.tsx
      page2/
        page.tsx
    (without-sidebar)/
      page3/
        page.tsx
```

### Layout Nesting

```typescript
// app/(common)/layout.tsx
export default function CommonLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="common-styles">
      {children}
    </div>
  )
}
```

```typescript
// app/(common)/(with-sidebar)/layout.tsx
export default function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
```

## Conditional Routes with Groups

### Auth-Based Groups

```
app/
  (auth)/
    layout.tsx
    dashboard/
      page.tsx
  (public)/
    layout.tsx
    landing/
      page.tsx
    login/
      page.tsx
```

### Role-Based Groups

```
app/
  (admin)/
    layout.tsx
    admin-panel/
      page.tsx
  (user)/
    layout.tsx
    dashboard/
      page.tsx
  (public)/
    layout.tsx
    page.tsx
```

## File Organization

### With src Folder

```
src/
  app/
    (marketing)/
      layout.tsx
      about/
        page.tsx
    (app)/
      layout.tsx
      dashboard/
        page.tsx
```

### Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  srcDir: true, // Use src/ folder
  routeGroups: {
    marketing: {
      path: '(marketing)',
      layout: 'MarketingLayout',
    },
    app: {
      path: '(app)',
      layout: 'AppLayout',
    },
  },
});
```

## Best Practices

### Naming Conventions

- `(marketing)` - Feature-based
- `(team-name)` - Team-based
- `(collection-slug)` - Collection-based
- `(auth)` - Access-level based

### Avoid Conflicts

- Don't have same paths in different groups
- Example: `(marketing)/about` and `(shop)/about` ❌
- Result: Both resolve to `/about` causing error

### Home Route

- With multiple root layouts, define home in a group
- Example: `app/(marketing)/page.tsx`

## Configuration

### Full Config

```typescript
// deesse.config.ts
export const config = defineConfig({
  routeGroups: {
    enabled: true,
    defaultGroup: '(public)',
    groups: {
      public: {
        path: '(public)',
        layout: 'PublicLayout',
        collections: ['pages'],
      },
      app: {
        path: '(app)',
        layout: 'AppLayout',
        collections: ['users', 'organizations'],
      },
      admin: {
        path: '(admin)',
        layout: 'AdminLayout',
        collections: ['all'],
        requiresRole: 'admin',
      },
    },
  },
});
```

### Collection Group Assignment

```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [
    {
      name: 'posts',
      routeGroup: '(public)',
    },
    {
      name: 'users',
      routeGroup: '(admin)',
      permissions: {
        read: 'admin',
        write: 'admin',
      },
    },
  ],
});
```

## Benefits

- **Organization**: Clean code structure
- **Team Collaboration**: Separate team spaces
- **Isolation**: Independent layouts per group
- **Flexibility**: Multiple root layouts
- **No URL Impact**: Parentheses ignored in URL
- **Scalability**: Easy to add new sections
