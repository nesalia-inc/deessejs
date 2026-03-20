# Admin Dashboard

This is an internal document outlining the architecture of the admin dashboard for this project.

## Overview

DeesseJS is a CMS for developers. The admin dashboard provides a WordPress-like interface for content management, accessible at `/admin/[...slug]/page.tsx`.

## Routing

- **Native routes**: Core admin functionality is provided by built-in routes
- **Plugin routes**: The majority of admin routes are dynamically loaded from plugins, allowing extensibility

This architecture enables developers to extend the admin dashboard through the plugin system while maintaining a solid core of native functionality.

## Internal DSL

The dashboard is built using an internal DSL that allows developers to programmatically define the dashboard structure. This provides a clean, declarative way to build admin interfaces.

### Core Functions

- **`page()`**: Defines a new admin page
  - **`name`**: The page display name
  - **`children`**: Can be nested under a `section()`
  - **`content`**: A React component that renders the page content

- **`section()`**: Creates a section within a page

These functions will be explored in detail to define the dashboard structure.
