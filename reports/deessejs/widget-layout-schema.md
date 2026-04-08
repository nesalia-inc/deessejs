# Widget Layout JSON Schema Design

## Executive Summary

This document defines a production-ready JSON schema for drag-and-drop widget-based page layouts, drawing from patterns in Notion, Airtable, Webflow, Builder.io, and WordPress Gutenberg. It provides recommended schemas, validation strategies, and migration/versioning patterns.

**Status**: Research and recommendations complete - implementation deferred per project instructions.

---

## 1. Industry Analysis

### 1.1 Notion

Notion uses a **block-based document model** where every element (paragraphs, headings, images, databases) is a "block" with a unique ID and optional children.

**Layout Representation**:
```typescript
type Block = {
  id: string;
  type: string;  // "paragraph", "heading_1", "image", "child_database"
  has_children: boolean;
  parent_id: string | null;
  parent_table: "workspace" | "page" | "database" | "block";
  properties: Record<string, unknown>;  // Type-specific properties
  content?: Block[];  // Nested children
  format?: Record<string, unknown>;  // Layout/styling
};
```

**Widget/Block Types**:
- Page sections via "toggle" blocks with children
- Columns via `column_list` parent with `column` children
- Embedded databases as `child_database` blocks
- Templates via `template` blocks

**Positioning**: Notion uses a flat block order with semantic containment (parent_id), not explicit x/y coordinates. Columns are explicit block types.

### 1.2 Airtable

Airtable uses a **grid-based view system** with field configurations and record-level data.

**Layout Representation**:
```typescript
type View = {
  id: string;
  name: string;
  type: "grid" | "gallery" | "kanban" | "calendar" | "formula";
  filterByFormula?: string;
  sort?: { field: string; direction: "asc" | "desc" }[];
  group?: { field: string; direction: "asc" | "desc" }[];
  fields: {
    fieldId: string;
    visible: boolean;
    width?: number;
    order: number;
  }[];
};
```

**Widget Equivalents**: Airtable calls them "blocks" in their Marketplace. Blocks are embedded apps that render within a view, configured via a `config` JSON object.

### 1.3 Webflow

Webflow uses a **nested element tree** with explicit positioning modes.

**Layout Representation**:
```typescript
type WebflowElement = {
  tag: string;  // "BODY", "DIV", "SECTION", "IMG", etc.
  children?: WebflowElement[];
  style?: {
    position?: "absolute" | "relative" | "fixed";
    display?: "flex" | "grid" | "block";
    flexDirection?: "row" | "column";
    gridColumn?: string;  // e.g., "span 2"
    gridRow?: string;
    width?: string;
    height?: string;
    breakpoints?: Record<string, Style>;  // Responsive variants
  };
  components?: {
    type: string;  // "FORM", "NAVLINK", "VIDEO"
    data: Record<string, unknown>;
  }[];
};
```

**Key Insight**: Webflow differentiates between element hierarchy (parent/child tree) and explicit positioning (CSS grid/flex properties). Responsive design uses breakpoint-specific style objects.

### 1.4 Builder.io

Builder.io uses a **layer-based composition** with explicit symbol references and responsive groups.

**Layout Representation** (from their open-source SDK):
```typescript
type BuilderContent = {
  id: string;
  name?: string;
  data: {
    blocks: BuilderBlock[];
  };
  modelId?: string;
  version?: string;
};

type BuilderBlock =
  | TextBlock
  | ImageBlock
  | ColumnsBlock
  | SymbolBlock
  | CustomBlock;

type ColumnsBlock = {
  kind: "columns";
  options: {
    columns: number;
    gap: number;
    widths?: number[];  // Per-column width overrides
    responsiveColumns?: boolean;
  };
  children?: BuilderBlock[];
};
```

**Positioning**: Uses a content-block list with implicit ordering. Columns are special blocks that contain child blocks. No explicit x/y coordinates.

### 1.5 WordPress Gutenberg (Block Editor)

Gutenberg uses a **flat block list with tree structure** via parent references, similar to Notion but more explicit.

**Layout Representation**:
```typescript
type GBBlock = {
  blockName: string;  // "core/paragraph", "core/columns"
  instanceId: string;
  attributes: Record<string, unknown>;
  innerBlocks?: GBBlock[];  // Explicit nested array
};

type GBPost = {
  blocks: GBBlock[];
  // Parsed into tree structure during render
};
```

**Widget Equivalents**: Gutenberg "widgets" are either:
1. Custom Gutenberg blocks registered via `registerBlockType`
2. Widget areas in the sidebar using the Legacy Widget block
3. Block patterns (pre-configured block arrangements)

---

## 2. Recommended Schema Structure for DeesseJS

### 2.1 Core Types

```typescript
// packages/deesse/src/widgets/types.ts

/**
 * Unique identifier for a widget definition (registered in WidgetRegistry)
 */
type WidgetDefinitionId = string & { readonly brand: unique symbol };

/**
 * Unique identifier for a widget instance (per-placement, UUID)
 */
type WidgetInstanceId = string & { readonly brand: unique symbol };

/**
 * Size in grid units
 */
type Size = {
  /** Width in columns (1-12 for 12-column grid) */
  w: number;
  /** Height in rows (1-4 max) */
  h: number;
};

/**
 * Position and size combined (grid coordinates)
 */
type Position = Size & {
  /** Column start (0-indexed, 0-11 for 12-column grid) */
  x: number;
  /** Row start (0-indexed, auto-calculated) */
  y: number;
};

/**
 * Base widget configuration (always present)
 */
type WidgetBaseConfig = {
  /** Visibility on different viewports */
  visibility?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
};

/**
 * Widget registry entry (definition)
 */
type WidgetDefinition<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Unique identifier for this widget type */
  id: WidgetDefinitionId;
  /** Human-readable name */
  name: string;
  /** Description for the widget picker */
  description?: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Default size when placed */
  defaultSize: Size;
  /** Minimum allowed size */
  minSize?: Size;
  /** Maximum allowed size */
  maxSize?: Size;
  /** Configuration schema for validation */
  configSchema: ZodSchema<TConfig>;
  /** React component to render */
  component: React.ComponentType<WidgetProps<TConfig>>;
  /** Version for migration support */
  version: string;
};

/**
 * Widget instance (a placed widget with position and config)
 */
type WidgetInstance<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Unique instance ID (UUID per placement) */
  instanceId: WidgetInstanceId;
  /** References WidgetDefinition.id */
  definitionId: WidgetDefinitionId;
  /** Grid position and size */
  position: Position;
  /** User-configured settings */
  config: TConfig;
  /** When this instance was created */
  createdAt: Date;
  /** When this instance was last modified */
  updatedAt: Date;
};

/**
 * Widget runtime props passed to component
 */
type WidgetProps<TConfig = Record<string, unknown>> = {
  instanceId: WidgetInstanceId;
  config: TConfig;
  onConfigChange: (config: Partial<TConfig>) => void;
  isEditMode: boolean;
  onRemove?: () => void;
  elementRef?: React.RefObject<HTMLDivElement>;
};
```

### 2.2 Page Layout Schema

```typescript
/**
 * A page containing widget instances
 */
type PageLayout = {
  /** Page identifier (URL slug component) */
  pageId: string;
  /** Widget instances on this page */
  widgets: WidgetInstance[];
  /** Layout version for migrations */
  layoutVersion: string;
  /** When layout was last modified */
  updatedAt: Date;
  /** Who last modified (userId for per-user layouts) */
  updatedBy?: string;
};

/**
 * User-specific layout customization (optional override)
 */
type UserLayout = {
  userId: string;
  pageId: string;
  widgets: WidgetInstance[];
  isDefault: boolean;  // true if same as page default
};

/**
 * Complete layout document stored in database
 */
type LayoutDocument = {
  id: string;
  pageSlug: string;
  userId?: string;  // null for page-default layouts
  widgets: WidgetInstance[];
  layoutVersion: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### 2.3 JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://deessejs.io/schemas/layout.json",
  "title": "Layout Document",
  "description": "JSON schema for DeesseJS widget-based page layouts",
  "type": "object",
  "required": ["id", "pageSlug", "widgets", "layoutVersion"],

  "definitions": {
    "position": {
      "type": "object",
      "required": ["x", "y", "w", "h"],
      "properties": {
        "x": {
          "type": "integer",
          "minimum": 0,
          "maximum": 11,
          "description": "Column start (0-indexed)"
        },
        "y": {
          "type": "integer",
          "minimum": 0,
          "description": "Row start (0-indexed, auto-calculated)"
        },
        "w": {
          "type": "integer",
          "minimum": 1,
          "maximum": 12,
          "description": "Width in columns"
        },
        "h": {
          "type": "integer",
          "minimum": 1,
          "maximum": 4,
          "description": "Height in rows"
        }
      },
      "additionalProperties": false
    },

    "widgetInstance": {
      "type": "object",
      "required": ["instanceId", "definitionId", "position", "config", "createdAt", "updatedAt"],
      "properties": {
        "instanceId": {
          "type": "string",
          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
          "description": "UUID v4 format"
        },
        "definitionId": {
          "type": "string",
          "minLength": 1,
          "description": "References widget definition ID"
        },
        "position": { "$ref": "#/definitions/position" },
        "config": {
          "type": "object",
          "description": "Widget-specific configuration"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "additionalProperties": false
    },

    "layoutDocument": {
      "type": "object",
      "required": ["id", "pageSlug", "widgets", "layoutVersion", "createdAt", "updatedAt"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "pageSlug": {
          "type": "string",
          "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$",
          "description": "URL-friendly page identifier"
        },
        "userId": {
          "type": ["string", "null"],
          "description": "null for page-default layout, user ID for per-user customization"
        },
        "widgets": {
          "type": "array",
          "items": { "$ref": "#/definitions/widgetInstance" },
          "default": []
        },
        "layoutVersion": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+$",
          "description": "Semantic version of layout schema"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time"
        }
      },
      "additionalProperties": false
    }
  },

  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "pageSlug": { "type": "string" },
    "userId": { "type": ["string", "null"] },
    "widgets": {
      "type": "array",
      "items": { "$ref": "#/definitions/widgetInstance" }
    },
    "layoutVersion": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  }
}
```

---

## 3. Nested Structures

### 3.1 Section/Group Pattern

For widgets that contain other widgets (like columns, tabs, accordions):

```typescript
/**
 * Container widget that holds child widgets
 */
type ContainerWidgetInstance = WidgetInstance<ContainerConfig> & {
  children: WidgetInstance[];
};

type ContainerConfig = {
  /** Container type */
  type: "columns" | "tabs" | "accordion" | "stack";
  /** For columns: number of columns */
  count?: number;
  /** For columns: column width ratios */
  ratios?: number[];
  /** Gap between children in pixels */
  gap?: number;
  /** Direction */
  direction?: "horizontal" | "vertical";
};

/**
 * Column container example
 */
type ColumnsInstance = WidgetInstance<{
  type: "columns";
  count: 2;
  gap: 16;
  ratios?: [1, 1];  // Optional 50/50 split
}> & {
  children: [WidgetInstance[], WidgetInstance[]];  // Array per column
};
```

### 3.2 JSON Schema for Nested Structures

```json
{
  "definitions": {
    "widgetInstanceWithChildren": {
      "type": "object",
      "properties": {
        "instanceId": { "type": "string" },
        "definitionId": { "type": "string" },
        "position": { "$ref": "#/definitions/position" },
        "config": {
          "oneOf": [
            { "$ref": "#/definitions/regularConfig" },
            { "$ref": "#/definitions/containerConfig" }
          ]
        },
        "children": {
          "type": "array",
          "items": { "$ref": "#/definitions/widgetInstanceWithChildren" }
        }
      }
    },

    "containerConfig": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "enum": ["columns", "tabs", "accordion", "stack"]
        },
        "count": {
          "type": "integer",
          "minimum": 2,
          "maximum": 6
        },
        "gap": {
          "type": "integer",
          "minimum": 0,
          "maximum": 48,
          "default": 16
        },
        "ratios": {
          "type": "array",
          "items": { "type": "number", "minimum": 0 }
        }
      }
    }
  }
}
```

---

## 4. Responsive Layouts

### 4.1 Breakpoint Strategy

```typescript
/**
 * Breakpoint-specific layout overrides
 */
type ResponsiveLayout = {
  /** Base layout (desktop) */
  base: WidgetInstance[];
  /** Tablet overrides (768px - 1024px) */
  tablet?: WidgetInstanceOverride[];
  /** Mobile overrides (<768px) */
  mobile?: WidgetInstanceOverride[];
};

/**
 * Partial override for a breakpoint
 * Null means widget is hidden at that breakpoint
 */
type WidgetInstanceOverride = {
  instanceId: WidgetInstanceId;
  position?: Partial<Position> | null;  // null = hidden
  config?: Partial<unknown> | null;
};
```

### 4.2 Responsive JSON Schema

```json
{
  "definitions": {
    "widgetOverride": {
      "type": "object",
      "properties": {
        "instanceId": { "type": "string" },
        "position": {
          "oneOf": [
            { "$ref": "#/definitions/position" },
            { "type": "null", "description": "Widget hidden at this breakpoint" }
          ]
        },
        "config": {
          "oneOf": [
            { "type": "object" },
            { "type": "null" }
          ]
        }
      }
    },

    "responsiveLayout": {
      "type": "object",
      "properties": {
        "base": {
          "type": "array",
          "items": { "$ref": "#/definitions/widgetInstance" }
        },
        "tablet": {
          "type": "array",
          "items": { "$ref": "#/definitions/widgetOverride" }
        },
        "mobile": {
          "type": "array",
          "items": { "$ref": "#/definitions/widgetOverride" }
        }
      }
    }
  }
}
```

### 4.3 Grid-to-Stack Transformation

On mobile, the 12-column grid transforms to single-column stack. Recommended transformation:

```typescript
/**
 * Transform grid positions to mobile stack
 * Desktop: x=2, y=0, w=3, h=2 becomes:
 * Mobile: y=auto (next row), w=1 (full width), h=auto (content height)
 */
function toMobileLayout(widgets: WidgetInstance[]): WidgetInstance[] {
  return widgets.map(widget => ({
    ...widget,
    position: {
      x: 0,
      y: widget.position.y,  // Preserve vertical order
      w: 12,  // Full width on mobile
      h: widget.position.h,
    }
  }));
}
```

---

## 5. Validation Strategies

### 5.1 Widget Configuration Validation with Zod

```typescript
// Widget config schemas are Zod schemas at definition time
const statsWidget = widget({
  id: "stats",
  name: "Statistics",
  configSchema: z.object({
    metric: z.enum(["users", "pageViews", "revenue", "orders"]),
    timeRange: z.enum(["7d", "30d", "90d", "365d"]).default("30d"),
    showTrend: z.boolean().default(true),
    colorScheme: z.enum(["default", "warm", "cool"]).optional(),
  }),
  component: StatsWidget,
  defaultSize: { w: 2, h: 1 },
  minSize: { w: 1, h: 1 },
  maxSize: { w: 4, h: 2 },
  version: "1.0.0",
}));

// Validation at runtime
type ValidationResult =
  | { ok: true; config: TConfig }
  | { ok: false; errors: ZodError };

function validateWidgetConfig<TConfig>(
  definition: WidgetDefinition<TConfig>,
  config: unknown
): ValidationResult {
  const result = definition.configSchema.safeParse(config);
  if (result.success) {
    return { ok: true, config: result.data };
  }
  return { ok: false, errors: result.error };
}
```

### 5.2 Layout-Level Validation

```typescript
/**
 * Validate entire layout against widget registry
 */
type LayoutValidationError =
  | { type: "UNKNOWN_WIDGET"; definitionId: string }
  | { type: "INVALID_POSITION"; instanceId: string; reason: string }
  | { type: "CONFIG_VALIDATION"; instanceId: string; errors: ZodError }
  | { type: "SIZE_CONSTRAINT_VIOLATION"; instanceId: string; violation: string };

function validateLayout(
  layout: PageLayout,
  widgetRegistry: Map<WidgetDefinitionId, WidgetDefinition>
): LayoutValidationError[] {
  const errors: LayoutValidationError[] = [];

  for (const widget of layout.widgets) {
    // Check widget definition exists
    const definition = widgetRegistry.get(widget.definitionId);
    if (!definition) {
      errors.push({ type: "UNKNOWN_WIDGET", definitionId: widget.definitionId });
      continue;
    }

    // Check position constraints
    if (widget.position.w < (definition.minSize?.w ?? 1)) {
      errors.push({
        type: "INVALID_POSITION",
        instanceId: widget.instanceId,
        reason: `Width ${widget.position.w} below minimum ${definition.minSize.w}`,
      });
    }
    if (widget.position.w > (definition.maxSize?.w ?? 12)) {
      errors.push({
        type: "INVALID_POSITION",
        instanceId: widget.instanceId,
        reason: `Width ${widget.position.w} above maximum ${definition.maxSize.w}`,
      });
    }

    // Validate config against definition schema
    const configResult = validateWidgetConfig(definition, widget.config);
    if (!configResult.ok) {
      errors.push({
        type: "CONFIG_VALIDATION",
        instanceId: widget.instanceId,
        errors: configResult.errors,
      });
    }
  }

  return errors;
}
```

### 5.3 JSON Schema Validation (Ajv)

```typescript
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// Compile layout schema once
const validateLayout = ajv.compile(layoutSchema);

// Validate at API boundary
function validateLayoutDocument(doc: unknown): boolean {
  const valid = validateLayout(doc);
  if (!valid) {
    console.error("Layout validation errors:", validateLayout.errors);
    return false;
  }
  return true;
}
```

---

## 6. Versioning and Migration

### 6.1 Layout Version Schema

```typescript
type LayoutVersion = `${number}.${number}.${number}`;

const CURRENT_LAYOUT_VERSION = "1.0.0";

/**
 * Version history for migrations
 */
type LayoutMigration = {
  fromVersion: LayoutVersion;
  toVersion: LayoutVersion;
  migrate: (layout: unknown) => unknown;
};

/**
 * Widget migration (when widget schema changes)
 */
type WidgetMigration = {
  widgetId: WidgetDefinitionId;
  fromSchema: string;
  toSchema: string;
  migrateConfig: (config: unknown) => unknown;
};
```

### 6.2 Migration Registry Pattern

```typescript
/**
 * Migration registry - handles layout and widget schema migrations
 */
class MigrationRegistry {
  private layoutMigrations: Map<string, LayoutMigration> = new Map();
  private widgetMigrations: Map<string, WidgetMigration[]> = new Map();

  /**
   * Register a layout migration
   */
  registerLayoutMigration(migration: LayoutMigration): void {
    const key = `${migration.fromVersion}->${migration.toVersion}`;
    this.layoutMigrations.set(key, migration);
  }

  /**
   * Register a widget config migration
   */
  registerWidgetMigration(migration: WidgetMigration): void {
    const existing = this.widgetMigrations.get(migration.widgetId) ?? [];
    existing.push(migration);
    this.widgetMigrations.set(migration.widgetId, existing);
  }

  /**
   * Migrate layout to current version
   */
  migrateLayout(layout: PageLayout): PageLayout {
    const migrations = this.getMigrations(layout.layoutVersion, CURRENT_LAYOUT_VERSION);
    let migrated = layout;

    for (const migration of migrations) {
      migrated = migration.migrate(migrated) as PageLayout;
    }

    return { ...migrated, layoutVersion: CURRENT_LAYOUT_VERSION };
  }

  /**
   * Migrate widget config to current schema
   */
  migrateWidgetConfig(
    definitionId: WidgetDefinitionId,
    config: unknown,
    fromVersion: string
  ): unknown {
    const widgetMigrations = this.widgetMigrations.get(definitionId) ?? [];
    const applicable = widgetMigrations.filter(m => m.fromSchema === fromVersion);

    let migrated = config;
    for (const migration of applicable) {
      migrated = migration.migrateConfig(migrated);
    }

    return migrated;
  }

  private getMigrations(from: string, to: string): LayoutMigration[] {
    // Simple linear migration path
    // Could be extended for non-linear version graphs
    const migrations: LayoutMigration[] = [];
    let current = from;

    while (current !== to) {
      const next = this.findNextVersion(current, to);
      if (!next) break;

      const key = `${current}->${next}`;
      const migration = this.layoutMigrations.get(key);
      if (!migration) break;

      migrations.push(migration);
      current = next;
    }

    return migrations;
  }

  private findNextVersion(current: string, target: string): string | null {
    // Find immediate next version in migration chain
    const versions = [current, target].map(parseVersion);
    // Simple implementation: assume sequential patch version increments
    if (versions[0].major === versions[1].major && versions[0].minor === versions[1].minor) {
      return `${versions[0].major}.${versions[0].minor}.${versions[0].patch + 1}`;
    }
    return null;
  }
}

// Global registry
export const migrations = new MigrationRegistry();
```

### 6.3 Example Migrations

```typescript
/**
 * Migration: v1.0.0 -> v1.1.0
 * Widget 'stats' added 'colorScheme' field (optional, defaults to 'default')
 */
migrations.registerWidgetMigration({
  widgetId: "stats",
  fromSchema: "1.0.0",
  toSchema: "1.1.0",
  migrateConfig: (config) => ({
    ...config,
    colorScheme: (config as any).colorScheme ?? "default",
  }),
});

/**
 * Migration: v1.0.0 -> v1.1.0
 * Layout 'position' field renamed to 'gridPosition' for clarity
 * (This is a hypothetical breaking change example)
 */
migrations.registerLayoutMigration({
  fromVersion: "1.0.0",
  toVersion: "1.1.0",
  migrate: (layout: any) => ({
    ...layout,
    widgets: layout.widgets.map((w: any) => ({
      ...w,
      gridPosition: w.position,
      position: undefined,  // Remove old field
    })),
  }),
});
```

### 6.4 Version Detection and Auto-Migration

```typescript
/**
 * Detect layout version and auto-migrate if needed
 */
function processLayout(
  rawLayout: unknown,
  widgetRegistry: Map<WidgetDefinitionId, WidgetDefinition>
): PageLayout {
  if (!isLayoutDocument(rawLayout)) {
    throw new Error("Invalid layout document structure");
  }

  const layout = rawLayout as PageLayout;

  if (layout.layoutVersion === CURRENT_LAYOUT_VERSION) {
    return layout;
  }

  // Auto-migrate
  const migratedLayout = migrations.migrateLayout(layout);

  // Re-validate after migration
  const errors = validateLayout(migratedLayout, widgetRegistry);
  if (errors.length > 0) {
    console.error("Post-migration validation errors:", errors);
    throw new Error("Migration failed validation");
  }

  return migratedLayout;
}
```

---

## 7. Widget Definition Registry

### 7.1 Registry Type

```typescript
/**
 * Widget registry - maps definition IDs to definitions
 */
class WidgetRegistry {
  private definitions: Map<WidgetDefinitionId, WidgetDefinition> = new Map();

  /**
   * Register a widget definition
   */
  register<TConfig extends Record<string, unknown>>(
    definition: WidgetDefinition<TConfig>
  ): void {
    if (this.definitions.has(definition.id)) {
      console.warn(`Widget ${definition.id} already registered, overwriting`);
    }
    this.definitions.set(definition.id, definition as WidgetDefinition);
  }

  /**
   * Get a widget definition
   */
  get(id: WidgetDefinitionId): WidgetDefinition | undefined {
    return this.definitions.get(id);
  }

  /**
   * Get all registered widget definitions
   */
  getAll(): WidgetDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get all widget IDs
   */
  getIds(): WidgetDefinitionId[] {
    return Array.from(this.definitions.keys());
  }

  /**
   * Check if a widget is registered
   */
  has(id: WidgetDefinitionId): boolean {
    return this.definitions.has(id);
  }

  /**
   * Create a frozen snapshot for persistence/transmission
   */
  snapshot(): WidgetDefinitionSnapshot[] {
    return this.getAll().map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      iconName: def.icon?.displayName,  // Serializable icon reference
      defaultSize: def.defaultSize,
      minSize: def.minSize,
      maxSize: def.maxSize,
      configSchemaJson: JSON.stringify(def.configSchema),  // Or schema ID
      version: def.version,
    }));
  }
}

// Global registry instance
export const widgetRegistry = new WidgetRegistry();
```

### 7.2 Built-in Widgets Registration

```typescript
// packages/deesse/src/widgets/builtin.ts
import { widgetRegistry } from "./registry";
import { widget } from "./widget";

/**
 * Register all built-in widgets
 */
export function registerBuiltinWidgets(): void {
  widgetRegistry.register(
    widget({
      id: "stats",
      name: "Statistics",
      description: "Display key metrics with trends",
      icon: BarChartIcon,
      defaultSize: { w: 2, h: 1 },
      minSize: { w: 1, h: 1 },
      maxSize: { w: 4, h: 2 },
      configSchema: z.object({
        metric: z.enum(["users", "pageViews", "revenue", "orders"]),
        timeRange: z.enum(["7d", "30d", "90d", "365d"]).default("30d"),
        showTrend: z.boolean().default(true),
        colorScheme: z.enum(["default", "warm", "cool"]).optional(),
      }),
      component: StatsWidget,
      version: "1.0.0",
    })
  );

  widgetRegistry.register(
    widget({
      id: "quick-actions",
      name: "Quick Actions",
      description: "Shortcuts to common actions",
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
          { label: "New Post", href: "/admin/posts/new", icon: "Plus" },
        ]),
      }),
      component: QuickActionsWidget,
      version: "1.0.0",
    })
  );

  widgetRegistry.register(
    widget({
      id: "recent-activity",
      name: "Recent Activity",
      description: "Timeline of recent events",
      icon: ActivityIcon,
      defaultSize: { w: 1, h: 2 },
      minSize: { w: 1, h: 1 },
      maxSize: { w: 3, h: 4 },
      configSchema: z.object({
        limit: z.number().min(5).max(50).default(10),
        types: z.array(z.enum(["post", "user", "comment"])).optional(),
      }),
      component: RecentActivityWidget,
      version: "1.0.0",
    })
  );

  widgetRegistry.register(
    widget({
      id: "chart",
      name: "Chart",
      description: "Visualize data with charts",
      icon: ChartLineIcon,
      defaultSize: { w: 2, h: 2 },
      minSize: { w: 2, h: 1 },
      maxSize: { w: 6, h: 4 },
      configSchema: z.object({
        chartType: z.enum(["line", "bar", "pie", "area"]).default("line"),
        dataSource: z.string(),
        xAxis: z.string(),
        yAxis: z.string(),
      }),
      component: ChartWidget,
      version: "1.0.0",
    })
  );
}
```

---

## 8. Persistence Schema (Database)

### 8.1 Drizzle Schema for Layouts

```typescript
// packages/deesse/src/widgets/schema.ts
import { pgTable, uuid, varchar, jsonb, timestamp, text, boolean } from "drizzle-orm/pg-core";

/**
 * Layouts table - stores widget layouts per page/user
 */
export const layouts = pgTable("deesse_widget_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageSlug: varchar("page_slug", { length: 255 }).notNull(),
  userId: uuid("user_id").references(() => users.id),  // Null for page-default layout
  widgets: jsonb("widgets").notNull().default([]),
  layoutVersion: varchar("layout_version", { length: 50 }).notNull().default("1.0.0"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  pageUserIdx: unique().on(table.pageSlug, table.userId),
  pageDefaultIdx: unique().on(table.pageSlug).where(sql`${table.userId} IS NULL`),
}));

/**
 * Widget definitions table - stores widget metadata for the registry
 */
export const widgetDefinitions = pgTable("deesse_widget_definitions", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }),
  defaultWidth: jsonb("default_size").notNull(),  // { w: number, h: number }
  minWidth: jsonb("min_size"),
  maxWidth: jsonb("max_size"),
  configSchema: jsonb("config_schema").notNull(),  // Zod schema JSON
  componentPath: varchar("component_path", { length: 500 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### 8.2 API Endpoints

```typescript
// pages/api/widgets/[pageSlug]/route.ts

/**
 * GET /api/widgets/[pageSlug]
 * Get layout for a page (user-specific or default)
 */
export async function GET(
  request: Request,
  { params }: { params: { pageSlug: string } }
) {
  const searchParams = new URL(request.url).searchParams;
  const userId = searchParams.get("userId");  // Optional

  const layout = await db.query.layouts.findFirst({
    where: userId
      ? sql`${layouts.pageSlug} = ${params.pageSlug} AND ${layouts.userId} = ${userId}`
      : sql`${layouts.pageSlug} = ${params.pageSlug} AND ${layouts.userId} IS NULL AND ${layouts.isDefault} = true`,
  });

  if (!layout) {
    return Response.json({ error: "Layout not found" }, { status: 404 });
  }

  // Auto-migrate if needed
  const processed = processLayout(layout.widgets, widgetRegistry);

  return Response.json(processed);
}

/**
 * PUT /api/widgets/[pageSlug]
 * Save layout for a page
 */
export async function PUT(
  request: Request,
  { params }: { params: { pageSlug: string } }
) {
  const body = await request.json();
  const { userId, widgets, isDefault } = body;

  // Validate layout first
  const errors = validateLayout({ widgets } as PageLayout, widgetRegistry);
  if (errors.length > 0) {
    return Response.json({ error: "Validation failed", errors }, { status: 400 });
  }

  if (isDefault) {
    // Upsert default layout
    await db.query.layouts.upsert({
      where: sql`${layouts.pageSlug} = ${params.pageSlug} AND ${layouts.userId} IS NULL`,
      set: { widgets, layoutVersion: CURRENT_LAYOUT_VERSION, updatedAt: new Date() },
      create: {
        pageSlug: params.pageSlug,
        userId: null,
        widgets,
        layoutVersion: CURRENT_LAYOUT_VERSION,
        isDefault: true,
      },
    });
  } else {
    // Upsert user-specific layout
    await db.query.layouts.upsert({
      where: sql`${layouts.pageSlug} = ${params.pageSlug} AND ${layouts.userId} = ${userId}`,
      set: { widgets, layoutVersion: CURRENT_LAYOUT_VERSION, updatedAt: new Date() },
      create: {
        pageSlug: params.pageSlug,
        userId,
        widgets,
        layoutVersion: CURRENT_LAYOUT_VERSION,
        isDefault: false,
      },
    });
  }

  return Response.json({ success: true });
}
```

---

## 9. Summary

### 9.1 Recommended Core Schema

```typescript
// Final recommended types

type WidgetInstance = {
  instanceId: string;  // UUID v4
  definitionId: string;  // References WidgetDefinition.id
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  createdAt: string;  // ISO date-time
  updatedAt: string;  // ISO date-time
};

type PageLayout = {
  id: string;
  pageSlug: string;
  userId: string | null;  // null for page-default
  widgets: WidgetInstance[];
  layoutVersion: string;  // Semantic version "major.minor.patch"
  createdAt: string;
  updatedAt: string;
};
```

### 9.2 Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|------------|
| **Positioning** | Explicit grid coordinates (x, y, w, h) | Simple, predictable, supports collision detection |
| **Config validation** | Zod schemas per widget definition | Type-safe, runtime validation, self-documenting |
| **Layout versioning** | Semantic version string on layout | Clear migration path, easy version detection |
| **Widget versioning** | Version field on definition + migrations registry | Supports breaking schema changes with auto-migration |
| **Responsive** | Breakpoint overrides (tablet, mobile) | Clean separation, no magic breakpoints |
| **Nested structures** | Container widgets with children array | Extensible for columns, tabs, accordions |
| **Registry** | In-memory Map with snapshot capability | Fast access, serializable for client |

### 9.3 Open Questions

1. **Per-user vs per-page layouts**: Should the schema support user-specific layouts or just page defaults?
2. **Offline/resume edit mode**: Should unsaved edits be stored locally (localStorage) before API save?
3. **Layout templates**: Should users be able to save named layout templates?
4. **Collaborative editing**: Real-time sync would require operation transforms (like Notion)
5. **Undo/redo**: Client-side history stack vs server-side snapshots

### 9.4 Files Reference

| File | Purpose |
|------|---------|
| `docs/features/ui/WIDGET-SYSTEM.md` | Existing widget system design |
| `reports/deessejs/admin-dashboard-architecture.md` | Admin dashboard structure |
| `reports/deessejs/deessejs-integration-design.md` | DeesseJS integration patterns |

---

## 10. References

- [Notion Block API](https://developers.notion.com/reference/block)
- [Builder.io Content API](https://www.builder.io/content-api)
- [WordPress Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [Webflow CMS API](https://developers.webflow.com/)
- [Airtable API](https://developer.airtable.com/)
- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- [Zod Validation](https://zod.dev/)
- [Ajv JSON Schema Validator](https://ajv.js.org/)
