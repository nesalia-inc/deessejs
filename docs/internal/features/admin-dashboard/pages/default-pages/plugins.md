# Plugins Page

The plugins page displays two sections:

- **Active Plugins** — plugins enabled in `deesse.config.ts`
- **Available Plugins** — plugins from the Plugin Registry API not yet enabled

## Data Flow

```
config.plugins → Active Plugins

GET https://plugins.deessejs.com/api/v1/plugins → Available Plugins

available = registry.plugins - config.plugins
```

## Active Plugins

Active plugins come directly from `config.plugins`. Each plugin provides at minimum a `name` string.

```typescript
const activePlugins = config.plugins ?? [];
```

Display: name, version (if available from registry), enable/disable toggle.

## Available Plugins

Fetched from the Plugin Registry API:

```typescript
GET https://plugins.deessejs.com/api/v1/plugins
```

Response shape:

```json
{
  "plugins": [
    {
      "name": "seo",
      "displayName": "SEO",
      "description": "SEO optimization and monitoring",
      "version": "1.2.0",
      "npmPackage": "@deessejs/plugin-seo"
    }
  ]
}
```

Filter out plugins already in `config.plugins`:

```typescript
const registry = await fetch("https://plugins.deessejs.com/api/v1/plugins");
const availablePlugins = registry.plugins.filter(
  (p) => !activePlugins.some((ap) => ap.name === p.name)
);
```

## Caching

The registry response should be cached for at least 5 minutes to avoid hitting the API on every page load.

```typescript
// Next.js fetch caching
const plugins = await fetch(
  "https://plugins.deessejs.com/api/v1/plugins",
  { next: { revalidate: 300 } }
);
```

## Error Handling

If the registry API is unreachable, show Active Plugins only and display a message:

```
Could not load available plugins. Check your internet connection.
```

## Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Plugins                                                    │
├─────────────────────────────────────────────────────────────┤
│  Active Plugins (3)                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ● SEO              v1.2.0    [Disable] [Settings]       ││
│  │ ● Analytics       v0.9.0    [Disable] [Settings]       ││
│  │ ● Chat            v2.0.0    [Disable] [Settings]       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Available Plugins (5)                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ○ Sitemap        v1.0.0    [Install]                   ││
│  │ ○ Social Meta    v0.5.0    [Install]                   ││
│  │ ○ Backup         v0.8.0    [Install]                   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```