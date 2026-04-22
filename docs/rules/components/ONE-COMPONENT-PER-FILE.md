# One Component Per File Rule

## Rule

**Each file must contain exactly one primary component.**

Subcomponents that are tightly coupled to their parent (e.g., `CardHeader`, `CardFooter` for a `Card`) may be co-located in the same file.

## Rationale

- **Clarity** — One component per file makes it easy to find and import
- **Tree-shaking** — Better dead code elimination
- **Git blame** — Easier to track who changed what
- **Testing** — Simpler to test individual components

## Anti-Pattern (Bad)

```tsx
// user-card.tsx

export const UserCard = ({ user }) => {
  return <div>...</div>;
};

export const UserCardHeader = ({ user }) => {
  return <header>...</header>;
};

export const UserCardContent = ({ user }) => {
  return <main>...</main>;
};

export const UserCardFooter = ({ user }) => {
  return <footer>...</footer>;
};

// OR

export function UserCard({ user }) {
  return <div>...</div>;
}

export function UserCardHeader({ user }) {
  return <header>...</header>;
}
```

## Correct Pattern (Good)

### Co-located Subcomponents (Tightly Coupled)

When subcomponents are always used together and belong to the same domain:

```tsx
// card.tsx

export const Card = ({ children }) => {
  return <div className="card">{children}</div>;
};

export const CardHeader = ({ children }) => {
  return <header className="card-header">{children}</header>;
};

export const CardContent = ({ children }) => {
  return <main className="card-content">{children}</main>;
};

export const CardFooter = ({ children }) => {
  return <footer className="card-footer">{children}</footer>;
};
```

### Separate Files (Loosely Coupled)

When subcomponents may be used independently:

```tsx
// card.tsx
export { Card } from "./card/card";
export { CardHeader } from "./card/card-header";
export { CardContent } from "./card/card-content";
export { CardFooter } from "./card/card-footer";
```

## When Subcomponents Can Be Co-located

Subcomponents may be in the same file only when:

1. **They share state** — Parent and child access the same hooks/context
2. **They are always composed together** — `Card` + `CardHeader` + `CardContent`
3. **They are part of the same design system** — Atomic UI components
4. **Child components have no meaning outside the parent**

### Acceptable Co-location

```tsx
// badge.tsx — design system component
export const Badge = ({ children }) => <span className="badge">{children}</span>;
export const BadgeCount = ({ count }) => <span className="badge-count">{count}</span>;

// accordion.tsx — coupled UI component
export const Accordion = ({ children }) => <div>{children}</div>;
export const AccordionItem = ({ children }) => <div>{children}</div>;
export const AccordionTrigger = ({ children }) => <button>{children}</button>;
```

### Must Be Separate Files

```tsx
// login-page.tsx — page-level component
export const LoginPage = () => { ... };

// login-form.tsx — different concern, separate file
export const LoginForm = ({ onSubmit }) => { ... };

// login-utils.ts — pure logic, different file type
export const validateEmail = (email: string) => { ... };
```

## Decision Tree

```
Is it a page-level component?
├── YES → One per file, use descriptive name (e.g., login-page.tsx)
└── NO → Is it tightly coupled with sibling components?
          ├── YES (e.g., Card + CardHeader) → Co-locate in same file
          └── NO → Separate file
```

## File Naming

| Type | Naming | Example |
|------|--------|---------|
| Page component | `kebab-case` | `login-page.tsx`, `settings-page.tsx` |
| UI component | `kebab-case` | `card.tsx`, `badge.tsx` |
| Layout component | `kebab-case` | `admin-shell.tsx`, `header.tsx` |
| Subcomponents (co-located) | PascalCase exports | `Card`, `CardHeader` |
| Separate subcomponents | `kebab-case` file | `card-header.tsx` |

## Index Files

Use barrel exports for re-exporting:

```tsx
// card/index.ts
export { Card } from "./card";
export { CardHeader } from "./card-header";
export { CardContent } from "./card-content";
export { CardFooter } from "./card-footer";
```

## Enforcement

This rule is checked during code reviews. If a file has multiple primary exports, ask:
1. Are they tightly coupled?
2. Do they share state?
3. Would a child make sense used alone?

If all answers are "no", split into separate files.
