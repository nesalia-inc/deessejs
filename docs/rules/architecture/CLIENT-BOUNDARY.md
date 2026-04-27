# CLIENT-BOUNDARY Rule

## Rule

**Props crossing a `"use client"` boundary must be serializable.** Functions cannot be passed as props from Server to Client Components.

## Why

When props cross the Server/Client boundary:
1. React serializes them to send over the network
2. Functions are not serializable — they cannot be converted to JSON
3. Non-serializable props become `null` or cause errors

## The Problem

```tsx
// ❌ page.tsx — Server Component
export default async function Page() {
  const handleClick = () => console.log("clicked")  // Function

  return <Button onClick={handleClick} />  // ❌ Cannot pass function to client
}
```

## Serializable Props

| Type | Can Cross Boundary? |
|------|---------------------|
| `string` | ✅ |
| `number` | ✅ |
| `boolean` | ✅ |
| `null` | ✅ |
| `Object` (flat) | ✅ |
| `Array` | ✅ |
| `Date` | ✅ (becomes string) |
| `Function` | ❌ |
| `Class Instance` | ❌ |
| `Promise` | ❌ |

## Solutions

### Solution 1: Slot Pattern (Recommended)

Use `children` to embed Server Components inside Client Components:

```tsx
// ✅ page.tsx — Server Component
export default async function Page() {
  return (
    <Modal>
      <ServerContent />  {/* Server Component as children */}
    </Modal>
  )
}
```

```tsx
// ✅ modal.tsx — Client Component
"use client"

export const Modal = ({ children }: { children: React.ReactNode }) => {
  return <div className="modal">{children}</div>
}
```

### Solution 2: Callback Props via Event Handlers

For actions, use API routes or form submissions instead of callbacks:

```tsx
// ❌ Wrong — function as prop
<ClientButton onClick={handleClick} />

// ✅ Correct — Server Component renders, client handles submission
// Client Component uses form action or fetch
```

### Solution 3: Client Component Renders Itself

If a component needs both server data and client interactivity, split it:

```tsx
// ✅ Server Component — fetches data
export default async function PostPage({ params }) {
  const post = await getPost(params.id)

  return <PostContent post={post} />
}

// ✅ Client Component — handles interactivity
"use client"

export const PostContent = ({ post }) => {
  const [liked, setLiked] = useState(false)

  return (
    <article>
      <h1>{post.title}</h1>
      <button onClick={() => setLiked(true)}>Like</button>
    </article>
  )
}
```

## Context Is Client-Only

React Context does not work in Server Components:

```tsx
// ❌ Context cannot be created in Server Component
export const ThemeContext = createContext("dark")  // ❌ Won't work
```

```tsx
// ✅ Context must be created in Client Component
"use client"

export const ThemeContext = createContext("dark")
export const ThemeProvider = ({ children }) => {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
}
```

## Practical Example

### DeesseJS Admin Dashboard

```tsx
// ✅ admin/users/page.tsx — Server Component
import { UsersTable } from "./users-table"

export default async function UsersPage() {
  const users = await db.select().from(usersTable).all()

  return <UsersTable initialUsers={users} />
}
```

```tsx
// ✅ users-table.tsx — Client Component for interactivity
"use client"

import { useState } from "react"

export const UsersTable = ({ initialUsers }: { initialUsers: User[] }) => {
  const [users] = useState(initialUsers)  // Server data as initial state

  return (
    <table>
      {users.map(user => (
        <tr key={user.id}>
          <td>{user.name}</td>
          <td>
            <button onClick={() => deleteUser(user.id)}>Delete</button>
          </td>
        </tr>
      ))}
    </table>
  )
}
```

## Common Mistakes

### Mistake 1: Passing Event Handlers

```tsx
// ❌ Wrong
export default async function Page() {
  return <Button onClick={() => alert("hi")} />
}

// ✅ Correct — Button handles its own state
"use client"

export const Button = () => {
  return <button onClick={() => alert("hi")}>Click</button>
}
```

### Mistake 2: Passing Async Functions

```tsx
// ❌ Wrong
export default async function Page() {
  const handleSubmit = async (data) => {
    await fetch("/api/submit", { body: JSON.stringify(data) })
  }
  return <Form onSubmit={handleSubmit} />
}
```

### Mistake 3: Passing useCallback

```tsx
// ❌ Wrong
export default async function Page() {
  const memoizedHandler = useCallback(() => doSomething(), [])
  return <Button onClick={memoizedHandler} />
}
```

## Summary

| Pattern | Allowed? |
|---------|----------|
| `<Comp data={42} />` | ✅ |
| `<Comp data={{ name: "John" }} />` | ✅ |
| `<Comp data={myArray} />` | ✅ |
| `<Comp onClick={handler} />` | ❌ |
| `<Comp>{children}</Comp>` | ✅ (children is special) |

Remember: **Functions cannot cross the boundary. Use slots or split components.**
