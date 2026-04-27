# Widget System Architecture

**Status**: Research Complete

---

## Three-Layer Data Model

The widget system requires three distinct conceptual layers:

### Layer 1: Widget Definition

The schema/template for what a widget IS — registered by builtins and plugins.

```typescript
type WidgetDefinition<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;                                    // Unique: "stats", "chart"
  name: string;                                 // Display: "Statistics"
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultSize: { w: number; h: number };        // Grid units
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  configSchema: z.ZodSchema<TConfig>;           // Runtime validation
  component: React.ComponentType<WidgetProps<TConfig>>;
};

type WidgetProps<TConfig> = {
  instance: WidgetInstance<TConfig>;
  isEditMode: boolean;
};
```

### Layer 2: Widget Instance

A placed widget with resolved configuration — stored per-user in the database.

```typescript
type Position = {
  x: number;  // Column start (0–11 for 12-col grid)
  y: number;  // Row start (auto-calculated)
  w: number;  // Width in columns
  h: number;  // Height in rows
};

type WidgetInstance<TConfig = Record<string, unknown>> = {
  instanceId: string;     // UUID v4 — unique per placement, not per definition
  definitionId: string;   // Points to WidgetDefinition.id
  position: Position;
  config: TConfig;       // User-configured settings
};
```

### Layer 3: Page Layout

The container holding all instances for a given page and user.

```typescript
type PageLayout = {
  id: string;
  pageSlug: string;             // Which admin page
  userId: string | null;       // null = global/default layout
  widgets: WidgetInstance[];
  layoutVersion: string;       // Semantic version for migrations
  createdAt: string;
  updatedAt: string;
};
```

---

## Widget Registry

The registry is a `Map<string, WidgetDefinition>` populated from both built-in widgets and plugin-provided widgets. This is the single source of truth for resolving `definitionId` -> actual widget.

```typescript
type WidgetRegistry = Map<string, WidgetDefinition>;

function buildWidgetRegistry(
  builtins: WidgetDefinition[],
  plugins: Plugin[]
): WidgetRegistry {
  const registry = new Map<string, WidgetDefinition>();
  builtins.forEach(w => registry.set(w.id, w));
  plugins.forEach(p => p.widgets?.forEach(w => registry.set(w.id, w)));
  return registry;
}
```

The registry is passed as a prop to the dashboard grid, which uses it to resolve `definitionId` to the correct component.

---

## Component Hierarchy

```
DashboardPage
├── DashboardShell
│   ├── EditModeBar (toggle button, save status)
│   └── DashboardGrid
│       ├── DndContext (dnd-kit)
│       ├── SortableContext (dnd-kit)
│       ├── react-grid-layout Grid
│       │   └── SortableWidgetItem[] (wraps each instance)
│       └── DragOverlay (dnd-kit)
└── WidgetConfigPanel (Sheet, shown when widget selected in edit mode)
```

### Edit Mode Propagation

A top-level `isEditMode: boolean` controls the entire editing state. This propagates down without per-widget conditional logic:

```typescript
const DashboardPage = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [instances, setInstances] = useState<WidgetInstance[]>(page.widgets ?? []);

  return (
    <DashboardShell>
      <DashboardGrid
        registry={registry}
        instances={instances}
        isEditMode={isEditMode}
        onInstancesChange={setInstances}
      />
      <EditModeBar isEditMode={isEditMode} onToggle={() => setIsEditMode(!isEditMode)} />
    </DashboardShell>
  );
};
```

In edit mode:
- Drag handles appear on each widget
- Remove button appears on hover
- Clicking a widget opens `WidgetConfigPanel`
- "Add Widget" button opens a widget picker modal
- Widget positions are interactive (drag to reorder)

---

## Industry Patterns (Reference)

| Platform | Layout Model | Storage Format |
|----------|-------------|----------------|
| **Notion** | Block-based, vertical flow | Tree structure in DB |
| **Linear** | Custom CSS grid, Kanban | dnd-kit (confirmed), per-view ordered arrays |
| **Payload CMS** | Field-based blocks | Ordered array + block map |
| **Webflow** | 12-column explicit grid | JSON tree with x/y/w/h |
| **Builder.io** | Tree-based, recursive | JSON tree with options |
| **WordPress Gutenberg** | Flat block list with `innerBlocks[]` | Comment-delimited HTML |

### Key Insight

Modern production systems consistently separate Widget Definition from Widget Instance. This enables both static default layouts (in config) and per-user customizations (in database).

DeesseJS follows this pattern: config provides defaults as fallbacks, the database holds user-specific overrides.

---

## Config-Driven vs. Database-Driven

**A. Config-driven (static default):** The default layout is defined in `deesse.config.ts`, loaded server-side, and client-side overrides are merged on top.

```typescript
// deesse.config.ts
page({
  name: 'Home',
  widgets: [
    { instanceId: 'home-stats-1', definitionId: 'stats', position: { x: 0, y: 0, w: 2, h: 1 }, config: {} },
  ],
})
```

**B. Database-driven (full persistence):** Layouts exist only in the database. The config provides the widget registry and default layout as a fallback.

**Recommendation:** Implement a hybrid. The config defines default layouts as fallbacks, but the database holds user-specific overrides. This mirrors how Notion and Linear handle dashboard customization.
