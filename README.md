# DeesseJS

A modern headless CMS built for Next.js developers.

**Status: Early Development (v0.0.1)**

This project is in active development. The API is unstable and not ready for production use.

## What is DeesseJS?

DeesseJS is a headless CMS designed specifically for Next.js applications, providing:

- TypeScript-first API with full type safety
- Content management with collections and fields
- Visual editor for content creators
- Built-in admin dashboard
- Plugin system for extensibility
- Template-based project scaffolding

## Project Structure

This is a monorepo managed with pnpm and Turborepo:

```
deessejs/
├── packages/
│   ├── cli/                  # Command-line interface
│   ├── create-deesse-app/    # Project scaffolding tool
│   └── deesse/               # Core CMS package
├── templates/
│   ├── minimal/              # Minimal starter template
│   └── default/              # Default template with Tailwind + shadcn/ui
└── docs/                     # Documentation
```

## Quick Start (Future)

Once the first version is released:

```bash
# Create a new DeesseJS project
npx create-deesse-app@latest my-app

# Start development
cd my-app
pnpm dev
```

## Development (Contributors)

### Setup

```bash
# Install dependencies
pnpm install

# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run tests
pnpm test

# Format code
pnpm format
```

### Monorepo Commands

```bash
# Build all packages
pnpm build

# Run development mode for all packages
pnpm dev

# Clean build artifacts
pnpm clean
```

### Version Management

This project uses Changesets for version management:

```bash
# Create a changeset
pnpm changeset

# Version packages (consumes changesets)
pnpm changeset:version

# Publish packages to npm
pnpm changeset:publish
```

## Documentation

- [Development Guidelines](docs/guidelines/development-methodology.md)
- [v0.0.1 Documentation](docs/versions/0.0.1/)
  - [Repository Structure](docs/versions/0.0.1/repository-structure.md)
  - [Developer Experience](docs/versions/0.0.1/developer-experience.md)
  - [CI/CD & Versioning](docs/versions/0.0.1/ci-cd.md)
  - [What is Changesets?](docs/versions/0.0.1/what-is-changesets.md)

## Technology Stack

- **Runtime**: Node.js 18+
- **Package Manager**: pnpm 9+
- **Build System**: Turborepo
- **Language**: TypeScript 5.7+
- **Linting**: ESLint 9 with flat config
- **Formatting**: Prettier
- **Testing**: Vitest (unit), Playwright (E2E)
- **Versioning**: Changesets

## License

MIT

## Roadmap

### v0.0.1 (Current)

- CLI tool for project scaffolding
- Basic template system (minimal + default)
- Monorepo infrastructure with CI/CD

### v0.1.0 (Planned)

- Core CMS functionality
- Content collections
- Basic admin dashboard
- Documentation website

### v0.2.0+ (Future)

- Plugin system
- Visual editor
- Advanced admin features
- Production-ready release
