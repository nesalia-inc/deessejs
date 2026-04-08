# Drag-and-Drop System

**Status**: Research Complete

---

## Library Choice: dnd-kit

| Library | Maintenance | React 19 | Accessibility | Bundle |
|---------|-------------|----------|---------------|--------|
| **dnd-kit** | Active (2025) | Yes | Built-in | ~15kb |
| react-dnd | Stale (2022) | Unknown | Manual | ~15kb |
| react-beautiful-dnd | Archived (2021) | — | — | — |

**Why not react-dnd or react-beautiful-dnd?** Both are effectively unmaintained. react-dnd's last release was April 2022. react-beautiful-dnd was archived by Atlassian in 2021. Neither supports React 19 reliably.

**dnd-kit packages used:**
```
@dnd-kit/core          # DndContext, DragOverlay, sensors
@dnd-kit/sortable      # SortableContext, useSortable
@dnd-kit/utilities     # CSS transforms
```

---

## dnd-kit Packages

### @dnd-kit/core

Core primitives:

```typescript
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
```

| Component | Purpose |
|-----------|---------|
| `DndContext` | Wraps the drag-and-drop area |
| `DragOverlay` | Renders a ghost of the dragged item |
| `useSensor` | Configures input sensors |
| `PointerSensor` | Mouse/touch drag detection |
| `KeyboardSensor` | Arrow-key-based reordering |
| `closestCenter` | Collision detection algorithm |

### @dnd-kit/sortable

For sortable lists:

```typescript
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
```

| Component | Purpose |
|-----------|---------|
| `SortableContext` | Marks children as sortable |
| `useSortable` | Makes an item sortable |
| `rectSortingStrategy` | Position-based sorting |
| `verticalListSortingStrategy` | Vertical list sorting |
| `arrayMove` | Utility to reorder array items |

---

## Dashboard Grid Implementation

```typescript
const DashboardGrid = ({
  registry,
  instances,
  isEditMode,
  onInstancesChange,
}: DashboardGridProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },  // Must drag 8px before drag starts
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = instances.findIndex(i => i.instanceId === active.id);
    const newIndex = instances.findIndex(i => i.instanceId === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(instances, oldIndex, newIndex).map((instance, index) => ({
        ...instance,
        position: {
          ...instance.position,
          x: index % 12,
          y: Math.floor(index / 12),
        },
      }));
      onInstancesChange(reordered);
    }
  };

  const activeInstance = activeId
    ? instances.find(i => i.instanceId === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={instances.map(i => i.instanceId)}
        strategy={rectSortingStrategy}
        disabled={!isEditMode}
      >
        <div
          className="grid gap-4"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridAutoRows: '80px',
          }}
        >
          {instances.map(instance => {
            const definition = registry.get(instance.definitionId);
            if (!definition) return null;
            return (
              <SortableWidgetItem
                key={instance.instanceId}
                instance={instance}
                definition={definition}
                isEditMode={isEditMode}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeInstance && (
          <WidgetContainer
            definition={registry.get(activeInstance.definitionId)!}
            instance={activeInstance}
            isEditMode={isEditMode}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};
```

---

## Sortable Widget Item

```typescript
const SortableWidgetItem = ({
  instance,
  definition,
  isEditMode,
  onRemove,
}: SortableWidgetItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: instance.instanceId,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${instance.position.w}`,
    gridRow: `span ${instance.position.h}`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <WidgetContainer
        definition={definition}
        instance={instance}
        isEditMode={isEditMode}
        onRemove={onRemove}
        dragHandleProps={listeners}
      />
    </div>
  );
};
```

---

## Drag Activation Constraint

Set a minimum activation distance to prevent accidental drags when a user clicks a widget to configure it:

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // Must drag 8px before drag starts
    },
  }),
  useSensor(KeyboardSensor)
);
```

This ensures:
- Clicking a widget to configure it does NOT start a drag
- Dragging starts only after 8px of movement
- Keyboard reordering works via arrow keys

---

## Nested Sortable (Widgets with Internal Lists)

Some widgets (e.g., "Quick Actions" with reorderable items) need their own sortable lists. These use a **nested `DndContext`** scoped to the widget's DOM subtree:

```typescript
// Inside a widget that has sortable children
const SortableActionList = ({ items, onReorder }: SortableActionListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {items.map(item => (
          <SortableActionItem key={item.id} item={item} />
        ))}
      </SortableContext>
    </DndContext>
  );
};
```

**Important:** Each nested `DndContext` is isolated to its DOM subtree. Drag events within a widget's internal list do not interfere with the outer dashboard grid's drag context.

---

## Keyboard Navigation

dnd-kit provides keyboard support automatically when using `KeyboardSensor`:

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor)  // Built-in keyboard support
);
```

With `KeyboardSensor`, users can:
- **Tab** to focus a widget
- **Space/Enter** to pick up
- **Arrow keys** to move
- **Space/Enter** to drop

---

## Accessibility

dnd-kit's accessibility features:
- ARIA attributes on draggable elements
- Screen reader announcements for drag states
- Keyboard navigation support
- Focus management

This exceeds what `react-dnd` and `react-beautiful-dnd` provide out of the box.
