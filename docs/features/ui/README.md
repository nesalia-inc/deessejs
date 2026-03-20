# UI System

This is an internal document outlining the UI system for DeesseJS.

## Overview

DeesseJS provides a UI system that developers can use to build consistent admin interfaces. The system includes conventions for building UI components and a widget system for extending the dashboard home page.

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

The home page of the admin dashboard is extensible through a widget system. Developers can:

- **Define custom widgets**: Create reusable widget components
- **Modify the homepage layout**: Arrange widgets on the home page to create a personalized dashboard

Widgets allow developers to display relevant information and functionality directly on the dashboard landing page.
