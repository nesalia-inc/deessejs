# Troubleshooting Guide: Next.js HMR Issues

## Overview

This guide covers common issues with Hot Module Replacement (HMR) and Fast Refresh in Next.js, with solutions for each problem.

## Quick Diagnosis

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| HMR not working at all | CORS / WebSocket blocked | Use `allowedDevOrigins` |
| State lost on every edit | `/* @refresh reset */` or hook change | Check file for directive |
| Full page reload always | Server component or config change | Expected behavior |
| Hydration mismatch | Browser extension or SSR issues | Add `suppressHydrationWarning` |
| WebSocket error in console | Port mismatch | Set `NEXT_HMR_PORT` |
| HMR very slow | Not using Turbopack | Use default (Turbopack) |

## Common Issues and Solutions

### Issue 1: HMR Not Working

**Symptoms:**
- Edit a file, nothing happens
- No fast refresh indicator
- WebSocket connection errors in console

**Diagnosis:**
1. Check browser console for WebSocket errors
2. Check if HMR WebSocket is connecting
3. Verify file is being watched

**Solutions:**

#### Solution 1.1: Configure Allowed Dev Origins

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

**PowerShell:**
```powershell
$env:NEXT_HMR_ALLOWED_ORIGINS = "127.0.0.1,localhost"
```

#### Solution 1.2: Check Firewall / Antivirus

- Ensure localhost connections are allowed
- Check if antivirus is blocking WebSocket connections
- Try disabling browser extensions

#### Solution 1.3: Clear Cache

```bash
rm -rf .next
rm -rf node_modules/.cache
next dev
```

#### Solution 1.4: Use Correct Port

```bash
# If using a different port
next dev --port 3001

# Or set environment variable
$env:NEXT_HMR_PORT = "3001"
```

### Issue 2: State Lost on Every Edit

**Symptoms:**
- React state always resets
- Components remount instead of update
- `useState` values go back to initial

**Diagnosis:**
1. Check for `/* @refresh reset */` in the file
2. Check for hook signature changes
3. Check if custom hooks are involved

**Solutions:**

#### Solution 2.1: Remove Reset Directive

```javascript
// Remove this line from your file:
// /* @refresh reset */

// Without the directive, state should be preserved
// for compatible component changes
```

#### Solution 2.2: Check Hook Signatures

**Problematic pattern (causes state reset):**
```javascript
// This will reset state because hook order changes
function Component({ showExtra }) {
  const [count, setCount] = useState(0);
  if (showExtra) {
    const [extra, setExtra] = useState(false); // Conditional hook!
  }
  const [name, setName] = useState('');
  return <div>{count}</div>;
}
```

**Fixed pattern:**
```javascript
// Always call hooks in the same order
function Component({ showExtra }) {
  const [count, setCount] = useState(0);
  const [extra, setExtra] = useState(false); // Always initialize
  const [name, setName] = useState('');

  // Use the extra state conditionally but always call
  const showExtraState = showExtra ? extra : null;
  return <div>{count}</div>;
}
```

#### Solution 2.3: Use Stable Hook Order

```javascript
// Good: Same hooks in same order every render
function Counter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const value = useAnotherHook(count); // Custom hooks at the end
  // ...
}

// Bad: Different order on different renders
function Counter({ hasName }) {
  const [count, setCount] = useState(0);
  if (hasName) {
    const [name, setName] = useState(''); // Conditional hook
  }
  // ...
}
```

### Issue 3: Full Page Reload Instead of HMR

**Symptoms:**
- Page reloads instead of hot updating
- No preserved state
- Browser does full refresh

**Diagnosis:**
- Some file types always trigger full reload

**Why This Happens (Expected Behavior):**

1. **Server Components** - Cannot be hot-updated
2. **API Routes** - Server-side code changes
3. **Layout files** - `_app.tsx`, `layout.tsx`
4. **next.config.js** - Configuration changes
5. **Server-side data fetching** - `getServerSideProps`, `getStaticProps`

**Solutions:**

#### Solution 3.1: Edit Client Components Only

```javascript
// pages/index.js (page with server data fetching)
// getServerSideProps causes full reload on changes

// Instead, extract client logic to a separate component:
'use client';

import { ClientComponent } from './ClientComponent';

export async function getServerSideProps() {
  const data = await fetchData();
  return { props: { data } };
}

export default function Page({ data }) {
  return <ClientComponent initialData={data} />;
}

// ClientComponent.js
'use client';
export function ClientComponent({ initialData }) {
  // This component can use HMR
  const [data, setData] = useState(initialData);
  // State will be preserved on edits
}
```

#### Solution 3.2: Use Route Groups for Large Pages

If you have large pages with both server and client parts, structure them so most of the page can use HMR:

```
app/
  (routes)/
    page.tsx      # Server component wrapper
  components/
    Counter.tsx   # Client component with HMR
```

### Issue 4: Hydration Mismatch After HMR

**Symptoms:**
- Error overlay shows hydration mismatch
- UI looks broken after edit
- Browser console shows hydration warnings

**Diagnosis:**
- Browser extension may be modifying DOM
- SSR/CSR content mismatch

**Solutions:**

#### Solution 4.1: Add Suppress Hydration Warning

```tsx
// layout.tsx or specific component
<html lang="en" suppressHydrationWarning>
```

#### Solution 4.2: Check Browser Extensions

Some browser extensions modify the DOM, causing hydration mismatches. Try:
1. Incognito mode
2. Disable extensions
3. Check if issue persists without extensions

#### Solution 4.3: Ensure Consistent SSR/CSR

```javascript
// Problem: Different content SSR vs CSR
function Component() {
  const [value, setValue] = useState(
    typeof window !== 'undefined'
      ? window.__INITIAL_VALUE__
      : null
  );
  return <div>{value}</div>;
}

// Better: Use consistent initialization
function Component() {
  const [value, setValue] = useState(null);

  useEffect(() => {
    // Only run on client, after mount
    setValue(window.__INITIAL_VALUE__);
  }, []);

  return <div>{value}</div>;
}
```

### Issue 5: WebSocket Connection Failed

**Symptoms:**
- "WebSocket connection failed" in console
- HMR updates not arriving
- "ERR_CONNECTION_REFUSED" errors

**Diagnosis:**
- Port mismatch between dev server and HMR client
- Firewall blocking connections
- Wrong hostname configuration

**Solutions:**

#### Solution 5.1: Set HMR Port Explicitly

```bash
# PowerShell
$env:NEXT_HMR_PORT = "3000"
next dev
```

#### Solution 5.2: Check Hostname

```bash
# If running on different hostname
next dev --hostname localhost

# Or in next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/webpack-hmr',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};
```

#### Solution 5.3: Allowed Dev Origins for CORS

```javascript
// next.config.js
module.exports = {
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '0.0.0.0', // If needed for Docker
  ],
}
```

### Issue 6: HMR Works but Very Slow

**Symptoms:**
- Updates take several seconds
- Large apps have slow HMR
- Webpack builds are slow

**Solutions:**

#### Solution 6.1: Use Turbopack (Default Since Next.js 15)

```bash
# Already default, but if you switched away:
next dev --turbo
```

#### Solution 6.2: Enable Turbopack File System Cache

```javascript
// next.config.js
module.exports = {
  turbopack: {
    turbopackFileSystemCache: './.next/cache/turbopack',
  },
}
```

#### Solution 6.3: Disable Telemetry

```bash
$env:NEXT_TELEMETRY_DISABLED = "1"
next dev
```

#### Solution 6.4: Use Faster Machine

This isn't a solution, but Turbopack significantly reduces HMR latency - especially for large applications.

### Issue 7: HMR with WSL2 Issues

**Symptoms:**
- Works in Windows, not in WSL2
- WebSocket connection problems between WSL and Windows

**Solutions:**

#### Solution 7.1: Configure Allowed Origins

```javascript
// next.config.js for Windows/WSL2
module.exports = {
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    // WSL2 IP (discover with: ip addr show eth0 | grep inet)
    // Something like 172.x.x.x
  ],
}
```

#### Solution 7.2: Set Environment Variables in WSL

```bash
# In WSL2 terminal
export NEXT_HMR_ALLOWED_ORIGINS="127.0.0.1,localhost,$(hostname -I | awk '{print $1}')"
next dev
```

#### Solution 7.3: Use Windows-Side Development

If WSL2 HMR is problematic, consider running Next.js directly in Windows with npm/pnpm.

### Issue 8: HMR with Docker Issues

**Symptoms:**
- HMR works locally, not in Docker
- WebSocket errors in container

**Solutions:**

#### Solution 8.1: Configure for Docker

```javascript
// next.config.js for Docker
module.exports = {
  allowedDevOrigins: [
    'host.docker.internal',
    '127.0.0.1',
    'localhost',
  ],
}
```

#### Solution 8.2: Docker Compose Configuration

```yaml
services:
  next:
    build: .
    ports:
      - "3000:3000"
    environment:
      - HOSTNAME=0.0.0.0
      - NEXT_HMR_ALLOWED_ORIGINS=host.docker.internal,127.0.0.1
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

#### Solution 8.3: Network Mode

```yaml
services:
  next:
    build: .
    network_mode: host
    # Then you don't need port mapping
    # and localhost should work directly
```

### Issue 9: Class Components Always Remount

**Symptoms:**
- Class component state always lost
- HMR doesn't preserve class component state

**Diagnosis:**
- This is expected behavior - React's Fast Refresh doesn't support class component state preservation

**Solutions:**

#### Solution 9.1: Convert to Functional Components

```javascript
// Instead of class Counter extends React.Component
// Use functional component with hooks

function Counter({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  // State will be preserved on HMR
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

#### Solution 9.2: Use Error Boundaries for Recovery

```javascript
// Create an error boundary that preserves some state
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // This state is preserved through errors
  // Use it to recover UI state
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <button onClick={() => this.setState({ hasError: false })}>
        Retry
      </button>;
    }
    return this.props.children;
  }
}
```

### Issue 10: HMR with Third-Party Libraries

**Symptoms:**
- Third-party library changes don't trigger HMR
- Some libraries break HMR entirely

**Solutions:**

#### Solution 10.1: Configure Transpile Packages

```javascript
// next.config.js
module.exports = {
  // Ensure third-party packages are transpiled
  transpilePackages: ['my-package'],
}
```

#### Solution 10.2: Check Library Compatibility

Some libraries with complex client-server interactions don't support HMR:
- Apollo Client (with complex caching)
- Relay (with specific caching)
- Redux (with store rehydration)

For these, you may need to:
1. Use library-specific HMR plugins
2. Accept full page reloads for certain changes
3. Use library documentation for HMR setup

### Issue 11: Next.js 15+ with Turbopack HMR Issues

**Symptoms (Next.js 15 specific):**
- Turbopack HMR not working
- HMR events not triggering
- Build errors in Turbopack mode

**Solutions:**

#### Solution 11.1: Clear Cache

```bash
rm -rf .next
next dev
```

#### Solution 11.2: Fallback to Webpack (Temporary)

```bash
next dev --webpack
```

#### Solution 11.3: Report Issues

Since Turbopack is newer, some edge cases may not be handled:
- Report issues to https://github.com/vercel/next.js

### Issue 12: API Routes Not Triggering HMR

**Symptoms:**
- Editing API routes triggers full reload
- No Fast Refresh for API routes

**Diagnosis:**
- This is expected behavior - API routes are server-side

**Solutions:**

#### Solution 12.1: Accept Full Page Reload

API routes require full reload since they run on the server.

#### Solution 12.2: Extract Client Logic

If API route is part of a page with complex client logic:
1. Separate client components from API route logic
2. Only the client components will benefit from HMR

## Debugging Techniques

### Enable HMR Logging

```javascript
// In browser console
window.__NEXT_HMR = true;
```

### Check HMR Status

```javascript
// In browser console
if (module.hot) {
  console.log('HMR status:', module.hot.status());
}
```

### Monitor HMR Events

```javascript
// In browser console
if (module.hot) {
  module.hot.addStatusHandler((status) => {
    console.log('HMR status changed:', status);
  });
}
```

### Check for Specific Errors

```javascript
// In browser console
if (module.hot) {
  module.hot.on('error', (error) => {
    console.error('HMR error:', error);
  });
}
```

## Getting Help

If you've tried all solutions and HMR still isn't working:

1. **Check Next.js GitHub** - Search for similar issues
2. **Discord/Discussions** - Ask in Next.js community
3. **Create Issue** - Report bugs with:
   - Next.js version
   - Operating system
   - Configuration (next.config.js)
   - Error messages from console
   - Steps to reproduce

## References

- [Next.js Debugging Guide](https://nextjs.org/docs/app/guides/debugging)
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [React Fast Refresh](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [Turbopack Documentation](https://nextjs.org/docs/app/api-reference/turbopack)