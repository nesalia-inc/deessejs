# Fast Refresh Core Mechanism

## What is Fast Refresh?

Fast Refresh is a Next.js development feature that enables editing React components in a running application while preserving component state. It is an evolution of traditional Hot Module Replacement (HMR) specifically designed for React's component model.

**Key characteristics:**
- Preserves React component state during updates (for compatible changes)
- Shows compile-time and runtime errors in an overlay
- Falls back to full page reload when necessary
- Officially supported by React (unlike ad-hoc hot reloading solutions)

## How Fast Refresh Differs from Traditional HMR

| Aspect | Traditional HMR | Fast Refresh |
|--------|-----------------|--------------|
| State Preservation | None - full remount | Component-level for functions |
| React Awareness | None | Understands hooks, components |
| Error Recovery | Manual | Automatic error boundary recovery |
| Update Scope | Module-level | Component-level |
| Reliability | Variable | Official React support |

## The Fast Refresh Pipeline

### 1. Babel Transformation Stage

When you save a file, Next.js (via Babel) transforms the React code to enable Fast Refresh. This is done through `@babel/plugin-transform-react-jsx-self` and `@babel/plugin-transform-react-jsx-source`, plus `react-refresh/babel`.

**What gets transformed:**

```javascript
// Original code
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
export default Counter;

// After transformation
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

$RefreshReg$(Counter, "Counter");
$RefreshSig$(Counter);

export default Counter;
```

**Key Babel plugin operations:**

1. **Registration injection** - `$RefreshReg$(Component, "ComponentName")` registers each component
2. **Signature wrapping** - `$RefreshSig$()` marks the entry point of components
3. **Hook tracking** - Collects hook call signatures to determine if state can be preserved

### 2. Runtime Registration

The transformed code includes calls to `react-refresh/runtime`:

```javascript
// Component registration
$RefreshReg$(Counter, "Counter");

// Signature computation for state preservation
$RefreshSig$();
```

**Runtime behavior:**

1. Each component is registered with its type and a unique ID
2. The runtime tracks "families" of component versions
3. Signatures are computed from hook call patterns

### 3. Signature System

The signature system is what enables state preservation:

```javascript
// Simplified signature computation
function computeSignature(component) {
  return hash(hookCallsInComponent);
// e.g., "useState:0,useEffect:1" becomes a compact key
}
```

**State preservation decision tree:**

```
Edit occurs
    │
    ▼
Compute new signature
    │
    ▼
Compare with old signature
    │
    ├─── Match ────> Preserve state, update component
    │
    └─── Mismatch ──> Check if recoverable
                          │
                          ├─── Yes ──> Remount component (state lost)
                          │
                          └─── No ──> Show error overlay
```

### 4. Update Execution

When the server sends a hot update via WebSocket:

```javascript
// Client-side handling (simplified)
socket.onmessage = (event) => {
  const { type, modules } = JSON.parse(event.data);

  if (type === 'hot') {
    // Apply module updates
    for (const module of modules) {
      __webpack_require__(module.id);
    }

    // Trigger React refresh
    performReactRefresh();
  }
};

function performReactRefresh() {
  // Process pending updates
  // Separate "updated" from "stale" component families
  // Updated families preserve state
  // Stale families remount
}
```

## What Gets Refreshed vs Reloaded

### Preserved State (Functional Components)

For edits to functional components and hooks:
- React state (`useState`, `useReducer`) is preserved
- Refs are preserved
- Component DOM nodes are updated in place
- Effects re-run based on dependency changes

### Reset State (Various Conditions)

State is reset when:
1. **Class components** - Always remount (no state preservation)
2. **Hook signature changes** - Different hooks or different order
3. **Custom hook edits** - Hook defined outside the component being edited
4. **`/* @refresh reset */`** - Manual directive in the file
5. **Error threshold exceeded** - Multiple consecutive errors

### Full Page Reload

A full page reload occurs when:
1. Non-React modules are changed (utils, styles, configs)
2. Server-side code changes (API routes, getServerSideProps)
3. Layout files change (layout.tsx, _app.tsx)
4. Error recovery fails after multiple attempts

## Error Recovery Mechanism

### Compilation Errors
- Shown in browser overlay
- Does not trigger page reload
- Cleared when file is fixed

### Runtime Errors
- Caught by Error Boundary created by Fast Refresh
- "Error in [filename]" overlay appears
- After 5 errors or a SyntaxError, full page reload is triggered
- Fixed code clears the overlay and resumes normal Fast Refresh

### Error Boundary Behavior

Fast Refresh creates a special error boundary per file:

```javascript
// Runtime error boundary (simplified)
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Track failed roots for retry
    failedRoots.add(this);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorOverlay error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**Recovery flow:**
1. Error occurs during render
2. ErrorBoundary catches it, shows overlay
3. User fixes the code
4. Next HMR update clears overlay and re-renders

## React Version Considerations

### React 18+ Changes
- **Automatic batching** - Fast Refresh updates are batched
- **Suspense integration** - Better handling of loading states during refresh
- **useId** - Stable IDs across refreshes (no state loss from ID changes)

### React 19 Considerations
- **Server Components** - Require full reload (Fast Refresh not applicable)
- **Actions API** - Updated in place with state preservation

## Implementation Details from React Refresh Runtime

### Module Registration

```javascript
// From React's react-refresh/runtime
const register = (type, id) => {
  const family = typeof id === 'number' ? [id] : id;
  if (!registrations.has(type)) {
    registrations.set(type, family);
  } else {
    // Merge families for nested types (memo, forwardRef)
    const existing = registrations.get(type);
    registrations.set(type, [...existing, ...family]);
  }
};
```

### Signature Computation

```javascript
// Hook signatures track the actual hook calls
function setSignature(type, key) {
  // Store hook signature for this component
  signatures.set(type, key);
}

function computeFullKey(signature) {
  // Combine nested component signatures
  // e.g., memo(Component) includes both signatures
  return signature;
}
```

### Update Scheduling

```javascript
// Updates are scheduled, not applied immediately
const performReactRefresh = () => {
  // Snapshot current state to avoid mutation during iteration
  const families = snapshot(familiesByType);

  for (const [type, family] of families) {
    const update = determineUpdate(type, family);
    if (update.preserve) {
      // Mark for state preservation
    } else {
      // Mark for remount
    }
  }

  // Apply all updates in a single pass
  scheduler.flush();
};
```

## Fast Refresh Babel Plugin Specifics

The Babel plugin (`ReactFreshBabelPlugin.js`) performs several transformations:

### 1. Component Detection

```javascript
// Detects component-like names (PascalCase)
const isComponentishName = (name) => {
  return name[0] === name[0].toUpperCase() && name[0] !== '_';
};

// Handles various patterns:
// - function Counter() {}
// - const Counter = () => {}
// - const Counter = React.memo(...)
// - export default memo(...)
```

### 2. Inner Component Detection

```javascript
// Finds components wrapped in HOCs
const findInnerComponents = (node, hocs) => {
  // Recursively unwraps: memo(), forwardRef(), styled(), etc.
  // Tracks all wrapper types
};
```

### 3. Hook Collection

```javascript
// Collects all hook calls for signature computation
const collectHookCalls = (path) => {
  const calls = [];
  path.traverse({
    CallExpression(node) {
      if (isHookCall(node)) {
        calls.push({
          name: node.callee.name,
          line: node.loc.start.line,
        });
      }
    }
  });
  return calls;
};
```

### 4. Signature Key Generation

```javascript
// Hash-based signature for production compactness
const getHookCallsSignature = (calls, filename) => {
  if (isInProduction) {
    // Compact hash in production
    return hash(calls).slice(0, 12);
  }
  // Verbose key in development for better debugging
  return calls.map(c => `${c.name}:${c.line}`).join(',');
};
```

## Reset Directive

The `/* @refresh reset */` directive forces state reset:

```javascript
// In your component file:
// /* @refresh reset */

// This causes:
// 1. All components in the file to remount
// 2. State to be lost
// 3. React to treat it as a full reload for that file

// Useful for:
// - Error boundary components
// - Components with cached state that must be fresh
// - Debugging state-related issues
```

## Limitations

### Cannot Preserve State When:
1. Changing from class to function component
2. Changing hook order or adding/removing hooks
3. Editing a custom hook that multiple components use
4. Using certain TypeScript generic transformations

### Full Reload Required For:
1. Changes to `getServerSideProps` or `getStaticProps`
2. Changes to `_app.tsx` or `_document.tsx`
3. Changes to Next.js configuration
4. Adding new routes
5. Server Components (RSC) changes

## Debugging Fast Refresh

### Enable Verbose Logging

Add to your component:
```javascript
// /* @refresh trace */
// This logs what Fast Refresh is doing internally
```

### Check Signature Compatibility

If state is unexpectedly resetting:
1. Ensure hooks are called in the same order
2. Check for conditional hook calls
3. Verify custom hooks aren't causing resets

### Error Overlay Interpretation

- **Red**: Compilation error (syntax, import)
- **Yellow**: Runtime error during render
- **Orange**: Too many errors, suggesting full reload

## References

- [React Fast Refresh Package](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [React Refresh Babel Plugin Source](https://github.com/facebook/react/blob/main/packages/react-refresh/src/ReactFreshBabelPlugin.js)
- [React Refresh Runtime Source](https://github.com/facebook/react/blob/main/packages/react-refresh/src/ReactFreshRuntime.js)
- [Next.js Fast Refresh Architecture](https://nextjs.org/docs/architecture/fast-refresh)