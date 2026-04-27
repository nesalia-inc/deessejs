# Folder Domain Organization Rule

## Rule

Every folder must be organized into **subfolders by domain**. Never dump all files at the root level of a directory.

## Rationale

- **Scalability** — A flat folder with 50 files is unmanageable
- **Domain boundaries** — Grouping by domain makes the codebase easier to navigate
- **Findability** — Knowing where to look for code reduces cognitive load
- **Colocation** — Related files stay together

## Anti-Pattern (Bad)

```
components/
├── admin-header.tsx
├── sidebar-nav.tsx
├── sidebar-nav-utils.ts   # ← mixed with components
├── app-sidebar.tsx
├── nav-user.tsx
├── admin-shell.tsx
├── password-input.tsx
├── login-page.tsx
├── first-admin-setup.tsx
└── ... (20 more files)
```

Problems:
- No clear organization
- Utility files mixed with components
- Hard to find related files
- Doesn't scale as the codebase grows

## Correct Pattern (Good)

```
components/
├── layouts/
│   ├── admin-header.tsx
│   └── admin-shell.tsx
├── pages/
│   ├── login-page.tsx
│   ├── first-admin-setup.tsx
│   └── password-input.tsx
├── ui/
│   ├── app-sidebar.tsx
│   ├── sidebar-nav.tsx
│   └── nav-user.tsx
└── lib/
    ├── admin-header.ts      # ← extracted logic
    └── sidebar-utils.ts     # ← extracted logic
```

## Grouping by Domain

### Domain Categories

| Domain | Description | Examples |
|--------|-------------|----------|
| `layouts/` | Page layout components | `admin-shell.tsx`, `dashboard-layout.tsx` |
| `pages/` | Full page components | `login-page.tsx`, `settings-page.tsx` |
| `ui/` | Reusable UI components | `button.tsx`, `card.tsx`, `sidebar.tsx` |
| `lib/` | Pure logic/utilities | `admin-header.ts`, `sidebar-utils.ts` |
| `hooks/` | Custom React hooks | `use-auth.ts`, `use-sidebar.ts` |
| `context/` | React contexts | `auth-context.tsx`, `theme-context.tsx` |
| `api/` | API-related code | `api-client.ts`, `endpoints.ts` |
| `types/` | TypeScript types | `user.types.ts`, `api.types.ts` |

### Decision Tree for Grouping

```
Is it a React component?
├── YES → Is it a full page?
│         ├── YES → pages/
│         └── NO → Is it a layout wrapper?
│                 ├── YES → layouts/
│                 └── NO → ui/
└── NO → Is it pure logic (no React)?
          ├── YES → lib/
          └── NO → Is it a hook?
                  ├── YES → hooks/
                  └── NO → Is it a context?
                          ├── YES → context/
                          └── NO → api/ or types/
```

## Multi-Domain Packages

For larger packages, consider a `domains/` directory:

```
packages/next/src/
├── domains/
│   ├── admin/
│   │   ├── components/
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   └── lib/
│   │   └── hooks/
│   └── shared/
│       ├── ui/
│       ├── hooks/
│       └── lib/
└── shared/  (if needed)
```

## File Naming

- **Components**: PascalCase — `AdminHeader.tsx`, `LoginPage.tsx`
- **Utils/Hooks**: camelCase — `getBreadcrumbFromPathname.ts`, `useAuth.ts`
- **Types**: kebab-case or PascalCase — `user.types.ts` or `UserTypes.ts`

## Enforcement

This rule is checked during code reviews. If a folder exceeds ~15-20 files, it should be split by domain.

## Examples

### Before
```
src/
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   ├── UserMenu.tsx
│   ├── AuthProvider.tsx
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Card.tsx
```

### After
```
src/
├── components/
│   ├── layouts/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   └── context/
│       └── AuthProvider.tsx
```
