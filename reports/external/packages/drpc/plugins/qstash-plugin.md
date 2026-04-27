# QStash Plugin for drpc: Desired Developer Experience

## Overview

This document describes how QStash could work as a plugin for drpc, enabling **automatic task handling** without creating manual routes.

**Key Goal:** The developer should never need to create webhook routes manually. Define procedures with `t.task()`, call them with `ctx.qstash.queue()`, and the plugin handles everything.

---

## The Problem: Manual Route Creation Today

With current QStash integration, developers must:

```typescript
// 1. Create the upload route
export const POST = async (req: Request) => {
  // Upload logic
  const imageId = await saveImage(data);

  // 2. Manually queue to QStash with EXPLICIT URL
  const result = await client.publishJSON({
    url: "https://my-app.vercel.app/api/process-image", // ← Manual URL
    body: { imageId },
  });

  return NextResponse.json({ messageId: result.messageId });
};

// 3. Create ANOTHER route for the webhook
// app/api/process-image/route.ts
export const POST = async (req: Request) => {
  // Verify signature
  await verifyQStashSignature(req);

  // Process the image
  const { imageId } = await req.json();
  await processImage(imageId);

  return NextResponse.json({ success: true });
};
```

**Issues:**
- Manual URL management
- Manual signature verification
- Manual routing logic
- Manual retry handling

---

## The Solution: Automatic Task Procedures

### Core Concept

```typescript
// 1. Define a TASK PROCEDURE - no route needed
const processImage = t.task({
  name: "processImage",  // ← Unique name
  args: z.object({ imageId: z.string() }),
  handler: async (ctx, args) => {
    // Full access to ctx (db, auth, etc.)
    const image = await ctx.db.query.images.find(args.imageId);
    await processImageInBackground(image);
    return ok({ processed: true });
  }
});

// 2. Queue it from any mutation - NO URL needed
const uploadImage = t.mutation({
  args: z.object({ data: z.string() }),
  handler: async (ctx, args) => {
    const imageId = await saveImage(args.data);

    // Queue for task processing - plugin handles the rest
    await ctx.qstash.queue("processImage", { imageId });

    return ok({ imageId, queued: true });
  }
});
```

**The plugin automatically:**
- Creates the webhook endpoint
- Handles signature verification
- Routes to the correct procedure
- Manages retries

---

## Desired DX: Full Setup

### Step 1: Register the Plugin

```typescript
// src/server/index.ts
import { defineContext, t, createAPI } from "@deessejs/server";
import { qstashPlugin } from "@deessejs/server/plugins/qstash";

const { createAPI: mkAPI } = defineContext({
  context: { db },
  plugins: [
    qstashPlugin({
      token: process.env.QSTASH_TOKEN!,
      baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
    })
  ],
});
```

### Step 2: Define Procedures

```typescript
const appRouter = t.router({

  // Regular mutation (synchronous)
  uploadImage: t.mutation({
    args: z.object({ data: z.string() }),
    handler: async (ctx, args) => {
      const imageId = await ctx.db.insert(images).values({ data: args.data });
      return ok({ imageId });
    },
  }),

  // Background mutation (asynchronous) - NO ROUTE CREATED
  processImage: t.task({
    name: "processImage",
    args: z.object({ imageId: z.string() }),
    handler: async (ctx, args) => {
      const image = await ctx.db.query.images.find(args.imageId);
      await ctx.storage.process(image);
      await ctx.db.update(images).set({ processed: true }).where(eq(images.id, args.imageId));
      return ok({ success: true });
    },
  }),

  // Another task
  generateThumbnail: t.task({
    name: "generateThumbnail",
    args: z.object({ imageId: z.string(), size: z.enum(["sm", "md", "lg"]) }),
    handler: async (ctx, args) => {
      const image = await ctx.db.query.images.find(args.imageId);
      const thumbnail = await ctx.storage.generateThumbnail(image, args.size);
      return ok({ thumbnail });
    },
  }),
});
```

### Step 3: Queue from Mutations

```typescript
uploadAndProcess: t.mutation({
  args: z.object({ data: z.string() }),
  handler: async (ctx, args) => {
    // 1. Upload
    const imageId = await ctx.db.insert(images).values({ data: args.data });

    // 2. Queue tasks - NO URLs, NO routes
    await ctx.qstash.queue("processImage", { imageId });
    await ctx.qstash.queue("generateThumbnail", { imageId, size: "md" });

    return ok({ imageId, queued: true });
  },
}),
```

### Step 4: Done!

**The plugin handles automatically:**
- Webhook endpoint at `/api/qstash/[procedure]`
- Signature verification
- Argument validation
- Error handling and retries
- Route to correct procedure

---

## How It Works Internally

### Plugin Creates Webhook Endpoint

```
┌─────────────────────────────────────────────────────────────────┐
│                    Plugin Magic                                    │
│                                                                  │
│  1. Registers webhook route: /api/qstash/[procedure]             │
│                                                                  │
│  2. On incoming request:                                         │
│     - Verify QStash signature                                    │
│     - Parse procedure name from path                             │
│     - Parse and validate arguments                               │
│     - Call the handler                                          │
│     - Handle errors / retries                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Flow Diagram

```
┌──────────────┐                           ┌──────────────┐
│   uploadImage │                           │   QStash     │
│   mutation   │                           │              │
└──────┬───────┘                           └──────┬───────┘
       │                                         │
       │ ctx.qstash.queue("processImage", {...})  │
       │────────────────────────────────────────► │
       │                                         │
       │              ┌─────────────────────────────────────┐
       │              │ Webhook: /api/qstash/processImage   │
       │              │                                     │
       │              │ 1. Verify signature                 │
       │              │ 2. Parse args                       │
       │              │ 3. Call processImage handler        │
       │              │ 4. Return result                   │
       │              └─────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   Response   │
│   { queued }│
└──────────────┘
```

---

## Plugin Interface

### New Procedure Type

```typescript
interface QueryBuilder {
  // Existing
  query<T>(config: QueryConfig): Procedure;
  mutation<T>(config: MutationConfig): Procedure;
  internalQuery<T>(config: InternalQueryConfig): Procedure;
  internalMutation<T>(config: InternalMutationConfig): Procedure;

  // NEW
  task<T>(config: TaskConfig): TaskProcedure;
}

interface TaskConfig {
  name: string;                    // Unique procedure name
  args: ZodSchema;               // Argument validation
  handler: (ctx: InternalContext, args: T) => Promise<Result>;
  retries?: number;               // Default: 3
  delay?: string;                // Optional delay
}
```

### Plugin Options

```typescript
interface QStashPluginOptions {
  token: string;
  baseURL: string;
  retries?: number;
  verifySignature?: boolean;
}

interface QStashPlugin extends Plugin<BaseContext> {
  name: "qstash";

  // Extend internal context with qstash client
  extendInternal: (ctx: BaseContext) => {
    qstash: {
      queue: <T>(
        procedure: string,           // Procedure name
        args: T,                     // Arguments
        options?: QueueOptions       // Optional: delay, retries
      ) => Promise<{ messageId: string }>;

      queueDelayed: <T>(
        procedure: string,
        args: T,
        delay: string                // "5m", "1h", "1d"
      ) => Promise<{ messageId: string }>;

      // For direct QStash access if needed
      client: QStashClient;
    };
  };

  // The plugin registers task procedures
  registerProcedures?: (procedures: TaskProcedure[]) => void;
}
```

---

## Queue Options

```typescript
// Basic queue
await ctx.qstash.queue("processImage", { imageId: "123" });

// With options
await ctx.qstash.queue("processImage", { imageId: "123" }, {
  retries: 5,
  delay: "5m",
  deduplicationId: "unique-id",
});

// Named delay
await ctx.qstash.queueDelayed("sendReminder", { userId: "123" }, "24h");
```

---

## Error Handling

### Automatic Retries

```typescript
const processPayment = t.task({
  name: "processPayment",
  args: z.object({ orderId: z.string() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.query.orders.find(args.orderId);
    try {
      await paymentGateway.charge(order.amount);
      return ok({ success: true });
    } catch (error) {
      // Throwing = retry
      throw error;
    }
  },
  retries: 3,  // QStash will retry on thrown errors
});
```

### Failure Handling

If all retries fail, the message goes to Dead Letter Queue (DLQ):

```typescript
// In plugin configuration
qstashPlugin({
  token: process.env.QSTASH_TOKEN!,
  baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
  onFailure: (procedure, args, error) => {
    // Log to monitoring
    logger.error(`Background procedure ${procedure} failed:`, error);
    // Notify admins
    notifyAdmins(`Failed: ${procedure}`, { args, error });
  },
});
```

---

## Comparison

### Before (Manual)

```typescript
// Need 2 routes, manual URL, manual verification
export const POST = async (req: Request) => {
  const { imageId } = await req.json();
  const result = await client.publishJSON({
    url: "https://my-app.com/api/process-image",
    body: { imageId },
  });
  return NextResponse.json({ messageId: result.messageId });
};

// Separate webhook route
export const POST = async (req: Request) => {
  await verifyQStashSignature(req);
  const { imageId } = await req.json();
  await processImage(imageId);
  return NextResponse.json({ success: true });
};
```

### After (Plugin)

```typescript
// NO routes needed - everything is procedure
processImage: t.task({
  name: "processImage",
  args: z.object({ imageId: z.string() }),
  handler: async (ctx, args) => {
    await processImage(args.imageId);
    return ok({ success: true });
  },
}),

uploadAndProcess: t.mutation({
  handler: async (ctx, args) => {
    const imageId = await saveImage(args.data);
    await ctx.qstash.queue("processImage", { imageId });
    return ok({ queued: true });
  },
}),
```

---

## DX Benefits

| Aspect | Manual Routes | Plugin |
|--------|--------------|--------|
| **Routes to create** | N webhooks | Zero |
| **URL management** | Manual | Automatic |
| **Signature verification** | Manual | Automatic |
| **Routing logic** | Manual switch/case | Automatic by procedure name |
| **Argument validation** | Manual | Zod schema reuse |
| **Retries** | Manual | Configurable per-procedure |
| **ctx access** | Limited in webhooks | Full (db, auth, etc.) |

---

## Security: Two-Tier Context

```typescript
// t.mutation - HAS ctx.qstash.queue()
uploadImage: t.mutation({
  handler: async (ctx, args) => {
    await ctx.qstash.queue("processImage", { imageId: "123" }); // ✓ OK
  }
});

// t.query - NO ctx.qstash.queue()
getImages: t.query({
  handler: async (ctx, args) => {
    await ctx.qstash.queue("processImage", { imageId: "123" }); // ✗ TypeScript error
  }
});

// t.task - IS the task procedure
processImage: t.task({
  handler: async (ctx, args) => {
    // Full access to ctx.qstash for chaining
    await ctx.qstash.queue("generateThumbnail", { imageId: args.imageId }); // ✓ OK
  }
});
```

---

## Open Questions

1. **Webhook path convention**
   - `/api/qstash/[procedure]`?
   - `/api/tasks/[procedure]`?
   - Configurable?

2. **Callback URLs**
   - Should task procedures support callbacks?
   - How to handle callback results?

3. **Parallel execution**
   - Should `ctx.qstash.queue()` support multiple in parallel?
   - `await ctx.qstash.queueAll([...])`?

4. **Workflow integration**
   - Should task procedures be chainable?
   - Support for multi-step workflows?

---

## See Also

- [QStash Documentation](https://upstash.com/docs/qstash)
- [Two-Tier Context System](../context/README.md) - Security pattern for plugins
- [better-auth Plugin](./better-auth-plugin.md) - Another plugin example
- [QStash Package Research](../qstash/README.md) - QStash overview