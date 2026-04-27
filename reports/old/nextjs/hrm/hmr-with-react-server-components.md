# HMR with React Server Components

## Overview

React Server Components (RSC) represent a paradigm shift in how React applications handle rendering. This document explains how HMR and Fast Refresh interact with Server Components, and what behaviors you can expect.

## What are React Server Components?

React Server Components are React components that render exclusively on the server. They:
- Can access backend resources directly (databases, filesystems)
- Cannot use client-side state or effects
- Cannot use browser-only APIs
- Are the default in Next.js App Router

```tsx
// Server Component (default in app directory)
async function Page() {
  const data = await db.query('SELECT * FROM posts');
  return <PostList posts={data} />;
}

// Client Component - explicitly marked
'use client';
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

## How HMR Interacts with Server Components

### Fundamental Limitation

**Server Components cannot be hot-updated.** This is a hard constraint, not a bug.

When a Server Component changes:
1. The server needs to re-render
2. The entire component tree may need to change
3. Client components that depend on server data may be affected

**Result: Full Page Reload**

### What Triggers Full Reload vs Fast Refresh

| File/Component Type | HMR Behavior | Why |
|--------------------|--------------|-----|
| Client Component (use client) | Fast Refresh | Runs in browser, React can update |
| Server Component | Full Page Reload | Must re-render on server |
| Server Action | Full Page Reload | Server-side handler |
| Layout (Server) | Full Page Reload | Structure change |
| Layout (Client) | Fast Refresh | UI-only change |
| Page (Server) | Full Page Reload | Contains server data |
| Page (Client parts) | Partial Fast Refresh | Only client parts update |
| API Route | Full Page Reload | Server-side code |
| Middleware | Full Page Reload | Edge runtime |

### File-by-File Analysis

#### app/page.tsx (Server Component Page)

```tsx
// app/page.tsx
export default async function Page() {
  // This is a Server Component
  const data = await fetchData();

  return (
    <div>
      <ServerData data={data} />
      <ClientCounter /> {/* This can still Fast Refresh */}
    </div>
  );
}
```

**Behavior when `page.tsx` changes:**
- Full page reload
- But `ClientCounter` state might be preserved if it's isolated

#### app/layout.tsx (Server Layout)

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  // Server Layout - changes trigger full reload
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

**Behavior when `layout.tsx` changes:**
- Full page reload (navigation context changes)

#### Client Components

```tsx
// components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  // State preserved via Fast Refresh
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Behavior when `Counter.tsx` changes:**
- Fast Refresh (state preserved)
- Component updates in place

## How Fast Refresh Works with Mixed Architectures

### Rendering Flow

```
User Edits File
      │
      ▼
Is it a Server Component?
      │
   ├───Yes──► Full Page Reload
      │
      └───No──► Is it a Client Component?
                    │
                 ├───Yes──► Fast Refresh (state preserved)
                    │
                    └───No──► Static import (styles, etc.)
                                  │
                               └───► Page Reload or CSS HMR
```

### Fast Refresh Within Server Component Boundaries

When you edit a Client Component that is imported by a Server Component:

```tsx
// app/page.tsx (Server Component)
import { Counter } from './Counter'; // Client Component

export default async function Page() {
  const data = await fetchData();
  return (
    <div>
      <h1>{data.title}</h1>
      <Counter /> {/* Can Fast Refresh! */}
    </div>
  );
}

// After editing Counter.tsx:
// - Only Counter component updates
// - Page gets full reload
// - BUT: if Page's server data is stable, React may preserve Counter state
```

### The "Island" Architecture

In RSC, the page is mostly server-rendered, with "islands" of client interactivity:

```
┌─────────────────────────────────────────────────┐
│ Server Component Tree (cold)                    │
│                                                 │
│  ┌─────────────┐    ┌─────────────────────┐    │
│  │ Layout      │    │ Page                │    │
│  │ (server)    │    │ (server)            │    │
│  │             │    │                     │    │
│  │             │    │  ┌─────────────┐    │    │
│  │             │    │  │ Interactive │    │    │
│  │             │    │  │ Component   │    │    │
│  │             │    │  │ (client)    │    │    │
│  │             │    │  │ ★ FAST      │    │    │
│  │             │    │  │   REFRESH   │    │    │
│  │             │    │  └─────────────┘    │    │
│  │             │    │                     │    │
│  └─────────────┘    └─────────────────────┘    │
│       │                     │                    │
│       ▼                     ▼                    │
│   Full Reload        Fast Refresh (if client)   │
│   (no state)         (state preserved)          │
└─────────────────────────────────────────────────┘
```

## State Preservation Patterns with RSC

### Pattern 1: Client Component Isolation

```tsx
// app/page.tsx
import { ServerHeader } from './ServerHeader';
import { ClientCounter } from './ClientCounter';

export default async function Page() {
  const data = await fetchData(); // Server-only data fetching

  return (
    <div>
      {/* Server component - changes cause full reload */}
      <ServerHeader title={data.title} />

      {/* Client component - changes use Fast Refresh */}
      <ClientCounter initialCount={data.count} />
    </div>
  );
}
```

**State Preservation:**
- `ClientCounter` state preserved on its own edits
- `ServerHeader` changes still cause full page reload
- BUT: Once page reloads, `ClientCounter` gets fresh `initialCount`

### Pattern 2: Lifting Client State

```tsx
// app/page.tsx
import { ClientIsland } from './ClientIsland';

export default async function Page() {
  const data = await fetchData();

  // Lift client state to a client component boundary
  return <ClientIsland initialData={data} />;
}

// ClientIsland.tsx
'use client';

export function ClientIsland({ initialData }) {
  const [count, setCount] = useState(initialData.count);
  // This state is preserved on hot updates to ClientIsland
  // Even if parent server components cause full reload

  return <div>{count}</div>;
}
```

### Pattern 3: Route Group Separation

Using route groups to structure client-heavy sections:

```
app/
  (marketing)/
    page.tsx      # Mostly server
    layout.tsx    # Server layout
  (app)/
    dashboard/
      page.tsx    # Client-heavy
      layout.tsx  # Client layout
      Counter.tsx # Client component with state
```

When editing `Counter.tsx`:
- Only that component uses Fast Refresh
- Full reload of dashboard route, but other routes unaffected

## Error Boundaries and RSC

### Error Boundary Behavior

Error boundaries in RSC work differently:

```tsx
// app/components/ErrorBoundary.tsx
'use client';

export class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}
```

**When a Server Component throws:**
- Error boundary catches it (if it's a client boundary)
- Page may show partial UI
- Error is recoverable without full reload

**When a Client Component throws:**
- Same error boundary behavior
- Fast Refresh attempts recovery
- After 5 errors, triggers full reload

## Server Actions and HMR

Server Actions (`use server`) also affect HMR:

```tsx
// app/actions.ts
'use server';

export async function submitForm(formData: FormData) {
  // Server-side action
  await db.insert(formData);
  revalidatePath('/');
}

// When submitForm changes:
// - Full page reload (server code)
// HMR does NOT apply to server actions
```

### Calling Server Actions from Client Components

```tsx
// app/components/Form.tsx
'use client';

import { submitForm } from '../actions';

export function Form() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await submitForm(formData);
    setPending(false);
  }

  return (
    <form action={handleSubmit}>
      {/* Form content */}
    </form>
  );
}
```

**When `Form.tsx` changes:**
- Fast Refresh works for the client component
- Server action changes still cause full reload

## Streaming and HMR

With React Suspense and streaming:

```tsx
// app/page.tsx
import { Suspense } from 'react';
import { ServerData } from './ServerData';
import { ClientCounter } from './ClientCounter';

export default function Page() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <ServerData />
      </Suspense>
      <ClientCounter />
    </div>
  );
}
```

**HMR behavior:**
- `ClientCounter` changes Fast Refresh (state preserved)
- `ServerData` changes trigger full reload
- Suspense boundary doesn't change HMR behavior

## Debugging RSC HMR Issues

### Checking Component Type

In browser console:

```javascript
// Check if component is server or client
// Look at Next.js DevTools overlay

// Server components show: "Server Component"
// Client components show: "Client Component"
```

### Forcing Client Component Behavior

If you need more granular HMR:

```tsx
// Instead of having a large server component
// Break it into smaller client islands

// Problem: Large server component with some interactive parts
// app/dashboard/page.tsx
async function DashboardPage() {
  const data = await fetchDashboard();
  return (
    <div>
      <StaticHeader />
      <InteractiveWidget data={data.widget} /> {/* Need HMR here */}
      <MoreStatic />
    </div>
  );
}

// Solution: Extract interactive part to client component
// app/components/InteractiveWidget.tsx
'use client';
export function InteractiveWidget({ data }) {
  // This component can Fast Refresh
  const [expanded, setExpanded] = useState(false);
  return <div>{/* interactive content */}</div>;
}
```

## Common Issues

### Issue 1: Server Component Edits Reset Client State

**Problem:** Editing a server component causes full reload, losing client state.

**Solution:** This is expected. To preserve state:
1. Move client logic into isolated client components
2. Use URL state (search params) for important state
3. Use cookies/localStorage for persistence

### Issue 2: Can't Get HMR for Layout

**Problem:** Layout changes always cause full reload.

**Solution:** This is expected behavior. Strategies:
1. Keep layouts simple (static when possible)
2. Move dynamic parts to client components within layouts
3. Use route groups to separate concerns

### Issue 3: Server Actions Not Refreshing

**Problem:** Edited server action doesn't take effect.

**Solution:** Server actions run on server. Edits require:
- Full page reload (automatic)
- No special HMR for server-side code

### Issue 4: Client Component Deep in Server Tree

```tsx
// app/page.tsx (server)
├── ServerComponentA
│   └── ServerComponentB
│       └── ClientComponent (deeply nested)
```

**Behavior:** `ClientComponent` still uses Fast Refresh on edits.
The server component tree above it doesn't affect HMR for client components.

## Performance Considerations

### RSC HMR Strategy

1. **Minimize server component boundaries** - Move client components higher
2. **Isolate client islands** - Wrap them in client components
3. **Use route groups** - Separate client-heavy routes from server-only routes

### Example Structure for Optimal HMR

```
app/
  (routes)/
    page.tsx           # Thin server wrapper
    components/
      Counter.tsx      # Client component - good HMR
      Form.tsx         # Client component - good HMR
      Chart.tsx        # Client component - good HMR
  layout.tsx           # Simple server layout
```

### Monitoring HMR Effectiveness

In Next.js DevTools:
- Shows which components are "hot" (can Fast Refresh)
- Shows which components cause full reload

## References

- [Next.js Server Components Documentation](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [Next.js App Router Guide](https://nextjs.org/docs/app/building-your-application/rendering)
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Fast Refresh Architecture](https://nextjs.org/docs/architecture/fast-refresh)