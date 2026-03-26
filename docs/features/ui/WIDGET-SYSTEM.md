# Widget System - Deep Dive

## Overview

The widget system is the foundation of the DeesseJS admin dashboard's customization. It enables users to compose their dashboard pages with drag-and-drop widgets that can be resized, repositioned, and configured dynamically.

**Status**: Planning phase - do not implement yet

---

## Concepts

### What is a Widget?

A widget is a **self-contained React component** that:
- Renders content within the dashboard grid
- Can have configurable settings (e.g., "number of items to show", "color scheme")
- Is identified by a unique `id` and registered in the **Widget Registry**
- Can be placed multiple times on the same or different pages with different configurations

### Widget vs Page

| Aspect | Page | Widget |
|--------|------|--------|
| **Definition** | Route in admin navigation | Component in a grid |
| **Content** | Static or dynamic React component | Self-contained dashboard component |
| **Navigation** | Has a URL (`/admin/users`) | Lives within a page |
| **Customization** | Pages are fixed, content can vary | Position, size, and config are user-defined |

### Widget Types

1. **Built-in Widgets** - Ship with `@deessejs/ui`
   - Stats widget (displays numbers with trend)
   - Quick Actions widget (list of action buttons)
   - Recent Activity widget (timeline of events)
   - Chart widget (placeholder for visualizations)

2. **Plugin Widgets** - Provided by plugins
   - SEO Stats widget (from SEO plugin)
   - Recent Posts widget (from Blog plugin)
   - Revenue widget (from Payments plugin)

3. **Custom Widgets** - User-defined
   - Developers can create and register their own widgets

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Project                             │
│                                                                  │
│  deesse.config.ts                                               │
│  ├── plugins: [seoPlugin, blogPlugin, ...]                     │
│  └── pages: [                                                   │
│        { name: 'Home', widgets: [...] }  ← page with widgets   │
│      ]                                                          │
│                                                                  │
│  Widget Registry (populated from plugins + built-in)            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  'stats'        → { component: StatsWidget, ... }      │    │
│  │  'quick-actions' → { component: QuickActionsWidget, ...} │    │
│  │  'seo-overview'  → { component: SeoOverviewWidget, ... } │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Dashboard Grid (renders based on page.widgets config)           │
│  ┌─────────────────┬─────────────────┬─────────────────┐       │
│  │  Stats (2x1)    │  Quick Actions  │  Activity (1x2)│       │
│  │                 │     (1x1)       │                 │       │
│  ├─────────────────┼─────────────────┤                 │       │
│  │  SEO Overview (2x1)               │                 │       │
│  └─────────────────┴─────────────────┴─────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Widget Registry

### Registration

Widgets are registered via the `widgets` option in `defineConfig()`:

```typescript
// deesse.config.ts
import { defineConfig, widget } from '@deessejs/deesse';

const statsWidget = widget({
  id: 'stats',
  name: 'Statistics',
  description: 'Display key metrics with trends',
  icon: BarChartIcon,
  defaultSize: { w: 2, h: 1 },  // 2 columns wide, 1 row tall
  minSize: { w: 1, h: 1 },
  maxSize: { w: 4, h: 2 },
  configSchema: z.object({
    metric: z.enum(['users', 'views', 'revenue']),
    timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
  }),
  component: StatsWidget,
});

const seoPlugin = plugin({
  // ...
  widgets: [
    widget({
      id: 'seo-overview',
      name: 'SEO Overview',
      component: SeoOverviewWidget,
      defaultSize: { w: 2, h: 1 },
    }),
  ],
});

export const config = defineConfig({
  widgets: [statsWidget],
  plugins: [seoPlugin],
  pages: [
    page({
      name: 'Home',
      content: DashboardPage,  // Renders the widget grid
      widgets: [  // Initial widget layout
        { id: 'stats', x: 0, y: 0, w: 2, h: 1, config: { metric: 'users' } },
        { id: 'quick-actions', x: 2, y: 0, w: 1, h: 1 },
      ],
    }),
  ],
});
```

### Widget Registry Type

```typescript
type WidgetDefinition<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultSize: Size;
  minSize?: Size;
  maxSize?: Size;
  configSchema: ZodSchema<TConfig>;
  component: React.ComponentType<WidgetProps<TConfig>>;
};

type WidgetInstance<TConfig = Record<string, unknown>> = {
  instanceId: string;  // Unique per placement (uuid)
  definitionId: string;  // References WidgetDefinition.id
  position: Position;
  config: TConfig;
};

type Page = {
  name: string;
  slug?: string;
  content?: React.ComponentType;
  widgets?: WidgetInstance[];
  // ... other page properties
};
```

---

## Grid System

### Grid Specifications

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

### Widget Sizes

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

### Size Constraints

```typescript
type Size = {
  w: number;  // Width in columns (1-12)
  h: number;  // Height in rows (1-4)
};

type Position = {
  x: number;  // Column start (0-11)
  y: number;  // Row start (auto-calculated if not specified)
};

// Example: Widget spanning columns 2-4 (2 wide), starting at row 1
{ x: 2, y: 1, w: 2, h: 1 }
```

### Grid Library Selection

We need a drag-and-drop grid library. Options:

| Library | Pros | Cons | License |
|---------|------|------|---------|
| **Gridstack** | Mature, many features, good mobile | Larger bundle (~100kb) | MIT |
| **react-grid-layout** | Popular, React-native, good docs | No built-in touch support | MIT |
| **dnd-kit** | Lightweight, accessible, modern | Not grid-specific, need custom grid | MIT |
| **Custom CSS Grid** | Zero bundle impact, pure CSS | Complex DND logic, no collision | None |

**Recommendation**: Use **Gridstack.js**
- Battle-tested grid library
- Supports 12-column grid natively
- Built-in drag-and-drop with collision detection
- Responsive with breakpoints
- Has React wrapper (`react-gridstack` or use directly)

**Alternative**: If bundle size is critical, use **dnd-kit** with custom grid layout logic.

---

## Widget Component API

### WidgetProps

```typescript
type WidgetProps<TConfig = Record<string, unknown>> = {
  /** Unique instance ID for this widget placement */
  instanceId: string;
  /** User-configured settings for this instance */
  config: TConfig;
  /** Callback to update widget configuration */
  onConfigChange: (config: Partial<TConfig>) => void;
  /** Whether the widget is in edit mode (shows handles, overlays) */
  isEditMode: boolean;
  /** Callback when user requests widget removal */
  onRemove?: () => void;
  /** Ref to the widget's DOM element (for measurements) */
  elementRef?: React.RefObject<HTMLDivElement>;
};
```

### Example Widget Implementation

```typescript
// Built-in Stats Widget
const StatsWidget = ({ config, onConfigChange, isEditMode }: WidgetProps) => {
  const { metric, timeRange } = config;

  return (
    <Card className="h-full p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {metric.charAt(0).toUpperCase() + metric.slice(1)}
        </span>
        {isEditMode && (
          <Select
            value={metric}
            onValueChange={(v) => onConfigChange({ metric: v })}
          >
            <SelectTrigger className="w-24 h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="views">Views</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="text-3xl font-bold">
        {getMetricValue(metric, timeRange).toLocaleString()}
      </div>
      <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
        <TrendingUp className="h-4 w-4" />
        <span>+12.5%</span>
      </div>
    </Card>
  );
};
```

### Widget Container (Edit Mode Overlay)

```typescript
// WidgetContainer renders the widget with edit overlays
const WidgetContainer = ({
  definition,
  instance,
  isEditMode,
  onRemove,
}: {
  definition: WidgetDefinition;
  instance: WidgetInstance;
  isEditMode: boolean;
  onRemove: () => void;
}) => {
  return (
    <div
      className={cn(
        'relative',
        isEditMode && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
      data-widget-id={instance.instanceId}
    >
      {/* Widget Content */}
      <definition.component
        instanceId={instance.instanceId}
        config={instance.config}
        isEditMode={isEditMode}
        onConfigChange={(newConfig) => handleConfigChange(instance, newConfig)}
        onRemove={onRemove}
      />

      {/* Edit Mode Overlays */}
      {isEditMode && (
        <>
          {/* Drag Handle */}
          <div className="absolute -top-3 -left-3 cursor-move bg-primary text-primary-foreground rounded p-1">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Resize Handle */}
          <div className="absolute -bottom-2 -right-2 cursor-se-resize bg-primary text-primary-foreground rounded p-1">
            <Minimize2 className="h-3 w-3" />
          </div>

          {/* Remove Button */}
          <button
            className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full p-1"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Size Indicator */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-1 text-xs text-muted-foreground">
            {instance.position.w}x{instance.position.h}
          </div>
        </>
      )}
    </div>
  );
};
```

---

## Dashboard Grid Component

### DashboardGrid

```typescript
type DashboardGridProps = {
  /** Available widget definitions */
  widgetDefinitions: Map<string, WidgetDefinition>;
  /** Current widget instances on this page */
  instances: WidgetInstance[];
  /** Whether grid is in edit mode */
  isEditMode: boolean;
  /** Callback when layout changes */
  onLayoutChange: (instances: WidgetInstance[]) => void;
  /** Callback when widget is added */
  onWidgetAdd: (definitionId: string) => void;
  /** Callback when widget is removed */
  onWidgetRemove: (instanceId: string) => void;
  /** Callback when widget config changes */
  onWidgetConfigChange: (instanceId: string, config: Record<string, unknown>) => void;
};
```

### DashboardGrid Implementation (using Gridstack)

```typescript
import { GridStack, GridStackNode } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

const DashboardGrid = ({
  widgetDefinitions,
  instances,
  isEditMode,
  onLayoutChange,
  onWidgetRemove,
  onWidgetConfigChange,
}: DashboardGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstance = useRef<GridStack | null>(null);

  // Initialize Gridstack
  useEffect(() => {
    if (!gridRef.current) return;

    gridInstance.current = GridStack.init(
      {
        column: 12,
        cellHeight: 80,
        gutter: 16,
        float: true,
        disableDrag: !isEditMode,
        disableResize: !isEditMode,
        animate: true,
      },
      gridRef.current
    );

    gridInstance.current.on('change', (_event: Event, nodes: GridStackNode[]) => {
      const newInstances = nodes.map((node) => {
        const instance = instances.find((i) => i.instanceId === node.id);
        if (!instance) return null;
        return {
          ...instance,
          position: {
            x: node.x ?? 0,
            y: node.y ?? 0,
            w: node.w ?? 1,
            h: node.h ?? 1,
          },
        };
      }).filter(Boolean) as WidgetInstance[];

      onLayoutChange(newInstances);
    });

    return () => {
      gridInstance.current?.destroy(false);
    };
  }, [isEditMode]);

  // Sync instances to DOM
  useEffect(() => {
    if (!gridInstance.current) return;

    instances.forEach((instance) => {
      const el = gridRef.current?.querySelector(
        `[data-widget-id="${instance.instanceId}"]`
      );
      if (el) {
        gridInstance.current?.makeWidget(el);
        gridInstance.current?.update(el, {
          x: instance.position.x,
          y: instance.position.y,
          w: instance.position.w,
          h: instance.position.h,
        });
      }
    });
  }, [instances]);

  return (
    <div ref={gridRef} className="grid-stack">
      {instances.map((instance) => {
        const definition = widgetDefinitions.get(instance.definitionId);
        if (!definition) return null;

        return (
          <div
            key={instance.instanceId}
            className="grid-stack-item"
            gs-id={instance.instanceId}
            gs-x={instance.position.x}
            gs-y={instance.position.y}
            gs-w={instance.position.w}
            gs-h={instance.position.h}
          >
            <div className="grid-stack-item-content">
              <WidgetContainer
                definition={definition}
                instance={instance}
                isEditMode={isEditMode}
                onRemove={() => onWidgetRemove(instance.instanceId)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## Widget Add/Remove Flow

### Add Widget Modal

When user clicks "Add Widget" in edit mode:

```
┌─────────────────────────────────────────────────────────────┐
│  Add Widget                                             [X] │
├─────────────────────────────────────────────────────────────┤
│  [Search widgets...]                                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [!] Statistics                                          ││
│  │ Display key metrics with trends                         ││
│  │ Built-in • 2x1 default                                  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [+] Quick Actions                                       ││
│  │ List of action buttons                                  ││
│  │ Built-in • 1x1 default                                   ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [图表] SEO Overview                                     ││
│  │ SEO statistics and insights                             ││
│  │ SEO Plugin • 2x1 default                                ││
│  └─────────────────────────────────────────────────────────┘│
│                              [Cancel]  [Add to Dashboard]   │
└─────────────────────────────────────────────────────────────┘
```

### Widget Selector Component

```typescript
const WidgetSelector = ({
  widgetDefinitions,
  onSelect,
  onClose,
}: {
  widgetDefinitions: Map<string, WidgetDefinition>;
  onSelect: (definitionId: string) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState('');

  const filtered = Array.from(widgetDefinitions.values()).filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search widgets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <div className="max-h-96 overflow-y-auto space-y-2">
          {filtered.map((widget) => (
            <button
              key={widget.id}
              className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
              onClick={() => onSelect(widget.id)}
            >
              <div className="flex items-center gap-2">
                {widget.icon && <widget.icon className="h-5 w-5" />}
                <span className="font-medium">{widget.name}</span>
                {widget.description && (
                  <span className="text-sm text-muted-foreground">
                    — {widget.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Badge variant="secondary">
                  {isBuiltIn(widget.id) ? 'Built-in' : 'Plugin'}
                </Badge>
                <span>{widget.defaultSize.w}x{widget.defaultSize.h} default</span>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Widget Configuration

### In-Place Configuration

When user clicks the configure icon on a widget:

```typescript
// Widget configuration panel (slides in from right)
const WidgetConfigPanel = ({
  definition,
  instance,
  onConfigChange,
  onClose,
}: {
  definition: WidgetDefinition;
  instance: WidgetInstance;
  onConfigChange: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) => {
  const schema = definition.configSchema;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{definition.name} Settings</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <ObjectForm
            schema={schema}
            value={instance.config}
            onChange={onConfigChange}
          />
        </div>

        <SheetFooter>
          <Button onClick={onClose}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
```

### Generic Object Form

For widgets with simple configs, we can generate a form from the Zod schema:

```typescript
const ObjectForm = ({
  schema,
  value,
  onChange,
}: {
  schema: ZodSchema;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) => {
  const { fields } = useForm({
    schema,
    defaultValues: value,
  });

  return (
    <Form {...form}>
      {Object.entries(fields).map(([key, field]) => (
        <FormField
          key={key}
          control={form.control}
          name={key}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{key}</FormLabel>
              <FormControl>
                {field.type === 'select' ? (
                  <Select
                    value={field.value as string}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input {...field} />
                )}
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </Form>
  );
};
```

---

## Persistence

### Saving Layout

Widget layouts are stored in the database. The layout is associated with:
- User ID (per-user customization)
- Page ID (per-page layout)

```typescript
// Database schema (using Standard Schema / Zod)
const widgetLayoutSchema = z.object({
  userId: z.string(),
  pageSlug: z.string(),
  widgets: z.array(
    z.object({
      instanceId: z.string(),
      definitionId: z.string(),
      position: z.object({
        x: z.number().min(0).max(11),
        y: z.number().min(0),
        w: z.number().min(1).max(12),
        h: z.number().min(1).max(4),
      }),
      config: z.record(z.unknown()),
    })
  ),
  updatedAt: z.date(),
});

// API endpoints
// GET  /api/widgets?page=:slug - Get layout for page
// PUT  /api/widgets - Save layout for page
```

### Layout Loading

```typescript
// In DashboardPage component
const DashboardPage = ({ page }) => {
  const [widgets, setWidgets] = useState(page.widgets ?? []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load user's saved layout on mount
  useEffect(() => {
    if (!page.widgets) return;
    setIsLoading(true);
    fetchWidgets(page.slug).then((saved) => {
      setWidgets(saved ?? page.widgets);
      setIsLoading(false);
    });
  }, [page.slug]);

  // Auto-save on layout change (debounced)
  const debouncedSave = useDebouncedCallback(
    (newWidgets) => saveWidgets(page.slug, newWidgets),
    1000
  );

  useEffect(() => {
    debouncedSave(widgets);
  }, [widgets]);

  // ...
};
```

---

## Edit Mode Toggle

### Edit Mode Bar

```typescript
const EditModeBar = ({
  isEditMode,
  onToggle,
  hasChanges,
  onSave,
  onDiscard,
}: {
  isEditMode: boolean;
  onToggle: () => void;
  hasChanges: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) => {
  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 p-2 rounded-lg shadow-lg',
        'bg-background border',
        isEditMode && 'ring-2 ring-primary'
      )}
    >
      {isEditMode ? (
        <>
          <span className="text-sm font-medium px-2">Edit Mode</span>
          {hasChanges && (
            <>
              <Button size="sm" onClick={onSave}>Save</Button>
              <Button size="sm" variant="ghost" onClick={onDiscard}>
                Discard
              </Button>
            </>
          )}
          <Divider orientation="vertical" className="h-6" />
          <Button size="sm" variant="outline" onClick={onToggle}>
            Done
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={onToggle}>
          <Pencil className="h-4 w-4 mr-1" />
          Customize
        </Button>
      )}
    </div>
  );
};
```

---

## Page-Level Widget Page

For pages that use the widget grid (like Home dashboard):

```typescript
// This replaces page.content for widget-based pages
const WidgetBasedPage = ({
  page,
  widgetDefinitions,
}: {
  page: Page;
  widgetDefinitions: Map<string, WidgetDefinition>;
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<WidgetInstance[]>(page.widgets ?? []);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [editingWidget, setEditingWidget] = useState<string | null>(null);

  const handleLayoutChange = (newWidgets: WidgetInstance[]) => {
    setWidgets(newWidgets);
  };

  const handleWidgetAdd = (definitionId: string) => {
    const definition = widgetDefinitions.get(definitionId);
    if (!definition) return;

    const newInstance: WidgetInstance = {
      instanceId: generateId(),  // uuid
      definitionId,
      position: {
        x: 0,
        y: Infinity,  // Gridstack will auto-place
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
      },
      config: getDefaultConfig(definition.configSchema),
    };

    setWidgets((prev) => [...prev, newInstance]);
    setShowWidgetSelector(false);
  };

  const handleWidgetRemove = (instanceId: string) => {
    setWidgets((prev) => prev.filter((w) => w.instanceId !== instanceId));
  };

  const editingWidgetDefinition = editingWidget
    ? widgetDefinitions.get(
        widgets.find((w) => w.instanceId === editingWidget)?.definitionId ?? ''
      )
    : null;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{page.name}</h1>
        {isEditMode && (
          <Button size="sm" onClick={() => setShowWidgetSelector(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Widget
          </Button>
        )}
      </div>

      {/* Widget Grid */}
      <DashboardGrid
        widgetDefinitions={widgetDefinitions}
        instances={widgets}
        isEditMode={isEditMode}
        onLayoutChange={handleLayoutChange}
        onWidgetAdd={handleWidgetAdd}
        onWidgetRemove={handleWidgetRemove}
        onWidgetConfigChange={() => {}}
      />

      {/* Edit Mode Bar */}
      <EditModeBar
        isEditMode={isEditMode}
        onToggle={() => setIsEditMode(!isEditMode)}
        hasChanges={hasUnsavedChanges}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      {/* Widget Selector Modal */}
      {showWidgetSelector && (
        <WidgetSelector
          widgetDefinitions={widgetDefinitions}
          onSelect={handleWidgetAdd}
          onClose={() => setShowWidgetSelector(false)}
        />
      )}

      {/* Widget Config Panel */}
      {editingWidget && editingWidgetDefinition && (
        <WidgetConfigPanel
          definition={editingWidgetDefinition}
          instance={widgets.find((w) => w.instanceId === editingWidget)!}
          onConfigChange={(config) => {
            setWidgets((prev) =>
              prev.map((w) =>
                w.instanceId === editingWidget ? { ...w, config } : w
              )
            );
          }}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
};
```

---

## Built-in Widgets

### Stats Widget

```typescript
const statsWidget = widget({
  id: 'stats',
  name: 'Statistics',
  description: 'Display key metrics with trends',
  icon: BarChartIcon,
  defaultSize: { w: 2, h: 1 },
  minSize: { w: 1, h: 1 },
  maxSize: { w: 4, h: 2 },
  configSchema: z.object({
    metric: z.enum(['users', 'pageViews', 'revenue', 'orders']),
    timeRange: z.enum(['7d', '30d', '90d', '365d']).default('30d'),
    showTrend: z.boolean().default(true),
  }),
  component: StatsWidget,
});
```

### Quick Actions Widget

```typescript
const quickActionsWidget = widget({
  id: 'quick-actions',
  name: 'Quick Actions',
  description: 'Shortcuts to common actions',
  icon: ZapIcon,
  defaultSize: { w: 1, h: 1 },
  minSize: { w: 1, h: 1 },
  maxSize: { w: 2, h: 2 },
  configSchema: z.object({
    actions: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        icon: z.string(),  // Lucide icon name
      })
    ).default([
      { label: 'New Post', href: '/admin/posts/new', icon: 'Plus' },
      { label: 'View Site', href: '/', icon: 'ExternalLink' },
    ]),
  }),
  component: QuickActionsWidget,
});
```

### Recent Activity Widget

```typescript
const recentActivityWidget = widget({
  id: 'recent-activity',
  name: 'Recent Activity',
  description: 'Timeline of recent events',
  icon: ActivityIcon,
  defaultSize: { w: 1, h: 2 },
  minSize: { w: 1, h: 1 },
  maxSize: { w: 3, h: 4 },
  configSchema: z.object({
    limit: z.number().min(5).max(50).default(10),
    types: z.array(z.enum(['post', 'user', 'comment'])).optional(),
  }),
  component: RecentActivityWidget,
});
```

### Chart Widget (Placeholder)

```typescript
const chartWidget = widget({
  id: 'chart',
  name: 'Chart',
  description: 'Visualize data with charts',
  icon: ChartLineIcon,
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 2, h: 1 },
  maxSize: { w: 6, h: 4 },
  configSchema: z.object({
    chartType: z.enum(['line', 'bar', 'pie', 'area']).default('line'),
    dataSource: z.string(),  // Future: reference a collection
    xAxis: z.string(),
    yAxis: z.string(),
  }),
  component: ChartWidget,  // TODO: Implement with recharts or similar
});
```

---

## Integration with Pages

### Declaring Widgets on a Page

```typescript
export const config = defineConfig({
  widgets: [statsWidget, quickActionsWidget, recentActivityWidget],
  pages: [
    page({
      name: 'Home',
      content: WidgetBasedPage,  // Special page type for widgets
      widgets: [
        { id: 'stats', instanceId: 'home-stats-1', x: 0, y: 0, w: 2, h: 1, config: { metric: 'users' } },
        { id: 'quick-actions', instanceId: 'home-quick-1', x: 2, y: 0, w: 1, h: 1 },
        { id: 'recent-activity', instanceId: 'home-activity-1', x: 3, y: 0, w: 1, h: 2 },
      ],
    }),
    page({
      name: 'Users',
      content: UsersPage,  // Regular React component
    }),
  ],
});
```

### TypeScript Types (in @deessejs/deesse)

```typescript
// packages/deesse/src/widgets/types.ts

export type Size = {
  w: number;
  h: number;
};

export type Position = {
  x: number;
  y: number;
} & Size;

export type WidgetDefinition<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  name: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultSize: Size;
  minSize?: Size;
  maxSize?: Size;
  configSchema: ZodSchema<TConfig>;
  component: React.ComponentType<WidgetProps<TConfig>>;
};

export type WidgetInstance<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  instanceId: string;
  definitionId: string;
  position: Position;
  config: TConfig;
};

export type WidgetProps<TConfig = Record<string, unknown>> = {
  instanceId: string;
  config: TConfig;
  onConfigChange: (config: Partial<TConfig>) => void;
  isEditMode: boolean;
  onRemove?: () => void;
};

// packages/deesse/src/widgets/registry.ts

export function widget<TConfig extends Record<string, unknown>>(
  definition: WidgetDefinition<TConfig>
): WidgetDefinition<TConfig> {
  return definition;
}

// packages/deesse/src/config/types.ts

type PageWithWidgets = Page & {
  content?: React.ComponentType;  // For non-widget pages
  widgets?: WidgetInstance[];      // For widget-based pages
};
```

---

## Files to Create/Modify

```
packages/
├── deesse/
│   └── src/
│       ├── widgets/
│       │   ├── types.ts           # Widget types
│       │   ├── registry.ts        # widget() function
│       │   └── index.ts
│       ├── config/
│       │   ├── define.ts          # Update to include widgets
│       │   └── types.ts           # Update Page type
│       └── index.ts               # Export widget types
│
├── ui/
│   └── src/
│       ├── admin/
│       │   ├── dashboard-grid.tsx  # Gridstack wrapper
│       │   ├── widget-container.tsx
│       │   ├── widget-selector.tsx
│       │   ├── widget-config-panel.tsx
│       │   ├── edit-mode-bar.tsx
│       │   ├── widget-based-page.tsx
│       │   └── widgets/
│       │       ├── stats-widget.tsx
│       │       ├── quick-actions-widget.tsx
│       │       ├── recent-activity-widget.tsx
│       │       ├── chart-widget.tsx
│       │       └── index.ts       # Re-exports all built-in widgets
│       └── index.ts
│
docs/features/ui/
├── WIDGET-SYSTEM.md      # This document
└── README.md             # Update to link to widget system
```

---

## Open Questions

1. **Grid Library**: Gridstack vs react-grid-layout vs dnd-kit? What's the priority on bundle size?

2. **Per-user vs Per-page layouts**: Should each user have their own widget layout, or is it global per page?

3. **Widget Config Storage**: Is the database schema I proposed acceptable? Should configs be stored separately?

4. **Server Components**: Should widget definitions be server-side and layouts client-side? How does this affect the widget registry?

5. **Responsive Behavior**: How should widgets behave on mobile? Stack vertically? Hide? Be scrollable?

6. **Undo/Redo**: Should edit mode support undo/redo for layout changes?

7. **Widget Versioning**: If a widget's config schema changes, how do we handle migration of existing configs?

---

## Related Documents

- [Admin Dashboard](../admin-dashboard/README.md)
- [@deessejs/ui Plan](./DEESSE-UI-PLAN.md)
- [Plugins](../plugins/README.md)
- [Configuration](../config/README.md)
