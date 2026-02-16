# Upgrade Guide

This guide explains how to upgrade your DeesseJS project to new versions using the `deesse upgrade` command.

## Overview

The upgrade system handles three types of updates:
- **Core packages** - `@deessejs/core` and related packages
- **Templates** - Project template updates (new components, config changes)
- **Dependencies** - Next.js, React, and other framework updates

## Checking for Updates

To see what updates are available without applying them:

```bash
deesse upgrade --dry-run
```

This will display:
- Current versions of all DeesseJS packages
- Latest available versions
- Breaking changes between versions
- Files that will be modified

## Basic Upgrade

To upgrade your project to the latest version:

```bash
deesse upgrade
```

The command will:
1. Check for available updates
2. Show you what will change
3. Ask for confirmation before proceeding
4. Apply migrations automatically
5. Update dependencies
6. Install new packages

### Interactive Prompt Example

```
? DeesseJS updates available

Core packages:
  @deessejs/core     0.1.0 → 0.2.0  (minor)
  @deessejs/cli      0.1.0 → 0.2.0  (minor)

Template:
  default             0.1.0 → 0.2.0  (minor)

Dependencies:
  next.js            16.1.6 → 16.2.0  (patch)

? Continue with upgrade? (y/N)
```

## Upgrade Options

### Upgrade to Specific Version

To upgrade to a specific version instead of the latest:

```bash
deesse upgrade --version 0.2.0
```

### Core Packages Only

If you only want to upgrade core packages without changing the template:

```bash
deesse upgrade --core-only
```

Use this when you want to stay on your current template version but get the latest core features.

### Template Upgrade

To update your project template:

```bash
deesse upgrade --template
```

This will:
- Update template files (configs, components)
- Preserve your customizations
- Prompt for conflict resolution

#### Template Conflict Resolution

When template files conflict with your customizations, you'll see:

```
? Conflict detected: tailwind.config.ts

Your version has custom modifications. What would you like to do?

  Keep my version
  Use template version
  Show diff
  Open in editor
```

Choose an option for each conflicting file, or use a flag to apply the same resolution to all conflicts:

```bash
deesse upgrade --template --resolve-conflicts=keep-existing
deesse upgrade --template --resolve-conflicts=force-overwrite
deesse upgrade --template --resolve-conflicts=merge
```

### Next.js Upgrade

To upgrade Next.js and apply related migrations:

```bash
deesse upgrade --next
```

This will:
- Update Next.js to the latest compatible version
- Apply @next/codemod transformations
- Update DeesseJS-specific integrations

### Verbose Mode

For detailed output during the upgrade process:

```bash
deesse upgrade --verbose
```

This shows:
- Every migration being applied
- Files being modified
- Commands being executed
- Success/warning messages

## Migration Process

### What Happens During Upgrade

1. **Version Detection**
   - Reads your current package.json
   - Fetches latest versions from npm registry
   - Determines migration path

2. **Backup Creation**
   - Creates `.deessejs/backup/` with timestamp
   - Stores original files before modifications
   - Enables rollback if something goes wrong

3. **Migration Application**
   - Applies codemods to update code
   - Modifies configuration files
   - Updates dependencies in package.json

4. **Package Installation**
   - Runs your package manager (pnpm/npm/yarn)
   - Installs updated dependencies
   - Regenerates lockfile

5. **Cleanup**
   - Removes temporary files
   - Shows summary of changes
   - Provides next steps

### Example Output

```bash
$ deesse upgrade

✔ Checking for updates...
✔ Found 3 packages to upgrade
✔ Creating backup at .deessejs/backup/2025-02-16-10-30-00

Applying migrations:

  ✔ v0.1.0 → v0.2.0: Update component imports (4 files)
  ✔ v0.1.0 → v0.2.0: Rename deprecated APIs (2 files)
  ✔ v0.1.0 → v0.2.0: Update configuration (1 file)

Installing packages:
  ✔ pnpm install (12s)

✨ Upgrade complete!

Summary:
  - @deessejs/core: 0.1.0 → 0.2.0
  - @deessejs/cli: 0.1.0 → 0.2.0
  - Template: 0.1.0 → 0.2.0

Next steps:
  - Review changes with: git diff
  - Run tests to verify everything works
  - Commit your changes

Backup stored at: .deessejs/backup/2025-02-16-10-30-00
```

## Rollback

If something goes wrong during the upgrade, you can rollback:

```bash
deesse upgrade --rollback
```

This will restore files from the most recent backup. You can also specify a specific backup:

```bash
deesse upgrade --rollback 2025-02-16-10-30-00
```

### Manual Rollback

If the automatic rollback doesn't work, you can manually restore from backup:

```bash
# List available backups
ls -la .deessejs/backup/

# Restore specific backup
cp -r .deessejs/backup/2025-02-16-10-30-00/* .
rm -rf node_modules
pnpm install
```

## Version Compatibility

DeesseJS follows semantic versioning:

- **Major (X.0.0)** - Breaking changes, manual migration likely required
- **Minor (0.X.0)** - New features, backward compatible
- **Patch (0.0.X)** - Bug fixes, drop-in replacement

### Supported Upgrade Paths

Direct upgrades are supported from any version to any later version:

```
0.1.0 → 0.2.0  ✔
0.1.0 → 0.3.0  ✔ (applies 0.2.0 migrations first)
0.2.0 → 0.3.0  ✔
```

Skipping multiple versions works automatically - migrations are applied sequentially.

### Next.js Compatibility

DeesseJS tracks compatibility with Next.js versions:

| DeesseJS | Next.js | React | Notes |
|----------|---------|-------|-------|
| 0.1.0    | 16.1.6  | 19.2.3 | Initial release |
| 0.2.0    | 16.1.6+ | 19.2.3+ | Added dark mode |
| 0.3.0    | 16.2.0+ | 19.2.3+ | Turbopack support |

Always check the release notes for version-specific compatibility information.

## Common Scenarios

### Scenario 1: Fresh Project Update

You created a project last month and want the latest features:

```bash
deesse upgrade
```

Everything updates automatically - no manual intervention needed.

### Scenario 2: Heavily Customized Project

You've modified many template files and want to update:

```bash
# First, see what would change
deesse upgrade --dry-run

# If you're happy with the changes, proceed but keep your customizations
deesse upgrade --template --resolve-conflicts=keep-existing

# Then update core packages
deesse upgrade --core-only
```

### Scenario 3: Next.js Major Version Upgrade

Next.js released a new major version and you want to upgrade:

```bash
# Check compatibility first
deesse upgrade --dry-run --next

# If compatible, proceed
deesse upgrade --next

# Review the changes and test thoroughly
git diff
pnpm test
```

### Scenario 4: Broken After Upgrade

Something isn't working after the upgrade:

```bash
# Rollback to the previous version
deesse upgrade --rollback

# Check what went wrong
cat .deessejs/backup/[timestamp]/upgrade.log

# Try again with verbose output to see more details
deesse upgrade --verbose
```

## Best Practices

### Before Upgrading

1. **Commit your changes**
   ```bash
   git add .
   git commit -m "Before upgrading to v0.2.0"
   ```

2. **Create a branch** (optional but recommended)
   ```bash
   git checkout -b upgrade-v0.2.0
   ```

3. **Check what will change**
   ```bash
   deesse upgrade --dry-run
   ```

### During Upgrade

1. **Use a separate terminal** - Keep your dev server running while upgrading in another terminal
2. **Read the prompts** - Don't blindly accept all defaults
3. **Review conflicts** - For template upgrades, choose wisely between versions

### After Upgrading

1. **Review changes**
   ```bash
   git diff
   ```

2. **Run tests**
   ```bash
   pnpm test
   ```

3. **Check the app**
   - Start the dev server
   - Visit key pages
   - Test critical functionality

4. **Commit the upgrade**
   ```bash
   git add .
   git commit -m "Upgrade to DeesseJS v0.2.0"
   ```

5. **Clean up old backups** (optional)
   ```bash
   # Remove backups older than 30 days
   rm -rf .deessejs/backup/*
   ```

## Troubleshooting

### "No updates available"

You're already on the latest version. Check with:
```bash
deesse --version
```

### "Migration failed"

A codemod couldn't be applied:
1. Check the error message for specifics
2. Use `--verbose` for more details
3. Manually apply the changes if needed
4. Report the issue if it seems like a bug

### "Package installation failed"

The package manager couldn't install updates:
1. Check your internet connection
2. Clear your package manager cache:
   ```bash
   pnpm store prune
   ```
3. Try installing manually:
   ```bash
   pnpm install
   ```

### "Git working directory not clean"

The upgrade command requires a clean git state:
```bash
# Stash your changes
git stash

# Run upgrade
deesse upgrade

# Restore changes (if needed)
git stash pop
```

### Template conflicts are overwhelming

Too many files conflict with the template:
```bash
# Keep all your customizations
deesse upgrade --template --resolve-conflicts=keep-existing

# Then manually cherry-pick template updates you want
```

## Advanced Usage

### Custom Migration Path

Upgrade through a specific version (useful for debugging):

```bash
# First go to 0.2.0
deesse upgrade --version 0.2.0

# Then go to 0.3.0
deesse upgrade --version 0.3.0
```

### Skip Specific Migrations

If a migration causes issues, you can skip it:

```bash
deesse upgrade --skip-migration rename-deprecated-api
```

Use with caution - this may leave your project in an inconsistent state.

### Force Re-run Migrations

Re-apply migrations even if they were already run:

```bash
deesse upgrade --force-migrations
```

Useful if a migration didn't apply correctly the first time.

### CI/CD Integration

For automated upgrades in CI/CD:

```yaml
# .github/workflows/upgrade.yml
name: Upgrade Dependencies

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  upgrade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: deesse upgrade --core-only --yes
      - run: pnpm test
      - run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "chore: upgrade dependencies"
          git push
```

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/nesalia-inc/deessejs/issues)
2. Search for similar problems
3. Create a new issue with:
   - DeesseJS version (`deesse --version`)
   - Node version (`node --version`)
   - Error message
   - Steps to reproduce
   - Output from `deesse upgrade --verbose`

## Related Documentation

- [Architecture Overview](./upgrade-system.md) - Technical details of the upgrade system
- [Migration Reference](./migrations.md) - List of all migrations
- [Release Notes](./releases.md) - Version-specific changes
