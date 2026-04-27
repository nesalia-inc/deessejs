# Page Content Types

Use `serverPage`, `clientPage`, or `dynamicPage` as the `content` of an `item()`.

---

## `serverPage(handler)`

Async server component. Runs on the server with direct access to the Deesse instance.

```typescript
serverPage(async (deesse) => {
  // deesse.auth — better-auth instance
  // deesse.database — Drizzle database
  return <Component />;
})
```

| Parameter | Type | Access |
|-----------|------|--------|
| `deesse.auth` | `Auth` | Session validation, signIn, signOut |
| `deesse.database` | `Database` | Drizzle queries |

```typescript
item({
  name: "Home",
  href: "/admin",
  content: serverPage(async (deesse) => {
    const stats = await deesse.database.select().from(schema.stats);
    return <Dashboard stats={stats} />;
  }),
})
```

---

## `clientPage(handler)`

Client component. Runs in the browser with React hooks.

```typescript
clientPage((client) => {
  // "use client" required in the file
  // client.auth — useSession(), signIn(), signOut()
  return <Component />;
})
```

| Parameter | Type | Access |
|-----------|------|--------|
| `client` | `DeesseClient` | React hooks via `client.auth` |

```typescript
item({
  name: "Users",
  href: "/admin/users",
  content: clientPage((client) => {
    const { data: session } = client.auth.useSession();
    return <UsersTable user={session?.user} />;
  }),
})
```

---

## `dynamicPage(config)`

Page with dynamic URL segments. Used for routes like `/admin/database/[table_slug]`.

```typescript
dynamicPage({
  name: string;
  slug: string;                              // required, must contain [param]
  icon?: LucideIcon;
  content: (params: Record<string, string>) => ReactNode;
})
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Display name |
| `slug` | `string` | Yes | URL pattern with `[param]` segments |
| `icon` | `LucideIcon` | No | Sidebar icon |
| `content` | `function` | Yes | Receives extracted params from URL |

### URL to Params Mapping

| Slug | URL | `params` |
|------|-----|----------|
| `database/[table_slug]` | `/admin/database/users` | `{ table_slug: "users" }` |
| `users/[id]/[view]` | `/admin/users/123/profile` | `{ id: "123", view: "profile" }` |

```typescript
item({
  name: "Table",
  href: "/admin/database/[table_slug]",
  content: dynamicPage((params) => <TableView table={params.table_slug} />),
})
```
