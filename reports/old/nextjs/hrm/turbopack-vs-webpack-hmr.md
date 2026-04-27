# Turbopack vs Webpack HMR

## Overview

Next.js supports two bundler backends, each with different HMR implementations:
1. **Turbopack** - Rust-based bundler (default since Next.js 15)
2. **Webpack** - JavaScript-based bundler (legacy default, still supported)

## Architectural Comparison

### Webpack HMR Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Development Server          │
                    │                                      │
  File Change ──────►│  ┌─────────┐    ┌─────────────┐   │
                    │  │ Webpack │────│ webpack-dev- │   │
                    │  │  Watch  │    │ middleware   │   │
                    │  └─────────┘    └─────────────┘   │
                    │       │                 │          │
                    │       ▼                 ▼          │
                    │  ┌─────────┐    ┌───────────┐     │
                    │  │ Babel   │    │ WebSocket  │     │
                    │  │ Transform│   │ Server     │     │
                    │  └─────────┘    └───────────┘     │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │              Browser                 │
                    │                                      │
                    │  ┌─────────────────────────────────┐│
                    │  │ webpack-dev-server client       ││
                    │  │ - webpack/hot/poll              ││
                    │  │ - react-refresh runtime         ││
                    │  └─────────────────────────────────┘│
                    └─────────────────────────────────────┘
```

### Turbopack HMR Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Development Server          │
                    │                                      │
  File Change ──────►│  ┌─────────┐    ┌─────────────┐   │
                    │  │Turbo-   │    │ Rust-native │   │
                    │  │pack     │    │ WebSocket   │   │
                    │  │Engine   │    │ Handler     │   │
                    │  └─────────┘    └─────────────┘   │
                    │       │                 │          │
                    │       ▼                 ▼          │
                    │  ┌─────────┐    ┌───────────┐     │
                    │  │ Native  │    │ Fast       │     │
                    │  │ HMR     │    │ Refresh    │     │
                    │  │ Protocol│    │ Runtime    │     │
                    │  └─────────┘    └───────────┘     │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │              Browser                 │
                    │                                      │
                    │  ┌─────────────────────────────────┐│
                    │  │ Turbopack HMR Client            ││
                    │  │ - Native protocol              ││
                    │  │ - react-refresh runtime        ││
                    │  └─────────────────────────────────┘│
                    └─────────────────────────────────────┘
```

## Performance Comparison

### Startup Time

| Application Size | Turbopack | Webpack | Difference |
|-----------------|-----------|---------|------------|
| Small (100 modules) | ~1s | ~10s | 10x faster |
| Medium (1,000 modules) | ~2s | ~30s | 15x faster |
| Large (5,000 modules) | ~4s | ~60s | 15x faster |
| Very Large (10,000+ modules) | ~8s | ~120s+ | 15x+ faster |

### HMR Update Latency

| Operation | Turbopack | Webpack |
|-----------|-----------|---------|
| Hot update (small change) | <50ms | 100-300ms |
| Hot update (module dependency) | <100ms | 300-500ms |
| Hot update (multiple modules) | <200ms | 500-1000ms |
| Full recompile | N/A | 1-5s+ |

### Memory Usage

| Metric | Turbopack | Webpack |
|--------|-----------|---------|
| Initial memory | Lower | Higher |
| Memory growth over time | Minimal | Compounds |
| Cache efficiency | Very high | Moderate |

## HMR Implementation Differences

### Module Replacement

**Webpack:**
1. File changes trigger full module recompilation
2. Creates `.hot-update.js` bundles
3. Sends hash and manifest to client
4. Client downloads updated chunks
5. `module.hot.accept()` fires for each updated module
6. React refresh scheduler runs

**Turbopack:**
1. File changes trigger incremental recompilation
2. Computes new module AST directly (Rust)
3. Sends minimal update via native protocol
4. Client receives pre-computed update
5. React refresh scheduler runs (same as webpack)

### State Preservation

Both bundlers use React's `react-refresh` runtime for state preservation:

```javascript
// This is identical in both implementations
// The difference is in HOW the update arrives, not HOW state is preserved

function Component() {
  const [count, setCount] = useState(0);

  // State preserved if:
  // 1. Hook signature matches
  // 2. Component is functional (not class)
  // 3. No /* @refresh reset */ directive
}
```

### Error Handling

**Webpack:** Uses `react-refresh-webpack-plugin` with webpack-dev-server integration

**Turbopack:** Native Rust implementation with same React refresh integration

```typescript
// Turbopack error handling (conceptual)
interface TurbopackError {
  type: 'syntax' | 'runtime' | 'module';
  file: string;
  message: string;
  line?: number;
  column?: number;
}
```

## Configuration Differences

### Enabling Turbopack (Default in Next.js 15+)

```javascript
// next.config.js - Turbopack is default, no config needed
module.exports = {}
```

### Enabling Webpack (Legacy)

```javascript
// next.config.js
module.exports = {
  // Force webpack
  // Just remove any webpack: false config if present
}

// Or via CLI:
next dev --webpack
```

### Turbopack Configuration

```javascript
// next.config.js
module.exports = {
  turbopack: {
    // File system cache for faster rebuilds
    turbopackFileSystemCache: './.next/cache/turbopack',

    // Resolve aliases
    resolveAlias: {
      '@': './src',
    },

    // Log level
    logLevel: 'info',

    // Events to listen to
    events: ['type:build', 'type:refresh'],
  },
}
```

### Webpack HMR Configuration

```javascript
// next.config.js
module.exports = {
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Webpack HMR plugins
      config.plugins.push(
        new webpack.HotModuleReplacementPlugin()
      );
    }
    return config;
  },
}
```

## Known Differences

### Turbopack-Specific Behavior

| Feature | Turbopack | Webpack |
|---------|-----------|---------|
| Server Components | Full reload | Full reload |
| Middleware changes | Full reload | Full reload |
| Edge Runtime changes | Full reload | Full reload |
| Client Components | Fast Refresh | Fast Refresh |
| CSS changes | HMR (no reload) | HMR (no reload) |
| API Route changes | Full reload | Full reload |

### Edge Cases and Limitations

**Turbopack:**
- Newer implementation, some edge cases may not be handled
- Not all webpack plugins have Turbopack equivalents
- Some complex webpack configurations may not work

**Webpack:**
- Slower for large applications
- Higher memory usage over time
- More mature, more edge cases handled

## When to Use Each

### Use Turbopack (Default) When:

1. **Using Next.js 15+** - It's the default
2. **Working with large applications** - Significantly faster HMR
3. **Rapid iteration required** - Sub-50ms updates
4. **Starting fresh** - No legacy webpack configuration to maintain

### Use Webpack (--webpack) When:

1. **Using webpack plugins that don't have Turbopack equivalents**
2. **Need specific webpack configuration** for legacy builds
3. **Encountering Turbopack bugs** - As a temporary workaround
4. **Specific webpack ecosystem integration** required

### Switching Between Bundlers

```bash
# Use Turbopack (default since Next.js 15)
next dev

# Use Webpack fallback
next dev --webpack

# Build with webpack
next build --webpack

# Build with Turbopack (default)
next build
```

## React Fast Refresh Compatibility

Both bundlers use the same React Fast Refresh runtime:

```javascript
// This code is identical whether using Turbopack or Webpack
// The bundler handles HOW updates are delivered
// React handles WHAT happens to components

import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}

// State preserved on hot update if:
// 1. Hook signature unchanged
// 2. Component is functional
// 3. No @refresh reset directive
```

## CLI Options

### Turbopack Commands

```bash
# Dev with Turbopack (default since Next.js 15)
next dev

# Specify Turbopack explicitly
next dev --turbo

# Turbopack build
next build  # Uses Turbopack by default in Next.js 15+
```

### Webpack Commands

```bash
# Dev with Webpack
next dev --webpack

# Build with Webpack
next build --webpack

# Verify which bundler is in use
# Look for "Turbopack" or "webpack" in console output
```

## Debugging HMR in Each Bundler

### Turbopack Debugging

```javascript
// Enable verbose logging
module.exports = {
  turbopack: {
    logLevel: 'verbose',
  },
}
```

### Webpack Debugging

```javascript
// In browser console
module.hot.status();
// Check webpack HMR status
```

## Migration Path

### From Webpack to Turbopack

If you have custom webpack configuration:

1. **Remove webpack-specific HMR plugins** (Turbopack has native HMR)
2. **Check resolve aliases** (may need updating)
3. **Test your application** with `next dev` (Turbopack default)
4. **Report issues** to Next.js if you encounter problems

### Preserving Webpack Configuration

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    // This only runs if using --webpack
    // Not used by Turbopack
    if (!isServer) {
      config.plugins.push(/* your plugins */);
    }
    return config;
  },
}
```

## References

- [Next.js Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack)
- [Turbopack GitHub](https://github.com/vercel/turbopack)
- [Vercel Blog: Turbopack Announcement](https://vercel.com/blog/turbopack)
- [Next.js Debugging Guide](https://nextjs.org/docs/app/guides/debugging)
- [React Fast Refresh](https://github.com/facebook/react/tree/main/packages/react-refresh)