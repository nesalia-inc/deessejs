# Next.js Server and Client Components

## Source

[Next.js Documentation: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

## Key Definitions

### Server Components

By default, layouts and pages are **Server Components**. They:
- Fetch data directly from databases or APIs
- Can access secrets, API keys, and tokens without exposing them
- Reduce JavaScript sent to the browser
- Improve First Contentful Paint (FCP)

### Client Components

Client Components (marked with `"use client"`) are needed when:
- Using React state (`useState`) or event handlers (`onClick`, `onChange`)
- Using lifecycle logic (`useEffect`)
- Accessing browser-only APIs (`localStorage`, `window`, `Navigator`)
- Using custom hooks

## The `"use client"` Boundary

```tsx
"use client"
// This file and ALL its imports are part of the client bundle
```

Once a file has `"use client"`, **all its imports and child components are considered client code**.

## How It Works

### On First Load

```
Server renders:
  - Server Components → RSC Payload (binary format)
  - Client Components + RSC Payload → HTML prerendered

Client hydrates:
  1. HTML shows fast non-interactive preview
  2. RSC Payload reconciles Client/Server trees
  3. JavaScript hydrates Client Components
```

### On Subsequent Navigation

- RSC Payload is prefetched and cached
- Client Components render entirely on client

## RSC Payload

The React Server Component Payload is a compact binary format containing:
- Rendered result of Server Components
- Placeholders for where Client Components should render
- References to Client Component JavaScript files
- Props passed from Server to Client Components

## Common Patterns

### Pattern 1: Server Fetches, Client Interacts

```tsx
// app/ui/like-button.tsx — Client Component
"use client"

import { useState } from "react"

export default function LikeButton({ likes }: { likes: number }) {
  const [count, setCount] = useState(likes)
  return <button onClick={() => setCount(count + 1)}>{count} likes</button>
}
```

```tsx
// app/[id]/page.tsx — Server Component
import LikeButton from "@/app/ui/like-button"
import { getPost } from "@/lib/data"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)

  return (
    <div>
      <h1>{post.title}</h1>
      <LikeButton likes={post.likes} />  {/* Server fetches, Client interacts */}
    </div>
  )
}
```

### Pattern 2: Slot — Server Content in Client Wrapper

```tsx
// app/ui/modal.tsx — Client Component
"use client"

export default function Modal({ children }: { children: React.ReactNode }) {
  return <div className="modal">{children}</div>
}
```

```tsx
// app/page.tsx — Server Component
import Modal from "./ui/modal"
import Cart from "./ui/cart"

export default function Page() {
  return (
    <Modal>
      <Cart />  {/* Server Component inside Client Component */}
    </Modal>
  )
}
```

### Pattern 3: Provider Pattern

```tsx
// app/theme-provider.tsx — Client Component
"use client"

import { createContext } from "react"

export const ThemeContext = createContext({})

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
}
```

```tsx
// app/layout.tsx — Server Component
import ThemeProvider from "./theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

> **Tip:** Render providers as deep as possible — wrap only `{children}`, not the entire document.

### Pattern 4: Third-Party Components

```tsx
// app/carousel.tsx — Wrapper to make it a Client Component
"use client"

import { Carousel } from "acme-carousel"

export default Carousel
```

```tsx
// app/page.tsx — Server Component
import Carousel from "./carousel"

export default function Page() {
  return <Carousel />
}
```

## Serialization Rule

Props passed from Server to Client Components **must be serializable**:

```tsx
// ✅ Serializable props
<ClientComponent count={42} name="John" />
<ClientComponent user={{ id: 1, name: "John" }} />
<ClientComponent onClick={handleClick} />  // Functions CANNOT be passed as props
```

## Preventing Environment Poisoning

### The Problem

```ts
// lib/data.ts — Contains API_KEY
export async function getData() {
  const res = await fetch("https://external-service.com/data", {
    headers: { authorization: process.env.API_KEY }, // Never exposed to client
  })
  return res.json()
}
```

If imported in a Client Component:
- `API_KEY` is replaced with empty string (only `NEXT_PUBLIC_` vars are exposed)
- The function won't work but no error is thrown

### The Solution: `server-only`

```bash
npm install server-only
```

```ts
// lib/data.ts
import "server-only"

export async function getData() {
  const res = await fetch("https://external-service.com/data", {
    headers: { authorization: process.env.API_KEY },
  })
  return res.json()
}
```

Now, if imported in a Client Component, there's a **build-time error**.

### Corresponding: `client-only`

```bash
npm install client-only
```

For modules that must only run on the client (e.g., accessing `window`).

## Reducing JS Bundle Size

Keep layouts as Server Components — only mark interactive components as Client:

```tsx
// ✅ Good: Search is Client, rest is Server
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <nav>
      <Logo />           {/* Server Component */}
      <Search />          {/* Client Component — only this is in client bundle */}
      <Navigation />     {/* Server Component */}
    </nav>
    <main>{children}</main>
  )
}
```

```tsx
// ❌ Bad: Entire layout is Client
"use client"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <nav>
      <Logo />
      <Search />
      <Navigation />
    </nav>
    <main>{children}</main>
  </>
}
```

## Environment Variables

| Prefix | Bundled to Client | Example |
|--------|-------------------|---------|
| `NEXT_PUBLIC_` | Yes | `NEXT_PUBLIC_BASE_URL` |
| (none) | No (replaced with `""`) | `AUTH_SECRET`, `API_KEY` |

## Key Takeaways

1. **Default is Server** — Pages and layouts are Server Components by default
2. **`"use client"` is a boundary** — All imports of a `"use client"` file become client code
3. **Pass data via props** — Server fetches, passes to Client via props
4. **Slots pattern** — Use `children` to embed Server Components in Client Components
5. **Use `server-only`** — Prevent accidental server code in client bundles
6. **Minimize client surface** — Only mark truly interactive components as `"use client"`
7. **Providers go deep** — Wrap only `{children}`, not the entire layout

## Common Mistakes

### Mistake 1: Passing Functions as Props

```tsx
// ❌ Won't work
<ClientComponent onSubmit={handleSubmit} />

// ✅ Use slot pattern instead
<ClientComponent>
  <ServerForm onSubmit={handleSubmit} />
</ClientComponent>
```

### Mistake 2: Marking Static Components as Client

```tsx
// ❌ Wasteful — this is a Server Component
"use client"

export default function Logo() {
  return <img src="/logo.svg" alt="Logo" />
}

// ✅ Logo has no interactivity — keep as Server Component
export default function Logo() {
  return <img src="/logo.svg" alt="Logo" />
}
```

### Mistake 3: Forgetting Context is Client-Only

```tsx
// ❌ Context doesn't work in Server Components
export const ThemeContext = createContext("dark")

// ✅ Wrap in Client Component
"use client"

export const ThemeContext = createContext("dark")
export const ThemeProvider = ({ children }) => (
  <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
)
```

## For DeesseJS

When working with `@deessejs/next`:

- `RootPage` is a **Server Component** — handles auth, fetches session
- `AdminDashboardLayout` has `"use client"` — uses `useSidebar()` hook
- `DatabasePage` is a **Server Component** — will fetch DB data directly
- If a page needs client interactivity, add `"use client"` to that specific component only
