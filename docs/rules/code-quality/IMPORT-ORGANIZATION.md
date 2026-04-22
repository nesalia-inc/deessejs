# Import Organization Rule

## Rule

Imports must be organized with **blank lines separating groups** and **alphabetically sorted within each group**.

## Group Order (Top to Bottom)

1. **External packages** (node_modules)
2. **Internal packages** (workspace packages)
3. **Types** (`import type { ... }`)
4. **Functions** (`import { ... }`)
5. **Relative imports** (local files)

Each group is separated by a **single blank line**.

## Alphabetical Order

Within each group, imports must be sorted **alphabetically by the first character** of the import path.

## Anti-Pattern (Bad)

```typescript
import  { type EventRegistry, type Middleware, type Router } from "../types.js";

import { QueryBuilder } from "../query/builder.js";

import { EventEmitter } from "../events/emitter.js";

import { createAPI } from "../api/factory.js";

import  { type TypedAPIInstance } from "../api/types.js";

import  { type DefineContextConfig } from "./types.js";
```

Problems:
- Inconsistent spacing after `import`
- Types mixed with functions
- No clear grouping
- Not alphabetically sorted

## Correct Pattern (Good)

```typescript
import type { DefineContextConfig } from "./types.js";
import type { TypedAPIInstance } from "../api/types.js";
import type { EventRegistry, Middleware, Router } from "../types.js";

import { createAPI } from "../api/factory.js";
import { EventEmitter } from "../events/emitter.js";
import { QueryBuilder } from "../query/builder.js";
```

## Complete Example

```typescript
// External packages (alphabetical)
import { EventEmitter } from "events";
import { z } from "zod";

// Internal packages (alphabetical)
import type { Plugin, Middleware } from "@deessejs/fp";

// Types (alphabetical, with 'type' keyword)
import type { DefineContextConfig } from "./types.js";
import type { Router } from "../types.js";

// Functions (alphabetical)
import { createAPI } from "../api/factory.js";
import { ok, err } from "../errors/result.js";
import { QueryBuilder } from "../query/builder.js";
```

## Group Categories

| Group | Description | Example |
|-------|-------------|---------|
| 1 | External packages | `import { x } from "package"` |
| 2 | Internal workspace | `import { x } from "@deessejs/fp"` |
| 3 | Types only | `import type { x } from "./types"` |
| 4 | Functions only | `import { x } from "./utils"` |
| 5 | Relative imports | `import { x } from "../shared"` |

## Enforcement

- No mixed type/function imports in single statement
- One blank line between groups
- Alphabetical order within groups
- Consistent spacing: `import` + optional `type` + `{ ... }` + `from` + path

This rule is checked during code reviews.
