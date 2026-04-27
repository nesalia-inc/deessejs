# `item()`

The core building block. Defines a sidebar entry and its page content.

## Types

```typescript
// Navigation item — has a page
type NavigationItem = {
  name: string;
  icon?: LucideIcon;
  badge?: ReactNode | (() => Promise<ReactNode>);
  href: string;
  content?: ReactNode | null;  // null = placeholder page
  children?: SubMenu[];        // submenu items
}

// Action item — has a callback
type ActionItem = {
  name: string;
  icon?: LucideIcon;
  badge?: ReactNode | (() => Promise<ReactNode>);
  action: () => void;
  children?: SubMenu[];
}

type MenuItem = NavigationItem | ActionItem;
```

`href` and `action` are mutually exclusive.

## Examples

### Navigation page

```typescript
item({
  name: "Users",
  icon: Users,
  href: "/admin/users",
  content: clientPage(() => <UsersTable />),
})
```

### Action — opens a dialog, sheet, etc.

```typescript
item({
  name: "Create User",
  icon: Plus,
  action: () => openCreateUserSheet(),
})
```

### Placeholder page (no content yet)

```typescript
item({ name: "Plugins", href: "/admin/settings/plugins" })
```

### Badge — static or async

```typescript
item({
  name: "Notifications",
  icon: Bell,
  badge: <NotificationBadge count={3} />,
})

item({
  name: "Notifications",
  icon: Bell,
  badge: async () => {
    const count = await fetchNotificationCount();
    return <NotificationBadge count={count} />;
  },
})
```
