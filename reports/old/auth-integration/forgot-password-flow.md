# Forgot Password / Password Reset Flow

**Parent:** [login-page-deep-analysis.md](./login-page-deep-analysis.md)
**Date:** 2026-04-14
**Classification:** Senior Architecture Deep Dive
**Focus:** Password reset flow and email provider system

---

## Executive Summary

This document covers the complete password reset flow including:
- Forgot password page (`/admin/forgot-password`)
- Reset password page (`/admin/reset-password`)
- Email provider adapter system for sending reset emails

---

## 1. Password Reset Flow Overview

### 1.1 Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Password Reset Flow                        │
└─────────────────────────────────────────────────────────────────┘

1. User clicks "Forgot password?" on login page
        │
        ▼
2. User visits /admin/forgot-password
        │
        ▼
3. User enters email address
        │
        ▼
4. Client calls client.auth.forgetPassword({ email })
        │
        ▼
5. POST /api/auth/request-password-reset
        │
        ▼
6. Server generates reset token, stores in DB
        │
        ▼
7. Server calls configured email provider
        │
        ▼
8. Email sent to user with reset link
        │
        ▼
9. User clicks link: /admin/reset-password?token=xxx
        │
        ▼
10. User enters new password
        │
        ▼
11. Client calls client.auth.resetPassword({ newPassword, token })
        │
        ▼
12. POST /api/auth/reset-password
        │
        ▼
13. Server validates token, updates password
        │
        ▼
14. Server revokes all existing sessions (if configured)
        │
        ▼
15. User redirected to /admin/login?reset=success
```

---

## 2. Forgot Password Page

### 2.1 Route

```
/admin/forgot-password
```

### 2.2 Purpose

Allows users to request a password reset email by entering their email address.

### 2.3 Client Method

```typescript
const { data, error } = await client.auth.forgetPassword({
  email: string;
  redirectTo?: string;  // URL after user clicks email link
});
```

**Endpoint:** `POST /api/auth/request-password-reset`

### 2.4 UX Flow

```
User enters email
       │
       ▼
Submit form
       │
       ▼
Show loading state
       │
       ▼
┌─────────────────────────────────────┐
│  ALWAYS show success, even if      │
│  email doesn't exist (prevents      │
│  email enumeration)                 │
└─────────────────────────────────────┘
       │
       ▼
Show: "Check your email for reset instructions"
```

### 2.5 Error Handling

| Error | Handling |
|-------|----------|
| Invalid email format | Show validation error |
| Rate limited (429) | Show "Too many requests, try again later" |
| Network error | Show "Network error, try again" |

---

## 3. Reset Password Page

### 3.1 Route

```
/admin/reset-password?token=xxx
```

### 3.2 Purpose

Allows user to set a new password using a token from the reset email.

### 3.3 Token Validation

On page load:
1. Extract `token` from URL query params
2. If no token → show error page
3. If token invalid/error from URL → show "Invalid or expired link"

### 3.4 Client Method

```typescript
const { data, error } = await client.auth.resetPassword({
  newPassword: string;
  token: string;
});
```

**Endpoint:** `POST /api/auth/reset-password`

### 3.5 Password Requirements

- Minimum 8 characters (enforced by better-auth)
- No complexity requirements (can be configured)

### 3.6 After Success

1. Redirect to `/admin/login?reset=success`
2. Show success message on login page: "Password reset successfully. Please log in."

---

## 4. Email Provider System

### 4.1 The Problem

Password reset emails require an email service. Different projects may need different providers.

### 4.2 Supported Providers

| Provider | Use Case | Pros | Cons |
|----------|----------|------|------|
| **Console** | Development | No setup, visible in terminal | Not for production |
| **Resend** | Production | Great DX, React Email integration | Commercial for high volume |
| **SendGrid** | Enterprise | High deliverability | Complex setup, expensive |
| **AWS SES** | AWS users | Cheap, scalable | Manual DKIM/SPF setup |
| **SMTP** | Self-hosted | Works with any provider | No API tracking |

### 4.3 Adapter Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     better-auth (core)                           │
│  - Token generation                                              │
│  - Token validation                                              │
│  - Reset URL construction                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ calls sendResetPassword()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Email Provider Interface                        │
│                     sendEmail(params)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Console   │    │   Resend    │    │  SendGrid   │
│   Adapter   │    │   Adapter   │    │   Adapter   │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 5. Adapter Interface

### 5.1 Interface Definition

```typescript
// packages/deesse/src/adapters/email/index.ts

export interface EmailProvider {
  send(params: SendEmailParams): Promise<void>;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}
```

### 5.2 Console Adapter (Development Default)

```typescript
export class ConsoleEmailAdapter implements EmailProvider {
  async send(params: SendEmailParams): Promise<void> {
    console.log('\n📧 Email would be sent:');
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`Body:\n${params.html}`);
  }
}
```

### 5.3 Resend Adapter (Recommended)

```typescript
export class ResendEmailAdapter implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(params: SendEmailParams): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
  }
}
```

---

## 6. Provider Selection

### 6.1 Factory Function

```typescript
function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'console';

  switch (provider) {
    case 'resend':
      return new ResendEmailAdapter(process.env.RESEND_API_KEY!);

    case 'sendgrid':
      return new SendGridEmailAdapter(process.env.SENDGRID_API_KEY!);

    case 'ses':
      return new SESEmailAdapter({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        region: process.env.AWS_REGION || 'us-east-1',
      });

    case 'console':
    default:
      return new ConsoleEmailAdapter();
  }
}
```

### 6.2 Configuration in better-auth

```typescript
// packages/deesse/src/config/define.ts

export const deesse = createDeesse({
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      const provider = getEmailProvider();
      await provider.send({
        to: user.email,
        subject: 'Reset your password',
        html: renderPasswordResetEmail({ user, url, token }),
      });
    },
    revokeSessionsOnPasswordReset: true,
  },
});
```

---

## 7. Environment Variables

```bash
# Required for production
EMAIL_PROVIDER=resend  # console, resend, sendgrid, ses, smtp

# Resend
RESEND_API_KEY=re_xxxxx

# SendGrid
SENDGRID_API_KEY=SG.xxxxx

# AWS SES
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1

# Optional
EMAIL_FROM=noreply@example.com
```

---

## 8. Email Templates

### 8.1 Password Reset Email (React Email)

```tsx
// packages/deesse/src/emails/password-reset.tsx

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface PasswordResetEmailProps {
  userEmail: string;
  resetUrl: string;
  expiresIn: string;  // e.g., "1 hour"
}

export function PasswordResetEmail({
  userEmail,
  resetUrl,
  expiresIn,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Reset your password</Heading>

          <Text style={styles.text}>
            Hello,
          </Text>

          <Text style={styles.text}>
            You requested a password reset for your account ({userEmail}).
          </Text>

          <Section style={styles.buttonSection}>
            <Button href={resetUrl} style={styles.button}>
              Reset Password
            </Button>
          </Section>

          <Text style={styles.text}>
            This link expires in {expiresIn}.
          </Text>

          <Text style={styles.text}>
            If you didn't request this, you can safely ignore this email.
          </Text>

          <Hr style={styles.hr} />

          <Text style={styles.small}>
            For security, this link can only be used once.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '40px auto',
    padding: '20px',
    maxWidth: '465px',
  },
  heading: { fontSize: '24px', textAlign: 'center' as const },
  text: { fontSize: '14px', lineHeight: '24px' },
  buttonSection: { textAlign: 'center' as const, marginTop: '32px' },
  button: {
    backgroundColor: '#000000',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    padding: '12px 24px',
    textDecoration: 'none',
  },
  hr: { borderColor: '#eaeaea', margin: '26px 0' },
  small: { color: '#666666', fontSize: '12px' },
};
```

### 8.2 Template Variables

| Variable | Source | Example |
|----------|--------|---------|
| `userEmail` | User's email | `admin@example.com` |
| `resetUrl` | Constructed from token | `https://app.com/reset-password?token=xxx` |
| `expiresIn` | Configured in better-auth | `"1 hour"` |

---

## 9. Security Considerations

### 9.1 Token Security

| Property | Value |
|----------|-------|
| Length | 24+ characters |
| Generation | Cryptographically random |
| Storage | Hashed in database |
| Expiry | 1 hour (configurable) |
| Usage | Single-use |

### 9.2 Email Enumeration Prevention

**Critical:** Always return success message, even if email doesn't exist:

```
"If an account with that email exists, we've sent password reset instructions."
```

This prevents attackers from:
- Discovering which emails are registered
- Using the forgot password form for phishing

### 9.3 Session Revocation

On password reset, better-auth can revoke all existing sessions:

```typescript
revokeSessionsOnPasswordReset: true
```

This ensures that if someone gained access to the account, they are logged out when the password is changed.

---

## 10. Route Structure

```
app/
  (auth)/
    forgot-password/
      page.tsx         # Request reset email
    reset-password/
      page.tsx         # Set new password (with token)
```

---

## 11. Files to Create

```
packages/deesse/
├── src/
│   ├── adapters/
│   │   └── email/
│   │       ├── index.ts           # Interface + factory
│   │       ├── console.adapter.ts
│   │       ├── resend.adapter.ts
│   │       ├── sendgrid.adapter.ts
│   │       └── ses.adapter.ts
│   └── emails/
│       ├── password-reset.tsx
│       └── index.ts
packages/admin/
└── src/
    └── app/
        └── (auth)/
            ├── forgot-password/
            │   └── page.tsx
            └── reset-password/
                └── page.tsx
```

---

## 12. Decisions Summary

| Question | Decision |
|----------|----------|
| Default provider | Console (dev) |
| Production provider | Resend (recommended) |
| Template approach | React Email |
| Session revocation on reset | Yes |

---

## 13. Open Questions

1. **Custom email templates**: Should admins be able to customize email templates in the UI?

2. **Email verification on signup**: Should we require email verification before first login?

3. **Brute force protection on forgot-password**: Should we rate limit the forgot-password endpoint?
