# UI System

This is an internal document outlining the UI system for DeesseJS.

## Overview

DeesseJS provides a UI system that developers can use to build consistent admin interfaces. The system includes conventions for building UI components and a widget system for extending the dashboard home page.

## Tailwind CSS

All components use **Tailwind CSS** for styling. This provides:

- Utility-first approach
- Consistent spacing and sizing
- Easy customization

## shadcn Compatibility

The UI system is **100% shadcn compatible**. All components follow shadcn/ui patterns and use CSS variables for theming. This ensures:

- **Theme consistency**: Use shadcn CSS variables (`--primary`, `--ring`, `--radius`, etc.)
- **Dark mode support**: All components support light/dark themes automatically
- **Easy customization**: Components are fully customizable via CSS variables

All custom components must use shadcn theme variables:

```css
/* Correct - use theme variables */
.my-component {
  background-color: var(--background);
  color: var(--foreground);
  border-radius: var(--radius);
  padding: var(--spacing);
}

/* Avoid - hardcoded colors */
.my-component {
  background-color: #ffffff;
}
```

## Conventions

The UI system follows certain conventions to ensure consistency across the dashboard:

- Use provided base components
- Follow naming conventions
- Maintain consistent styling patterns
- Always use theme variables for colors, spacing, and radius

## Widgets

The admin dashboard UI is **100% customizable** through a drag-and-drop widget system.

### Drag-and-Drop

Widgets can be:
- **Moved anywhere**: Drag and drop widgets to any position on the page
- **Resized**: Adjust widget sizes
- **Reordered**: Change the order of widgets
- **Added/Removed**: Enable or disable widgets as needed

### Widget Types

- **Built-in widgets**: Default widgets provided by DeesseJS
- **Custom widgets**: Developers can create their own widgets
- **Plugin widgets**: Plugins can provide widgets that appear in the dashboard

### Customization

The dashboard layout is fully customizable. Users can arrange widgets to match their workflow and preferences.
