# Admin Dashboard: Widget System

**Status**: Research Complete — Implementation Not Started
**Date**: April 2026

A drag-and-drop dashboard builder allowing users to compose pages with configurable widgets. Plugin creators can register custom widgets that extend the widget catalog.

---

## Documents

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | Three-layer data model, widget registry, component hierarchy |
| [Grid System](./GRID-SYSTEM.md) | 12-column grid, positioning, collision detection |
| [Drag-and-Drop](./DRAG-AND-DROP.md) | dnd-kit integration, sensors, sortable patterns |
| [Widget Definition](./WIDGET-DEFINITION.md) | Types, registration API, config schema |
| [Layout Schema](./LAYOUT-SCHEMA.md) | JSON serialization, versioning, responsive overrides |
| [Edit Mode](./EDIT-MODE.md) | Edit mode toggle, config panel, auto-save |
| [Plugin DX](./PLUGIN-DX.md) | How plugin creators register and ship widgets |
| [Security](./SECURITY.md) | XSS prevention, validation, authorization |
| [Open Questions](./OPEN-QUESTIONS.md) | Decisions requiring team input |

---

## Overview

### What is a Widget?

A widget is a **self-contained React component** that:
- Renders content within the dashboard grid
- Has configurable settings defined by a Zod schema
- Is registered in the **Widget Registry** by ID
- Can be placed multiple times with different configurations

### Widget vs Page

| Aspect | Page | Widget |
|--------|------|--------|
| **Definition** | Route in admin navigation | Component in a grid |
| **Content** | Static or dynamic React component | Self-contained dashboard component |
| **Navigation** | Has a URL (`/admin/users`) | Lives within a page |
| **Customization** | Content is fixed per-page definition | Position, size, and config are user-defined |

### Three-Layer Architecture

```
Widget Definition     → "stats": schema, component, default size
Widget Instance       → Placement on grid with resolved config
Page Layout           → All instances on a page, per user
```

### Recommended Library Stack

| Layer | Library | Alternative |
|-------|---------|-------------|
| Drag-and-drop | dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) | — |
| Grid layout | react-grid-layout v2 | gridstack, custom CSS |
| Config validation | Zod (already in use) | JSON Schema (Ajv) |
| Persistence | Drizzle ORM (`jsonb`) | Join tables |

---

## Related Documents

- [Admin Dashboard](../README.md)
- [UI Widget System](../../ui/WIDGET-SYSTEM.md) — Existing internal planning doc
- [Plugins](../../plugins/README.md)
- [Config](../../config/README.md)
