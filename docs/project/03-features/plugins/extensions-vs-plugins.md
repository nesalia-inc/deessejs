# Extensions vs Plugins

## Two Extension Systems

DeesseJS has two distinct extension mechanisms: **Extensions** and **Plugins**.

## Extensions

### Definition

Extensions are internal SDKs for common infrastructure services that require external providers.

### Concept

- DeesseJS defines the **internal interface/SDK**
- External **providers** adapt to DeesseJS's internal reasoning
- Unified API regardless of underlying provider

### Extension Categories

#### Logging

- Internal logging SDK
- Providers: Sentry, Logflare, custom, etc.
- Unified logging interface

#### Cache

- Internal cache SDK
- Providers: Redis, Upstash, Vercel KV, etc.
- Unified cache operations

#### Tasks

- Internal job/task SDK
- Providers: Trigger.dev, Inngest, BullMQ, etc.
- Unified background job interface

#### Blob Storage

- Internal blob storage SDK
- Providers: S3, R2, Cloudflare R2, Vercel Blob, etc.
- Unified file storage interface

### Extension Philosophy

- **One DeesseJS API**: Consistent interface regardless of provider
- **Provider Flexibility**: Switch providers without changing application code
- **Internal SDK**: DeesseJS defines the contract, providers implement it

## Plugins

### Definition

Plugins add functionality to the admin dashboard and application features.

### Purpose

- Extend admin dashboard capabilities
- Add domain-specific features
- Integrate third-party services
- Create custom workflows

### Examples

- Blog Manager
- SEO Analysis
- A/B Testing
- Version Manager
- Vercel Integration
- GitHub Integration
- AI Management

### Plugin Dependencies

Plugins can **depend on extensions** to function:

```
Plugin: "AI Management"
  └── Requires: Cache Extension, Blob Storage Extension

Plugin: "Blog Manager"
  └── Requires: Blob Storage Extension (for images)
```

## Relationship

```
Extensions (Infrastructure Layer)
  ↓ provide capabilities to
Plugins (Application Layer)
  ↓ run in
Admin Dashboard
```

## Configuration

Both extensions and plugins are configured in `deesse.config.ts`:

```typescript
export const config = defineConfig({
  extensions: {
    cache: { provider: 'redis' /* config */ },
    logging: { provider: 'sentry' /* config */ },
    // ...
  },
  plugins: [
    blogPlugin(),
    seoPlugin(),
    // ...
  ],
});
```

## Key Difference

| Aspect         | Extensions                                     | Plugins                  |
| -------------- | ---------------------------------------------- | ------------------------ |
| **Purpose**    | Infrastructure SDKs                            | Dashboard features       |
| **Interface**  | Defined by DeesseJS                            | Defined by plugin author |
| **Providers**  | External services implement DeesseJS interface | N/A                      |
| **Dependency** | Foundational                                   | Can depend on extensions |
| **Example**    | Cache, Logging, Tasks, Blob                    | Blog, SEO, A/B Testing   |
