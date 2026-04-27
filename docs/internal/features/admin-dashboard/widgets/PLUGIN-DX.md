# Plugin Developer Experience

**Status**: Research Complete

---

## Overview

Plugin creators extend the widget catalog by registering custom widgets via the `widgets` array in `definePlugin()`. This document describes the full DX for creating and publishing widget plugins.

---

## Widget Registration API

### Basic Registration

```typescript
// In a plugin package
import { definePlugin } from 'deesse';
import { StatsWidget } from './widgets/stats';
import { z } from 'zod';

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

### Widget Component Signature

```typescript
import type { WidgetProps } from 'deesse';

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

---

## Config Schema Patterns

### Simple Enum Selection

```typescript
configSchema: z.object({
  metric: z.enum(['users', 'revenue', 'conversions']).default('users'),
  timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
}),
```

### Nested Objects

```typescript
configSchema: z.object({
  header: z.object({
    title: z.string().default('Section Title'),
    showBorder: z.boolean().default(true),
  }),
  items: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      icon: z.string().optional(),
    })
  ).default([]),
}),
```

### Conditional Fields

```typescript
configSchema: z.object({
  displayType: z.enum(['grid', 'list']).default('grid'),
  // Conditional: only required when displayType is 'grid'
  columns: z.number().min(1).max(4).optional(),
}).refine(
  (data) => data.displayType !== 'grid' || (data.columns !== undefined && data.columns > 0),
  { message: 'Columns required when displayType is grid', path: ['columns'] }
),
```

### Custom Validation

```typescript
configSchema: z.object({
  apiKey: z.string().min(1, 'API key is required'),
  webhookUrl: z.string().url().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.webhookUrl && !data.webhookUrl.startsWith('https://')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Webhook URL must use HTTPS',
      path: ['webhookUrl'],
    });
  }
}),
```

---

## Icon Registration

Widgets use Lucide icons by name:

```typescript
import { BarChartIcon, type LucideIcon } from 'lucide-react';

{
  id: 'stats',
  name: 'Statistics',
  icon: BarChartIcon,  // Pass the icon component directly
  // OR
  icon: 'BarChart',     // Pass the string name (if supported)
}
```

---

## Widget Categories (Grouping)

Widgets can be grouped in the picker by specifying a `category`:

```typescript
{
  id: 'seo-overview',
  name: 'SEO Overview',
  category: 'analytics',  // Groups with other analytics widgets
  icon: SearchIcon,
  component: SeoOverviewWidget,
  configSchema: z.object({...}),
}
```

The picker modal then shows categories as sections:

```
Analytics
  ├── SEO Overview (SEO Plugin)
  ├── Google Analytics (Analytics Plugin)
  └── Revenue Chart (Payments Plugin)

Content
  ├── Recent Posts (Blog Plugin)
  └── Media Gallery (Media Plugin)
```

---

## Publishing a Widget Plugin

### Package Structure

```
my-deesse-plugin/
├── src/
│   ├── index.ts          # Plugin definition
│   └── widgets/
│       ├── stats.tsx
│       ├── chart.tsx
│       └── index.ts      # Re-exports all widgets
├── package.json
└── tsconfig.json
```

### package.json

```json
{
  "name": "deesse-plugin-analytics",
  "version": "1.0.0",
  "peerDependencies": {
    "deesse": ">=0.2.0",
    "react": ">=18.0.0"
  },
  "exports": {
    ".": "./dist/index.js",
    "./widgets": "./dist/widgets/index.js"
  }
}
```

### Entry Point

```typescript
// src/index.ts
import { definePlugin } from 'deesse';
import * as widgets from './widgets';

export const analyticsPlugin = definePlugin({
  name: 'analytics',
  widgets: Object.values(widgets),
});

export * from './widgets';
```

---

## Handling Server Data

Widgets often need to fetch data. Use React Query or SWR inside the widget:

```typescript
const StatsWidget = ({ instance, isEditMode }: WidgetProps) => {
  const { metric, timeRange } = instance.config;

  const { data, isLoading } = useQuery({
    queryKey: ['stats', metric, timeRange],
    queryFn: () => fetchStats(metric, timeRange),
  });

  if (isLoading) return <Skeleton />;
  if (!data) return <div>No data</div>;

  return (
    <Card>
      <CardContent>
        <div className="text-3xl font-bold">{data.value}</div>
        <div className="text-sm text-muted">{metric}</div>
      </CardContent>
    </Card>
  );
};
```

---

## Widget Migrations

When updating a widget's config schema, provide migration functions:

```typescript
{
  id: 'stats',
  configSchema: statsSchemaV2,  // Current schema
  migrations: {
    // Migrate from v1.0.0 to v2.0.0
    '1.0.0': (oldConfig: unknown): StatsConfigV2 => {
      const old = oldConfig as StatsConfigV1;
      return {
        metric: old.metric as StatsConfigV2['metric'],
        timeRange: old.timeRange as StatsConfigV2['timeRange'],
        showTrend: old.show ?? true,
        // New field in v2
        comparisonPeriod: 'previous',
      };
    },
  },
}
```

### Migration Execution

Migrations run when a user loads a page with instances using an old schema version:

```typescript
function migrateWidgetInstance(
  instance: WidgetInstance,
  definition: WidgetDefinition
): WidgetInstance {
  const currentVersion = definition.version ?? '1.0.0';
  const instanceVersion = instance.configVersion ?? currentVersion;

  if (instanceVersion === currentVersion) return instance;

  const migration = definition.migrations?.[instanceVersion];
  if (!migration) {
    // No migration path — use defaults
    return {
      ...instance,
      config: definition.configSchema.parse({}),
      configVersion: currentVersion,
    };
  }

  return {
    ...instance,
    config: migration(instance.config),
    configVersion: currentVersion,
  };
}
```

---

## TypeScript Support

Widget plugins are fully type-safe:

```typescript
// Plugin author defines the config shape
const seoWidget = widget({
  id: 'seo-overview',
  configSchema: z.object({
    metrics: z.array(z.enum(['visits', 'bounce', 'duration'])),
    period: z.enum(['7d', '30d', '90d']),
  }),
  component: SeoWidget,
});

// TypeScript infers the config type
type SeoConfig = z.infer<typeof seoWidget.configSchema>;
// { metrics: ('visits' | 'bounce' | 'duration')[]; period: '7d' | '30d' | '90d' }
```

The `WidgetProps` type receives this inferred type:

```typescript
// Inside SeoWidget:
const { config } = instance;
// config is typed as { metrics: ('visits' | 'bounce' | 'duration')[]; period: '7d' | '30d' | '90d' }
```

---

## Validation and Error Messages

Widget configs are validated at two levels:

### Runtime (Zod)

Config is parsed against `configSchema` on change. Invalid values show inline errors:

```typescript
const parsed = definition.configSchema.safeParse(newConfig);
if (!parsed.success) {
  return {
    error: parsed.error.flatten().fieldErrors,
  };
}
```

### On Save

Full schema validation before persisting. If invalid, show toast with specific error:

```typescript
const handleSave = async (instances: WidgetInstance[]) => {
  for (const instance of instances) {
    const definition = registry.get(instance.definitionId);
    const parsed = definition?.configSchema.safeParse(instance.config);
    if (!parsed.success) {
      toast.error(`Invalid config for ${definition.name}: ${parsed.error.message}`);
      return;
    }
  }
  await saveLayout(pageSlug, instances);
};
```

---

## Best Practices

1. **Always provide defaults** — Use `.default()` on Zod fields so new instances have valid configs
2. **Use enums for limited options** — Prevents typos and invalid values
3. **Keep config minimal** — Only store user choices, not derived data
4. **Version your schemas** — When changing configSchema, add a migration
5. **Handle loading states** — Widgets should show skeletons while fetching data
6. **Handle error states** — Show user-friendly errors when data fetching fails
7. **Use consistent icons** — Lucide icon names should match the widget's purpose
