# DeesseJS Admin Dashboard: Widget & Drag-and-Drop System

**Status**: Research Report — Not for Implementation
**Date**: April 2026
**Scope**: Internal architecture + Developer Experience for plugin-based widget system

---

## 1. Executive Summary

This report covers two interconnected concerns for the DeesseJS admin dashboard:

1. **Internal Architecture**: How widgets are stored, rendered, dragged, and persisted
2. **Developer Experience (DX)**: How plugin creators register, configure, and ship custom widgets

The widget system is a **drag-and-drop dashboard builder** where users place pre-defined widgets onto a grid-based layout. Plugins extend the widget catalog. The system should support both simple fixed-composition pages and fully customizable user-specific dashboards.

---

## 2. Industry Analysis

### 2.1 How Major Platforms Handle This

| Platform | Layout Model | Drag-and-Drop | Storage Format |
|----------|-------------|---------------|----------------|
| **Notion** | Block-based, vertical flow | Reorder `blockOrder[]` array | Tree structure in DB |
| **Linear** | Custom CSS grid, Kanban | dnd-kit (confirmed) | Per-view ordered arrays |
| **Payload CMS** | Field-based blocks | dnd-kit for block reordering | Ordered array + block map |
| **Webflow** | 12-column explicit grid | Custom + postMessage iframe | JSON tree with x/y/w/h |
| **Builder.io** | Tree-based, recursive | Custom React context | JSON tree with options |
| **WordPress Gutenberg** | Flat block list with `innerBlocks[]` | Block inserter + reorder | Comment-delimited HTML |

### 2.2 Key Insight

Modern production systems consistently separate:
- **Widget Definition** (the schema/template — what a widget IS)
- **Widget Instance** (a placed widget with resolved config — where it IS)
- **Page Layout** (the container that holds all instances for a page)

This separation enables both static default layouts (in config) and per-user customizations (in database).

---

## 3. Recommended Library Stack

### 3.1 Drag-and-Drop: dnd-kit

| Library | Maintenance | React 19 | Accessibility | Bundle |
|---------|-------------|----------|---------------|--------|
| **dnd-kit** | Active (2025) | Yes | Built-in | ~15kb |
| react-dnd | Stale (2022) | Unknown | Manual | ~15kb |
| react-beautiful-dnd | Archived (2021) | — | — | — |

**dnd-kit packages used:**
```
@dnd-kit/core          # DndContext, DragOverlay, sensors
@dnd-kit/sortable      # SortableContext, useSortable
@dnd-kit/utilities    # CSS transforms
```

### 3.2 Grid Layout: react-grid-layout v2

react-grid-layout v2 is a TypeScript-first, responsive 12-column grid with built-in:
- Collision detection
- Resize handles
- Breakpoint support (desktop, tablet, mobile)
- Layout serialization (direct mapping to data model)

For complex dashboards requiring nested grids, use **gridstack** (~100kb, more feature-complete).

For simple grids where bundle size matters, a **custom CSS Grid + dnd-kit** is viable (zero extra bundle).

**Decision**: Use react-grid-layout v2 for the main dashboard grid.

### 3.3 Widget Config Validation: Zod

Zod is already used in DeesseJS's `defineConfig()`. It provides:
- Runtime type validation
- Schema inference for TypeScript
- Composable schemas (`z.object`, `z.array`, `z.union`)
- Clear error messages

### 3.4 Final Library Stack

| Layer | Library | Alternative |
|-------|---------|-------------|
| Drag-and-drop | dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) | — |
| Grid layout | react-grid-layout v2 | gridstack, custom CSS |
| Config validation | Zod | JSON Schema (Ajv) |
| Form generation | Zod schemas + custom `ObjectForm` component | react-jsonschema-form |
| State management | React `useState` + `useReducer` | Zustand (if needed) |
| Persistence | Drizzle ORM (`jsonb`) | Join tables (normalized) |

---

## 4. Data Model

### 4.1 Three-Layer Architecture

```
Widget Definition     → "stats" widget: what data it needs, how to render it
Widget Instance       → Placement on the grid with user-configured values
Page Layout           → All instances on a given page, per user
```

### 4.2 Widget Definition

```typescript
type WidgetDefinition<TConfig extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;                                    // Unique: "stats", "chart"
  name: string;                                  // Display: "Statistics"
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultSize: { w: number; h: number };         // Grid units
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  configSchema: z.ZodSchema<TConfig>;            // Runtime validation
  component: React.ComponentType<WidgetProps<TConfig>>;
};

type WidgetProps<TConfig> = {
  instance: WidgetInstance<TConfig>;
  isEditMode: boolean;
};
```

### 4.3 Widget Instance

```typescript
type Position = {
  x: number;   // Column start (0–11 for 12-col grid)
  y: number;   // Row start (auto-calculated)
  w: number;   // Width in columns
  h: number;   // Height in rows
};

type WidgetInstance<TConfig = Record<string, unknown>> = {
  instanceId: string;       // UUID v4 — unique per placement
  definitionId: string;    // References WidgetDefinition.id
  position: Position;
  config: TConfig;         // User-configured settings
};
```

### 4.4 Page Layout

```typescript
type PageLayout = {
  id: string;
  pageSlug: string;             // Which admin page
  userId: string | null;        // null = global/default layout
  widgets: WidgetInstance[];
  layoutVersion: string;        // Semantic version for migrations
  createdAt: string;
  updatedAt: string;
};
```

### 4.5 Database Schema (Drizzle)

```typescript
// Widget definitions table (populated by config/plugins, not user-editable)
// This is a lookup table, not the primary storage
const widgetDefinitions = pgTable('widget_definitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),           // Lucide icon name
  defaultSizeW: integer('default_size_w').notNull(),
  defaultSizeH: integer('default_size_h').notNull(),
  minSizeW: integer('min_size_w'),
  minSizeH: integer('min_size_h'),
  maxSizeW: integer('max_size_w'),
  maxSizeH: integer('max_size_h'),
  configSchema: jsonb('config_schema').notNull(),  // Zod schema as JSON
  componentPath: text('component_path').notNull(),  // Import path
});

// Layouts table (user-specific overrides)
const widgetLayouts = pgTable('widget_layouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageSlug: text('page_slug').notIndex(),
  userId: text('user_id'),          // NULL = global layout
  widgets: jsonb('widgets').$type<WidgetInstance[]>().notNull(),
  layoutVersion: text('layout_version').default('1.0.0'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Unique constraint: one layout per user per page
// -> (pageSlug, userId) must be unique
```

### 4.6 API Endpoints

```
GET  /api/widgets/:pageSlug          → Get layout (user-specific if authed)
PUT  /api/widgets/:pageSlug          → Save layout
POST /api/widgets/:pageSlug/reset    → Reset to default config layout
```

### 4.7 Config-Driven Default Layouts

Default layouts are defined in `deesse.config.ts` as a fallback:

```typescript
// deesse.config.ts
page({
  name: 'Home',
  defaultWidgets: [
    {
      instanceId: 'home-stats-1',
      definitionId: 'stats',
      position: { x: 0, y: 0, w: 3, h: 2 },
      config: { metric: 'users', timeRange: '30d' }
    },
  ],
});

// When user visits /admin/home:
// 1. Check widget_layouts DB for userId=user.id AND pageSlug="home"
// 2. If exists: render from DB
// 3. If not: fall back to config defaultWidgets, render in edit mode
```

---

## 5. Widget Registry Pattern

The registry is a `Map<string, WidgetDefinition>` populated from both built-in widgets and plugin-provided widgets. This is the single source of truth for resolving `definitionId` -> actual widget.

```typescript
// Simple in-memory registry (can be persisted if needed)
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

The registry is passed as a prop to the dashboard grid, which uses it to render the correct component for each `definitionId`.

---

## 6. Internal Architecture

### 6.1 Component Hierarchy

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

### 6.2 Edit Mode

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

### 6.3 Widget Config Panel

When a widget is clicked in edit mode, a side panel (`Sheet`) opens with a form generated from the widget's Zod schema:

```typescript
const WidgetConfigPanel = ({
  definition,
  instance,
  onConfigChange,
}: WidgetConfigPanelProps) => {
  return (
    <Sheet open={!!selectedInstance} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{definition.name} Settings</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <ObjectForm
            schema={definition.configSchema}
            value={instance.config}
            onChange={onConfigChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
```

### 6.4 Auto-Save with Debouncing

Layout changes auto-save with 1-second debouncing:

```typescript
const debouncedSave = useDebouncedCallback(
  async (newInstances: WidgetInstance[]) => {
    await saveLayout(pageSlug, newInstances);
  },
  1000
);

useEffect(() => {
  debouncedSave(instances);
}, [instances]);
```

### 6.5 Adding a New Widget

When user clicks "Add Widget" in edit mode:

1. Modal opens with widget picker (lists all from registry)
2. User selects a widget
3. System finds next available grid position
4. New instance inserted into `instances` array
5. `onInstancesChange` fires, triggering save

```typescript
function findNextPosition(instances: WidgetInstance[], defaultSize: Size): Position {
  const maxY = instances.reduce(
    (max, i) => Math.max(max, i.position.y + i.position.h),
    0
  );
  return { x: 0, y: maxY, w: defaultSize.w, h: defaultSize.h };
}
```

### 6.6 Drag Activation Constraint

Set a minimum drag distance to prevent accidental drags when clicking to configure:

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }, // Must drag 8px before drag starts
  }),
  useSensor(KeyboardSensor)
);
```

### 6.7 Nested Sortable (Widgets with Internal Sortable Lists)

Some widgets (e.g., "Quick Actions" with reorderable items) need their own sortable lists. These use a **nested `DndContext`** scoped to the widget's DOM subtree:

```typescript
// Inside a widget that has sortable children
const SortableActionList = ({ items, onReorder }: SortableActionListProps) => {
  return (
    <DndContext sensors={useSensors(useSensor(PointerSensor, { distance: 5 }))}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {items.map(item => <SortableActionItem key={item.id} item={item} />)}
      </SortableContext>
    </DndContext>
  );
};
```

---

## 7. Developer Experience (DX) for Plugin Creators

### 7.1 Widget Registration API

Plugin creators register widgets via the `widgets` array in `definePlugin()`:

```typescript
// In a plugin package
import { definePlugin } from 'deesse';
import { StatsWidget } from './widgets/stats';

export const myPlugin = definePlugin({
  name: 'my-plugin',
  widgets: [
    {
      id: 'stats',
      name: 'Statistics',
      description: 'Display key metrics',
      icon: BarChartIcon,
      defaultSize: { w: 3, h: 2 },
      minSize: { w: 2, h: 1 },
      maxSize: { w: 6, h: 4 },
      configSchema: z.object({
        metric: z.enum(['users', 'revenue', ' conversions']).default('users'),
        timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
        showTrend: z.boolean().default(true),
      }),
      component: StatsWidget,
    },
  ],
});
```

### 7.2 Widget Component Signature

```typescript
type WidgetProps<TConfig> = {
  instance: WidgetInstance<TConfig>;
  isEditMode: boolean;
};

const StatsWidget = <TConfig extends Record<string, unknown>>({
  instance,
  isEditMode,
}: WidgetProps<TConfig>) => {
  const { config } = instance;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.metric}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditMode ? (
          <div className="text-sm text-muted">Edit: {JSON.stringify(config)}</div>
        ) : (
          <StatsContent metric={config.metric} timeRange={config.timeRange} />
        )}
      </CardContent>
    </Card>
  );
};
```

### 7.3 Config Schema -> Form Field Mapping

The admin panel auto-generates a configuration form from the Zod schema:

| Zod Type | Form Field |
|----------|------------|
| `z.string()` | `Input` |
| `z.number()` | `Input type="number"` |
| `z.boolean()` | `Switch` |
| `z.enum([...])` | `Select` / `RadioGroup` |
| `z.date()` | `Input type="date"` |
| `z.object({...})` | Nested `ObjectForm` |
| `z.array(z.string())` | `TagsInput` or repeatable `Input` |
| `z.record(z.string(), z.any())` | `Textarea` (JSON editor) |

### 7.4 Widget Picker Modal

When adding a widget, a modal shows all registered widgets grouped by plugin:

```typescript
const WidgetPickerModal = ({
  registry,
  onSelect,
}: WidgetPickerModalProps) => {
  const grouped = groupBy(Array.from(registry.values()), (w) => w.pluginId ?? 'builtin');

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(grouped).map(([group, widgets]) => (
            <div key={group}>
              <div className="text-sm font-medium mb-1">{group}</div>
              {widgets.map((w) => (
                <button key={w.id} onClick={() => onSelect(w)}>
                  <w.icon />
                  <span>{w.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### 7.5 Widget Preview in Picker

The widget picker shows each widget's default render to help users choose:

```typescript
// In WidgetPickerModal
{widgets.map((w) => (
  <div key={w.id} className="p-2 border rounded hover:border-primary">
    <div className="h-20 flex items-center justify-center bg-muted">
      <w.component
        instance={{
          instanceId: '__preview__',
          definitionId: w.id,
          position: { x: 0, y: 0, w: 1, h: 1 },
          config: w.configSchema.parse({}), // defaults
        }}
        isEditMode={false}
      />
    </div>
    <div className="text-sm mt-1">{w.name}</div>
  </div>
))}
```

### 7.6 Validation and Error Messages

Widget configs are validated at two levels:

1. **Runtime (Zod)**: Config is parsed against `configSchema` on change. Invalid values show inline errors.
2. **On Save**: Full schema validation before persisting. If invalid, show toast with specific error.

```typescript
const parsed = definition.configSchema.safeParse(newConfig);
if (!parsed.success) {
  return { error: parsed.error.flatten().fieldErrors };
}
```

### 7.7 Widget Deprecation (Migration Path)

When a widget's config schema changes (breaking), a migration function handles old data:

```typescript
type WidgetDefinition<TConfig> = {
  id: string;
  configSchema: z.ZodSchema<TConfig>;
  migrations?: {
    [version: string]: (oldConfig: unknown) => TConfig;
  };
};
```

Example:
```typescript
{
  id: 'stats',
  configSchema: statsSchemaV2,
  migrations: {
    '1.0.0': (old: StatsConfigV1) => ({
      metric: old.metric,        // renamed field
      timeRange: old.range || old.timeRange, // merged
      showTrend: old.show ?? true,
    }),
  },
}
```

---

## 8. JSON Schema for Page Layouts

### 8.1 Complete Layout Serialization

```json
{
  "layoutVersion": "1.0.0",
  "pageSlug": "home",
  "userId": "user_abc123",
  "widgets": [
    {
      "instanceId": "inst_001",
      "definitionId": "stats",
      "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
      "config": {
        "metric": "users",
        "timeRange": "30d",
        "showTrend": true
      }
    },
    {
      "instanceId": "inst_002",
      "definitionId": "quick-actions",
      "position": { "x": 3, "y": 0, "w": 3, "h": 2 },
      "config": {
        "actions": [
          { "id": "act_1", "label": "Create User", "href": "/admin/users/new" },
          { "id": "act_2", "label": "View Reports", "href": "/admin/reports" }
        ]
      }
    }
  ]
}
```

### 8.2 Responsive Breakpoint Overrides

```json
{
  "instanceId": "inst_001",
  "definitionId": "stats",
  "position": { "x": 0, "y": 0, "w": 6, "h": 2 },
  "responsiveOverrides": {
    "tablet": { "x": 0, "y": 0, "w": 4, "h": 2 },
    "mobile": { "x": 0, "y": 0, "w": 12, "h": 3 }
  },
  "config": { "metric": "users", "timeRange": "30d", "showTrend": true }
}
```

### 8.3 Layout Versioning Strategy

The `layoutVersion` field enables future migrations:

```typescript
const LAYOUT_VERSION = '1.0.0';

const migrations: Record<string, (layout: PageLayout) => PageLayout> = {
  '1.1.0': (layout) => ({
    ...layout,
    widgets: layout.widgets.map(migrateWidget),
    layoutVersion: '1.1.0',
  }),
};

function migrateLayout(layout: PageLayout): PageLayout {
  const migrator = migrations[layout.layoutVersion];
  return migrator ? migrator(layout) : layout;
}
```

---

## 9. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Widget config injection | Zod runtime validation on all configs |
| XSS via widget `innerHTML` | React escapes by default; avoid `dangerouslySetInnerHTML` |
| Unauthorized layout modification | Session/JWT validation on all `PUT /api/widgets/:slug` |
| Widget registry poisoning | Only server-side config can register widgets |
| Large layoutDoS | Limit `widgets` array length (e.g., max 50 per layout) |
| Config size explosion | Limit individual widget config size (e.g., max 16KB JSON) |

---

## 10. Key Architectural Decisions Summary

| Decision | Chosen Approach | Rationale |
|----------|-----------------|-----------|
| Drag-and-drop library | dnd-kit | Active maintenance, React 19 support, accessibility |
| Grid system | react-grid-layout v2 | Built-in collision, resize, breakpoints, serialization |
| Config validation | Zod | Already in use; type-safe runtime validation |
| Widget storage | Inline JSON (`jsonb`) | Pragmatic; avoid over-normalization |
| Default layouts | Config-based fallback | Simpler than always-requiring DB |
| User layouts | Per-user DB records | Notion/Linear-style personalization |
| Edit mode | Top-level boolean | Avoids per-widget conditionals |
| Widget registration | Plugin `widgets[]` array | Single extension point for plugin creators |
| Config forms | Zod schema -> auto form | No per-widget form boilerplate |
| Auto-save | 1-second debounce | Balance between persistence and DB load |
| Nested drag | Nested `DndContext` per widget | Isolates drag contexts per widget |

---

## 11. Open Questions for DeesseJS Team

1. **Per-user or global layouts?** Should each user have their own customizable dashboard, or is a single shared layout per page sufficient?
2. **Config-driven vs. database-only defaults?** Should default layouts live in `deesse.config.ts` (fallback) or only in the database?
3. **Widget config scope creep?** Should widget config support nested objects and arrays, or limit to flat key-value pairs?
4. **Live preview in widget picker?** Is rendering actual widget previews in the picker modal worth the performance cost?
5. **Resize handles?** Is resize-by-dragging required, or is position-only (drag to reorder) sufficient for v1?
6. **Mobile admin?** Should the admin dashboard itself be responsive, or is desktop-only acceptable for v1?

---

## 12. References

- [dnd-kit Documentation](https://dndkit.com)
- [react-grid-layout v2](https://github.com/react-grid-layout/react-grid-layout)
- [Payload CMS Block Editor](https://payloadcms.com/blog/field-based-blocks)
- [WordPress Gutenberg Block API](https://developer.wordpress.org/block-editor/reference-guides/block-api/)
- [Sanity Schema Types](https://www.sanity.io/docs/schema-types)
- [Keystatic Blocks](https://keystatic.com/docs/blocks)
- [Builder.io Component Registration](https://www.builder.io/c/docs/developing-with-angular#using-your-own-components)
