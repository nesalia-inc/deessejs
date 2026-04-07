# Admin Command Implementation

This document describes the internal implementation of the `deesse admin create` command.

---

## Architecture

The admin command follows the same pattern as other CLI commands in `packages/cli/src/commands/`:

```
packages/cli/src/
├── index.ts              # Entry point, command dispatcher
└── commands/
    ├── db.ts             # Database commands (db:generate, db:push, db:migrate)
    ├── init.ts           # Project initialization
    └── admin.ts          # Admin user creation
```

---

## Config Loading

### Pattern: Direct Dynamic Import via `@deesse-config`

The CLI uses the same `@deesse-config` alias as API routes, ensuring consistent config access:

```typescript
// packages/cli/src/commands/admin.ts
import { pathToFileURL } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

async function loadConfig(cwd: string = process.cwd()) {
  // Resolve @deesse-config alias to actual file path
  const configPath = path.resolve(cwd, "src/deesse.config.ts");

  // Windows ESM compatibility: use file:// URL
  const configModule = await import(pathToFileURL(configPath).toString());

  // Support both default and named exports
  const config = configModule.default || configModule.config;
  if (!config) {
    throw new Error("Config must have a default export or named 'config' export");
  }

  return config;
}
```

### Config File Discovery

The CLI searches for config in priority order:

```typescript
const CONFIG_PATHS = [
  "src/deesse.config.ts",
  "deesse.config.ts",
  "config/deesse.ts",
];
```

### Environment Variable Loading

```typescript
import "dotenv/config";

async function loadConfig(cwd: string = process.cwd()) {
  // dotenv loads .env automatically
  const config = await importConfig(cwd);
  return config;
}
```

---

## Command Structure

```typescript
// packages/cli/src/commands/admin.ts
import { Command } from "@commander-js/commander";
import { adminCreate } from "./admin-create.js";

export const adminCommand = new Command("admin")
  .description("Manage admin users")
  .addCommand(
    new Command("create")
      .description("Create an admin user")
      .option("--email <email>", "Admin email address")
      .option("--password <password>", "Admin password (min 8 characters)")
      .option("--name <name>", "Admin display name", "Admin")
      .option("--cwd <path>", "Working directory", process.cwd())
      .action(adminCreate)
  );
```

---

## Implementation Flow

### 1. Input Validation

```typescript
// packages/cli/src/commands/admin-create.ts
import { isEmail } from "validator";
import { z } from "zod";

const AdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).default("Admin"),
});

function validateInput(options: Record<string, unknown>) {
  const result = AdminSchema.safeParse(options);

  if (!result.success) {
    const error = result.error.errors[0];
    throw new Error(`${error.path.join(".")}: ${error.message}`);
  }

  return result.data;
}
```

### 2. Interactive Prompts

Uses `@clack/prompts` for interactive UI (same as better-auth CLI):

```typescript
import { intro, text, password, confirm, outro } from "@clack/prompts";

async function promptForAdminDetails(): Promise<{
  email: string;
  password: string;
  name: string;
}> {
  intro("Creating admin user");

  const email = await text({
    message: "Admin email:",
    validate: (value) => {
      if (!isEmail(value)) return "Invalid email format";
      if (isPublicEmailDomain(value)) return "Warning: Public email domains are not recommended for admin accounts";
      return true;
    },
  });

  const password = await password({
    message: "Admin password:",
    mask: true,
    validate: (value) => {
      if (value.length < 8) return "Password must be at least 8 characters";
      return true;
    },
  });

  const name = await text({
    message: "Admin display name:",
    defaultValue: "Admin",
  });

  return { email, password, name };
}
```

### 3. Config Loading

```typescript
import { getDeesse } from "deesse";
import { defineConfig } from "deesse";

async function loadDeesseConfig(cwd: string) {
  try {
    const configPath = path.resolve(cwd, "src/deesse.config.ts");
    const configModule = await import(pathToFileURL(configPath).toString());
    const rawConfig = configModule.default || configModule.config;

    if (!rawConfig) {
      throw new Error("No config found. Run 'deesse init' first.");
    }

    return defineConfig(rawConfig);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `Config file not found at ${configPath}. ` +
        `Run 'deesse init' to create a new project or ensure @deesse-config alias is set up.`
      );
    }
    throw error;
  }
}
```

### 4. Admin User Creation

```typescript
import { admin } from "better-auth/plugins";

async function createAdminUser(options: AdminOptions) {
  const config = await loadDeesseConfig(options.cwd);

  // Verify admin plugin is configured
  if (!config.auth?.plugins?.some((p) => p?.toString().includes("admin"))) {
    throw new Error(
      "Admin plugin not configured. Add 'admin()' to your auth.plugins in deesse.config.ts"
    );
  }

  const deesse = getDeesse(config);
  const { auth } = deesse;

  // Create admin user via better-auth API
  const result = await auth.api.createUser({
    body: {
      email: options.email,
      password: options.password,
      name: options.name,
      role: "admin",
    },
  });

  return result;
}
```

### 5. Error Handling

Maps errors to user-friendly messages with suggestions:

```typescript
const ERROR_MAP: Record<string, { message: string; suggestion: string }> = {
  USER_ALREADY_EXISTS: {
    message: "A user with this email already exists",
    suggestion: "Use a different email or check if an admin already exists",
  },
  DATABASE_ERROR: {
    message: "Cannot connect to database",
    suggestion: "Check DATABASE_URL in your .env file and ensure PostgreSQL is running",
  },
  INVALID_PASSWORD: {
    message: "Password must be at least 8 characters",
    suggestion: "Choose a longer password",
  },
  CONNECTION_REFUSED: {
    message: "Database connection refused",
    suggestion: "Ensure PostgreSQL is running and DATABASE_URL is correct",
  },
};

function handleError(error: unknown): never {
  const code = (error as { code?: string }).code || "";
  const mapped = ERROR_MAP[code];

  if (mapped) {
    console.error(`Error: ${mapped.message}`);
    console.error(`Suggestion: ${mapped.suggestion}`);
    process.exit(1);
  }

  // Fallback for unknown errors
  console.error("Unexpected error:", error);
  process.exit(1);
}
```

---

## Security Measures

### Password Handling

- Passwords are **never** stored, logged, or echoed to console
- Use `mask: true` in password prompts
- Validate minimum length before sending to API

```typescript
// Validate locally before API call
if (options.password.length < 8) {
  throw new Error("Password must be at least 8 characters");
}
```

### Sensitive Data Redaction

For any logging/display, redact sensitive fields:

```typescript
function sanitizeForLogging(obj: Record<string, unknown>) {
  const sensitive = ["password", "secret", "token", "key", "apiKey"];
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
}
```

### Public Email Warning

Warn users when using public email domains for admin accounts:

```typescript
const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
];

function isPublicEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return PUBLIC_EMAIL_DOMAINS.includes(domain);
}

function warnPublicEmail(email: string) {
  console.warn(
    `\n⚠️  Warning: ${email} is a public email domain.\n` +
    "   Admin accounts should use organizational email addresses.\n"
  );
}
```

---

## Output Formatting

Use `@clack/prompts` for consistent CLI output:

```typescript
import { log } from "@clack/prompts";

function printSuccess(result: { user: { id: string; email: string; name: string } }) {
  log.success("Admin user created successfully!");
  log.info(`Email: ${result.user.email}`);
  log.info(`Name: ${result.user.name}`);
  log.info(`ID: ${result.user.id.slice(0, 8)}...`);
}

function printError(error: Error) {
  log.error(error.message);
  if (error.suggestion) {
    log.info(error.suggestion);
  }
}
```

---

## Testing

```typescript
// packages/cli/src/commands/admin.test.ts
import { describe, it, expect, vi } from "vitest";
import { adminCreate } from "./admin-create";

describe("admin create command", () => {
  it("validates email format", async () => {
    const options = { email: "invalid", password: "password123" };
    await expect(adminCreate(options)).rejects.toThrow("Invalid email");
  });

  it("validates password length", async () => {
    const options = { email: "admin@example.com", password: "short" };
    await expect(adminCreate(options)).rejects.toThrow("at least 8 characters");
  });

  it("warns on public email domain", async () => {
    const options = { email: "admin@gmail.com", password: "password123" };
    // Should log warning but proceed
    const result = await adminCreate(options);
    expect(result).toBeDefined();
  });

  it("creates admin user successfully", async () => {
    const options = {
      email: "admin@company.com",
      password: "password123",
      name: "Admin User",
    };
    const result = await adminCreate(options);
    expect(result.user.role).toBe("admin");
  });

  it("handles USER_ALREADY_EXISTS error", async () => {
    const options = {
      email: "existing@company.com",
      password: "password123",
    };
    await expect(adminCreate(options)).rejects.toThrow("already exists");
  });
});
```

---

## Related

- [CLI Overview](../README.md)
- [DX Documentation](./README.md) - User-facing usage guide
- [Better Auth Admin Plugin](../../authentication/better-auth/admin-users.md)
- [CLI Config Patterns Report](../../../reports/cli/cli-config-patterns.md)
- [Better-Auth CLI Analysis Report](../../../reports/cli/better-auth-cli.md)