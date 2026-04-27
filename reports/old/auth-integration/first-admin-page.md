# First Admin Setup Page: `/admin/first-admin-setup`

**Date:** 2026-04-14
**Classification:** Senior Architecture Deep Dive
**Focus:** Initial admin creation page and API route

---

## Executive Summary

This document covers the `/admin/first-admin-setup` page and the corresponding `POST /api/admin/create-first-admin` API route. This is a **bootstrapping page** shown only when no admin users exist in the system.

**Key characteristics:**
- Only accessible when `hasAdminUsers()` returns `false`
- Protected by `NODE_ENV !== 'production'` check
- Creates the very first admin user
- Redirects to login after success

---

## 1. When Is This Page Shown?

### 1.1 Decision: Always Check on Login Page

**YES** - The login page must check if any admins exist and redirect to `/admin/first-admin-setup` if none exist.

**Rationale:** Users should never see a login page with no way to create an account.

### 1.2 Detection Flow

```
User visits /admin/login
       |
       v
Check: hasAdminUsers()
       |
       +-- NO admins --> Redirect to /admin/first-admin-setup
       |
       +-- HAS admins --> Show login form
```

### 1.3 Also Shown When

- Fresh installation with empty database
- All admin accounts deleted
- First-time setup wizard scenario

---

## 2. Security Architecture

### 2.1 Three-Layer Protection

Based on PayloadCMS analysis, this endpoint uses **three-layer protection**:

| Layer | Protection | Implementation |
|-------|------------|----------------|
| **1. Production Guard** | Block in production | `NODE_ENV !== 'production'` check |
| **2. Admin Existence** | Block if admins exist | `hasAdminUsers() === false` |
| **3. Input Validation** | Validate all inputs | Email format, password length, domain restriction |

### 2.2 Production Guard

**Critical:** This endpoint should NEVER be available in production.

```typescript
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json(
    { error: 'FORBIDDEN', message: 'Not available in production' },
    { status: 403 }
  );
}
```

**Rationale:**
- Production should always have at least one admin
- Prevents accidental exposure of setup form
- Forces proper deployment-time admin creation via CLI

### 2.3 Admin Existence Check

```typescript
const adminExists = await hasAdminUsers();
if (adminExists) {
  return NextResponse.json(
    { error: 'FORBIDDEN', message: 'Admin users already exist' },
    { status: 403 }
  );
}
```

**This is the critical security check** - ensures only one first admin can ever be created.

---

## 3. API Route Design

### 3.1 Route

```
POST /api/admin/create-first-admin
```

### 3.2 Request

```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "name": "Admin User"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email format |
| password | string | Yes | Min 8 characters |
| name | string | No | Display name |

### 3.3 Responses

| Status | Response | When |
|--------|----------|------|
| 200 | `{ success: true, user: { id, email, name, role } }` | Success |
| 400 | `{ error: 'VALIDATION_ERROR', message: '...' }` | Invalid input |
| 403 | `{ error: 'FORBIDDEN', message: '...' }` | Production or admins exist |

### 3.4 Error Responses

```typescript
// Validation error (400)
{
  error: 'VALIDATION_ERROR',
  message: 'Invalid email format'
}

// Production block (403)
{
  error: 'FORBIDDEN',
  message: 'Not available in production'
}

// Admins already exist (403)
{
  error: 'FORBIDDEN',
  message: 'Admin users already exist'
}

// Internal error (500)
{
  error: 'INTERNAL_ERROR',
  message: 'Failed to create admin'
}
```

---

## 4. Implementation Flow

### 4.1 Server-Side Handler

```
1. Check NODE_ENV !== 'production'
       |
       v
2. Check hasAdminUsers() === false
       |
       v
3. Validate email format
       |
       v
4. Validate password length >= 8
       |
       v
5. Validate email domain (ADMIN_ALLOWED_DOMAINS)
       |
       v
6. Hash password (bcrypt)
       |
       v
7. Create user with role: "admin"
       |
       v
8. Return success response
```

### 4.2 Email Domain Validation

Optional protection via environment variable:

```bash
ADMIN_ALLOWED_DOMAINS=example.com,company.com
```

```typescript
function validateEmailDomain(email: string): boolean {
  const allowedDomains = process.env.ADMIN_ALLOWED_DOMAINS;
  if (!allowedDomains) return true;

  const domains = allowedDomains.split(',');
  const emailDomain = email.split('@')[1];
  return domains.includes(emailDomain);
}
```

---

## 5. Page Design (UI)

### 5.1 Route

```
/admin/first-admin-setup
```

### 5.2 Page Title

```
Create First Admin Account
```

### 5.3 Page Description

```
Welcome! Create your first admin account to get started.
```

### 5.4 Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | email input | Yes | Valid email, domain check |
| Password | password input | Yes | Min 8 chars, strength indicator |
| Name | text input | No | Display name |

### 5.5 Password Requirements Display

Show real-time feedback:
- Minimum 8 characters
- Show/hide password toggle
- Password strength indicator (optional)

### 5.6 Success State

After successful creation:
1. Show success message
2. Redirect to `/admin/login?created=true`
3. Show message on login page: "Account created. Please log in."

---

## 6. Client Integration

### 6.1 Form Submission

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  const response = await fetch('/api/admin/create-first-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (response.ok) {
    router.push('/admin/login?created=true');
  } else {
    const data = await response.json();
    setError(data.message);
  }
}
```

### 6.2 Redirect from Login

On `/admin/login` page:

```typescript
// Check if redirected from setup
const searchParams = useSearchParams();
const created = searchParams.get('created');

if (created === 'true') {
  // Show success message
}
```

---

## 7. Relationship with CLI Command

### 7.1 Two Methods for First Admin

| Method | Command | Use Case |
|--------|---------|----------|
| **API Route** | UI at `/admin/first-admin-setup` | Development, visual feedback |
| **CLI Command** | `npx @deessejs/cli admin create` | CI/CD, automation, before server runs |

### 7.2 Shared Logic

Both use the same core function:

```typescript
// packages/admin/src/lib/first-admin.ts
export async function createFirstAdmin(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<User>
```

### 7.3 CLI Command

See [cli-admin-create-command.md](./cli-admin-create-command.md) for full details.

```bash
npx @deessejs/cli admin create \
  --email admin@example.com \
  --password "securePassword123" \
  --name "Admin User"
```

---

## 8. Route Structure

```
app/
  (auth)/
    first-admin-setup/
      page.tsx         # Setup form page
    login/
      page.tsx         # Login (checks hasAdminUsers, redirects here if needed)
    forgot-password/
      page.tsx

app/
  api/
    admin/
      create-first-admin/
        route.ts       # POST handler
```

---

## 9. Security Checklist

| Item | Status |
|------|--------|
| Production guard (NODE_ENV check) | **Required** |
| Admin existence check (hasAdminUsers) | **Required** |
| Email format validation | **Required** |
| Password length validation (min 8) | **Required** |
| Email domain restriction (ADMIN_ALLOWED_DOMAINS) | Optional |
| Password hashing (bcrypt) | **Required** (handled by better-auth) |
| Rate limiting on endpoint | **Recommended** |
| Audit logging | **Recommended** |

---

## 10. Decisions Summary

| Question | Decision |
|----------|----------|
| Show on login if no admins | **YES** - redirect to first-admin-setup |
| Production guard | **YES** - 403 in production |
| Email domain restriction | Optional via ADMIN_ALLOWED_DOMAINS |
| Password minimum | 8 characters |
| Success redirect | `/admin/login?created=true` |

---

## 11. Files Reference

| File | Purpose |
|------|---------|
| `packages/admin/src/lib/first-admin.ts` | Core logic: `createFirstAdmin()`, `hasAdminUsers()` |
| `packages/deesse/src/app/api/admin/create-first-admin/route.ts` | API route handler |
| `packages/admin/src/app/(auth)/first-admin-setup/page.tsx` | Setup page component |
| [cli-admin-create-command.md](./cli-admin-create-command.md) | CLI alternative |

---

## 12. Open Questions

All decisions have been made.
