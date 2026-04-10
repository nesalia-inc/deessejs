# Browser Client HMR Protocol

## Overview

This document explains what happens at the browser and WebSocket layer when Hot Module Replacement (HMR) is triggered in Next.js. It covers the client-side protocol, WebSocket communication, and how updates are applied in the browser.

## HMR Client Architecture

### Client Components

The browser-side HMR system consists of several integrated parts:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  React App                            │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │           React Refresh Runtime                │   │  │
│  │  │  - performReactRefresh()                       │   │  │
│  │  │  - register() / setSignature()                  │   │  │
│  │  │  - Error boundary handling                     │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  │                      │                                │  │
│  │  ┌───────────────────┴──────────────────────────┐   │  │
│  │  │         Bundler HMR Client                     │   │  │
│  │  │  (Webpack or Turbopack specific)             │   │  │
│  │  │  - module.hot API                            │   │  │
│  │  │  - WebSocket connection management           │   │  │
│  │  │  - Module update application                 │   │  │
│  │  └───────────────────────────────────────────────┘   │  │
│  │                      │                                │  │
│  │  ┌───────────────────┴──────────────────────────┐   │  │
│  │  │           WebSocket Client                    │   │  │
│  │  │  - Connects to dev server                    │   │  │
│  │  │  - Handles hot update messages                │   │  │
│  │  │  - Fallback to polling                       │   │  │
│  │  └───────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## WebSocket Protocol

### Connection Establishment

#### Webpack Mode WebSocket

```javascript
// Webpack HMR client connection (simplified)
class WebpackHMRClient {
  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const path = '/_next/webpack-hmr';

    this.socket = new WebSocket(`${protocol}//${host}${path}`);
    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onerror = this.onError.bind(this);
    this.socket.onclose = this.onClose.bind(this);
  }
}
```

#### Turbopack Mode WebSocket

```javascript
// Turbopack HMR client connection (simplified)
class TurbopackHMRClient {
  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const path = '/_next/turbopack-hmr';

    this.socket = new WebSocket(`${protocol}//${host}${path}`);
    // Turbopack uses different message format
  }
}
```

### Message Format

#### Webpack HMR Messages

```json
// webpack/hot/message (WebSocket message)
{
  "action": "hash",
  "data": {
    "hash": "abc123..."
  }
}

// webpack/hot/ok
{
  "action": "built",
  "hash": "abc123...",
  "time": 1234
}

// webpack/hot_err
{
  "action": "errors",
  "errors": [
    {
      "header": "Module Build Error",
      "message": "SyntaxError: Unexpected token",
      "body": "..."
    }
  ]
}

// webpack/hot/close
{
  "action": "close"
}
```

#### Turbopack HMR Messages

```json
// Turbopack specific message format
{
  "type": "TurbopackHmrUpdate",
  "moduleId": "./src/pages/index.tsx",
  "hash": "def456...",
  "runtime": "// Updated module code",
  "map": { /* source map */ }
}

// Turbo stream message
{
  "type": "TurbopackHmrStream",
  "updates": [
    { "type": "module", "moduleId": "...", "runtime": "..." },
    { "type": "chunk", "chunkId": "...", "runtime": "..." }
  ]
}
```

### WebSocket Lifecycle

```
Client                              Server
  │                                    │
  │─────── WebSocket Connect ──────────►│
  │                                    │
  │◄─────────── Accept ─────────────────│
  │                                    │
  │◄─────────── hash message ──────────│  // Compilation hash
  │                                    │
  │      [File Change Detected]        │
  │                                    │
  │◄─────────── invalidate ────────────│  // Module invalidated
  │                                    │
  │─────── hash request ──────────────►│  // Client requests new hash
  │                                    │
  │◄─────────── hash response ─────────│  // New hash available
  │                                    │
  │─────── get update ─────────────────►│  // Request update details
  │                                    │
  │◄─────────── update payload ─────────│  // New module code
  │                                    │
  │         [Apply Update]             │
  │                                    │
  │─────── stats ─────────────────────►│  // Update stats
  │                                    │
  │◄─────────── (continue) ────────────│
  │                                    │
```

## Module Update Application

### Update Flow (Webpack)

```javascript
// webpack module.hot.accept callback (simplified)
module.hot.accept('./module.js', (newModule, newModuleId) => {
  // New module received

  // Call Next.js HMR sync
  if (window.__next_set_hmr_sync) {
    window.__next_set_hmr_sync({
      module: newModule,
      id: newModuleId,
      // React refresh registration
    });
  }

  // Trigger React refresh
  performReactRefresh();
});

function performReactRefresh() {
  // From react-refresh/runtime
  // Determine which components need update
  // Call setState on components that can preserve state
  // Remount components that need full reload
}
```

### Update Flow (Turbopack)

```javascript
// Turbopack HMR update application (simplified)
class TurbopackHMRClient {
  handleMessage(data) {
    if (data.type === 'TurbopackHmrUpdate') {
      this.applyUpdate(data);
    } else if (data.type === 'TurbopackHmrError') {
      this.showError(data);
    }
  }

  applyUpdate(update) {
    // Turbopack sends pre-computed runtime code
    // Inject into module system

    const module = System.getImport(update.moduleId);
    const newModule = eval(update.runtime);
    System.setImport(update.moduleId, newModule);

    // Trigger React refresh
    performReactRefresh();
  }
}
```

### Error Overlay Handling

```javascript
// Error overlay integration
const overlayConfig = {
  entrypoints: [
    // Next.js error overlay entry
    // Requires ['webpack-hot-middleware/client'] entry
  ],

  // Error handling
  handleCompileError: (error) => {
    // Show compilation error overlay
    // Don't perform React refresh
    // Stay in current state
  },

  handleRuntimeError: (error, errorInfo) => {
    // Show runtime error in overlay
    // Error boundary catches it
    // After 5 errors, suggest full reload
  },

  handleSuccess: () => {
    // Clear overlay on successful update
  },
};
```

## React Refresh Runtime Integration

### Registration System

```javascript
// React refresh registration (from runtime)
const registrations = new WeakMap();
const signatures = new WeakMap();

function register(type, id) {
  // type: React component type
  // id: unique identifier for this component version

  const family = typeof id === 'number' ? [id] : id;

  if (!registrations.has(type)) {
    registrations.set(type, family);
  } else {
    // Merge for HOCs like memo(), forwardRef()
    const existing = registrations.get(type);
    registrations.set(type, [...existing, ...family]);
  }
}

function setSignature(type, key) {
  signatures.set(type, key);
}

function computeFullKey(type) {
  const sig = signatures.get(type);
  if (!sig) return null;

  // Combine with parent signatures for wrapped components
  // e.g., memo(Component) combines both signatures
  return sig;
}
```

### Update Determination

```javascript
// performReactRefresh implementation (simplified)
function performReactRefresh() {
  // Get all pending updates
  const pending = collectUpdates();

  // Separate into categories
  const updatedFamilies = [];
  const staleFamilies = [];

  for (const [type, family] of pending) {
    const oldSig = signatures.get(type);
    const newSig = computeNewSignature(type);

    if (oldSig === newSig) {
      // Signature matches - can preserve state
      updatedFamilies.push(type);
    } else {
      // Signature changed - must remount
      staleFamilies.push(type);
    }
  }

  // Schedule updates
  for (const type of updatedFamilies) {
    // Force update on React fiber (preserves state)
    scheduleUpdate(type);
  }

  for (const type of staleFamilies) {
    // Force remount (state lost)
    scheduleRemount(type);
  }
}
```

### Error Boundary Integration

```javascript
// Error boundary for HMR
class ReactRefreshErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    // Track this error for retry logic
    return { error };
  }

  componentDidCatch(error, info) {
    // Register failed root for later retry
    failedRoots.add(this);

    // Report to HMR system
    reportRuntimeError(error);
  }

  render() {
    if (this.state.error) {
      return <ErrorOverlay error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Error recovery flow
function retryFailedRoots() {
  for (const root of failedRoots) {
    // Try re-rendering after code change
    root.retry();
  }
}
```

## Browser-Side File Monitoring

### Fallback: Polling Mode

When WebSocket fails, browsers fall back to HTTP polling:

```javascript
// Polling fallback (webpack-dev-server)
class HMRPollingClient {
  constructor() {
    this.pollInterval = 5000; // Check every 5 seconds
  }

  start() {
    this.poll();
  }

  poll() {
    fetch('/__webpack_hmr?hash=' + this.lastHash)
      .then(response => response.json())
      .then(data => {
        if (data.action === 'built') {
          // New build available
          this.requestUpdate();
        }
      })
      .catch(() => {
        // WebSocket likely working, ignore
      });

    setTimeout(() => this.poll(), this.pollInterval);
  }
}
```

### Next.js HMR Client Setup

```javascript
// Next.js HMR initialization (simplified)
function initHMR() {
  // Determine bundler type
  const bundler = window.__NEXT_DATA__.bundler;

  if (bundler === 'turbopack') {
    window.__NEXT_HMR_CLIENT__ = new TurbopackHMRClient();
  } else {
    window.__NEXT_HMR_CLIENT__ = new WebpackHMRClient();
  }

  // Inject React refresh callback
  window.__next_set_hmr_sync = (exports) => {
    // Register modules with React refresh
    // Trigger refresh cycle
  };

  // Handle errors
  window.next.on华山HmrError = (error) => {
    // Show error overlay
  };
}
```

## Connection Management

### Reconnection Logic

```javascript
class HMRClient {
  constructor() {
    this.maxRetries = 5;
    this.retryDelay = 1000;
    this.retries = 0;
  }

  onClose() {
    if (this.retries < this.maxRetries) {
      // Exponential backoff
      const delay = this.retryDelay * Math.pow(2, this.retries);
      setTimeout(() => this.reconnect(), delay);
      this.retries++;
    } else {
      // Fall back to polling
      this.startPolling();
    }
  }

  onError(error) {
    // Log error
    console.error('HMR WebSocket error:', error);

    // Try to maintain last working state
    // Don't crash the app
  }
}
```

### Heartbeat/Keep-Alive

```javascript
// Heartbeat to detect stale connections
class HMRClient {
  startHeartbeat() {
    setInterval(() => {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 30000); // Every 30 seconds
  }
}
```

## Browser Events and Callbacks

### Available Callbacks

```javascript
// In browser console or custom code

// When a module is disposed
module.hot.dispose((data) => {
  // Save state before module is removed
  data.state = getComponentState();
});

// When a module is accepted
module.hot.accept('./module.js', (newModule, id) => {
  // New module is available
  // React refresh will handle component updates
});

// Status changes
module.hot.addStatusHandler((status) => {
  // 'idle' - no pending updates
  // 'check' - checking for updates
  // 'watch' - watching for changes
  // 'process' - applying updates
  // 'fail' - update failed
  console.log('HMR status:', status);
});

// Errors
module.hot.on('error', (error) => {
  console.error('HMR error:', error);
});
```

### React Refresh Callbacks

```javascript
// React refresh specific callbacks

// Before refresh
beforeGlobalRefresh = (lastError) => {
  // Called before components are updated
  // Return false to prevent update
};

// After refresh
afterRefresh = () => {
  // Called after refresh cycle completes
};

// Injected by Next.js
__react_refresh_utils__.beforeResolveCallback = (module) => {
  // Called when module is resolved
  return module;
};
```

## Source Maps and Debugging

### Source Map Handling

```javascript
// Source maps are sent with update payload
const update = {
  moduleId: './src/components/Button.tsx',
  runtime: '...', // Updated code
  map: {           // Source map
    "version": 3,
    "sources": ["Button.tsx"],
    "mappings": "..."
  }
};

// Browser DevTools uses source map to show original source
// Error stack traces point to original TypeScript files
```

### Error Stack Traces

When an error occurs during HMR:

```javascript
// Error contains source-mapped stack trace
console.error(error);
// -->
// Error: Invalid hook call
//   at useState (Button.tsx:5:10)     <-- Original source
//   at Button (Button.tsx:12:3)
//   at App (App.tsx:8:1)
```

## Performance Considerations

### Update Payload Size

| Update Type | Payload Size | Notes |
|------------|--------------|-------|
| Small component | 1-5 KB | Minimal JSON |
| Multiple modules | 5-50 KB | Depends on changed modules |
| Full recompile | 100+ KB | Rare, usually incremental |

### Latency

- **WebSocket message**: <1ms
- **Module eval**: 1-5ms
- **React refresh cycle**: 5-20ms
- **Total perceived**: <50ms for small changes

### Memory Usage

HMR increases memory usage because:
- Old module code is kept for rollback
- Multiple versions of components may exist
- Source maps are loaded for debugging

## Security Considerations

### Localhost Only

HMR WebSocket is designed to only accept connections from localhost:
- Prevents remote attacks
- Only works in development
- CORS blocked for external origins

### Development Only

HMR is automatically disabled in production:
- No WebSocket server runs
- No hot update endpoints exist
- Source maps not loaded by default

## Troubleshooting Browser-Side Issues

### Check WebSocket Connection

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:3000/_next/webpack-hmr');
ws.onopen = () => console.log('HMR WebSocket connected');
ws.onerror = () => console.error('HMR WebSocket failed');
```

### Inspect HMR State

```javascript
// In browser console

// Check module.hot status
module.hot.status();

// Check React refresh state
window.__react_refresh_utils__;

// Check pending updates
window.__react_refresh_pending__;
```

### Force Full Reload

If HMR is stuck, force full reload:
- Close browser tab
- Restart dev server
- Clear browser cache

## References

- [React Fast Refresh Runtime](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [Webpack HMR Documentation](https://webpack.js.org/concepts/hot-module-replacement/)
- [Next.js Debugging Guide](https://nextjs.org/docs/app/guides/debugging)
- [react-refresh-webpack-plugin](https://github.com/pmmmwh/react-refresh-webpack-plugin)