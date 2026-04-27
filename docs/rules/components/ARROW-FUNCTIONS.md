# Arrow Functions Rule

## Rule

**Components and event handlers must use arrow functions (`const` + arrow), not the `function` keyword.**

## Rationale

- **Consistency** — Arrow functions provide a uniform style across the codebase
- **No hoisting confusion** — Arrow functions are not hoisted, making the code flow clearer
- **Modern React convention** — The React ecosystem has moved to arrow function components
- **Implicit return** — Arrow functions allow concise single-expression returns

## Anti-Pattern (Bad)

```tsx
// Component using function keyword
export function LoginPage() {
  const router = useRouter();
  // ...
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // ...
  }
  return <form onSubmit={handleSubmit}>...</form>;
}

// Non-exported inner component
function AdminDashboardContent({ children }) {
  return <div>{children}</div>;
}
```

## Correct Pattern (Good)

```tsx
// Component using arrow function
export const LoginPage = () => {
  const router = useRouter();
  // ...
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // ...
  };
  return <form onSubmit={handleSubmit}>...</form>;
};

// Non-exported inner component
const AdminDashboardContent = ({ children }) => {
  return <div>{children}</div>;
};
```

## Conversion Guide

| Before | After |
|--------|-------|
| `export function Component() {` | `export const Component = () => {` |
| `function Component() {` | `const Component = () => {` |
| `async function handleSubmit() {` | `const handleSubmit = async () => {` |
| `function getBreadcrumb(...) {` | Already in `.ts` file, keep as `function` for clarity |

## Exceptions

### Logic Files (`.ts`)

Functions in pure logic files (`.ts`) do not need to be arrow functions. The `function` keyword is acceptable and often more readable for standalone utility functions:

```ts
// components/lib/admin-header.ts
// function keyword is fine here
export function getBreadcrumbFromPathname(pathname: string, items: SidebarItem[]) {
  // ...
}
```

### Closing Brace

Remember to change the closing brace from `}` to `};` when converting:

```tsx
// Before
export function Component() {
  return <div />;
}

// After
export const Component = () => {
  return <div />;
};
```

## Enforcement

This rule is checked during code reviews. Run `tsc` to verify TypeScript compiles without errors.
