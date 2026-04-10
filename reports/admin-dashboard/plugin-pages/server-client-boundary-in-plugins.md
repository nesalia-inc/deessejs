# Server-Client Boundary in Plugin Pages

## The Core Challenge

Plugin pages need to make auth requests (like `auth.api.listUsers()`), but:

1. **Pages are Server Components** - `deesse.pages.tsx` has no "use client" directive, so pages render as Server Components
2. **Server Components can't use hooks** - No `useState`, `useEffect`, etc.
3. **Auth requires access to `auth` object** - Which is only available via `deesseAuth` passed to `RootPage`
4. **Page content receives no props** - `RootPage` renders `result.page.content` with nothing passed

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RootPage                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1. Server-side session check                                │ │
│  │    const session = await auth.api.getSession({ headers }) │ │
│  │                                                             │ │
│  │ 2. Find page by slug                                        │ │
│  │    const result = findPage(config.pages, slugParts)        │ │
│  │                                                             │ │
│  │ 3. Render content - NO PROPS PASSED                        │ │
│  │    return <>{result.page.content}</>;                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Page Content    │
                    │ (Server Component) │
                    │                 │
                    │ No auth access!  │
                    │ No hooks!        │
                    └─────────────────┘
```

## What's Available in Server Components

### Can Do:
- Fetch data directly using `deesseAuth.api.*`
- Use async/await
- Render other Server Components
- Render Client Components (as children)

### Cannot Do:
- Use React hooks (useState, useEffect, etc.)
- Have interactive state without Client Components
- Access browser APIs

## How Current Auth Access Works

In `RootPage` (line ~45):
```typescript
const session = await (auth.api as any).getSession({
  headers: await headers(),
});

if (!session) {
  redirect("/admin/login");
}
```

**Key insight:** The session is fetched but **not passed to pages**.

## Solution 1: Async Page Content Function

Change `Page.content` to be an async function that receives context:

```typescript
type PageContext = {
  session: Session;
  auth: Auth;
};

type PageContent =
  | ReactNode
  | ((context: PageContext) => Promise<ReactNode>);

type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: PageContent;
};
```

**RootPage modification:**
```typescript
// Instead of just rendering content
return <>{result.page.content}</>;

// Now check if content is a function and call it
const content = result.page.content;
if (typeof content === "function") {
  // content receives session and auth
  return <>{await content({ session, auth })}</>;
}
return <>{content}</>;
```

## Solution 2: Client Components Within Server Pages

Even with async page content, you can still have Client Components:

```typescript
// Server-side page content
async ({ session, auth }) => {
  // Fetch data with server-side auth
  const { users } = await auth.api.listUsers({ limit: 10 });

  // Render client component with fetched data as props
  return (
    <UserListPage
      initialUsers={users}
      session={session}
    />
  );
}
```

```typescript
// UserListPage.tsx - Client Component
"use client";

export function UserListPage({ initialUsers, session }) {
  const [users, setUsers] = useState(initialUsers);
  const [filter, setFilter] = useState("");

  // Client-side filtering/sorting
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter users..."
      />
      <Table data={filteredUsers} />
    </div>
  );
}
```

## Plugin Page Rendering Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         RootPage                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1. Session check (server-side)                            │ │
│  │ 2. Find page                                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 3. Check if page.content is a function                    │ │
│  │    if (typeof content === "function") {                    │ │
│  │      html = await content({ session, auth });              │ │
│  │    }                                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 4. Async function executes "use server"                    │ │
│  │    - auth.api.listUsers() called                           │ │
│  │    - Database query happens                               │ │
│  │    - Returns React component                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────────┐                         │
│                    │ Page Component  │                         │
│                    │ (with data)     │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## "use server" Directive Inside Async Functions

When page content is an async function, you can use "use server" inside it:

```typescript
page({
  name: "Users",
  slug: "users",
  content: async ({ session, auth }) => {
    "use server";  // This directive makes the function run on server

    // This code runs on the server with access to:
    // - auth.api.* (all better-auth endpoints)
    // - Database via auth.internalAdapter.*
    // - Session from context

    const { users } = await auth.api.listUsers({ limit: 10 });
    const canCreate = hasPermission({
      role: session.user.role,
      permissions: { user: ["create"] },
    });

    return (
      <div>
        <h1>Users</h1>
        {canCreate && <CreateUserButton />}
        <UserTable users={users} />
      </div>
    );
  },
})
```

## Data Flow for Plugin Pages

```
Plugin defines page with async content
         │
         ▼
RootPage finds page, has session + auth
         │
         ▼
Call content({ session, auth })
         │
         ▼
"use server" executes on server
         │
         ▼
auth.api.listUsers() called
         │
         ▼
React component returned with data
         │
         ▼
Component rendered (can contain Client Components)
```

## Type Safety for Auth Context

```typescript
// In PageContext type
type PageContext = {
  session: {
    user: UserWithRole;  // Includes role, banned, etc.
    session: Session;
  };
  auth: Auth;  // Has auth.api.listUsers, etc.
};

// Plugin page can strongly type the context
content: async ({ session, auth }) => {
  // session.user.role is typed
  // auth.api.listUsers is typed
}
```

## Summary

| Challenge | Solution |
|-----------|----------|
| Pages have no auth access | Pass session/auth via async function context |
| Server Components can't use hooks | Use client components as children, receive data via props |
| "use server" in plugins | Async function with "use server" directive inside |
| Type safety | Strongly type PageContext with session and auth types |

The server-client boundary is preserved because:
1. The async function executes server-side
2. Client components are rendered as children with serializable props
3. No "use client" needed at page level - content is already a server function