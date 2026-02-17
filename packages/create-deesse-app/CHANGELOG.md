# @deessejs/create-app

## 0.2.3

### Patch Changes

- Fix template download failing with 302 redirect error by using fetch instead of https.get.

## 0.2.2

### Patch Changes

- Fix incorrect path to package.json when reading version dynamically.

## 0.2.1

### Patch Changes

- Fix CLI version display to read dynamically from package.json instead of hardcoded value.

## 0.2.0

### Minor Changes

- Download templates from GitHub at runtime instead of bundling them. Templates are cached locally for faster subsequent uses.

## 0.1.2

### Patch Changes

- Fix \_\_dirname not defined error in ES modules by adding proper polyfill.

## 0.1.1

### Patch Changes

- Add support for "." to create project in current directory. Parse CLI arguments and allow current directory initialization.

## 0.1.0

### Minor Changes

- 4206384: Add template copy functionality with default template including Next.js 16, React 19, and shadcn/ui configuration.
- 0ae9a72: Add template copy functionality with default template including Next.js 16, React 19, and shadcn/ui configuration.

## 0.0.1

### Initial Release

- Initial CLI scaffolding
- Dummy version for testing DX
- @clack/prompts for interactive CLI
- Template selection (minimal, default, full-stack)
