# Admin User Creation

The `deesse admin create` command creates the first admin user for your DeesseJS project. This command uses better-auth's admin plugin to create a user with the `admin` role directly through the CLI.

---

## Usage

```bash
deesse admin create [options]
```

### Interactive Mode

Run without arguments to enter interactive mode. The CLI will prompt for required values:

```bash
deesse admin create
```

### Non-Interactive Mode

Pass credentials directly as options:

```bash
deesse admin create --email admin@example.com --password Secur3P@ss!
```

---

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--email <email>` | Admin email address | Yes (in non-interactive mode) |
| `--password <password>` | Admin password (min 8 characters) | Yes (in non-interactive mode) |
| `--name <name>` | Admin display name | No (defaults to "Admin") |
| `--cwd <path>` | Working directory | No (defaults to current directory) |

---

## Examples

### Interactive Creation

```bash
$ deesse admin create
? Admin email: admin@example.com
? Admin password: ************
Admin user created successfully!
  Email: admin@example.com
  Name: Admin
  ID: abc123...
```

### Non-Interactive Creation

```bash
deesse admin create \
  --email admin@example.com \
  --password Secur3P@ss! \
  --name "Site Administrator"
```

### With Custom Working Directory

```bash
deesse admin create \
  --email admin@example.com \
  --password Secur3P@ss! \
  --cwd /path/to/project
```

---

## Requirements

Before running this command, ensure:

1. **Database is configured** - Your project has a valid `DATABASE_URL` in `.env`
2. **Database schema is applied** - Run `deesse db:push` or `deesse db:migrate` first
3. **better-auth with admin plugin is configured** - Your `deesse.config.ts` must include the admin plugin

```typescript
// deesse.config.ts
import { defineConfig } from "deesse";
import { admin } from "better-auth/plugins";

export const config = defineConfig({
  database: drizzle({ client: pool }),
  auth: {
    plugins: [admin()],
  },
});
```

---

## Security Considerations

### Password Requirements

- Minimum 8 characters
- Passwords are never logged or displayed
- Input uses secure prompts (no echo)

### Email Validation

Public email domains (gmail.com, yahoo.com, etc.) are not recommended for admin accounts. The CLI will display a warning if you use one.

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `USER_ALREADY_EXISTS` | User with this email already exists | Use a different email |
| `DATABASE_ERROR` | Cannot connect to database | Check `DATABASE_URL` in `.env` |
| `INVALID_PASSWORD` | Password too short | Use at least 8 characters |

---

## Integration with Init

The admin creation command can be run during project initialization:

```bash
# Interactive init (prompts for admin)
deesse init

# Non-interactive init with admin
deesse init --admin-email admin@example.com --admin-password Secur3P@ss!
```

---

## Related

- [CLI Overview](./README.md)
- [Database Commands](./DB-COMMANDS.md)
- [Better Auth Admin Plugin](../../authentication/better-auth/admin-users.md)