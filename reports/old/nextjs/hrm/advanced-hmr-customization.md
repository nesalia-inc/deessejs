# Advanced HMR Customization

## Overview

This document covers advanced techniques for customizing Hot Module Replacement (HMR) behavior in Next.js applications. It includes hooks, custom configurations, performance tuning, and integration patterns.

## Module Hot API

### Basic Hooks

```javascript
// module.hot.accept() - Accept updates to this module
module.hot.accept('./dependency.js', (newModule, oldModule) => {
  // Called when ./dependency.js changes
  // newModule contains the updated exports
  console.log('Dependency updated:', newModule);
});

// module.hot.decline() - Reject updates
module.hot.decline('./dependency.js');
// Future changes to dependency will trigger full reload

// module.hot.dispose() - Cleanup before module is replaced
module.hot.dispose((data) => {
  // Save state that should persist to new version
  data.count = myModule.count;
  data.timestamp = Date.now();
});

// module.hot.removeAcceptHandler() - Remove callback
const handler = (newModule) => { /*...*/ };
module.hot.accept('./module.js', handler);
module.hot.removeAcceptHandler('./module.js', handler);
```

### Status Monitoring

```javascript
// Check current HMR status
module.hot.status();
// Returns: 'idle' | 'check' | 'watch' | 'upload' | 'ready' | 'dispose' | 'fail' | 'accept error' | 'abort'

// Listen for status changes
module.hot.addStatusHandler((status) => {
  switch (status) {
    case 'idle':
      console.log('No pending HMR updates');
      break;
    case 'check':
      console.log('Checking for updates...');
      break;
    case 'ready':
      console.log('Update ready to be applied');
      break;
    case 'fail':
      console.log('HMR update failed');
      break;
  }
});

// Remove status handler
module.hot.removeStatusHandler(handler);
```

### Error Handling

```javascript
// Listen for HMR errors
module.hot.on('error', (error) => {
  console.error('HMR Error:', error);
});

// Custom error recovery
module.hot.on('error', (error, { moduleId, moduleName }) => {
  if (error.message.includes('React')) {
    // React-related error, try to recover
    performFullReload();
  } else {
    // Other error, try HMR recovery
    module.hot.apply({ ignoreError: true });
  }
});
```

## React Refresh Hooks

### Global Refresh Callbacks

```javascript
// In your code or a custom module

// Called before global refresh
__ReactRefreshUtils__.beforeGlobalRefresh = (lastError) => {
  // Return false to prevent refresh
  if (lastError && lastError.message.includes('critical')) {
    return false;
  }
  return true;
};

// Called after global refresh completes
__ReactRefreshUtils__.afterRefresh = () => {
  console.log('Components refreshed');
  // Custom post-refresh logic
};
```

### Custom Registration

```javascript
// Custom component tracking
const customRegister = (type, id) => {
  // Your custom registration logic
  console.log('Component registered:', id);

  // Call original register
  $RefreshReg$(type, id);
};

const customSignature = (type, key) => {
  // Your custom signature logic
  $RefreshSig$(type, key);
};
```

## Custom HMR Clients

### Creating a Custom WebSocket Client

```javascript
// custom-hmr-client.js
class CustomHMRClient {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.reconnectDelay = 1000;
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('HMR Client connected');
      this.reconnectDelay = 1000; // Reset on successful connection
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(JSON.parse(event.data));
    };

    this.socket.onclose = () => {
      this.reconnect();
    };

    this.socket.onerror = (error) => {
      console.error('HMR WebSocket error:', error);
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'update':
        this.applyUpdate(message.payload);
        break;
      case 'error':
        this.showError(message.error);
        break;
      case 'hash':
        this.onHash(message.hash);
        break;
    }
  }

  applyUpdate(payload) {
    // Custom update logic
    const { moduleId, code } = payload;
    // Evaluate and apply
    eval(code);
    // Trigger React refresh
    if (window.__next_set_hmr_sync) {
      window.__next_set_hmr_sync(payload);
    }
  }

  reconnect() {
    console.log(`Reconnecting in ${this.reconnectDelay}ms...`);
    setTimeout(() => {
      this.connect();
      this.reconnectDelay *= 2; // Exponential backoff
    }, this.reconnectDelay);
  }
}

// Usage
const client = new CustomHMRClient('ws://localhost:3000/_next/hmr');
client.connect();
```

### Custom Error Overlay

```javascript
// custom-error-overlay.js
class CustomErrorOverlay {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'custom-hmr-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px;
      background: #e53e3e;
      color: white;
      font-family: monospace;
      z-index: 9999;
      display: none;
    `;
    document.body.appendChild(this.container);
  }

  show(error) {
    this.container.innerHTML = `
      <h3>HMR Error</h3>
      <pre>${error.message}</pre>
      <button onclick="location.reload()">Reload</button>
      <button onclick="this.parentElement.style.display='none'">Dismiss</button>
    `;
    this.container.style.display = 'block';
  }

  hide() {
    this.container.style.display = 'none';
  }
}

const overlay = new CustomErrorOverlay();

// Integrate with HMR
module.hot.on('error', (error) => {
  overlay.show(error);
});

module.hot.addStatusHandler((status) => {
  if (status === 'idle') {
    overlay.hide();
  }
});
```

## State Persistence Across HMR

### Preserving Component State

```javascript
// state-persistence.js

// Save state before disposal
module.hot.dispose((data) => {
  // Find React component instance
  const reactRoot = document.getElementById('root');
  const fiber = reactRoot._reactRootContainer._internalRoot;

  // Extract state (simplified)
  data.componentState = extractState(fiber);
});

// Restore state after acceptance
module.hot.accept((newModule) => {
  // Wait for React to render
  setTimeout(() => {
    const reactRoot = document.getElementById('root');
    const fiber = reactRoot._reactRootContainer._internalRoot;
    restoreState(fiber, module.hot.data.componentState);
  }, 0);
});
```

### Using localStorage for State

```javascript
// localStorage-persistence.js

// Wrap component with state persistence
function withPersistentState(Component, storageKey) {
  return function PersistentComponent(props) {
    const [state, setState] = useState(() => {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : props.initialState;
    });

    useEffect(() => {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }, [state]);

    return <Component {...props} state={state} setState={setState} />;
  };
}

// Usage
const PersistentCounter = withPersistentState(Counter, 'counter-state');

module.hot.dispose(() => {
  // State already saved in localStorage
});
```

## Babel Plugin Configuration

### Custom Babel Transform

If you need to customize how components are transformed for HMR:

```javascript
// babel.config.js or .babelrc
module.exports = {
  plugins: [
    // Your custom plugin that works with react-refresh
    ['@babel/plugin-transform-react-jsx', {
      runtime: 'automatic',
      importSource: 'react',
    }],
    // Add your custom HMR plugin
    './custom-hmr-babel-plugin.js',
  ],
};
```

### Custom Fast Refresh Plugin

```javascript
// custom-hmr-babel-plugin.js
module.exports = function customHMRPlugin(babel) {
  return {
    visitor: {
      FunctionDeclaration(path, state) {
        // Check if it's a React component
        if (isComponentishName(path.node.id.name)) {
          // Insert HMR registration
          path.node.body.body.unshift(
            babel.template.statements.ast(`
              $RefreshSig$();
              $RefreshReg$(COMPONENT_NAME, "COMPONENT_NAME");
            `).replace('COMPONENT_NAME', path.node.id.name)
          );
        }
      },
    },
  };
};
```

## Performance Optimization

### Lazy Compilation

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Only compile requested routes
      config.plugins.push(
        new webpack.ContextReplacementPlugin(
          /.*/,
          (context) => {
            if (!context.request) return false;
            // Only include current route
            const currentRoute = window.location.pathname;
            return context.request.startsWith('./pages' + currentRoute);
          }
        )
      );
    }
    return config;
  },
};
```

### Excluding Large Dependencies

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't watch large node_modules
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules\/(?!large-package)/,
      };
    }
    return config;
  },
};
```

### Module Cache Optimization

```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    // Optimize module caching
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };
    return config;
  },
};
```

## Custom Update Strategies

### Selective Refresh

```javascript
// selective-refresh.js

// Only refresh certain modules, accept others
module.hot.accept('./stable-module.js', () => {
  // This module updates without triggering React refresh
  // Good for utilities that don't affect React
});

module.hot.accept('./component.js', (newModule) => {
  // This triggers React refresh for components
  performReactRefresh();
});

// Decline updates for production-only code
module.hot.decline('./production-only.js');
```

### Chunk-Based Updates

```javascript
// chunk-update-strategy.js

// For large updates, split into chunks
async function applyChunkedUpdate(update) {
  const chunks = splitIntoChunks(update.modules, 10); // 10 modules per chunk

  for (const chunk of chunks) {
    await applyChunk(chunk);
    await new Promise(resolve => setTimeout(resolve, 50)); // Brief pause
  }
}

module.hot.on('change', (changedModules) => {
  applyChunkedUpdate({ modules: changedModules });
});
```

## HMR with Non-React Code

### CSS HMR

```javascript
// CSS modules HMR (already built-in, but can customize)
module.hot.accept('./styles.css', () => {
  // CSS changes apply without full reload
  // No React refresh needed
  const links = document.querySelectorAll('link[href*="styles.css"]');
  links.forEach(link => {
    link.href = link.href + '?t=' + Date.now(); // Cache bust
  });
});
```

### TypeScript/Hooks HMR

```javascript
// Custom hook updates
module.hot.accept('./hooks.ts', (newModule) => {
  // Hooks can be hot-updated
  // React will use new hook implementations
  // State preserved if hook signature unchanged
  Object.assign(currentHooks, newModule);
});
```

## Debugging HMR

### Enable HMR Logging

```javascript
// Create HMR logger middleware
function hmrLogger(req, res, next) {
  if (req.url.includes('webpack-hmr')) {
    const originalWrite = res.write;
    res.write = function(chunk, encoding, callback) {
      console.log('HMR message:', chunk.toString());
      return originalWrite.apply(res, arguments);
    };
  }
  next();
}

// Add to next.config.js
module.exports = {
  async rewrites() {
    return [];
  },
  // Note: This is conceptual - actual implementation varies
};
```

### Inspect Module Graph

```javascript
// In browser console

// Get all managed modules
console.table(
  Array.from(module.hot._modules || [])
    .map(id => ({ id, status: 'managed' }))
);

// Check pending disposals
console.log('Pending disposals:', module.hot._disposeCallbacks);
```

## Integration with DevTools

### Custom DevTools Panel

```javascript
// hmr-devtools-panel.js
class HMRDevTools {
  constructor() {
    this.panel = this.createPanel();
    this.setupListeners();
  }

  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'hmr-devtools';
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 300px;
      background: #1a1a1a;
      color: #fff;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
    `;
    document.body.appendChild(panel);
    return panel;
  }

  setupListeners() {
    module.hot.addStatusHandler((status) => {
      this.updateStatus(status);
    });

    module.hot.on('change', (modules) => {
      this.logChanges(modules);
    });
  }

  updateStatus(status) {
    this.panel.innerHTML = `
      <h4>HMR Status</h4>
      <p>Status: ${status}</p>
    `;
  }

  logChanges(modules) {
    console.log('Modules changed:', modules);
  }
}

new HMRDevTools();
```

## Custom Hot Reload Rules

### File Pattern Matching

```javascript
// custom-hot-rules.js
module.hot.rules = {
  // Match patterns for different handling
  '*.test.js': {
    accept: false, // Don't hot update test files
    reload: true, // Full reload instead
  },
  '*.config.js': {
    accept: false,
    reload: true,
  },
  'components/*.tsx': {
    accept: true,
    reuse: true, // Reuse component instance
  },
};
```

## Production Considerations

### HMR in Production Build

HMR is automatically disabled in production:

```javascript
// In production, these are undefined:
console.log(module.hot); // undefined
console.log(import.meta.hot); // undefined (ESM)
```

### Disabling HMR Completely

```bash
# Disable HMR entirely
NEXT_DISABLE_HMR=1 next dev
```

```javascript
// next.config.js
module.exports = {
  // Disable HMR for specific routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-HMR-Enabled', value: 'false' },
        ],
      },
    ];
  },
};
```

## Common Custom Patterns

### Pattern 1: Auto-Reject Large Updates

```javascript
module.hot.on('change', (changedModules) => {
  const totalSize = calculateModuleSizes(changedModules);

  if (totalSize > 1024 * 1024) { // 1MB
    console.warn('Large HMR update, triggering full reload');
    location.reload();
    return false;
  }
});
```

### Pattern 2: Debounced Refresh

```javascript
let refreshTimeout;

module.hot.addStatusHandler((status) => {
  if (status === 'check') {
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      module.hot.apply({ ignoreError: true });
    }, 100); // Debounce 100ms
  }
});
```

### Pattern 3: Skip Conflicting Updates

```javascript
const pendingUpdates = new Set();

module.hot.on('change', (moduleId) => {
  if (isConflictingUpdate(moduleId)) {
    console.log('Conflicting update detected, skipping');
    module.hot.decline(moduleId);
    pendingUpdates.add(moduleId);

    setTimeout(() => {
      pendingUpdates.delete(moduleId);
    }, 5000);
  }
});
```

## References

- [Webpack HMR API](https://webpack.js.org/api/hot-module-replacement/)
- [React Fast Refresh](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [react-refresh-webpack-plugin](https://github.com/pmmmwh/react-refresh-webpack-plugin)
- [Next.js Debugging](https://nextjs.org/docs/app/guides/debugging)
- [Babel Plugin Handbook](https://babeljs.io/docs/en/plugins)