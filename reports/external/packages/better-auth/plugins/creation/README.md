# better-auth Plugin Architecture

## Overview

Better-auth makes a **strict architectural separation between client plugins and server plugins** for fundamental security, capability, and bundle-size reasons.

## Directory Structure

```
creation/
├── README.md              # This file - overview and index
├── 01-executive-summary.md
├── 02-client-plugins.md
├── 03-server-plugins.md
├── 04-why-separate.md
├── 05-capabilities.md
├── 06-communication.md
├── 07-type-inference.md
├── 08-awareness.md        # Asymmetric awareness between plugins
├── 09-plugin-pairs.md
├── 10-security.md
└── 11-migration.md
```

## Quick Reference

### Plugin Types

| Type | Interface | Key Properties |
|------|-----------|----------------|
| **Server** | `BetterAuthPlugin` | `endpoints`, `schema`, `hooks`, `init` |
| **Client** | `BetterAuthClientPlugin` | `$InferServerPlugin`, `getAtoms`, `pathMethods` |

### Awareness

- **Client → Server**: YES (via `$InferServerPlugin: {}`)
- **Server → Client**: NO (server is oblivious)

### Communication

- Runtime: **HTTP only** via `$fetch`
- Type-level: **TypeScript inference** via `$InferServerPlugin`

## See Also

- [Client Plugins](./02-client-plugins.md)
- [Server Plugins](./03-server-plugins.md)
- [Type Inference & Awareness](./07-type-inference.md)
- [Security](./10-security.md)