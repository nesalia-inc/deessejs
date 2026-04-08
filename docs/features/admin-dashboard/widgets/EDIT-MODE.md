# Edit Mode

**Status**: Research Complete

---

## Overview

Edit mode is controlled by a top-level `isEditMode: boolean` that propagates down to all widgets. This avoids per-widget conditional logic and ensures consistent behavior across the entire dashboard.

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

---

## Edit Mode Bar

A floating action bar at the bottom of the screen toggles edit mode:

```typescript
const EditModeBar = ({
  isEditMode,
  onToggle,
  hasChanges,
  onSave,
  onDiscard,
}: EditModeBarProps) => {
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

## What Changes in Edit Mode

| Element | View Mode | Edit Mode |
|---------|-----------|----------|
| Drag handles | Hidden | Visible (top-left corner) |
| Remove buttons | Hidden | Visible on hover (top-right) |
| Widget click | Opens link/action | Opens config panel |
| Widget positions | Fixed | Interactive (can drag) |
| "Add Widget" button | Hidden | Visible in header |
| Grid | Static | Sortable via dnd-kit |

---

## Widget Container (Edit Mode Overlays)

```typescript
const WidgetContainer = ({
  definition,
  instance,
  isEditMode,
  onRemove,
  dragHandleProps,
  isDragging,
}: WidgetContainerProps) => {
  return (
    <div
      className={cn(
        'relative h-full',
        isEditMode && 'ring-2 ring-primary ring-offset-2 rounded-lg',
        isDragging && 'shadow-lg'
      )}
      data-widget-id={instance.instanceId}
    >
      {/* Widget Content */}
      <definition.component
        instance={instance}
        isEditMode={isEditMode}
      />

      {/* Edit Mode Overlays */}
      {isEditMode && (
        <>
          {/* Drag Handle */}
          <div
            className="absolute -top-3 -left-3 cursor-move bg-primary text-primary-foreground rounded p-1"
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Remove Button */}
          {onRemove && (
            <button
              className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground rounded-full p-1"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </button>
          )}

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

## Widget Config Panel

When a widget is clicked in edit mode, a side panel (`Sheet`) opens with a form generated from the widget's Zod schema:

```typescript
const WidgetConfigPanel = ({
  definition,
  instance,
  onConfigChange,
  onClose,
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
        <SheetFooter>
          <Button onClick={onClose}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
```

---

## Auto-Save with Debouncing

Layout changes auto-save with 1-second debouncing to avoid excessive database writes:

```typescript
const DashboardPage = ({ page }) => {
  const [instances, setInstances] = useState<WidgetInstance[]>(page.widgets ?? []);

  const debouncedSave = useDebouncedCallback(
    async (newInstances: WidgetInstance[]) => {
      await saveLayout(page.slug, newInstances);
    },
    1000
  );

  useEffect(() => {
    debouncedSave(instances);
  }, [instances]);

  // ...
};
```

### Save Status Indicator

Show a subtle indicator while saving:

```typescript
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

const debouncedSave = useDebouncedCallback(
  async (newInstances: WidgetInstance[]) => {
    setSaveStatus('saving');
    await saveLayout(page.slug, newInstances);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  },
  1000
);

// In EditModeBar:
{saveStatus === 'saving' && <span className="text-xs text-muted-foreground">Saving...</span>}
{saveStatus === 'saved' && <span className="text-xs text-green-600">Saved</span>}
```

---

## Adding a New Widget

When user clicks "Add Widget" in edit mode:

1. Modal opens with widget picker (lists all from registry)
2. User selects a widget
3. System finds next available grid position
4. New instance inserted into `instances` array
5. `onInstancesChange` fires, triggering save

```typescript
const handleWidgetAdd = (definitionId: string) => {
  const definition = registry.get(definitionId);
  if (!definition) return;

  // Calculate next available position
  const maxY = instances.reduce(
    (max, i) => Math.max(max, i.position.y + i.position.h),
    0
  );

  const newInstance: WidgetInstance = {
    instanceId: generateId(),  // uuid
    definitionId,
    position: {
      x: 0,
      y: maxY,
      w: definition.defaultSize.w,
      h: definition.defaultSize.h,
    },
    config: definition.configSchema.parse({}),  // defaults
  };

  setInstances((prev) => [...prev, newInstance]);
  setShowWidgetSelector(false);
};
```

---

## Widget Picker Modal UI

```
┌─────────────────────────────────────────────────────────────┐
│  Add Widget                                             [X] │
├─────────────────────────────────────────────────────────────┤
│  [Search widgets...]                                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Statistics                                              ││
│  │ Display key metrics with trends                         ││
│  │ Built-in • 2x1 default                                  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Quick Actions                                           ││
│  │ List of action buttons                                  ││
│  │ Built-in • 1x1 default                                   ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ SEO Overview                                            ││
│  │ SEO statistics and insights                             ││
│  │ SEO Plugin • 2x1 default                                ││
│  └─────────────────────────────────────────────────────────┘│
│                              [Cancel]  [Add to Dashboard]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Removing a Widget

```typescript
const handleWidgetRemove = (instanceId: string) => {
  setInstances((prev) => prev.filter((w) => w.instanceId !== instanceId));
};
```

---

## Reordering via Drag

```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = instances.findIndex((i) => i.instanceId === active.id);
  const newIndex = instances.findIndex((i) => i.instanceId === over.id);

  if (oldIndex !== -1 && newIndex !== -1) {
    const reordered = arrayMove(instances, oldIndex, newIndex).map((instance, index) => ({
      ...instance,
      position: {
        ...instance.position,
        x: index % 12,
        y: Math.floor(index / 12),
      },
    }));
    setInstances(reordered);
  }
};
```
