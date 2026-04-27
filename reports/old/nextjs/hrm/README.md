# Next.js HMR/Fast Refresh - Master Reference

This directory contains comprehensive documentation about Hot Module Replacement (HMR) and Fast Refresh in Next.js.

## Overview

Next.js provides two main hot reloading mechanisms:
1. **Fast Refresh** (default, recommended) - Preserves React component state on edits
2. **Traditional HMR** - Full module replacement without state preservation

## Document Index

### Core Concepts
- [`fast-refresh-core-mechanism.md`](./fast-refresh-core-mechanism.md) - Fundamental understanding of how Fast Refresh works at the React level
- [`nextjs-hmr-implementation.md`](./nextjs-hmr-implementation.md) - How Next.js specifically implements HMR/Fast Refresh
- [`browser-client-hmr-protocol.md`](./browser-client-hmr-protocol.md) - WebSocket protocol and browser client-side behavior

### Configuration & Options
- [`configuration-options.md`](./configuration-options.md) - next.config.js options and environment variables affecting HMR
- [`turbopack-vs-webpack-hmr.md`](./turbopack-vs-webpack-hmr.md) - Comparing Turbopack vs webpack HMR implementations

### Usage & Troubleshooting
- [`hmr-with-react-server-components.md`](./hmr-with-react-server-components.md) - HMR behavior with React Server Components
- [`troubleshooting-guide.md`](./troubleshooting-guide.md) - Common issues and fixes for HMR problems

### Advanced Topics
- [`advanced-hmr-customization.md`](./advanced-hmr-customization.md) - Custom HMR hooks, module.hot API, performance optimization

## Quick Reference

### What Gets Refreshed

| Change Type | Behavior |
|------------|----------|
| React component edit (function) | Preserves state, updates component |
| React component edit (class) | Full remount, state lost |
| Hook-only change | Preserves state if signature matches |
| Non-React module change | Page reload |
| Server Component change | Full page reload |

### State Preservation Rules

Fast Refresh preserves state when:
1. The edited file exports React components or hooks
2. The new code has compatible signatures (same hooks called in same order)
3. No syntax errors prevent the file from compiling

Fast Refresh resets state when:
1. `/* @refresh reset */` directive is present
2. Custom hooks outside components are edited
3. Class components are edited
4. Errors accumulate beyond threshold

### Configuration Options

```javascript
// next.config.js
module.exports = {
  // Turbopack (default since Next.js 15)
  turbopack: {
    // HMR-related options
  },

  // Webpack fallback
  webpack: (config) => {
    // Webpack HMR configuration
  },

  // Development indicators
  devIndicators: {
    buildActivity: true,
  },

  // Allowed origins for HMR (fixes CORS issues)
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
}
```

### Common Issues

1. **State loss after edit**: Add `/* @refresh reset */` to force remount, or check hook signature compatibility
2. **HMR not working in WSL2/Docker**: Use `allowedDevOrigins` config or `NEXT_HMR_ALLOWED_ORIGINS`
3. **Hydration mismatch**: Check for browser extensions interfering, or add `suppressHydrationWarning`
4. **WebSocket connection failing**: Ensure firewall allows localhost connections, try `NEXT_HMR_PORT`

## References

- [Next.js Fast Refresh Architecture](https://nextjs.org/docs/architecture/fast-refresh)
- [React Fast Refresh Package](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack)
- [Next.js Debugging Guide](https://nextjs.org/docs/app/guides/debugging)