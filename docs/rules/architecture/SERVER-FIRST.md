# SERVER-FIRST Rule

## Rule

**Default to Server Components.** Only add `"use client"` when necessary. Ask "does this need client features?" before marking anything as client.

## When to Use Server Components

Server Components are the **default** in Next.js App Router. Use them when:

- ✅ Fetching data (databases, APIs)
- ✅ Accessing secrets or API keys
- ✅ Rendering static content
- ✅ Using server-only libraries
- ✅ Streaming content to client

## When to Use Client Components

Client Components (`"use client"`) are needed **only** when:

| Need | Example |
|------|---------|
| State | `useState`, `useReducer` |
| Events | `onClick`, `onChange`, `onSubmit` |
| Effects | `useEffect`, `useLayoutEffect` |
| Browser APIs | `window`, `localStorage`, `navigator` |
| Custom Hooks | Any hook using the above |

## Decision Flowchart

```
Do I need this to run on the client?
    │
    ├── YES: Does it need state, events, or browser APIs?
    │         │
    │         ├── YES → Add "use client" (Client Component)
    │         │
    │         └── NO → Can you pass data as props instead?
    │                   │
    │                   ├── YES → Keep Server Component
    │                   │
    │                   └── NO → Consider use() API or streaming
    │
    └── NO: Can it be a Server Component?
              │
              ├── YES → Use Server Component (no "use client")
              │
              └── NO → Explain why, then use Client Component
```

## Examples

### ✅ Server Component (Correct)

```tsx
// app/users/page.tsx — No interactivity needed
export default async function UsersPage() {
  const users = await db.select().from(usersTable)  // ✅ Server fetch

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

### ✅ Client Component (Correct)

```tsx
// app/ui/counter.tsx — Needs state
"use client"

import { useState } from "react"

export const Counter = ({ initialCount }: { initialCount: number }) => {
  const [count, setCount] = useState(initialCount)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### ❌ Client Component (Unnecessary)

```tsx
// ❌ page.tsx — Static content, no need for client
"use client"

export default function AboutPage() {
  return (
    <main>
      <h1>About Us</h1>
      <p>We're a company...</p>
    </main>
  )
}
```

### ✅ Server Component (Correct)

```tsx
// ✅ page.tsx — Static content, keep as server
export default function AboutPage() {
  return (
    <main>
      <h1>About Us</h1>
      <p>We're a company...</p>
    </main>
  )
}
```

## Mixing Server and Client

### Pattern: Server Fetches, Client Interacts

```tsx
// app/posts/[id]/page.tsx — Server fetches
import { LikeButton } from "@/components/like-button"

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)

  return (
    <article>
      <h1>{post.title}</h1>
      <LikeButton initialLikes={post.likes} />  {/* Server data, client interaction */}
    </article>
  )
}
```

```tsx
// components/like-button.tsx — Client interacts
"use client"

import { useState } from "react"

export const LikeButton = ({ initialLikes }: { initialLikes: number }) => {
  const [likes, setLikes] = useState(initialLikes)

  return (
    <button onClick={() => setLikes(l => l + 1)}>
      ❤️ {likes}
    </button>
  )
}
```

## Common Mistakes

### Mistake 1: Adding "use client" for Props

```tsx
// ❌ Wrong — thinking props need client
"use client"

export const UserCard = ({ user }: { user: User }) => {
  return <div>{user.name}</div>  // Just rendering props, no interactivity
}
```

```tsx
// ✅ Correct — props are fine without "use client"
export const UserCard = ({ user }: { user: User }) => {
  return <div>{user.name}</div>  // Server Component, props work fine
}
```

### Mistake 2: Adding "use client" for Styling

```tsx
// ❌ Wrong — className is not interactivity
"use client"

export const Header = () => {
  return <header className="flex items-center">...</header>
}
```

```tsx
// ✅ Correct — styling doesn't need client
export const Header = () => {
  return <header className="flex items-center">...</header>
}
```

### Mistake 3: Adding "use client" for Imports

```tsx
// ❌ Wrong — importing a client library doesn't make the component client
"use client"

import { someFunction } from "some-lib"
```

```tsx
// ✅ Correct — only mark if YOU use client features
import { someFunction } from "some-lib"
```

## Checklist

Before adding `"use client"`, confirm:

- [ ] Does this component use `useState`, `useReducer`, or other state?
- [ ] Does this component have event handlers (`onClick`, `onChange`)?
- [ ] Does this component use `useEffect`?
- [ ] Does this component access browser APIs (`window`, `localStorage`)?
- [ ] Is this component a custom hook that depends on the above?

If all answers are **no**, keep it as a Server Component.

## Enforcement

This rule is enforced through:
1. Code reviews — question every `"use client"`
2. Bundle analysis — verify client bundle size
3. Prefer smaller client boundaries

Remember: **Server is the default. Client is the exception.**
