# Providers Location Rule

## Rule

All React providers must be:
1. Located in `@/components/providers/` directory
2. Wrapped in a single `AppProviders` component in `index.tsx`
3. Composed in the correct order (outermost provider first)

## Rationale

- **Centralization** — All providers in one place makes the app structure predictable
- **Composition order** — Provider order matters; `AppProviders` ensures correct nesting
- **Discoverability** — Developers know where to find and add providers
- **Consistency** — Same pattern across all apps using the framework

## Directory Structure

```
components/
└── providers/
    ├── index.tsx              # AppProviders wrapper
    ├── auth-provider.tsx      # Session/auth provider
    ├── theme-provider.tsx     # Theme provider
    ├── sidebar-provider.tsx    # Sidebar state provider
    └── query-provider.tsx     # TanStack Query, etc.
```

## Required Structure

### `components/providers/index.tsx`

```tsx
"use client";

import { ThemeProvider } from "./theme-provider";
import { SidebarProvider } from "./sidebar-provider";
import { AuthProvider } from "./auth-provider";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
};
```

### Individual Provider Files

```tsx
// components/providers/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
};
```

```tsx
// components/providers/sidebar-provider.tsx
"use client";

import { SidebarProvider } from "@deessejs/ui/sidebar";

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  return <SidebarProvider>{children}</SidebarProvider>;
};
```

## Usage in Root Layout

```tsx
// app/layout.tsx
import { AppProviders } from "@/components/providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
```

## Provider Order

The order in `AppProviders` matters. General rules:

1. **Theme** — First (affects HTML attribute)
2. **Layout providers** — Sidebar, Tooltip (structural)
3. **Data providers** — Query, Auth (data fetching)
4. **Feature providers** — Feature-specific contexts

```
ThemeProvider
  ↓
SidebarProvider
  ↓
TooltipProvider
  ↓
AuthProvider
  ↓
{children}
```

## Anti-Pattern (Bad)

```tsx
// ❌ Scattered providers
components/
├── layout.tsx                  # Contains ThemeProvider
├── sidebar.tsx                 # Contains SidebarProvider
└── auth-context.tsx            # Contains AuthProvider

// ❌ Individual providers in random locations
components/
├── providers/
│   └── auth-provider.tsx       # Only one provider
└── theme-provider.tsx           # Outside providers folder
```

## What Goes in `providers/`

| Provider | Purpose |
|----------|---------|
| `theme-provider.tsx` | next-themes |
| `sidebar-provider.tsx` | @deessejs/ui sidebar state |
| `auth-provider.tsx` | Better Auth session |
| `query-provider.tsx` | TanStack Query / SWR |
| `tooltip-provider.tsx` | Radix tooltip root |
| `dialog-provider.tsx` | Radix dialog root |

## What Does NOT Go in `providers/`

- **Hooks** — Go in `hooks/` or `lib/`
- **Components** — Go in their respective folders
- **Contexts** — Feature contexts go with their feature

## Naming Convention

| File | Component | Reason |
|------|-----------|--------|
| `theme-provider.tsx` | `ThemeProvider` | File describes what's inside |
| `sidebar-provider.tsx` | `SidebarProvider` | File describes what's inside |
| `index.tsx` | `AppProviders` | Root composition |

## Enforcement

- Providers must be in `components/providers/`
- All providers must be composed in `AppProviders`
- Root layout must use `AppProviders`

This rule is checked during code reviews.
