# Philosophy

This document outlines the general philosophy and vision of DeesseJS.

## Vision

DeesseJS is designed to be the **center of a set of development tools** that simplify the lives of developers. Instead of building from scratch every time, DeesseJS provides a solid foundation that can be extended and customized.

## Core Principles

### 1. Everything is Configurable

Every aspect of DeesseJS should be configurable. The framework provides sensible defaults, but developers can override and customize almost everything:

- Database providers (Drizzle, Prisma, or custom)
- Authentication
- Admin dashboard pages and sections
- UI components and widgets
- API routes

### 2. Plugin-First Architecture

Functionality should be delivered through plugins. This allows:
- Modular architecture
- Easy sharing between projects
- Independent updates
- Community contributions

### 3. Start Simple, Extend Later

The framework starts with a minimal core that can be extended over time. Begin with the admin dashboard and progressively add features as needed.

## Database Agnostic

DeesseJS should support multiple database providers. Whether you prefer Drizzle, Prisma, or another solution, DeesseJS should work with your choice. The framework abstracts database operations to provide a consistent interface regardless of the underlying provider.

## The Admin Dashboard First

The initial focus is on building a **controllable admin dashboard** that developers can:
- Customize with custom pages and sections
- Extend via plugins
- Build upon for their specific needs

This dashboard serves as the foundation for content management while remaining flexible enough to handle various use cases.

## Defaults

The only defaults in DeesseJS are:

1. **Admin Dashboard** - A basic admin interface at `/admin`
2. **Authentication** - Built on better-auth for user management
3. **Plugin System** - The ability to extend via plugins

Everything else (database, API routes, content types, etc.) is opt-in and configured by the developer.

## Database Requirement

A database provider is required because **plugin settings need to be persisted**. Each plugin can define its own settings (via the Zod schema), and these need to be stored somewhere. DeesseJS supports multiple database providers (Drizzle, Prisma, or custom) to give developers flexibility.

## Summary

DeesseJS = A configurable, extensible CMS that puts developers in control. Start with the admin dashboard, add plugins as needed, connect your preferred database, and build your perfect content management system.

## Multi-Platform Support (Future)

DeesseJS aims to be a **multi-platform framework** that supports:

- **Web** - Next.js based admin dashboard
- **Mobile** - Expo/React Native integration
- **Desktop** - Electron integration

This will be managed through a **monorepo** structure, allowing shared code between platforms. This is a future consideration that requires careful planning to ensure proper architecture.

*Note: Multi-platform support is planned but requires deeper exploration to ensure proper implementation.*
