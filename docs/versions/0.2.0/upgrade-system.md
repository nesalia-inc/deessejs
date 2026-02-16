# Upgrade System Architecture

## Overview

DeesseJS requires a robust upgrade system to handle three distinct scenarios:
1. **Core package updates** - Upgrading `@deessejs/core` and related packages
2. **Template updates** - Migrating existing projects to newer templates
3. **Dependency updates** - Handling Next.js, React, and other dependency upgrades

This document outlines the architecture for implementing `deesse upgrade` command, inspired by Next.js's `next upgrade` functionality.

## System Architecture

### Components

```
@deessejs/cli
├── commands/
│   └── upgrade.ts        # Main upgrade command
├── utils/
│   ├── diff.ts           # Compare versions
│   └── migrate.ts        # Run codemods
└── config/
    └── templates.json    # Template version registry

@deessejs/codemod
├── transforms/
│   ├── core/             # Core package migrations
│   ├── template/         # Template migrations
│   └── dependencies/     # Dependency upgrades
└── utils/
    ├── ast.ts            # AST manipulation
    └── files.ts          # File operations

@deessejs/templates-registry
├── templates.json        # Available templates & versions
└── migrations/           # Migration paths
```

## Implementation Approaches

### Option A: Custom Codemods (Recommended)

**Pros:**
- Full control over transformations
- Tailored to DeesseJS architecture
- Can handle template-specific migrations
- No external dependency on Next.js internals

**Cons:**
- More development effort
- Need to maintain AST transformation logic

**Dependencies:**
- `jscodeshift` - Codemod runner
- `@babel/parser` - JavaScript/TypeScript parser
- `@babel/traverse` - AST traversal
- `@babel/types` - AST node types
- `prettier` - Code formatting after transformations

### Option B: Fork @next/codemod

**Pros:**
- Leverage existing battle-tested transformations
- Faster initial development

**Cons:**
- Fork maintenance burden
- May not align with DeesseJS architecture
- Risk of divergence from upstream

## Three Upgrade Scenarios

### Scenario 1: Core Package Updates

**Trigger:** User runs `deesse upgrade` when a new `@deessejs/core` version is available.

**Flow:**
1. Check current core version in package.json
2. Fetch latest version from npm registry
3. Determine migration path (e.g., 0.1.0 → 0.2.0)
4. Apply relevant codemods from `@deessejs/codemod/transforms/core/`
5. Update package.json dependencies
6. Run install command

**Example Migration:**
```
transforms/core/v0.1.0-to-v0.2.0/
├── remove-deprecated-api.ts
├── update-component-structure.ts
└── rename-exports.ts
```

### Scenario 2: Template Updates

**Trigger:** User wants to update their project template (e.g., new shadcn/ui components, updated Tailwind config).

**Flow:**
1. Detect current template version (stored in `.deessejs/template.json`)
2. Compare with available template versions
3. Identify files that have changed
4. For non-conflicting files: merge automatically
5. For conflicting files: prompt user for action
6. Apply template-specific codemods

**Conflict Resolution Options:**
- `--keep-existing` - Preserve user's files
- `--force-overwrite` - Use template version
- `--merge` - Attempt intelligent merge (default)
- `--interactive` - Prompt for each conflict

**Template Version File:**
```json
{
  "template": "default",
  "version": "0.1.0",
  "lastUpdated": "2025-01-15T10:00:00Z",
  "customizations": ["src/app/page.tsx", "tailwind.config.ts"]
}
```

### Scenario 3: Next.js Dependency Updates

**Trigger:** New Next.js version released with breaking changes.

**Flow:**
1. Check Next.js version compatibility matrix
2. Identify breaking changes for current version
3. Apply relevant @next/codemod transformations
4. Update Next.js dependency
5. Apply DeesseJS-specific adjustments

**Version Compatibility Matrix:**
```json
{
  "next": {
    "15.0.0": {
      "deesse": ">=0.1.0",
      "codemods": ["next-15-remove-image-import", "next-15-update-config"]
    },
    "16.0.0": {
      "deesse": ">=0.2.0",
      "codemods": ["next-16-turbopack-default", "next-16-update-app-dir"]
    }
  }
}
```

## CLI Command Structure

```bash
# Interactive upgrade (default)
deesse upgrade

# Check available upgrades without applying
deesse upgrade --dry-run

# Upgrade to specific version
deesse upgrade --version 0.2.0

# Force template update with conflict resolution
deesse upgrade --template --resolve-conflicts=force-overwrite

# Upgrade only core packages
deesse upgrade --core-only

# Upgrade Next.js dependencies
deesse upgrade --next

# Verbose output
deesse upgrade --verbose
```

## Migration Format

Each migration codemod follows this structure:

```typescript
// transforms/core/v0.1.0-to-v0.2.0/rename-component.ts
import { transform } from '@deessejs/codemod/utils';

export default transform({
  name: 'rename-deprecated-component',
  version: '0.2.0',
  description: 'Renames DeprecatedComponent to NewComponent',

  transform: (file, api) => {
    const j = api.jscodeshift;
    const root = j(file.source);

    // Find and replace component usage
    root.find(j.JSXIdentifier, { name: 'DeprecatedComponent' })
      .forEach(path => {
        path.node.name = 'NewComponent';
      });

    // Update imports
    root.find(j.ImportSpecifier)
      .filter(path => path.node.imported.name === 'DeprecatedComponent')
      .forEach(path => {
        path.node.imported.name = 'NewComponent';
      });

    return root.toSource({
      quote: 'double',
      trailingComma: true,
    });
  },
});
```

## Templates Registry

The templates registry tracks available templates and their versions:

```json
{
  "templates": {
    "default": {
      "latest": "0.2.0",
      "versions": {
        "0.1.0": {
          "createdAt": "2025-01-10T00:00:00Z",
          "next": "16.1.6",
          "react": "19.2.3",
          "shadcn": "61 components"
        },
        "0.2.0": {
          "createdAt": "2025-02-01T00:00:00Z",
          "next": "16.1.6",
          "react": "19.2.3",
          "shadcn": "61 components",
          "features": ["dark-mode", "i18n"]
        }
      }
    },
    "minimal": {
      "latest": "0.1.0",
      "versions": {
        "0.1.0": {
          "createdAt": "2025-01-15T00:00:00Z",
          "next": "16.1.6",
          "react": "19.2.3"
        }
      }
    }
  }
}
```

## Development Roadmap

### Phase 1: Foundation (v0.2.0)
- [ ] Create `@deessejs/codemod` package
- [ ] Implement basic AST utilities
- [ ] Set up jscodeshift runner
- [ ] Create template version tracking system

### Phase 2: Core Upgrades (v0.3.0)
- [ ] Implement `deesse upgrade` command
- [ ] Add version detection logic
- [ ] Create first core migration (v0.1.0 → v0.2.0)
- [ ] Add dry-run mode

### Phase 3: Template Updates (v0.4.0)
- [ ] Implement template diff algorithm
- [ ] Add conflict resolution system
- [ ] Create interactive prompt for conflicts
- [ ] Add `.deessejs/template.json` tracking

### Phase 4: Dependency Upgrades (v0.5.0)
- [ ] Integrate @next/codemod for Next.js updates
- [ ] Build version compatibility matrix
- [ ] Add automated dependency update detection
- [ ] Implement rollback mechanism

## Priority Ranking

1. **High Priority** (v0.2.0 - v0.3.0)
   - Core package upgrade system
   - Basic version detection and migration
   - Dry-run mode for safety

2. **Medium Priority** (v0.4.0)
   - Template update system
   - Conflict resolution
   - Interactive prompts

3. **Lower Priority** (v0.5.0+)
   - Next.js dependency upgrades
   - Rollback mechanism
   - Automatic update detection

## Technical Considerations

### AST Transformation Safety
- Always create backups before transformations
- Validate syntax after transformation
- Provide rollback option on failure
- Use prettier for consistent formatting

### Version Detection
- Read package.json for current versions
- Query npm registry for latest versions
- Cache version data to reduce API calls
- Handle private registry scenarios

### Error Handling
- Graceful degradation on partial failures
- Clear error messages with actionable steps
- Logging system for debugging
- User confirmation before destructive operations

### Testing Strategy
- Unit tests for each codemod
- Integration tests with sample projects
- E2E tests for full upgrade flow
- Regression tests for previous migrations

## References

- [Next.js Upgrade CLI](https://github.com/vercel/next.js/tree/canary/packages/next-upgrade)
- [@next/codemod](https://github.com/vercel/next.js/tree/canary/packages/codemod)
- [jscodeshift](https://github.com/facebook/jscodeshift)
- [Facebook Codemods](https://github.com/facebook/codemod)

## Future Enhancements

- **Automatic updates** - Optional background update checking
- **Plugin system** - Allow community codemods
- **Migration presets** - Pre-configured upgrade paths
- **Web UI** - Visual upgrade interface
- **Analytics** - Track upgrade success rates
