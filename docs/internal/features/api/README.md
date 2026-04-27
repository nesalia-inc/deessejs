# API

Deesse exposes a unified API layer that combines built-in REST endpoints (auth, first-admin) with custom DRPC procedures.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            app/(deesse)/api/[[...route]]/route.ts            │
│                     (single auto-generated handler)          │
├─────────────────────────────────────────────────────────────┤
│  toNextJsHandler(config)                                    │
│       │                                                     │
│       ├── config.auth     → /api/auth/*                      │
│       ├── config.routes   → /api/users/list, /api/users/...  │
│       └── first-admin    → /api/first-admin                 │
└─────────────────────────────────────────────────────────────┘
```

The `config.routes` field holds your DRPC procedures. When provided, they are merged into the same route handler.

## Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@deessejs/server` | 1.2.0 | Core RPC protocol |
| `@deessejs/server-next` | 1.3.1 | Next.js adapter (`createNextHandler`) |
| `@deessejs/fp` | * | Result type (`ok`, `err`) |
| `zod` | ^4.0.0 | Validation (peer dependency) |

---

## Route Handler

```typescript
// app/(deesse)/api/[[...route]]/route.ts
import { toNextJsHandler } from "@deessejs/next/routes";
import config from "@deesse-config";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = toNextJsHandler(config);
```

The handler is **auto-generated** by `@deessejs/next`. Do not modify it — it is rewritten on changes to config.

---

## Built-in Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/first-admin` | Create first admin user |
| `GET/POST` | `/api/auth/*` | better-auth endpoints (login, logout, session) |

---

## Custom Endpoints (DRPC)

Your DRPC procedures are registered via `config.routes` and exposed at:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users/list` | `t.query()` procedure |
| `POST` | `/api/users/create` | `t.mutation()` procedure |
| `POST` | `/api/users/delete` | `t.internalMutation()` (server-only) |

---

## Adding DRPC Procedures

1. **Define** procedures in `src/server/index.ts`
2. **Export** `api` (server-only) and `publicAPI` (client-safe)
3. **Register** via `config.routes` in `deesse.config.ts`

See [drpc.md](./drpc.md) for the full workflow.

---

## Security Model

```
┌────────────────────┬────────────┬─────────────┐
│ Operation          │ HTTP/API   │ Server Only │
├────────────────────┼────────────┼─────────────┤
│ t.query()          │ Yes        │ Yes         │
│ t.mutation()       │ Yes        │ Yes         │
│ t.internalQuery()   │ No         │ Yes         │
│ t.internalMutation  │ No         │ Yes         │
└────────────────────┴────────────┴─────────────┘
```

---

## Detailed Documentation

- [drpc.md](./drpc.md) — How to integrate DRPC procedures
- [.claude/skills/deesse-rpc/SKILL.md](../../.claude/skills/deesse-rpc/SKILL.md) — Full RPC protocol documentation