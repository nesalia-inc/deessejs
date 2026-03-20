# Admin Dashboard

This is an internal document outlining the architecture of the admin dashboard for this project.

## Overview

DeesseJS is a CMS for developers. The admin dashboard provides a WordPress-like interface for content management, accessible at `/admin/[...slug]/page.tsx`.

## Routing

- **Native routes**: Core admin functionality is provided by built-in routes
- **Plugin routes**: The majority of admin routes are dynamically loaded from plugins, allowing extensibility

This architecture enables developers to extend the admin dashboard through the plugin system while maintaining a solid core of native functionality.
