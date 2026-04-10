# Page Structure for deessejs Admin User Pages

## Route Structure

Based on the existing deessejs architecture using the catch-all `[[...slug]]` route, the user management pages should follow this structure:

```
/admin/users                        # User list (default)
/admin/users/new                   # Create user
/admin/users/[id]                  # User detail
/admin/users/[id]/edit             # Edit user
/admin/users/[id]/sessions         # User sessions list
/admin/users/[id]/sessions/[sessionId]  # Specific session detail
/admin/users/[id]/password         # Set password
```

## Slug-to-Page Content Mapping

The existing `RootPage` component uses `findPage(config.pages, slugParts)` to locate pages:

| URL | slugParts | Matched Page |
|-----|-----------|-------------|
| `/admin` | `[]` | Home page (empty slug) |
| `/admin/users` | `['users']` | Users list |
| `/admin/users/new` | `['users', 'new']` | New user form |
| `/admin/users/abc123` | `['users', 'abc123']` | User detail for ID `abc123` |
| `/admin/users/abc123/edit` | `['users', 'abc123', 'edit']` | Edit user |
| `/admin/users/abc123/sessions` | `['users', 'abc123', 'sessions']` | User sessions |

## Implementation via DSL

```typescript
// deesse.pages.ts
import { Users, UserCog, Shield, Sessions } from 'lucide-react';

const UsersListPage = () => <UsersList />;
const UserDetailPage = () => <UserDetail />;
const UserNewPage = () => <UserNewForm />;
const UserEditPage = () => <UserEditForm />;
const UserSessionsPage = () => <UserSessions />;

export const deessePages = [
  // ... existing pages
  page({
    name: 'Users',
    slug: 'users',
    icon: Users,
    content: UsersListPage,  // List view as default content
  }),
  section({
    name: 'Users',
    slug: 'users',
    children: [
      page({
        name: 'Users',
        slug: 'users',
        icon: Users,
        content: UsersListPage,
      }),
      page({
        name: 'New User',
        slug: 'users/new',
        icon: UserCog,
        content: UserNewPage,
      }),
      page({
        name: 'User Detail',
        slug: 'users/[id]',
        icon: Shield,
        content: UserDetailPage,
      }),
      page({
        name: 'User Sessions',
        slug: 'users/[id]/sessions',
        icon: Sessions,
        content: UserSessionsPage,
      }),
    ],
  }),
];
```

## Components Needed

### Data Display Components

| Component | Purpose |
|-----------|---------|
| `UserTable` | Main sortable/filterable table |
| `UserRow` | Individual user row with actions |
| `UserBadge` | Status badges (Active, Banned, Unverified) |
| `UserAvatar` | User avatar with fallback initials |
| `SessionList` | List of user sessions |
| `SessionRow` | Individual session with revoke action |
| `Pagination` | Page navigation controls |
| `SearchInput` | Global search field |
| `FilterDropdowns` | Role, status, date filters |

### Detail Panel Components

| Component | Purpose |
|-----------|---------|
| `UserProfileCard` | User overview card |
| `UserMetadataPanel` | Extended user info |
| `UserActivityTimeline` | Recent activity |
| `UserDangerZone` | Destructive actions (delete, ban) |

### Form Components

| Component | Purpose |
|-----------|---------|
| `UserForm` | Create/Edit user form |
| `PasswordForm` | Set/reset password |
| `RoleSelect` | Role assignment dropdown |
| `BanDialog` | Ban with reason and duration |
| `DeleteConfirmDialog` | Delete confirmation |

### Layout Components

| Component | Purpose |
|-----------|---------|
| `AdminShell` | Already exists, wraps with sidebar |
| `PageHeader` | Page title and actions |
| `DetailSlideOver` | Slide-over panel for quick view |
| `DataTable` | Reusable data table shell |

## Page Designs

### Users List Page (`/admin/users`)

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 🔍 Search users...              [Filter ▼] [+ Add User]   │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ ☐ │ User          │ Email           │ Role  │ Status │ Act │  │
│ │───┼───────────────┼─────────────────┼───────┼────────┼─────│  │
│ │ ☐ │ Alice Smith   │ alice@email.com │ admin │ ●active│ ⋮   │  │
│ │ ☐ │ Bob Jones     │ bob@email.com   │ user  │ ●active│ ⋮   │  │
│ │ ☐ │ Carol White   │ carol@email.com │ user  │ ○banned│ ⋮   │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Showing 1-20 of 156 users            < 1 2 3 ... 8 >       │  │
│ └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### User Detail Page (`/admin/users/[id]`)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Users                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 👤 Alice Smith                                          │    │
│  │    alice@email.com                                      │    │
│  │    Role: admin ● Active                                 │    │
│  │    Created: Jan 15, 2024                                │    │
│  │                                                          │    │
│  │    [Edit] [Ban] [Delete]                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐                 │
│  │ Profile  │ Sessions │ Activity │ Danger   │  ← Tabs          │
│  └──────────┴──────────┴──────────┴──────────┘                 │
│                                                                 │
│  [Tab Content Area]                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### User Sessions Page (`/admin/users/[id]/sessions`)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Alice Smith                                           │
├─────────────────────────────────────────────────────────────────┤
│ Sessions (3 active)                                             │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🌐 Chrome on Windows    │ 192.168.1.1  │ Jan 20, 2024 │ [X] │ │
│ │ ✓ Current session       │              │ 2 hours ago  │     │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 🌐 Safari on iOS        │ 10.0.0.5     │ Jan 19, 2024 │ [X] │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 📱 Mobile App           │ 172.16.0.1   │ Jan 18, 2024 │ [X] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Revoke All Sessions]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## State Management Patterns

### Server Component State (for initial data)

```typescript
// app/(deesse)/admin/users/page.tsx
export default async function UsersPage() {
  const users = await listUsers({ limit: 20, offset: 0 });
  return <UserTable initialUsers={users} />;
}
```

### Client Component State (for interactions)

```typescript
// components/admin/users/user-table.tsx
"use client";

export function UserTable({ initialUsers }: { initialUsers: ListUsersResult }) {
  const [users, setUsers] = useState(initialUsers.users);
  const [total, setTotal] = useState(initialUsers.total);
  const [isPending, startTransition] = useTransition();

  // Optimistic updates for instant feedback
  const handleBan = async (userId: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, banned: true } : u
    ));

    startTransition(async () => {
      try {
        await banUser(userId);
      } catch {
        // Revert on error
        setUsers(initialUsers.users);
      }
    });
  };
}
```

## Navigation Flow

```
/admin/users (list)
    ├── /admin/users/new (create form)
    └── /admin/users/[id] (detail)
            ├── /admin/users/[id]/edit (edit form)
            ├── /admin/users/[id]/sessions (sessions list)
            └── /admin/users/[id]/password (password form)
```

## URL State Considerations

For the detail page, we use `[id]` as a slug segment. This means:
- `/admin/users/abc123` - User with ID `abc123`
- The `id` is passed as a prop to the page component
- Used to fetch user data via `getUser(id)`

If a user ID happens to match a reserved word like "new", the `/admin/users/new` route takes precedence due to slug matching order.