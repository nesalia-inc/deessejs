# Props-Only Types Rule

## Rule

**Component files (`.tsx`) may only define types/interfaces for props.** All other types must be defined elsewhere.

## Allowed in Component Files

```tsx
// ✅ Props interface — ALLOWED
interface ButtonProps {
  variant: "primary" | "secondary";
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button = ({ variant, children, onClick }: ButtonProps) => {
  // ...
}
```

## Not Allowed in Component Files

```tsx
// ❌ Internal data type — NOT ALLOWED
interface User {
  id: string;
  name: string;
  email: string;
}

export const UserCard = ({ user }: { user: User }) => {
  return <div>{user.name}</div>
}

// ❌ API response type — NOT ALLOWED
type ApiResponse<T> = {
  data: T;
  status: number;
};

// ❌ Event type — NOT ALLOWED
type ButtonClickEvent = {
  type: "click";
  timestamp: number;
};
```

## Where to Put Other Types

| Type | Location |
|------|----------|
| Domain types (`User`, `Product`) | `types/` or `lib/types/` |
| API types (`ApiResponse`) | `types/api.ts` or `lib/api.ts` |
| Event types | `lib/events.ts` |
| Utility types | `lib/types.ts` |

## Complete Example

### ❌ Bad

```tsx
// components/user-card.tsx
interface User {
  id: string;
  name: string;
  email: string;
}

interface UserCardProps {
  user: User;
}

export const UserCard = ({ user }: UserCardProps) => {
  return <div>{user.name}</div>
}
```

### ✅ Good

```tsx
// types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
}
```

```tsx
// components/user-card.tsx
import type { User } from "@/types/user";

interface UserCardProps {
  user: User;
}

export const UserCard = ({ user }: UserCardProps) => {
  return <div>{user.name}</div>
}
```

## Why This Rule

1. **Separation of concerns** — Types define domain models, components render them
2. **Reusability** — Types can be imported anywhere without importing components
3. **Testability** — Types can be tested independently
4. **Discoverability** — `types/` folder shows all domain types at a glance

## Exception: Colocated Subcomponents

When components are tightly coupled (e.g., `Card` + `CardHeader`), their types may be co-located:

```tsx
// components/card.tsx — Tightly coupled, types can stay together
export interface CardProps {
  children: React.ReactNode;
}

export interface CardHeaderProps {
  title: string;
}

export const Card = ({ children }: CardProps) => <div>{children}</div>;
export const CardHeader = ({ title }: CardHeaderProps) => <header>{title}</header>;
```

## Decision Tree

```
Is this type a...?
├── Props type for THIS component? → ALLOWED (in component file)
├── Subcomponent props (tightly coupled)? → ALLOWED (co-located)
└── Domain type / API type / utility type?
    → NOT ALLOWED (put in types/ or lib/)
```

## Enforcement

This rule is checked during code reviews. If a component file contains non-props types, they should be extracted to the appropriate `types/` or `lib/` location.
