# Next.js HMR Implementation

## Overview

Next.js implements Hot Module Replacement (HMR) through two different bundler backends:
1. **Webpack with react-refresh-webpack-plugin** (legacy, Next.js 14 and earlier default)
2. **Turbopack with native HMR** (default since Next.js 15)

Both aim to provide Fast Refresh, but the implementation details differ significantly.

## Webpack-Based HMR (Pages Router & Legacy)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Development Server                        │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │   Webpack   │  │ react-refresh    │  │   WebSocket   │  │
│  │   Dev       │──│ webpack-plugin   │──│   Server      │  │
│  │   Server    │  │                  │  │               │  │
│  └─────────────┘  └──────────────────┘  └───────────────┘  │
│        │                                        │          │
│        │         ┌──────────────────┐            │          │
│        └─────────│   Next.js        │────────────┘          │
│                  │   HMR Client     │                       │
│                  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Browser       │
                    │   - Webpack     │
                    │   - React       │
                    │   - HMR Client  │
                    └─────────────────┘
```

### Webpack Configuration

Next.js webpack config includes HMR via `react-refresh-webpack-plugin`:

```javascript
// packages/next/build/webpack-config.ts (simplified)
const webpackConfig = {
  mode: 'development',
  plugins: [
    // ...other plugins
    isServer ? null : new ReactRefreshWebpackPlugin({
      overlayConfig: {
        entrypoints: [
          // Error overlay handling
        ],
      },
    }),
  ].filter(Boolean),
};
```

### Entry Point Injection

Next.js adds HMR client entries:

```javascript
// Added to webpack entry
entry: {
  main: [
    // ...existing entries
    'webpack-hot-middleware/client?path=/_next/webpack-hmr',
  ],
},
```

### react-refresh-webpack-plugin Integration

The plugin provides:

1. **Babel transformation** - via `react-refresh/babel`
2. **Runtime injection** - via `react-refresh/runtime`
3. **Error overlay** - compilation and runtime errors in browser

```javascript
// react-refresh-webpack-plugin configuration
new ReactRefreshWebpackPlugin({
  // Integration with webpack-dev-server
  integration: {
    // Use webpack-dev-server's WebSocket handling
    protocol: 'webpack',
  },
  // Error overlay settings
  overlay: {
    entrypoints: [
      require.resolve('react-error-overlay'),
    ],
    absoluteFilePath: filePath,
  },
});
```

### Module Replacement Flow (Webpack)

1. **File Change Detection**
   - Webpack's `watch` system detects file changes
   - Webpack triggers recompilation of affected modules

2. **Babel Transformation**
   - `react-refresh/babel` transforms components
   - Injects registration and signature calls

3. **Hot Update Bundle Creation**
   - Webpack creates `.hot-update.json` manifest
   - Creates individual module `.hot-update.js` files
   - Stored in `.next/webpack/`

4. **WebSocket Notification**
   - `webpack-hot-middleware` emits WebSocket message
   - Contains list of updated module IDs

5. **Client-Side Application**
   - HMR client receives WebSocket message
   - Downloads updated modules via JSON endpoints
   - `module.hot.accept()` handlers fire
   - React refresh scheduler runs

### HMR Client in Browser

```javascript
// Next.js HMR client (simplified)
class HMRClient {
  constructor() {
    this.sock = new WebSocket(url);
    this.sock.onmessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    const data = JSON.parse(event.data);

    switch (data.action) {
      case 'sync':
        // Full recompile sync
        break;
      case 'invalid':
        // Module invalidated, refresh
        break;
      case 'hash':
        // New compilation hash available
        break;
    }
  }
}
```

## Turbopack-Based HMR (App Router & Next.js 15+)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Development Server                        │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Turbopack  │  │   Turbopack     │  │   WebSocket   │  │
│  │   Server    │──│   HMR Engine    │──│   Handler     │  │
│  │             │  │                  │  │               │  │
│  └─────────────┘  └──────────────────┘  └───────────────┘  │
│        │                                        │          │
│        │         ┌──────────────────┐            │          │
│        └─────────│   Next.js        │────────────┘          │
│                  │   Turbopack      │                       │
│                  │   Integration    │                       │
│                  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Browser       │
                    │   - Turbopack   │
                    │   - React       │
                    │   - HMR Client  │
                    └─────────────────┘
```

### Turbopack HMR Design Goals

1. **Incremental compilation** - Only recompile what changed
2. **Rust-native HMR** - No JavaScript plugin overhead
3. **Fine-grained updates** - Module-level, not bundle-level
4. **Better caching** - Persistent cache across restarts

### Turbopack HMR Implementation

```rust
// Turbopack HMR server (pseudocode structure)
struct HmrServer {
    entries: HashMap<ModuleId, Module>,
    watcher: FileWatcher,
}

impl HmrServer {
    fn on_file_change(&mut self, path: &Path) {
        // 1. Find affected modules
        let affected = self.entries.find_dependents(path);

        // 2. Recompile only affected
        for module in affected {
            self.recompile(module);
        }

        // 3. Send HMR update via WebSocket
        self.broadcast(HmrUpdate {
            modules: affected,
            signatures: compute_signatures(affected),
        });
    }
}
```

### Module Replacement in Turbopack

Turbopack uses a different module system:

1. **Module Graph** - Tracks all module dependencies
2. **Incremental Compilation** - Caches compilation results
3. **Hot Module Updating** - Rust-native WebSocket server

```typescript
// Turbopack HMR update message (conceptual)
interface TurbopackHmrUpdate {
  type: 'TurbopackHmrUpdate';
  moduleId: string;
  hash: string;
  // Actual runtime code as string for injection
  runtime: string;
  // Source map for errors
  map?: string;
}
```

### Turbopack vs Webpack HMR Comparison

| Aspect | Turbopack HMR | Webpack HMR |
|--------|---------------|-------------|
| Language | Rust | JavaScript |
| Compilation | Incremental by default | Full recompile of changed |
| Module updating | Fine-grained | Bundle-level |
| WebSocket protocol | Custom Rust | webpack-hot-middleware |
| State preservation | Same (via React runtime) | Same |
| Startup time | ~4s for 5000 modules | ~60s for 5000 modules |
| Update latency | <50ms | 100-500ms |
| Caching | Persistent disk cache | Memory cache |

## Next.js Fast Refresh Integration

### Client-Side Setup

Next.js creates a specialized HMR client that works with both webpack and Turbopack:

```javascript
// packages/next/client/next-dev.js (simplified)
function createHMRClient() {
  const protocol = window.__NEXT_DATA__.runtime === 'Turbopack'
    ? 'turbopack'
    : 'webpack';

  return new HMRClient({
    path: `/_next/webpack-hmr`,
    timeout: 5000,
    overlayIsNextError: true, // Next.js specific error handling
  });
}
```

### React Refresh Integration

Both bundlers use React's `react-refresh` package:

```javascript
// packages/next/src/build/setup/ReactRefresh.ts
import { performReactRefresh } from 'react-refresh/runtime';

export function injectReactRefreshCallback() {
  // Called after HMR update is applied
  window.__next_set_hmr_sync = (exports) => {
    // Register modules with React refresh
    for (const [id, module] of Object.entries(exports)) {
      // React refresh registration
    }

    // Trigger refresh cycle
    performReactRefresh();
  };
}
```

### Error Overlay Integration

Next.js uses a custom error overlay that works with both HMR systems:

```javascript
// Error overlay configuration
const overlayConfig = {
  // Only show errors from Next.js code
  nextjs: {
    // Filter out non-critical webpack errors
    exclude: [/webpack\/build/, /webpack\/hot/],
  },
  // Error boundary for runtime errors
  errorBoundary: {
    default: true,
    minimal: false,
  },
};
```

## Next.js-Specific HMR Features

### 1. Route-Based Invalidation

When certain files change, Next.js triggers full page reload:

```javascript
// Routes that trigger full reload
const ROUTE_INVALIDATIONS = [
  'pages/_app.tsx',
  'pages/_document.tsx',
  'app/layout.tsx',  // App router layout
  'next.config.js',
  'tsconfig.json',
];

// API routes always trigger full reload
const API_ROUTE_PATTERNS = [
  /pages\/api\//,
  /app\/api\//,
];
```

### 2. Server Component Handling

Server Components (RSC) require special handling:

```javascript
// When a Server Component changes:
if (isServerComponent(module)) {
  // Full page reload required
  // Server Components cannot be hot-updated
  window.location.reload();
} else {
  // Client Component - can use Fast Refresh
  applyHmrUpdate();
}
```

### 3. Compilation Error Recovery

Next.js wraps compilation to handle errors gracefully:

```javascript
// webpack-config.ts
compiler.hooks.afterCompile.tap('Next.js', (compilation) => {
  // Collect errors but don't fail compilation
  // Allows HMR to continue even with errors
});
```

### 4. Styling HMR

CSS changes are handled separately:

```javascript
// CSS modules get HMR without React refresh
// This prevents React state issues during style-only changes

module.rules.push({
  test: /\.module\.css$/,
  use: [
    'style-loader',
    {
      options: {
        hmr: true, // CSS-specific HMR
        reloadAll: false,
      },
    },
  ],
});
```

## Development Server WebSocket Handler

### Webpack Mode

```javascript
// webpack-hot-middleware integration
app.use(
  '/webpack-hmr',
  webpackHotMiddleware(compiler, {
    log: false,
    path: '/__webpack_hmr',
    heartbeat: 2000,
    reload: true, // Full reload for non-JS changes
  })
);
```

### Turbopack Mode

```javascript
// Custom Rust WebSocket server
const turbopackHmr = new TurbopackHmrServer({
  root: process.cwd(),
  port: nextConfig.devServer?.port || 3000,
});

app.use('/turbopack-hmr', turbopackHmr.handler);
```

## State Preservation in Next.js

### Implementation in Next.js Client

```javascript
// packages/next/client/page-loader.ts
class PageLoader {
  // ... other code ...

  notifyHMR(moduleId) {
    // Call React refresh
    if (window.__next_set_hmr_sync) {
      window.__next_set_hmr_sync(moduleMap[moduleId]);
    }
  }
}
```

### How Next.js Tracks State

1. **React component tree** - React's reconciler maintains component state
2. **Fiber nodes** - Each component's state stored in fiber
3. **Fast Refresh signature** - React refresh runtime checks compatibility

## next.config.js HMR Options

### Turbopack Configuration

```javascript
// next.config.js
module.exports = {
  turbopack: {
    // Enable/disable HMR
    // (defaults to true in development)
    // No specific HMR config - it's always on

    // File system cache for faster rebuilds
    turbopackFileSystemCache: './.next/cache/turbopack',

    // Resolve aliases
    resolveAlias: {
      '@': './src',
    },

    // Experimental features
    experimental: {
      // Granular HMR for better caching
    },
  },
};
```

### Webpack Configuration

```javascript
// next.config.js
module.exports = {
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Webpack HMR configuration
      config.plugins.push(
        new ReactRefreshWebpackPlugin({
          // Multiple entrypoints for Next.js error handling
          entrypoints: [
            // ... Next.js specific entries
          ],
        })
      );
    }
    return config;
  },
};
```

### Dev Indicators

```javascript
// next.config.js
module.exports = {
  devIndicators: {
    // Show build activity indicator
    buildActivity: true,
    // Show loading indicator on route changes
    loadingIndicator: true,
  },
};
```

### Allowed Dev Origins (CORS Fix)

```javascript
// next.config.js
module.exports = {
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    // Add custom origins if using reverse proxy
  ],
};
```

## HMR Events and Lifecycle

### Server-Side Events

1. **compile** - New compilation started
2. **invalid** - Module marked as invalid
3. **hash** - Compilation hash computed
4. **done** - Compilation finished

### Client-Side Events

```javascript
// Webpack HMR events
if (module.hot) {
  module.hot.accept('./module.js', callback);
  module.hot.dispose(callback); // Cleanup
  module.hot.removeAcceptHandler(callback);
}

// Error handling
module.hot.on('error', (error) => {
  // Handle HMR error
});
```

## Performance Considerations

### Turbopack Advantages

1. **Startup**: 4s vs 60s for large apps
2. **Update latency**: <50ms vs 100-500ms
3. **Memory usage**: Lower due to Rust efficiency

### Webpack Optimizations

Next.js applies several webpack optimizations:

```javascript
// Lazy compilation for routes
config.plugins.push(
  new webpack.ContextReplacementPlugin(
    /.*/,
    (context) => {
      // Only compile current route
      context.request = location.pathname;
    }
  )
);
```

## Common Patterns and Edge Cases

### 1. HMR with Dynamic Imports

```javascript
// Dynamic imports work with HMR
const Component = dynamic(() => import('./Component'));

// After edit, HMR updates the component
// State is preserved if the component hasn't unmounted
```

### 2. HMR with getServerSideProps

Changes to `getServerSideProps` trigger full page reload:
```javascript
// Edit to pages/api/user.ts or getServerSideProps
// --> Full page reload (can't hot update server code)
```

### 3. HMR with API Routes

API routes always trigger full reload:
```javascript
// pages/api/hello.ts
// --> Full page reload (server-side code)
```

### 4. HMR with Middleware

Middleware changes trigger full page reload:
```javascript
// middleware.ts
// --> Full page reload (edge runtime)
```

## Debugging HMR in Next.js

### Enable HMR Logging

```javascript
// In browser console
window.__NEXT_HMR = true;
```

### Check HMR Status

```javascript
// In browser console
if (module.hot) {
  console.log('HMR enabled');
  console.log('Status:', module.hot.status());
}
```

### Common Debugging Commands

```javascript
// Check which modules are managed by HMR
module.hot.accept('./module.js', () => {
  console.log('Module updated');
});

// Monitor HMR events
module.hot.addStatusHandler((status) => {
  console.log('HMR status:', status);
});
```

## References

- [Next.js Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack)
- [react-refresh-webpack-plugin](https://github.com/pmmmwh/react-refresh-webpack-plugin)
- [React Fast Refresh Runtime](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [Next.js Debugging Guide](https://nextjs.org/docs/app/guides/debugging)
- [Vercel Blog: Turbopack](https://vercel.com/blog/turbopack)