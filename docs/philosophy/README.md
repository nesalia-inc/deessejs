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

## Summary

DeesseJS = A configurable, extensible CMS that puts developers in control. Start with the admin dashboard, add plugins as needed, connect your preferred database, and build your perfect content management system.
