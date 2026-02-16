# DeesseJS - Overview

## Vision

DeesseJS is a WordPress-like CMS designed specifically for developers, built as a Next.js overlay.

## Core Architecture

### Next.js Overlay

- DeesseJS runs as a layer over Next.js
- No modification of existing Next.js patterns required
- Seamless integration with existing Next.js applications

### Admin Dashboard

- Admin interface accessible via `/admin/[...slug]` route
- Single entry point for all administrative operations
- Full-featured dashboard for content and system management

### Core Features

- **Integrated Authentication**: Built-in auth system
- **Integrated Payments**: Native payment handling
- **Plugin System**: Extensible architecture for adding custom admin dashboard elements

### Configuration

- Centralized configuration via `deesse.config.ts`
- Single source of truth for all CMS settings
- TypeScript-based configuration for type safety
