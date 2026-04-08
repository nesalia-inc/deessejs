# Grid System

**Status**: Research Complete

---

## Specifications

The grid uses a **12-column responsive grid** with **auto-placing rows**:

| Property | Value |
|----------|-------|
| Columns | 12 |
| Row height | 80px |
| Gap | 16px |
| Min widget width | 1 column |
| Max widget width | 12 columns |
| Min widget height | 1 row |
| Max widget height | 4 rows |

---

## Widget Sizes

Widgets can occupy various grid cells:

```
┌──────────────────────────────────────────────────────────────┐
│                        12 Columns                             │
├─────────────┬─────────────┬─────────────┬────────────────────┤
│             │             │             │                    │
│   1x1       │   1x1       │   1x1       │   1x1              │
│  (1 col,    │  (1 col,    │  (1 col,    │  (1 col,           │
│   1 row)    │   1 row)    │   1 row)    │   1 row)           │
│             │             │             │                    │
├─────────────┴─────────────┴─────────────┼────────────────────┤
│                                        │                    │
│   3x1                                  │   1x1               │
│  (3 cols,                             │  (1 col,            │
│   1 row)                              │   1 row)           │
│                                        │                    │
├────────────────────────────────────────┴────────────────────┤
│                                                             │
│   4x1                                                        │
│  (4 cols, 1 row)                                            │
│                                                             │
├─────────────────────────┬───────────────────────────────────┤
│                         │                                   │
│   2x2                   │   2x1                              │
│  (2 cols,               │  (2 cols,                         │
│   2 rows)               │   1 row)                           │
│                         │                                   │
│                         ├───────────────────────────────────┤
│                         │   2x1                             │
│                         │  (2 cols, 1 row)                  │
└─────────────────────────┴───────────────────────────────────┘
```

---

## Position Type

```typescript
type Position = {
  x: number;  // Column start (0–11)
  y: number;  // Row start (auto-calculated)
};

type Size = {
  w: number;  // Width in columns (1–12)
  h: number;   // Height in rows (1–4)
};

type Position = {
  x: number;
  y: number;
} & Size;

// Example: Widget spanning columns 2–4 (2 wide), starting at row 1
{ x: 2, y: 1, w: 2, h: 1 }
```

---

## Grid Library Comparison

| Library | Grid Type | Resize | Bundle | Collision | Maturity |
|---------|-----------|--------|--------|-----------|----------|
| **react-grid-layout v2** | 12-col CSS grid | Yes | ~25kb | Built-in | High (TypeScript) |
| **gridstack** | 12-col CSS grid | Yes | ~100kb | Built-in | Very High |
| **Custom CSS Grid + dnd-kit** | Custom | Manual | Zero | Manual | N/A |

### Decision: react-grid-layout v2

**react-grid-layout v2** is recommended because:
- Fully TypeScript
- Responsive breakpoints built-in
- Layout serialization maps directly to data model
- Built-in collision detection and compaction
- Resize handles included
- `useGridLayout` hook for fine-grained control

### Custom CSS Grid Alternative

For simpler grids where bundle size is critical, a custom CSS Grid + dnd-kit approach is viable:

```typescript
<div
  className="grid gap-4"
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gridAutoRows: '80px',
  }}
>
  {instances.map(instance => (
    <div
      key={instance.instanceId}
      style={{
        gridColumn: `span ${instance.position.w}`,
        gridRow: `span ${instance.position.h}`,
      }}
    >
      <WidgetContainer ... />
    </div>
  ))}
</div>
```

Trade-off: Implementing collision detection and auto-placement logic is manual.

---

## Auto-Placement Algorithm

When adding a new widget, the system must find the next available grid position.

```typescript
function findNextPosition(
  instances: WidgetInstance[],
  defaultSize: Size
): Position {
  const maxY = instances.reduce(
    (max, i) => Math.max(max, i.position.y + i.position.h),
    0
  );
  return { x: 0, y: maxY, w: defaultSize.w, h: defaultSize.h };
}
```

For more sophisticated packing (react-grid-layout's built-in compactor), use the `useGridLayout` hook or the `react-grid-layout/extras` module.

---

## Collision Detection

react-grid-layout handles collision detection automatically via `compactType`:

```typescript
import { type CompactType, type Layout } from 'react-grid-layout';

const layout: Layout = instances.map(i => ({
  i: i.instanceId,
  x: i.position.x,
  y: i.position.y,
  w: i.position.w,
  h: i.position.h,
}));

const GridLayout = () => (
  <ResponsiveGridLayout
    className="layout"
    layouts={{ lg: layout }}
    compactType={CompactType.CompactUpAndLeft}  // or CompactType.Vertical
    rowHeight={80}
    cols={12}
  />
);
```

Available compaction types:
- `CompactType.Vertical` — Fill rows top-to-bottom
- `CompactType.CompactUpAndLeft` — Push widgets up and left to fill gaps
- `null` — No compaction (free-form)

---

## Responsive Breakpoints

Layouts can vary per breakpoint:

```typescript
type ResponsiveOverrides = {
  tablet?: Position;
  mobile?: Position;
};

type WidgetInstance = {
  instanceId: string;
  definitionId: string;
  position: Position;           // Desktop
  responsiveOverrides?: ResponsiveOverrides;
  config: Record<string, unknown>;
};
```

react-grid-layout handles breakpoint switching automatically via the `layouts` prop:

```typescript
<ResponsiveGridLayout
  layouts={{
    lg: desktopLayout,
    md: tabletLayout,
    sm: mobileLayout,
  }}
  breakpoints={{ lg: 1200, md: 996, sm: 768 }}
  cols={{ lg: 12, md: 10, sm: 6 }}
/>
```

Breakpoint mapping:

| Breakpoint | Columns | Typical Device |
|------------|---------|----------------|
| `lg` | 12 | Desktop |
| `md` | 10 | Tablet landscape |
| `sm` | 6 | Tablet portrait |
| `xs` | 4 | Mobile landscape |
| `xxs` | 2 | Mobile portrait |
