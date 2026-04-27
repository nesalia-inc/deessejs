# NO-USE-CLIENT-AT-ROOT Rule

## Rule

**Layouts and pages must never have `"use client"` unless explicitly necessary.** Mark `"use client"` as deep in the component tree as possible.

## Rationale

- **Tree-shaking** — Smaller client bundle
- **Performance** — Less JavaScript sent to browser
- **Correctness** — Server Components can do more (data fetching, secrets)
- **Principle of Least Privilege** — Only the parts that need client behavior are client components

## Anti-Pattern (Bad)

```tsx
// ❌ page.tsx — Root page marked as client
"use client"

import { AdminDashboard } from "./admin-dashboard"

export default function Page() {
  return <AdminDashboard />
}
```

```tsx
// ❌ layout.tsx — Root layout marked as client
"use client"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body>{children}</body></html>
}
```

## Correct Pattern (Good)

```tsx
// ✅ page.tsx — Server Component by default
import { AdminDashboard } from "./admin-dashboard"

export default function Page() {
  return <AdminDashboard />
}
```

```tsx
// ✅ admin-dashboard.tsx — Only interactive parts are client
"use client"

export const AdminDashboard = () => {
  const { toggleSidebar } = useSidebar()
  return <div>...</div>
}
```

## When `"use client"` Is Acceptable at Root

| Case | Example | Rationale |
|------|---------|-----------|
| Page needs `useState` directly | `login-page.tsx` | Page itself is interactive |
| Page needs browser API | `analytics-page.tsx` | Uses `window` |
| Page is a client-only wrapper | `carousel.tsx` | Wraps third-party client lib |

## Decision Tree

```
Is this a layout or page root?
├── YES → Can it work as Server Component?
│         ├── YES → Keep Server (no "use client")
│         └── NO (needs interactivity) → Add "use client" to this file
└── NO → Is this a component inside the tree?
          └── YES → Push "use client" to the deepest component that needs it
```

## Example: Refactoring

### Before

```tsx
// admin/page.tsx
"use client"  // ❌ Page itself has no interactivity, but marked as client

import { AdminShell } from "./admin-shell"
import { AdminContent } from "./admin-content"

export default function AdminPage({ children }) {
  return (
    <AdminShell>
      <AdminContent>{children}</AdminContent>
    </AdminShell>
  )
}
```

### After

```tsx
// admin/page.tsx
// ✅ Server Component — no "use client" needed
import { AdminShell } from "./admin-shell"
import { AdminContent } from "./admin-content"

export default function AdminPage({ children }) {
  return (
    <AdminShell>
      <AdminContent>{children}</AdminContent>
    </AdminShell>
  )
}
```

```tsx
// admin/admin-shell.tsx
"use client"  // ✅ Only where interactivity is needed

import { useSidebar } from "@deessejs/ui/sidebar"

export const AdminShell = ({ children }) => {
  const { state } = useSidebar()  // Only this needs client
  return <div className={state}>{children}</div>
}
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Client bundle | Whole page | Only interactive parts |
| Data fetching | Impossible (client) | Possible (server) |
| Secrets exposure | Risk | Safe by default |
| Hydration | Full | Minimal |

## Enforcement

This rule is checked during code reviews. Ask:
1. Does this component need `"use client"`?
2. Can the interactivity be pushed to a child component?
3. Is this a root page/layout that genuinely needs client behavior?

If the answer to question 2 is "yes", refactor to push `"use client"` down.
