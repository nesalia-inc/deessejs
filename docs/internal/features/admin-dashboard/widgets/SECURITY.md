# Widget System Security

**Status**: Research Complete

---

## Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Widget config injection | High | Zod runtime validation on all configs |
| XSS via widget `innerHTML` | High | React escapes by default; avoid `dangerouslySetInnerHTML` |
| Unauthorized layout modification | High | Session/JWT validation on all `PUT /api/widgets/:slug` |
| Widget registry poisoning | Medium | Only server-side config can register widgets |
| Large layout DoS | Medium | Limit `widgets` array length (e.g., max 50 per layout) |
| Config size explosion | Low | Limit individual widget config size (e.g., max 16KB JSON) |

---

## Widget Config Injection Prevention

All widget configs must be validated against the widget's Zod schema before use.

```typescript
const WidgetInstanceSchema = z.object({
  instanceId: z.string().uuid(),
  definitionId: z.string(),
  position: PositionSchema,
  config: z.record(z.unknown()),
});

async function saveLayout(
  pageSlug: string,
  widgets: WidgetInstance[],
  userId: string
): Promise<void> {
  // 1. Validate array length
  if (widgets.length > 50) {
    throw new Error('Maximum 50 widgets per layout');
  }

  // 2. Validate each widget config against its schema
  for (const widget of widgets) {
    const definition = widgetRegistry.get(widget.definitionId);
    if (!definition) {
      throw new Error(`Unknown widget definition: ${widget.definitionId}`);
    }

    const parsed = definition.configSchema.safeParse(widget.config);
    if (!parsed.success) {
      throw new Error(`Invalid config for ${definition.name}: ${parsed.error.message}`);
    }
  }

  // 3. Persist
  await db.insert(widgetLayouts).values({
    pageSlug,
    userId,
    widgets: widgets as WidgetInstance[],
    layoutVersion: CURRENT_LAYOUT_VERSION,
  });
}
```

---

## XSS Prevention

React escapes all values rendered in JSX by default. Widgets must not use `dangerouslySetInnerHTML`:

```typescript
// UNSAFE — Do not do this
const UnsafeWidget = ({ config }) => (
  <div dangerouslySetInnerHTML={{ __html: config.html }} />
);

// SAFE — Let React escape content
const SafeWidget = ({ config }) => (
  <div>{config.text}</div>
);
```

If rich text is required, use a sanitization library:

```typescript
import DOMPurify from 'dompurify';

const RichTextWidget = ({ config }) => {
  const sanitized = useMemo(
    () => DOMPurify.sanitize(config.html, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em'] }),
    [config.html]
  );
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};
```

---

## Authorization

All widget layout endpoints require authentication:

```typescript
// middleware.ts or API route handler
import { getServerSession } from 'better-auth';
import { auth } from '@/lib/auth';

async function handler(req: Request) {
  const session = await getServerSession(auth);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // User can only modify their own layouts
  // Admin can modify any layout
  if (!isAdmin(session) && req.userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Proceed with save
}
```

### Layout Access Rules

| Role | Can Read | Can Write | Can Reset to Default |
|------|----------|----------|---------------------|
| Anonymous | Config defaults only | No | No |
| Authenticated user | Own layouts | Own layouts | Own layouts |
| Admin | All layouts | All layouts | All layouts |

---

## Input Validation on All Endpoints

### GET /api/widgets/:pageSlug

```typescript
const getLayoutSchema = z.object({
  pageSlug: z.string().min(1).max(100),
});

export async function GET(req: Request, { params }: { params: { pageSlug: string } }) {
  const parsed = getLayoutSchema.safeParse({ pageSlug: params.pageSlug });
  if (!parsed.success) {
    return new Response('Invalid page slug', { status: 400 });
  }

  // ...
}
```

### PUT /api/widgets/:pageSlug

```typescript
const putLayoutSchema = z.object({
  widgets: z.array(WidgetInstanceSchema).max(50),
});

export async function PUT(req: Request, { params }: { params: { pageSlug: string } }) {
  const session = await getServerSession(auth);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const parsed = putLayoutSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  // Check widget definitions exist
  for (const widget of parsed.data.widgets) {
    if (!widgetRegistry.has(widget.definitionId)) {
      return new Response(`Unknown widget: ${widget.definitionId}`, { status: 400 });
    }
  }

  // ...
}
```

---

## Widget Registry Poisoning

The widget registry is built server-side from:
1. Built-in widgets (trusted code)
2. Plugin widgets (loaded from project's `node_modules`)

Plugin code is not dynamically loaded at runtime from untrusted sources. The registry is constructed once at server startup:

```typescript
// server-side only
function buildWidgetRegistry(): WidgetRegistry {
  const registry = new Map<string, WidgetDefinition>();

  // Built-in widgets (deesse core)
  builtInWidgets.forEach(w => registry.set(w.id, w));

  // Plugin widgets (from project's installed packages)
  for (const plugin of config.plugins) {
    plugin.widgets?.forEach(w => {
      if (registry.has(w.id)) {
        console.warn(`Widget ${w.id} already registered, skipping duplicate`);
        return;
      }
      registry.set(w.id, w);
    });
  }

  return registry;
}
```

Clients receive only a serializable manifest (id, name, icon, schema metadata) — not executable code.

---

## Config Size Limits

Individual widget configs should be limited to prevent abuse:

```typescript
const MAX_WIDGET_CONFIG_SIZE = 16 * 1024; // 16KB

export async function PUT(req: Request) {
  const body = await req.json();

  for (const widget of body.widgets) {
    const configSize = JSON.stringify(widget.config).length;
    if (configSize > MAX_WIDGET_CONFIG_SIZE) {
      return new Response(
        `Widget config too large (max ${MAX_WIDGET_CONFIG_SIZE} bytes)`,
        { status: 400 }
      );
    }
  }
}
```

---

## CSRF Protection

Layout mutations should be protected against CSRF:

```typescript
// Using SameSite=Strict cookies (better-auth handles this)
export async function PUT(req: Request) {
  // better-auth session cookies are SameSite=Strict by default
  // This prevents cross-site PUT requests

  const session = await getServerSession(auth);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ...
}
```

---

## Security Checklist

- [ ] All widget configs validated against Zod schema on save
- [ ] Widget registry built server-side only from trusted sources
- [ ] API endpoints require authentication
- [ ] Users can only modify their own layouts (unless admin)
- [ ] No `dangerouslySetInnerHTML` in widget components
- [ ] Widget configs limited to 16KB each
- [ ] Layout limited to 50 widgets maximum
- [ ] Page slug validated (no injection)
- [ ] Session cookies use SameSite=Strict
- [ ] Rate limiting on save endpoint (optional, for DoS)
