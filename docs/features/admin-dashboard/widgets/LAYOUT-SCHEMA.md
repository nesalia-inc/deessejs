# Layout Schema

**Status**: Research Complete

---

## Complete Layout Serialization

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

---

## Responsive Breakpoint Overrides

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

---

## Database Schema (Drizzle)

```typescript
// Widget definitions table
// This is a lookup table populated from config/plugins, not user-editable
const widgetDefinitions = pgTable('widget_definitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),                    // Lucide icon name
  defaultSizeW: integer('default_size_w').notNull(),
  defaultSizeH: integer('default_size_h').notNull(),
  minSizeW: integer('min_size_w'),
  minSizeH: integer('min_size_h'),
  maxSizeW: integer('max_size_w'),
  maxSizeH: integer('max_size_h'),
  configSchema: jsonb('config_schema').notNull(),  // Zod schema as JSON
  componentPath: text('component_path').notNull(), // Import path
});

// Layouts table (user-specific overrides)
const widgetLayouts = pgTable('widget_layouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageSlug: text('page_slug').notIndex(),
  userId: text('user_id'),             // NULL = global layout
  widgets: jsonb('widgets').$type<WidgetInstance[]>().notNull(),
  layoutVersion: text('layout_version').default('1.0.0'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Unique constraint: one layout per user per page
// Enforced via unique index on (pageSlug, userId)
```

---

## API Endpoints

```
GET  /api/widgets/:pageSlug          → Get layout for page (user-specific if authed)
PUT  /api/widgets/:pageSlug          → Save layout for page
POST /api/widgets/:pageSlug/reset    → Reset to default config layout
```

### GET /api/widgets/:pageSlug

```typescript
// Response
{
  "pageSlug": "home",
  "userId": "user_abc123",
  "widgets": [...],
  "layoutVersion": "1.0.0",
  "updatedAt": "2026-04-08T12:00:00Z"
}

// If no user-specific layout exists, returns null
// Client falls back to config-defined defaultWidgets
```

### PUT /api/widgets/:pageSlug

```typescript
// Request body
{
  "widgets": [
    {
      "instanceId": "inst_001",
      "definitionId": "stats",
      "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
      "config": { "metric": "users", "timeRange": "30d", "showTrend": true }
    }
  ]
}

// Response: 200 OK or 400 Bad Request (validation errors)
```

---

## Layout Versioning Strategy

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

### Migration Triggers

Layout migrations are triggered when:
1. A user loads a layout with an outdated `layoutVersion`
2. A widget definition's schema changes (checked on load)
3. An admin explicitly triggers a migration

---

## Validation

### Widget Instance Validation

```typescript
const widgetInstanceSchema = z.object({
  instanceId: z.string().uuid(),
  definitionId: z.string(),
  position: z.object({
    x: z.number().int().min(0).max(11),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(4),
  }),
  config: z.record(z.unknown()),
});
```

### Layout Validation

```typescript
const pageLayoutSchema = z.object({
  pageSlug: z.string(),
  userId: z.string().nullable(),
  widgets: z.array(widgetInstanceSchema),
  layoutVersion: z.string(),
  updatedAt: z.string().datetime(),
});
```

### Config Validation Against Widget Schema

On load, each widget's config is validated against its `configSchema`:

```typescript
const definition = registry.get(instance.definitionId);
if (!definition) {
  // Widget definition no longer exists — skip this instance
  return null;
}

const parsed = definition.configSchema.safeParse(instance.config);
if (!parsed.success) {
  // Config is invalid — use defaults or flag for user attention
  return {
    ...instance,
    config: definition.configSchema.parse({}),  // defaults
    _validationError: parsed.error.flatten(),
  };
}
```

---

## Config-Driven Default Layouts

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

## Widget Picker Modal

When adding a widget, a modal shows all registered widgets grouped by plugin:

```typescript
const WidgetPickerModal = ({
  registry,
  onSelect,
}: WidgetPickerModalProps) => {
  const grouped = groupBy(
    Array.from(registry.values()),
    (w) => w.pluginId ?? 'builtin'
  );

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

### Widget Preview in Picker

The widget picker shows each widget's default render to help users choose:

```typescript
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
