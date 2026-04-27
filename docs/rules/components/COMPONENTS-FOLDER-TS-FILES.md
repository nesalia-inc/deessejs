# Components Folder TS Files Rule

## Rule

The `components/` folder must contain only:
- React component files (`.tsx`)
- `index.ts` barrel export files

**No `.ts` files** (pure logic files) are allowed directly in `components/`.

## Rationale

- **Clarity** — `components/` is exclusively for React components
- **Performance** — TypeScript doesn't need to process `.ts` files in component folder
- **Convention** — Developers know to look for components in `components/`
- **Separation of concerns** — Logic stays in `lib/`, UI stays in `components/`

## Anti-Pattern (Bad)

```
components/
├── lib/                    # ← logic folder - OK
│   └── admin-header.ts
├── layouts/
│   └── admin-shell.tsx
├── ui/
│   └── sidebar-nav.tsx
├── admin-header.ts        # ← .ts file in components root - WRONG
├── sidebar-utils.ts       # ← .ts file in components root - WRONG
└── index.ts              # ← barrel export - OK
```

## Correct Pattern (Good)

```
components/
├── lib/                    # ← logic stays here
│   ├── admin-header.ts
│   └── sidebar-utils.ts
├── layouts/
│   └── admin-shell.tsx
├── ui/
│   └── sidebar-nav.tsx
└── index.ts               # ← barrel export only
```

## Where to Put Logic Files

| Type | Location |
|------|----------|
| Pure utility functions | `components/lib/` |
| Custom hooks | `components/lib/` or `hooks/` |
| Helper functions | `components/lib/` |

## Index Files

`index.ts` barrel exports are allowed:

```ts
// components/index.ts
export { AdminHeader } from "./layouts/admin-header";
export { SidebarNav } from "./ui/sidebar-nav";
export * from "./lib/admin-header";
```

## ESLint Alternative

If using ESLint, this rule can be enforced automatically:

```json
{
  "rules": {
    "filenames/match-regex": [true, "^([a-z0-9]+(-[a-z0-9]+)*\\.)?(jsx|tsx)$", { "ignoreFiles": ["**/index.ts"] }]
  }
}
```

Or with `eslint-plugin-import`:

```json
{
  "rules": {
    "import/no-unresolved": [true, { "ignore": ["^\\.\\./lib/"] }]
  }
}
```

## Enforcement

This rule is checked during code reviews.
