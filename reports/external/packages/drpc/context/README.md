# Two-Tier Context System for RPC Plugins

## Problem Statement

When integrating privileged services (like better-auth) as RPC plugins, security becomes a concern:

```typescript
// PUBLIC procedure - should be accessible to all authenticated users
t.query({
  handler: async (ctx, args) => {
    // If ctx.auth.instance (with admin capabilities) is available here,
    // a developer might accidentally expose privileged operations
    ctx.auth.instance.api.admin.listUsers(); // ← SECURITY RISK
  }
});
```

**The problem:** If the full auth instance is available in all procedures (public and internal), there's no architectural enforcement against accidentally using privileged operations in public-facing code.

---

## Solution: Two-Tier Context Extension

Plugins should define **two separate context extensions**:

```typescript
interface Plugin<Ctx> {
  name: string;

  // Context available in ALL procedures (public & internal)
  extend?: (ctx: Ctx) => Partial<Ctx>;

  // NEW: Context available ONLY in internal procedures
  extendInternal?: (ctx: Ctx) => Partial<Ctx>;
}
```

### For better-auth Plugin

```typescript
interface BetterAuthPluginOptions {
  instance: BetterAuthInstance;
  client: BetterAuthClientInstance;
}

const betterAuthPlugin = {
  name: "better-auth",

  // Available everywhere - session only, safe for public
  extend: (ctx) => ({
    auth: {
      session: ctx.session,  // Validated session
    }
  }),

  // Only available in internalQuery/internalMutation
  extendInternal: (ctx) => ({
    auth: {
      instance: ctx.instance,  // Full better-auth access
    }
  }),
};
```

---

## Usage in Procedures

### Public Procedures

```typescript
// t.query - PUBLIC
t.query({
  handler: async (ctx, args) => {
    ctx.auth.session        // ✓ Available (extend)
    ctx.auth.instance       // ✗ TypeScript error - not in type
    ctx.auth.instance.api.admin.listUsers(); // ← Cannot even try
  }
});

// t.mutation - PUBLIC
t.mutation({
  handler: async (ctx, args) => {
    ctx.auth.session        // ✓ Available
    ctx.auth.instance       // ✗ TypeScript error
  }
});
```

### Internal Procedures

```typescript
// t.internalQuery - INTERNAL
t.internalQuery({
  handler: async (ctx, args) => {
    ctx.auth.session        // ✓ Available (extend)
    ctx.auth.instance       // ✓ Available (extendInternal)
    ctx.auth.instance.api.admin.listUsers(); // ← Safe to use
  }
});

// t.internalMutation - INTERNAL
t.internalMutation({
  handler: async (ctx, args) => {
    ctx.auth.session        // ✓ Available
    ctx.auth.instance       // ✓ Available
    ctx.auth.instance.api.admin.deleteUser({ id: args.id }); // ← Safe
  }
});
```

---

## TypeScript Type Safety

```typescript
// Type for PUBLIC procedures (query, mutation)
type PublicContext<TCtx> = TBaseContext & {
  auth: {
    session: Session | null;
  };
};

// Type for INTERNAL procedures (internalQuery, internalMutation)
type InternalContext<TCtx> = TBaseContext & {
  auth: {
    session: Session | null;
    instance: BetterAuthInstance;  // Full access
  };
};

// The plugin's extendInternal is only merged for internal procedures
// TypeScript enforces that ctx.auth.instance doesn't exist in public procedures
```

### Error on Misuse

```typescript
// ✗ TypeScript error at compile time
t.query({
  handler: async (ctx) => {
    return ctx.auth.instance.api.admin.listUsers();
    //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //           Property 'instance' does not exist on type '{ session: Session | null; }'
  }
});
```

---

## Framework Implementation

### Plugin Application Logic

```typescript
function createHandlerContext<Ctx>(options: {
  baseContext: Ctx;
  procedure: ProcedureDefinition;
  plugins: Plugin<Ctx>[];
}): Ctx {
  let context = { ...options.baseContext };

  // Apply extend() for ALL procedures
  for (const plugin of options.plugins) {
    if (plugin.extend) {
      const extension = plugin.extend(context);
      context = { ...context, ...extension };
    }
  }

  // Apply extendInternal() ONLY for internal procedures
  if (isInternalProcedure(options.procedure)) {
    for (const plugin of options.plugins) {
      if (plugin.extendInternal) {
        const extension = plugin.extendInternal(context);
        context = { ...context, ...extension };
      }
    }
  }

  return context;
}

function isInternalProcedure(procedure: ProcedureDefinition): boolean {
  return procedure.type === 'internalQuery' ||
         procedure.type === 'internalMutation';
}
```

### Simplified Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                    Procedure Types                                │
│                                                                  │
│  ┌─────────────────────┐     ┌──────────────────────────────┐   │
│  │   PUBLIC            │     │   INTERNAL                   │   │
│  │                     │     │                              │   │
│  │  t.query()          │     │  t.internalQuery()          │   │
│  │  t.mutation()       │     │  t.internalMutation()       │   │
│  │                     │     │                              │   │
│  │  ctx.auth.session   │     │  ctx.auth.session           │   │
│  │  ctx.auth.instance  │     │  ctx.auth.instance          │   │
│  │       ✗             │     │       ✓                      │   │
│  └─────────────────────┘     └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Guarantees

### By Design, Not By Convention

| Approach | Security | Guarantee |
|----------|----------|-----------|
| **Convention** | Developer must remember | Can be forgotten |
| **Architecture** | TypeScript enforces | Impossible to misuse |

### What's Protected

```typescript
// These privileged operations are ONLY accessible in internal procedures:

ctx.auth.instance.api.admin.listUsers();     // ✗ Public query - TypeScript error
ctx.auth.instance.api.admin.deleteUser();   // ✗ Public mutation - TypeScript error
ctx.auth.instance.api.admin.banUser();      // ✗ Public mutation - TypeScript error

// All require:
t.internalQuery({ handler: async (ctx) => { ... } })
t.internalMutation({ handler: async (ctx) => { ... } })
```

---

## Example: Full better-auth Plugin

```typescript
const betterAuthPlugin = (options: BetterAuthPluginOptions) => {
  return {
    name: "better-auth",

    // Safe context for public procedures
    extend: (ctx) => ({
      auth: {
        // Session is always available - use it to check identity
        session: ctx.session,
      }
    }),

    // Privileged context for internal procedures only
    extendInternal: (ctx) => ({
      auth: {
        // Full instance - only use in server-side internal handlers
        instance: options.instance,
      }
    }),

    // Add auth-related procedures to the router
    router: (t) => ({
      // Public procedures - use ctx.auth.session only
      "auth/get-session": t.query({
        handler: async (ctx) => {
          // Can access session
          return ctx.auth.session;
        }
      }),

      // Internal procedures - can use instance
      "auth/admin/list-users": t.internalQuery({
        handler: async (ctx) => {
          // Can use full instance
          return ctx.auth.instance.api.admin.listUsers({ limit: 100 });
        }
      }),
    }),

    // Client plugin for type inference
    client: {
      procedures: {
        "auth/get-session": { method: "GET" },
      },
    }
  };
};
```

---

## Context Extension Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Plugin Registration                              │
│                                                                      │
│  defineContext({                                                     │
│    plugins: [                                                        │
│      betterAuthPlugin({                                              │
│        instance: auth,                                               │
│        client: authClient,                                          │
│        extend: (ctx) => ({ auth: { session: ctx.session } }),      │
│        extendInternal: (ctx) => ({ auth: { instance: auth } }),      │
│      })                                                              │
│    ]                                                                 │
│  });                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Procedure Definition                               │
│                                                                      │
│  // PUBLIC - only gets extend()                                      │
│  t.query({ handler: (ctx) => ... })                                 │
│                        │                                             │
│                        ▼                                             │
│                   ctx.auth.session = Session | null                  │
│                   ctx.auth.instance = undefined (not in type)        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    Procedure Definition                               │
│                                                                      │
│  // INTERNAL - gets both extend() AND extendInternal()               │
│  t.internalQuery({ handler: (ctx) => ... })                         │
│                        │                                             │
│                        ▼                                             │
│                   ctx.auth.session = Session | null                  │
│                   ctx.auth.instance = BetterAuthInstance             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## See Also

- [better-auth Plugin for drpc](../plugins/better-auth-plugin.md) - Full plugin DX
- [better-auth Plugin Creation](../../better-auth/plugins/creation/README.md) - better-auth client/server pattern
- [drpc Plugin Architecture](../../../../api/rpc/integration/drpc-plugins.md) - Current drpc plugin limitations