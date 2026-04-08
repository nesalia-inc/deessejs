# Open Questions

**Status**: Awaiting Team Decision

These questions require input from the DeesseJS team before implementation can proceed.

---

## 1. Per-User or Global Layouts?

**Question**: Should each user have their own customizable dashboard, or is a single shared layout per page sufficient?

| Option | Pros | Cons |
|--------|------|------|
| **Per-user layouts** | Personalized experience, Notion/Linear-style | More storage, complexity |
| **Global layouts** | Simpler, less storage | No personalization |
| **Per-user with config fallback** | Best of both worlds | More complex logic |

**Current recommendation**: Per-user with config-based fallback (hybrid approach).

---

## 2. Config-Driven vs. Database-Only Defaults?

**Question**: Should default layouts live in `deesse.config.ts` (fallback) or only in the database?

| Option | Pros | Cons |
|--------|------|------|
| **Config-based fallback** | Version controlled, portable | Merging logic complexity |
| **Database-only** | Simpler persistence | Defaults not in version control |

**Current recommendation**: Config-based fallback. Defaults in `deesse.config.ts`, user overrides in database.

---

## 3. Widget Config Scope?

**Question**: Should widget config support nested objects and arrays, or limit to flat key-value pairs?

| Option | Pros | Cons |
|--------|------|------|
| **Flat key-value** | Simple, predictable | Limited expressiveness |
| **Nested (full Zod)** | Flexible, powerful | Complex form generation |

**Current recommendation**: Support full Zod (nested objects, arrays) — Zod already handles this well with `ObjectForm` recursion.

---

## 4. Live Preview in Widget Picker?

**Question**: Is rendering actual widget previews in the picker modal worth the performance cost?

**Concern**: Rendering 10-20 React components in a modal on every open could be slow.

| Option | Pros | Cons |
|--------|------|------|
| **Live previews** | Better UX, helps users choose | Performance cost on modal open |
| **Static icons only** | Fast, simple | Users don't know what widget does |

**Current recommendation**: Start with static icons, add previews as optimization if needed.

---

## 5. Resize Handles?

**Question**: Is resize-by-dragging required for v1, or is position-only (drag to reorder) sufficient?

| Option | Complexity | UX |
|--------|------------|-----|
| **Position only** | Low | Users can reorder but not resize |
| **Resize handles** | Medium (react-grid-layout handles this) | Full control |

**Current recommendation**: Full resize support via react-grid-layout v2 (built-in).

---

## 6. Mobile Admin Support?

**Question**: Should the admin dashboard itself be responsive, or is desktop-only acceptable for v1?

| Option | Effort | Users |
|--------|--------|-------|
| **Desktop only** | Low | Admin typically on desktop |
| **Responsive** | High | Admin on tablet/mobile |

**Current recommendation**: Start desktop-only. Responsive is a v2 concern.

---

## 7. Undo/Redo Support?

**Question**: Should edit mode support undo/redo for layout changes?

| Option | Complexity | UX |
|--------|------------|-----|
| **No undo/redo** | Low | Users must be careful |
| **Undo/redo stack** | Medium (Zustand/Immer) | Safer editing |

**Current recommendation**: Add undo/redo via a simple history stack in v2.

---

## 8. Nested Widgets (Containers)?

**Question**: Should widgets be able to contain other widgets (e.g., a "Column" widget containing other widgets)?

| Option | Complexity | Use Case |
|--------|------------|----------|
| **No nesting** | Low | Simple dashboards |
| **Nested via container widgets** | High (recursive rendering) | Complex layouts, tabs, accordions |

**Current recommendation**: Support nesting via container widgets in v2. v1 is flat grid only.

---

## 9. Widget Config Versioning?

**Question**: How should widget config schema migrations be triggered and executed?

| Option | Pros | Cons |
|--------|------|------|
| **On-load migration** | Automatic, transparent | Complexity in migration registry |
| **Manual migration** | User controls timing | Breaks old configs |
| **No migration (reset)** | Simple | User loses settings |

**Current recommendation**: On-load migration with migration registry per widget definition.

---

## 10. Widget Search/Filter?

**Question**: Should the widget picker support search/filter by name, category, or tags?

| Option | Complexity | UX |
|--------|------------|-----|
| **Simple list** | Low | Okay for <10 widgets |
| **Search by name** | Low | Helps with many widgets |
| **Tags/categories** | Medium | Best for large catalogs |

**Current recommendation**: Search by name is minimal complexity and should be included in v1.

---

## How to Resolve

For each question, the team should discuss and make a decision before implementation begins. The answers will determine:

1. Data model shapes
2. API endpoints
3. Component complexity
4. Testing scope

Once decided, these answers should be recorded in the implementation ticket.
