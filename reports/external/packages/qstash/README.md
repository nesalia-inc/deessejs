# QStash: Serverless Messaging for Background Workflows

## Overview

QStash is a **serverless messaging and workflow orchestration solution** built by [Upstash](https://upstash.com). It provides reliable message delivery with automatic retries for serverless environments.

---

## 1. What is QStash?

QStash is an HTTP-based message broker that ensures reliable message delivery between your application and API endpoints.

### Core Characteristics

| Feature | Description |
|---------|-------------|
| **HTTP-based** | 100% built on stateless HTTP requests |
| **At-least-once delivery** | If destinations are unavailable, QStash retries automatically |
| **Message size** | Up to 1 MB per message |
| **Authentication** | Bearer token via `QSTASH_TOKEN` |

### Supported Environments

- Serverless (AWS Lambda, Vercel, etc.)
- Cloudflare Workers
- Fastly Compute@Edge
- Next.js (including Edge Runtime)
- Deno / Deno Deploy
- Client-side web/mobile

---

## 2. Key Concepts

### Producers and Consumers

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Producer   │ ──────► │   QStash    │ ──────► │  Consumer   │
│  (your app) │  HTTP   │   Queue     │  HTTP    │  (webhook)  │
└─────────────┘         └─────────────┘         └─────────────┘
```

- **Producer** - Sends messages to QStash via SDK
- **Consumer** - HTTP endpoint that receives messages

### Queues and Topics

- **Queue** - FIFO ordered delivery, one message at a time
- **Topics / URL Groups** - Fan-out to multiple endpoints in parallel

### Webhooks and Callbacks

- **Webhook** - The consumer endpoint that receives messages
- **Callback** - Optional response sent to your API when delivery completes

### Retry Configuration

```typescript
const res = await client.publishJSON({
  url: "https://api...",
  body: { hello: "world" },
  retries: 3,    // Number of retries (default: 3)
  delay: "10s", // Delay before retry
})
```

### Deduplication

```typescript
const res = await client.publishJSON({
  url: "https://api...",
  body: { hello: "world" },
  deduplicationId: "unique-id-123", // Prevents duplicate delivery
})
```

---

## 3. Quick Start for Next.js

### Installation

```bash
npm install @upstash/qstash
```

### Environment Variables

```bash
QSTASH_TOKEN=your_qstash_token
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
```

### Sending Messages

```typescript
import { Client } from "@upstash/qstash"

const client = new Client({
  token: process.env.QSTASH_TOKEN!,
})

// Basic publish
const res = await client.publishJSON({
  url: "https://my-app.vercel.app/api/process",
  body: { task: "email-welcome" },
})

// With delay
await client.publishJSON({
  url: "https://my-app.vercel.app/api/process",
  body: { task: "reminder" },
  delay: 60, // 60 seconds
})

// With callback
await client.publishJSON({
  url: "https://my-app.vercel.app/api/long-running",
  body: { data: "..." },
  callback: "https://my-app.vercel.app/api/callback",
})
```

### Receiving Messages

```typescript
// app/api/my-endpoint/route.ts
import { Receiver } from "@upstash/qstash"

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

export async function POST(request: Request) {
  const body = await request.text()

  // Verify the request is from QStash
  const isValid = await receiver.verify({
    signature: request.headers.get("upstash-signature") ?? "",
    body,
  })

  if (!isValid) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Process the message
  const data = JSON.parse(body)
  console.log("Received:", data)

  return new Response(JSON.stringify({ success: true }))
}
```

### Edge Runtime Support

```typescript
import { Client } from "@upstash/qstash/edge"

const client = new Client({
  token: process.env.QSTASH_TOKEN!,
})

export const runtime = "edge"

export async function POST(request: Request) {
  const res = await client.publishJSON({
    url: "https://my-app.vercel.app/api/process",
    body: { data: await request.json() },
  })

  return new Response(JSON.stringify({ messageId: res.messageId }))
}
```

---

## 4. Workflows

QStash Workflows is a higher-level abstraction for **multi-step durable workflows** with failure resilience and automatic per-step retries.

### Key Features

- **Failure resilience** - Workflows pick up where they left off
- **Long-running** - For AI, video processing, etc.
- **Per-step retries** - Only failed steps retry, not the entire workflow
- **Wait/notify** - Wait for external events
- **Parallel runs** - Run steps concurrently

### How It Works

```
Step 1 ──► Success ──► Step 2 ──► Success ──► Step 3 ──► Done
             │              │
             ▼              ▼
          (retry)        (retry)
```

### Workflow Pattern

```typescript
import { WorkflowClient } from "@upstash/workflow"

const client = new WorkflowClient()

// Start workflow
const { id } = await client.start({
  url: "https://my-app.vercel.app/api/workflow/run",
  body: { userId: "123", action: "onboarding" },
})

// In workflow endpoint
export async function POST(request: Request) {
  const { step, context } = request.body

  switch (step) {
    case 1:
      return client.next({ action: "create-user", payload: { userId: "123" } })
    case 2:
      return client.next({ action: "send-email", payload: { userId: "123" } })
    case 3:
      return client.next({ action: "check-activity", payload: { userId: "123" } })
    default:
      return client.finish({ status: "completed" })
  }
}
```

### Use Cases

- AI agents with custom tools
- Data processing pipelines
- Customer onboarding flows
- E-commerce order fulfillment
- Image processing
- Payment retry flows

---

## 5. QStash as a drpc Plugin

### Plugin Design

```typescript
import { plugin } from "@deessejs/server"
import { Client } from "@upstash/qstash"

export const qstashPlugin = plugin("qstash", (ctx) => {
  const client = new Client({
    token: process.env.QSTASH_TOKEN!,
  })

  return {
    qstash: {
      client,
      publish: (url: string, body: unknown, options?: PublishOptions) =>
        client.publishJSON({ url, body, ...options }),
      publishDelayed: (url: string, body: unknown, delay: string) =>
        client.publishJSON({ url, body, delay }),
      publishWithCallback: (url: string, body: unknown, callback: string) =>
        client.publishJSON({ url, body, callback }),
    }
  }
})
```

### Registration

```typescript
const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  plugins: [qstashPlugin, authPlugin]
})
```

### Usage in Handlers

#### Fire-and-Forget

```typescript
const exportData = t.mutation({
  args: z.object({ format: z.string() }),
  handler: async (ctx, args) => {
    // Queue without waiting
    await ctx.qstash.publish(
      `https://my-app.vercel.app/api/export/${args.format}`,
      { userId: ctx.auth.session?.user.id, format: args.format }
    )

    return ok({ message: "Export queued" })
  }
})
```

#### Delayed Processing

```typescript
const scheduleReport = t.mutation({
  args: z.object({ reportType: z.string(), scheduleTime: z.string() }),
  handler: async (ctx, args) => {
    const delay = calculateDelay(args.scheduleTime)

    await ctx.qstash.publishDelayed(
      `https://my-app.vercel.app/api/generate-report`,
      { userId: ctx.auth.session?.user.id, reportType: args.reportType },
      delay
    )

    return ok({ scheduled: true })
  }
})
```

#### With Callback

```typescript
const longRunningTask = t.mutation({
  args: z.object({ data: z.any() }),
  handler: async (ctx, args) => {
    const result = await ctx.qstash.publishWithCallback(
      `https://my-app.vercel.app/api/long-running`,
      { data: args.data },
      `https://my-app.vercel.app/api/task-complete`
    )

    return ok({ taskId: result.messageId })
  }
})
```

### Webhook Verification

```typescript
export async function POST(request: Request) {
  const signature = request.headers.get("upstash-signature")
  const body = await request.text()

  if (!signature) {
    return new Response("Missing signature", { status: 401 })
  }

  const isValid = await ctx.qstash.verify(signature, body)
  if (!isValid) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Process
  const data = JSON.parse(body)
  return new Response(JSON.stringify({ success: true }))
}
```

---

## 6. Security Considerations

### Two-Tier Context

For security, QStash client should follow the same pattern as better-auth:

```typescript
export const qstashPlugin = {
  name: "qstash",

  // Available in ALL procedures
  extend: (ctx) => ({
    // No qstash access here - prevents accidental background tasks in public queries
  }),

  // Available ONLY in internal procedures
  extendInternal: (ctx) => ({
    qstash: {
      client,
      publish: (...),
    }
  }),
}
```

This ensures:
- **Public queries** - Cannot queue background tasks
- **Internal mutations** - Can queue background tasks

---

## 7. SDK Reference

### Client (Publishing)

```typescript
const client = new Client({ token: process.env.QSTASH_TOKEN! })

// Publish JSON
const res = await client.publishJSON({
  url: string,
  body: unknown,
  retries?: number,
  delay?: string | number,
  deduplicationId?: string,
  callback?: string,
  headers?: Record<string, string>,
})
// Returns: { messageId: string }

// Batch
await client.batchJSON([
  { url: "https://api1.com", body: { task: 1 } },
  { url: "https://api2.com", body: { task: 2 } },
])
```

### Receiver (Verifying)

```typescript
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

await receiver.verify({
  signature: string,
  body: string,
})
```

---

## 8. Comparison with Alternatives

| Feature | QStash | SQS/SNS | RabbitMQ |
|---------|--------|---------|----------|
| **Serverless native** | ✓ | Partial | ✗ |
| **HTTP-based** | ✓ | ✗ | ✗ |
| **Built-in retries** | ✓ | ✓ | ✓ |
| **Workflows** | ✓ | ✗ | ✗ |
| **Edge runtime** | ✓ | ✗ | ✗ |
| **No infra setup** | ✓ | ✗ | ✗ |

---

## See Also

- [Upstash QStash Docs](https://upstash.com/docs/qstash)
- [QStash Next.js Integration](https://upstash.com/docs/qstash/nextjs)
- [Upstash Workflow](https://github.com/upstash/workflow)
- [Two-Tier Context System](../drpc/context/README.md) - Security pattern for plugins
