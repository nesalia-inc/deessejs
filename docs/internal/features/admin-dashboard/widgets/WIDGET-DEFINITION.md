# Widget Definition

**Status**: Research Complete

---

## WidgetDefinition Type

```typescript
type WidgetDefinition<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;                                    // Unique identifier
  name: string;                                  // Display name
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultSize: { w: number; h: number };        // Grid units
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  configSchema: z.ZodSchema<TConfig>;           // Runtime config validation
  component: React.ComponentType<WidgetProps<TConfig>>;
};

type WidgetProps<TConfig> = {
  instance: WidgetInstance<TConfig>;
  isEditMode: boolean;
};
```

---

## WidgetProps

The props passed to every widget component:

```typescript
type WidgetProps<TConfig = Record<string, unknown>> = {
  /** The placed widget instance with position and config */
  instance: WidgetInstance<TConfig>;
  /** Whether the dashboard is in edit mode */
  isEditMode: boolean;
};
```

---

## Widget Instance

```typescript
type WidgetInstance<TConfig = Record<string, unknown>> = {
  instanceId: string;     // UUID v4 — unique per placement
  definitionId: string;   // References WidgetDefinition.id
  position: Position;
  config: TConfig;        // User-configured settings
};

type Position = {
  x: number;  // Column start (0–11)
  y: number;  // Row start
  w: number;  // Width in columns
  h: number;  // Height in rows
};
```

---

## Registration via Plugins

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
        metric: z.enum(['users', 'revenue', 'conversions']).default('users'),
        timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
        showTrend: z.boolean().default(true),
      }),
      component: StatsWidget,
    },
  ],
});
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

---

## Config Schema to Form Field Mapping

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

### Generic ObjectForm

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
  const parsed = schema.safeParse(value);
  if (!parsed.success) return null;

  return (
    <div className="space-y-4">
      {Object.entries(parsed.data).map(([key, val]) => (
        <FormField key={key} name={key}>
          {typeof val === 'string' ? (
            <Input
              value={val}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          ) : typeof val === 'boolean' ? (
            <Switch
              checked={val}
              onCheckedChange={(checked) => onChange({ ...value, [key]: checked })}
            />
          ) : null}
        </FormField>
      ))}
    </div>
  );
};
```

---

## Widget Deprecation (Migration Path)

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
      metric: old.metric,              // renamed field
      timeRange: old.range || old.timeRange,  // merged
      showTrend: old.show ?? true,
    }),
  },
}
```

---

## Widget Component Example

```typescript
const StatsWidget = ({
  instance,
  isEditMode,
}: WidgetProps) => {
  const { config } = instance;

  return (
    <Card className="h-full p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {config.metric}
        </span>
        {isEditMode && (
          <Select
            value={config.metric}
            onValueChange={(v) => handleConfigChange({ metric: v })}
          >
            <SelectTrigger className="w-24 h-6 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="text-3xl font-bold">
        {getMetricValue(config.metric).toLocaleString()}
      </div>
      {config.showTrend && (
        <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span>+12.5%</span>
        </div>
      )}
    </Card>
  );
};
```
