/**
 * Email validation utilities for admin email enforcement
 */

export const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'mail.com',
  'aol.com',
  'protonmail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
] as const;

export type PublicEmailDomain = (typeof PUBLIC_EMAIL_DOMAINS)[number];

/**
 * Check if an email uses a public email domain
 */
export function isPublicEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return PUBLIC_EMAIL_DOMAINS.includes(domain as PublicEmailDomain);
}

/**
 * Get allowed domains from ADMIN_ALLOWED_DOMAINS environment variable.
 * Returns empty array if not configured (no restrictions).
 */
export function getAllowedDomains(): string[] {
  const envValue = process.env['ADMIN_ALLOWED_DOMAINS'];
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Check if an email is from an allowed domain.
 * If no allowed domains are configured, all domains are allowed.
 */
export function isAllowedAdminEmail(email: string): boolean {
  const allowed = getAllowedDomains();
  if (!allowed.length) return true; // No restriction configured
  const domain = email.split('@')[1]?.toLowerCase();
  return allowed.includes(domain);
}

/**
 * Validate admin email against organizational requirements.
 * Returns an error message if validation fails.
 */
export function validateAdminEmailDomain(
  email: string
): { valid: true } | { valid: false; code: string; message: string; suggestion?: string } {
  // Check if email is from a public domain (warning level, not blocking)
  const isPublic = isPublicEmailDomain(email);
  const allowed = getAllowedDomains();

  // If allowed domains are configured, enforce them strictly
  if (allowed.length > 0) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!allowed.includes(domain)) {
      return {
        valid: false,
        code: 'INVALID_EMAIL_DOMAIN',
        message: `Admin email must be from an allowed domain. Allowed: ${allowed.join(', ')}`,
        suggestion: 'Set ADMIN_ALLOWED_DOMAINS environment variable to configure allowed email domains',
      };
    }
  }

  // If email is from a public domain, return warning info (but allow through)
  if (isPublic && allowed.length === 0) {
    const domain = email.split('@')[1]?.toLowerCase();
    return {
      valid: false,
      code: 'PUBLIC_EMAIL_DOMAIN',
      message: `${email} is a public email domain. Admin accounts should use organizational email addresses.`,
      suggestion: `Set ADMIN_ALLOWED_DOMAINS environment variable to restrict to organizational domains only (e.g., ADMIN_ALLOWED_DOMAINS=${domain})`,
    };
  }

  return { valid: true };
}
