# Admin Package Separation Reports

## Overview

This directory contains analysis and planning documents for decoupling admin functionality from `deesse` and `@deessejs/next` into new packages `@deessejs/admin` and `@deessejs/admin-next`.

## Documents

| Document | Description |
|----------|-------------|
| [01-analysis.md](./01-analysis.md) | Initial analysis and architecture proposal |
| [02-file-inventory.md](./02-file-inventory.md) | Detailed file-by-file analysis of current state |
| [03-architecture.md](./03-architecture.md) | Proposed package architecture and type definitions |
| [04-implementation-plan.md](./04-implementation-plan.md) | Step-by-step implementation instructions |
| [05-migration-guide.md](./05-migration-guide.md) | How to migrate from current to new structure |

## Quick Summary

### What "Framework-Agnostic" Means Here

"Framework-agnostic" means **React-based frameworks**, not vanilla JS. The admin logic works with Next.js, Tanstack, Remix, etc. as long as they use React.

- `@deessejs/admin` keeps React dependencies (`LucideIcon`, `ReactNode`, React context) - standard across React frameworks
- `@deessejs/admin-next` is Next.js-specific (API routes, `next/navigation`, `next/headers`)

### Current Problem

- Admin logic is mixed with core `deesse` package
- `deesse` has admin-specific types (`Page`, `Section`) that should be separate
- `@deessejs/next` contains both Next.js-specific code and shareable admin logic

### Solution

| Package | Purpose | Dependencies |
|---------|---------|--------------|
| `deesse` | Core auth (server, client, plugin, cache) | better-auth, drizzle-orm |
| `@deessejs/admin` | React-agnostic admin (pages, sidebar, nav, validation) | better-auth, React, lucide-react |
| `@deessejs/admin-next` | Next.js bindings (React components, API routes) | next, react, @deessejs/ui, @deessejs/admin |

### Key Design Decisions

1. **Keep React types** - `LucideIcon` and `ReactNode` stay in `@deessejs/admin` since they're standard across React frameworks
2. **No backward compatibility** - We're in development (not production), breaking changes are acceptable
3. **Extract business logic** - `createFirstAdmin()` returns `Result` type, not `NextResponse` (adapter handles conversion)
4. **Split default pages** - Structure in `admin`, React content in `admin-next`

## New Dependency Chain

```
deesse (core: server, client, plugin, cache)
    ↑
    │ (peer)
    │
@deessejs/admin (React-agnostic)
    │
    └──► @deessejs/admin-next (Next.js bindings)
                │
                └──► @deessejs/ui
```

## Next Steps

See [04-implementation-plan.md](./04-implementation-plan.md) for detailed implementation steps.