# HMR Configuration Options in Next.js

## Overview

Next.js provides various configuration options to control Hot Module Replacement (HMR) and Fast Refresh behavior. These can be set in `next.config.js` or via environment variables.

## next.config.js Options

### Turbopack Configuration

Turbopack is the default bundler since Next.js 15. HMR is built-in and enabled by default.

```javascript
// next.config.js
module.exports = {
  turbopack: {
    // Directory for Turbopack's file system cache
    // Speeds up subsequent HMR updates
    turbopackFileSystemCache: './.next/cache/turbopack',

    // Resolve aliases for cleaner imports
    resolveAlias: {
      '@': './src',
      '@components': './src/components',
    },

    // Log level for Turbopack output
    logLevel?: 'verbose' | 'info' | 'warning' | 'error' | 'none',

    //事件处理
    events?: string[],
  },
}
```

**Note**: Turbopack HMR is always enabled in development mode. There is no `disabled` option for HMR specifically - you would disable Turbopack entirely to disable HMR.

### Disabling Turbopack (Using Webpack)

If you need webpack's HMR behavior instead:

```javascript
// next.config.js
module.exports = {
  // Force webpack bundler
  // Note: This may be slower for large applications
}
```

Then run:
```bash
next dev --webpack
next build --webpack
```

### Webpack HMR Configuration

While Turbopack is default, you can still configure webpack HMR:

```javascript
// next.config.js
module.exports = {
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Access webpack's HMR configuration
      config.entry = config.entry.map((entry) => {
        if (typeof entry === 'string') {
          return [
            entry,
            'webpack-hot-middleware/client?path=/_next/webpack-hmr',
          ];
        }
        return entry;
      });

      // Add hot module replacement plugin
      config.plugins.push(
        new webpack.HotModuleReplacementPlugin()
      );
    }
    return config;
  },
}
```

### Development Indicators

```javascript
// next.config.js
module.exports = {
  // Visual indicators in the browser
  devIndicators: {
    // Show build activity indicator in the corner
    buildActivity: true, // default: true

    // Show loading indicator during navigation
    loadingIndicator: true, // default: true
  },
}
```

### Allowed Dev Origins (CORS Issues)

This option is critical for HMR when using:
- WSL2 with Windows host
- Docker containers
- Reverse proxies
- Custom domains

```javascript
// next.config.js
module.exports = {
  // Fixes CORS errors with HMR WebSocket
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    // Add your custom domain if using reverse proxy
    'my-app.local',
  ],
}
```

**Environment variable alternative:**
```bash
NEXT_HMR_ALLOWED_ORIGINS=127.0.0.1,localhost,my-app.local
```

### Asset Prefix

```javascript
// next.config.js
module.exports = {
  // Use CDN for HMR in production-like environments
  assetPrefix: 'https://cdn.example.com',

  // Or for local development
  assetPrefix: 'http://localhost:3001',
}
```

### Compress

```javascript
// next.config.js
module.exports = {
  // Enable/disable gzip compression
  // Affects HMR WebSocket messages
  compress: true, // default: true
}
```

## Environment Variables

### HMR-Specific Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_HMR_PORT` | Port for HMR WebSocket | Same as dev server port |
| `NEXT_HMR_HOST` | Host for HMR WebSocket | localhost |
| `NEXT_HMR_ALLOWED_ORIGINS` | CORS allowed origins | localhost, 127.0.0.1 |
| `NEXT_HMR_TIMEOUT` | HMR connection timeout | 5000ms |
| `NEXT_DISABLE_HMR` | Disable HMR entirely | false |

**PowerShell:**
```powershell
$env:NEXT_HMR_PORT = "3001"
$env:NEXT_HMR_ALLOWED_ORIGINS = "my-app.local"
```

### General Development Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to 'development' for HMR |
| `NEXT_TELEMETRY_DISABLED` | Disable telemetry (faster startup) |
| `PORT` | Dev server port (default: 3000) |
| `HOSTNAME` | Dev server hostname |

## Next.js CLI Options

### Dev Server Options

```bash
# Specify port
next dev --port 3001

# Specify hostname (for Docker/WSL2)
next dev --hostname 0.0.0.0

# Use Turbopack (default since Next.js 15)
next dev

# Use Webpack instead
next dev --webpack

# Enable Turbopack with specific options
next dev --turbo
```

### Build Options

```bash
# Webpack for production
next build --webpack

# Turbopack (faster builds)
next build
```

## Configuration for Specific Environments

### WSL2 / Windows Subsystem

```javascript
// next.config.js
module.exports = {
  // Allow Windows localhost access
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    // WSL2 IP may vary, you may need to discover it
    '172.x.x.x', // Your WSL2 IP
  ],

  // Or use environment variable
  // NEXT_HMR_ALLOWED_ORIGINS=127.0.0.1,localhost,172.x.x.x
}
```

### Docker / Container Environments

```javascript
// next.config.js
module.exports = {
  // Allow Docker network access
  allowedDevOrigins: [
    'host.docker.internal',
    '127.0.0.1',
    'localhost',
  ],

  // Or listen on all interfaces
  // Run with: next dev --hostname 0.0.0.0
}
```

**Docker Compose example:**
```yaml
services:
  next:
    build: .
    ports:
      - "3000:3000"
    environment:
      - HOSTNAME=0.0.0.0
      - NEXT_HMR_ALLOWED_ORIGINS=host.docker.internal,127.0.0.1
```

### Reverse Proxy (nginx, Caddy, etc.)

```javascript
// next.config.js
module.exports = {
  // If your proxy forwards to different domain
  allowedDevOrigins: [
    'your-custom-domain.com',
    'localhost',
  ],
}
```

## Experimental Configuration Options

### Turbopack Experimental Options

```javascript
// next.config.js
module.exports = {
  turbopack: {
    experimental: {
      // Enable faster HMR for large apps
      // May use more memory
      // granularHmr?: boolean,

      // Custom error reporting
      // errorHandler?: (error: Error) => void,
    },
  },
}
```

### React Compiler Options (affects HMR)

```javascript
// next.config.js
module.exports = {
  // React Compiler (experimental)
  // May affect how components are optimized for HMR
  reactCompiler: {
    // Automatically apply useMemo/useCallback where beneficial
    // May require components to be written in specific way
  },
}
```

## Configuration for HMR with Edge Runtime

```javascript
// next.config.js
module.exports = {
  // Edge runtime middleware requires full page reload on changes
  // No special HMR config needed - it just works differently
  edgeRuntime: 'warn',
}
```

**Important**: Edge runtime (Middleware, Edge API routes) changes always trigger full page reload. HMR/Fast Refresh only works for Node.js runtime code.

## Configuration for API Routes

API routes (both Pages Router and App Router) require full page reload on changes since they run on the server:

```javascript
// No special config needed - this is automatic behavior
// HMR simply isn't applied to server-side code
```

**To speed up API route development:**
- Use `next dev` with file watching
- Consider splitting API logic from React components

## Configuration for getServerSideProps / getStaticProps

These data fetching methods run on the server and trigger full page reload:

```javascript
// No special HMR configuration
// Changes to these functions always cause full reload
```

**To avoid full reloads:**
- Extract client-side state management to React components
- Keep data fetching in separate files from UI components

## Styling and CSS Configuration

### CSS Modules HMR

```javascript
// next.config.js
module.exports = {
  // CSS Modules HMR is enabled by default
  // No special configuration needed

  // For styled-jsx or other CSS solutions
  // HMR should work automatically
}
```

### CSS-in-JS Configuration

```javascript
// next.config.js
module.exports = {
  // For styled-components or emotion
  // You may need to configure babel/plugins

  webpack: (config) => {
    // styled-components Babel plugin
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            plugins: [
              // Required for styled-components HMR
              'babel-plugin-styled-components',
            ],
          },
        },
      ],
    });
    return config;
  },
}
```

## Performance Tuning

### Reducing HMR Latency

1. **Use Turbopack** (default since Next.js 15):
   ```bash
   next dev  # Already uses Turbopack
   ```

2. **Enable file system cache**:
   ```javascript
   // next.config.js
   module.exports = {
     turbopack: {
       turbopackFileSystemCache: './.next/cache/turbopack',
     },
   }
   ```

3. **Disable telemetry** for faster startup:
   ```bash
   NEXT_TELEMETRY_DISABLED=1 next dev
   ```

### Reducing Build Time

```javascript
// next.config.js
module.exports = {
  // Exclude unnecessary files from compilation
  onDemandEntries: {
    // Max age for entries in memory (ms)
    maxInactiveAge: 5000,
    // Pages to preload
    pagesBufferLength: 2,
  },
}
```

## Troubleshooting Configuration Issues

### HMR Not Working

1. Check that `allowedDevOrigins` includes your origin
2. Verify firewall allows localhost connections
3. Try clearing `.next` cache:
   ```bash
   rm -rf .next
   next dev
   ```

### HMR Slow

1. Switch to Turbopack (default)
2. Enable Turbopack file system cache
3. Disable unnecessary babel/webpack plugins

### CORS Errors

```javascript
// next.config.js
module.exports = {
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    // Add your specific origin
  ],
}
```

### WebSocket Connection Issues

```javascript
// next.config.js
module.exports = {
  // May need to specify WebSocket path
  // This is usually auto-detected
}
```

**Environment variable fix:**
```bash
NEXT_HMR_PORT=3000
NEXT_HMR_HOST=localhost
```

## Complete Example Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Development server configuration
  devIndicators: {
    buildActivity: true,
    loadingIndicator: true,
  },

  // Fix for WSL2/Docker/Custom domains
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    'host.docker.internal',
  ],

  // Turbopack configuration
  turbopack: {
    turbopackFileSystemCache: './.next/cache/turbopack',
    resolveAlias: {
      '@': './src',
    },
  },

  // Webpack fallback (only needed if not using Turbopack)
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Additional webpack HMR config if needed
    }
    return config;
  },

  // React compiler (experimental)
  reactCompiler: {
    target: 'react',
  },
};

module.exports = nextConfig;
```

## Environment-Specific Configuration

### Development (local)

```javascript
// next.config.js
module.exports = {
  // Full development features
  devIndicators: {
    buildActivity: true,
  },
}
```

### CI / Testing

```javascript
// next.config.js
module.exports = {
  // May want to disable indicators in CI
  devIndicators: {
    buildActivity: process.env.CI !== 'true',
  },
}
```

## References

- [Next.js Configuration Reference](https://nextjs.org/docs/app/api-reference/config/next-config-js)
- [Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack)
- [Debugging Next.js Applications](https://nextjs.org/docs/app/guides/debugging)
- [React Fast Refresh](https://github.com/facebook/react/tree/main/packages/react-refresh)