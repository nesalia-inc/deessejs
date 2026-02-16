# Redirect Strategies for DeesseJS

## Overview

Recommendations for implementing comprehensive redirect strategies using Next.js `redirect()` and `permanentRedirect()` functions in DeesseJS applications.

## Current State Analysis

Based on documentation analysis, DeesseJS has:

- `docs\next\proxy-integration.md` - Basic redirect patterns in proxy
- `docs\next\auth-status-pages.md` - Auth-based redirects

Current gaps:

- No centralized redirect configuration
- Limited permanent redirect support
- No redirect history/tracking
- Missing redirect management UI

## Recommended Enhancements

### 1. Redirect Configuration System

Create a centralized redirect configuration:

```typescript
// lib/redirects.ts
import { redirect, permanentRedirect } from 'next/navigation';

export type RedirectType = 'temporary' | 'permanent';
export type RedirectSource = string | RegExp;

export interface RedirectRule {
  from: RedirectSource;
  to: string;
  type: RedirectType;
  locale?: string;
  condition?: (request: Request) => boolean | Promise<boolean>;
  statusCode?: 301 | 302 | 303 | 307 | 308;
}

export interface RedirectConfig {
  rules: RedirectRule[];
  fallbackLocale?: string;
  preserveQueryParams?: boolean;
  logRedirects?: boolean;
}

class RedirectManager {
  private rules: RedirectRule[] = [];
  private redirectLog: Array<{
    timestamp: Date;
    from: string;
    to: string;
    type: RedirectType;
    rule: string;
  }> = [];

  constructor(config: RedirectConfig) {
    this.rules = config.rules;
  }

  async match(url: string, request?: Request): Promise<string | null> {
    for (const rule of this.rules) {
      // Check locale match
      if (rule.locale && !url.startsWith(`/${rule.locale}`)) {
        continue;
      }

      // Check condition
      if (rule.condition && request) {
        const matches = await rule.condition(request);
        if (!matches) continue;
      }

      // Match exact string
      if (typeof rule.from === 'string' && url === rule.from) {
        return rule.to;
      }

      // Match regex
      if (rule.from instanceof RegExp) {
        const match = url.match(rule.from);
        if (match) {
          // Replace captured groups
          return match.reduce((to, group, index) => {
            return to.replace(`$${index}`, group);
          }, rule.to);
        }
      }
    }

    return null;
  }

  async performRedirect(url: string, request?: Request) {
    const target = await this.match(url, request);

    if (target) {
      const rule = this.rules.find((r) => {
        if (typeof r.from === 'string') return r.from === url;
        return r.from.test(url);
      });

      if (rule) {
        // Log redirect
        this.logRedirect(url, target, rule.type);

        // Perform redirect
        if (rule.type === 'permanent') {
          permanentRedirect(target);
        } else {
          redirect(target);
        }
      }
    }
  }

  private logRedirect(from: string, to: string, type: RedirectType) {
    this.redirectLog.push({
      timestamp: new Date(),
      from,
      to,
      type,
      rule: from,
    });

    // Keep only last 1000 logs
    if (this.redirectLog.length > 1000) {
      this.redirectLog.shift();
    }
  }

  getLogs(limit = 100) {
    return this.redirectLog.slice(-limit);
  }

  clearLogs() {
    this.redirectLog = [];
  }
}

// Global redirect manager instance
let redirectManager: RedirectManager | null = null;

export function initRedirects(config: RedirectConfig) {
  redirectManager = new RedirectManager(config);
}

export function getRedirectManager() {
  if (!redirectManager) {
    throw new Error('Redirect manager not initialized. Call initRedirects first.');
  }
  return redirectManager;
}
```

### 2. Collection-Based Redirects

Auto-redirects for collection changes:

```typescript
// lib/collection-redirects.ts
import { redirect, permanentRedirect } from 'next/navigation';
import { db } from '@deessejs/db';

export interface CollectionRedirectConfig {
  collection: string;
  slugField: string;
  redirectOldSlugs: boolean;
  redirectTrailingSlash: boolean;
  redirectLowerCase: boolean;
}

export async function handleCollectionRedirect(
  collection: string,
  slug: string,
  config: CollectionRedirectConfig
) {
  // Check for old slug redirects
  if (config.redirectOldSlugs) {
    const item = await db[collection].findFirst({
      where: {
        [config.slugField]: slug,
      },
      include: {
        redirects: true,
      },
    });

    if (item?.redirects && item.redirects.length > 0) {
      const latestRedirect = item.redirects[0];

      // Use permanent redirect for moved content
      permanentRedirect(`/${collection}/${latestRedirect.to}`);
    }
  }

  // Trailing slash normalization
  if (config.redirectTrailingSlash) {
    if (slug.endsWith('/')) {
      redirect(`/${collection}/${slug.slice(0, -1)}`);
    }
  }

  // Lowercase normalization
  if (config.redirectLowerCase && slug !== slug.toLowerCase()) {
    permanentRedirect(`/${collection}/${slug.toLowerCase()}`);
  }
}
```

### 3. Auth-Based Redirects

Smart authentication redirects:

```typescript
// lib/auth-redirects.ts
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@deessejs/auth';

export interface AuthRedirectConfig {
  loginPath: string;
  unauthorizedPath: string;
  afterLoginPath: string;
  afterLogoutPath: string;
  preserveReturnUrl: boolean;
}

export async function requireAuth(config: AuthRedirectConfig, roles?: string[]) {
  const session = await getSession();

  if (!session) {
    // Save return URL
    if (config.preserveReturnUrl) {
      const headersList = await headers();
      const returnUrl = headersList.get('x-path') || '/';

      // Store return URL in session/cookie
      redirect(`${config.loginPath}?return=${encodeURIComponent(returnUrl)}`);
    }

    redirect(config.loginPath);
  }

  // Check roles
  if (roles && !roles.includes(session.user.role)) {
    redirect(config.unauthorizedPath);
  }
}

export async function handleLoginRedirect(returnUrl?: string) {
  if (returnUrl) {
    redirect(returnUrl);
  }

  redirect('/dashboard');
}

export async function handleLogoutRedirect() {
  redirect('/');
}
```

### 4. Locale-Based Redirects

Internationalization redirect handling:

```typescript
// lib/locale-redirects.ts
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export interface LocaleRedirectConfig {
  supportedLocales: string[];
  defaultLocale: string;
  detectFrom: 'header' | 'cookie' | 'query' | 'path';
  prefixDefaultLocale: boolean;
}

export async function handleLocaleRedirect(config: LocaleRedirectConfig): Promise<string | null> {
  const headersList = await headers();
  const pathname = headersList.get('x-path') || '/';

  // Check if already has locale prefix
  const localePattern = new RegExp(`^/(${config.supportedLocales.join('|')})(/|$)`);
  if (localePattern.test(pathname)) {
    return null;
  }

  // Detect locale
  let detectedLocale = config.defaultLocale;

  if (config.detectFrom === 'header') {
    const acceptLanguage = headersList.get('accept-language') || '';
    const preferredLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().toLowerCase())
      .find((lang) => config.supportedLocales.includes(lang));

    if (preferredLocale) {
      detectedLocale = preferredLocale;
    }
  } else if (config.detectFrom === 'cookie') {
    // Read from cookie
    const cookieLocale = getCookie('locale');
    if (cookieLocale && config.supportedLocales.includes(cookieLocale)) {
      detectedLocale = cookieLocale;
    }
  } else if (config.detectFrom === 'query') {
    const url = new URL(pathname, 'http://localhost');
    const queryLocale = url.searchParams.get('locale');
    if (queryLocale && config.supportedLocales.includes(queryLocale)) {
      detectedLocale = queryLocale;
    }
  }

  // Don't prefix default locale if not configured
  if (detectedLocale === config.defaultLocale && !config.prefixDefaultLocale) {
    return null;
  }

  // Return redirect path
  return `/${detectedLocale}${pathname}`;
}
```

### 5. Trailing Slash & URL Normalization

URL normalization redirects:

```typescript
// lib/url-normalization.ts
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export interface UrlNormalizationConfig {
  trailingSlash: 'always' | 'never' | 'preserve';
  lowercase: boolean;
  removeWww: boolean;
  removeIndex: boolean;
}

export async function normalizeUrl(
  request: NextRequest,
  config: UrlNormalizationConfig
): Promise<string | null> {
  let url = request.nextUrl.clone();
  let shouldRedirect = false;

  // Trailing slash handling
  if (config.trailingSlash === 'always') {
    if (!url.pathname.endsWith('/') && !url.pathname.includes('.')) {
      url.pathname += '/';
      shouldRedirect = true;
    }
  } else if (config.trailingSlash === 'never') {
    if (url.pathname.endsWith('/') && url.pathname !== '/') {
      url.pathname = url.pathname.slice(0, -1);
      shouldRedirect = true;
    }
  }

  // Lowercase
  if (config.lowercase) {
    const lowercased = url.pathname.toLowerCase();
    if (lowercased !== url.pathname) {
      url.pathname = lowercased;
      shouldRedirect = true;
    }
  }

  // Remove www
  if (config.removeWww) {
    const host = url.host;
    if (host.startsWith('www.')) {
      url.host = host.slice(4);
      shouldRedirect = true;
    }
  }

  // Remove index.html/index.htm
  if (config.removeIndex) {
    if (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/index.htm')) {
      url.pathname = url.pathname.replace(/\/index\.(html|htm)$/, '/');
      shouldRedirect = true;
    }
  }

  return shouldRedirect ? url.toString() : null;
}
```

### 6. Mobile/Tablet Redirects

Device-based redirects:

```typescript
// lib/device-redirects.ts
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export interface DeviceRedirectConfig {
  mobilePath?: string;
  tabletPath?: string;
  userAgentPatterns: {
    mobile: RegExp[];
    tablet: RegExp[];
  };
  cookieName?: string;
  allowOverride?: boolean;
}

export async function handleDeviceRedirect(config: DeviceRedirectConfig): Promise<string | null> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';

  // Check for override cookie
  if (config.allowOverride && config.cookieName) {
    const override = getCookie(config.cookieName);
    if (override) {
      return null; // User explicitly chose their view
    }
  }

  // Detect mobile
  if (
    config.mobilePath &&
    config.userAgentPatterns.mobile.some((pattern) => pattern.test(userAgent))
  ) {
    return config.mobilePath;
  }

  // Detect tablet
  if (
    config.tabletPath &&
    config.userAgentPatterns.tablet.some((pattern) => pattern.test(userAgent))
  ) {
    return config.tabletPath;
  }

  return null;
}

// Default user agent patterns
export const defaultDevicePatterns = {
  mobile: [/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i, /Mobile|Tablet/i],
  tablet: [/iPad|Android(?!.*Mobile)|Tablet/i],
};
```

### 7. Redirect Management UI

Admin panel for managing redirects:

```typescript
// app/@admin/redirects/page.tsx
import { db } from '@deessejs/db'

export default async function RedirectsAdminPage() {
  const redirects = await db.redirects.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const redirectStats = {
    total: await db.redirects.count(),
    active: await db.redirects.count({ where: { active: true } }),
    permanent: await db.redirects.count({ where: { type: 'permanent' } }),
  }

  return (
    <div>
      <h1>Redirect Management</h1>

      <div className="stats">
        <div>Total: {redirectStats.total}</div>
        <div>Active: {redirectStats.active}</div>
        <div>Permanent: {redirectStats.permanent}</div>
      </div>

      <RedirectForm />
      <RedirectList redirects={redirects} />
    </div>
  )
}
```

### 8. Redirect Testing & Validation

Testing utilities for redirects:

```typescript
// lib/redirect-testing.ts
import { RedirectRule } from './redirects';

export interface RedirectTestResult {
  from: string;
  to: string | null;
  passed: boolean;
  expected?: string;
  message: string;
}

export async function testRedirect(
  rule: RedirectRule,
  testUrl: string,
  expectedTarget?: string
): Promise<RedirectTestResult> {
  try {
    // Match rule
    let matched = false;
    let to: string | null = null;

    if (typeof rule.from === 'string') {
      matched = testUrl === rule.from;
      if (matched) to = rule.to;
    } else if (rule.from instanceof RegExp) {
      const match = testUrl.match(rule.from);
      matched = !!match;
      if (matched) {
        to = match.reduce((target, group, index) => {
          return target.replace(`$${index}`, group);
        }, rule.to);
      }
    }

    // Check condition
    if (matched && rule.condition) {
      const conditionMet = await rule.condition(new Request(testUrl));
      if (!conditionMet) {
        return {
          from: testUrl,
          to: null,
          passed: false,
          message: 'Rule condition not met',
        };
      }
    }

    if (!matched) {
      return {
        from: testUrl,
        to: null,
        passed: false,
        message: 'URL does not match rule',
      };
    }

    // Validate against expected
    if (expectedTarget && to !== expectedTarget) {
      return {
        from: testUrl,
        to,
        passed: false,
        expected: expectedTarget,
        message: `Expected ${expectedTarget}, got ${to}`,
      };
    }

    return {
      from: testUrl,
      to,
      passed: true,
      message: 'Redirect matched successfully',
    };
  } catch (error) {
    return {
      from: testUrl,
      to: null,
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function testAllRedirects(
  rules: RedirectRule[],
  testCases: Array<{ url: string; expected: string }>
): Promise<RedirectTestResult[]> {
  const results: RedirectTestResult[] = [];

  for (const testCase of testCases) {
    for (const rule of rules) {
      const result = await testRedirect(rule, testCase.url, testCase.expected);
      if (result.passed || result.to) {
        results.push(result);
        break;
      }
    }
  }

  return results;
}
```

## Implementation Priority

1. **High Priority**
   - Redirect configuration system
   - Collection-based redirects
   - Auth-based redirects

2. **Medium Priority**
   - Locale-based redirects
   - URL normalization
   - Redirect management UI

3. **Low Priority**
   - Device-based redirects
   - Redirect testing utilities
   - Advanced analytics

## Configuration Example

```typescript
// deesse.config.ts
export const config = defineConfig({
  redirects: {
    rules: [
      { from: '/old-path', to: '/new-path', type: 'permanent' },
      { from: /^\/blog\/(.*)$/, to: '/articles/$1', type: 'temporary' },
    ],
    collections: [
      {
        name: 'posts',
        slugField: 'slug',
        redirectOldSlugs: true,
        redirectTrailingSlash: true,
      },
    ],
    auth: {
      loginPath: '/login',
      unauthorizedPath: '/unauthorized',
      preserveReturnUrl: true,
    },
    i18n: {
      supportedLocales: ['en', 'fr', 'de'],
      defaultLocale: 'en',
      detectFrom: 'header',
    },
    urlNormalization: {
      trailingSlash: 'never',
      lowercase: true,
      removeWww: true,
    },
  },
});
```
