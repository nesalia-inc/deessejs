# Maximum Props Rule

## Rule

A component should never have more than **3 props**.

## Rationale

Components with too many props indicate:
- **High coupling** — the component knows too much about its context
- **Single responsibility violation** — the component is doing too much
- **Testing difficulty** — too many combinations to test
- **Inflexibility** — hard to reuse in different contexts

## Anti-Pattern (Bad)

```typescript
interface UserCardProps {
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: "active" | "inactive";
  onEdit: () => void;
  onDelete: () => void;
  onViewProfile: () => void;
  lastLogin: Date;
  createdAt: Date;
}

export function UserCard({
  name,
  email,
  avatar,
  role,
  status,
  onEdit,
  onDelete,
  onViewProfile,
  lastLogin,
  createdAt,
}: UserCardProps) {
  // Component has 11 props - way too many
}
```

## Correct Pattern (Good)

### Option 1: Split into Smaller Components

```typescript
// UserCard now has only essential props
interface UserCardProps {
  user: User;
  onViewProfile: () => void;
}

// Extract sub-components
interface UserStatusBadgeProps {
  status: "active" | "inactive";
}

interface UserActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}
```

### Option 2: Use a Context

```typescript
// Instead of passing 5 event handlers, use a context
interface UserCardContextValue {
  onEdit: () => void;
  onDelete: () => void;
  onViewProfile: () => void;
}

interface UserCardProps {
  user: User;
}
```

### Option 3: Use a Configuration Object

```typescript
// When props are semantically grouped
interface UserCardProps {
  user: User;
  config: {
    showEmail: boolean;
    showAvatar: boolean;
    showRole: boolean;
  };
  actions: {
    onEdit: () => void;
    onDelete: () => void;
  };
}
```

## Graceful Degradation

For components that genuinely need more than 3 props (e.g., highly specialized form components), use a configuration object pattern:

```typescript
// Good: config object allows extension without adding props
interface DataTableProps {
  data: Row[];
  config: {
    sortable?: boolean;
    filterable?: boolean;
    pageSize?: number;
  };
  onRowClick?: (row: Row) => void;
}
```

## When More Than 3 Props Is Acceptable

1. **Primitive-heavy wrappers** — A component that just wraps HTML elements with style props (className, style, id, etc. are infrastructure)
2. **Configuration objects** — When props are semantically grouped
3. **Framework components** — Next.js page components receiving `params`, `searchParams`

## Enforcement

This rule is checked during code reviews. If you need more than 3 props:
1. Consider if the component should be split
2. Consider if a context would be more appropriate
3. Consider using a configuration object
4. Document why the exception is necessary
