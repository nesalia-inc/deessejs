# Redis Plugin for drpc: Desired Developer Experience

## Overview

This document describes how Redis (via Upstash) could work as a plugin for drpc, enabling seamless Redis operations in procedure handlers via `ctx.cache`.

**Key Goal:** The developer should have typed, organized access to Redis commands through a clean context interface, with Redis operations restricted to internal procedures only (similar to QStash and better-auth patterns).

---

## 1. The Problem: Manual Redis Integration Today

With current Upstash Redis integration, developers must:

```typescript
// 1. Create Redis client manually
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 2. Scattered usage across handlers
const getUserCache = t.query({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    // Manual client access - not integrated with context
    const cached = await redis.get(`user:${args.userId}`);
    if (cached) {
      return ok(JSON.parse(cached));
    }
    const user = await ctx.db.query.users.find(args.userId);
    await redis.set(`user:${args.userId}`, JSON.stringify(user), { ex: 300 });
    return ok(user);
  },
});

// 3. Another handler with duplicate pattern
const getUserPreferences = t.query({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    // Same manual pattern repeated
    const cached = await redis.get(`prefs:${args.userId}`);
    if (cached) {
      return ok(JSON.parse(cached));
    }
    const prefs = await ctx.db.query.userPreferences.find(args.userId);
    await redis.set(`prefs:${args.userId}`, JSON.stringify(prefs), { ex: 300 });
    return ok(prefs);
  },
});
```

**Issues:**
- Manual client instantiation and lifecycle management
- No integration with procedure context (no access to session, db, etc.)
- Duplicate patterns across handlers
- No centralized Redis operation organization
- Commands not typed to procedure context (could be used in public queries accidentally)

---

## 2. The Solution: Redis Plugin Pattern

### Core Concept

```typescript
// 1. Register the plugin - client created automatically
const { createAPI } = defineContext({
  context: { db },
  plugins: [
    redisPlugin({
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      url: process.env.UPSTASH_REDIS_REST_URL!,
    })
  ],
});

// 2. Use Redis commands via context - organized by data type
const getUser = t.internalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    // Organized access: ctx.cache.<dataType>.<command>
    const cached = await ctx.cache.strings.get(`user:${args.userId}`);
    if (cached) {
      return ok(JSON.parse(cached));
    }
    const user = await ctx.db.query.users.find(args.userId);
    await ctx.cache.strings.set(`user:${args.userId}`, JSON.stringify(user), { ex: 300 });
    return ok(user);
  },
});

// 3. Only available in INTERNAL procedures
const getUserPublic = t.query({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    ctx.cache.strings.get(...) // ✗ TypeScript error - not available in public
    return ok({ public: true });
  },
});
```

**The plugin automatically:**
- Creates and manages the Upstash Redis client lifecycle
- Organizes commands by Redis data type (strings, lists, sets, hashes, sorted sets)
- Enforces Redis access only in internal procedures (via Two-Tier Context)
- Provides TypeScript type safety for all Redis operations

---

## 3. Desired DX: Full Setup

### Step 1: Register the Plugin

```typescript
// src/server/index.ts
import { defineContext, t, createAPI } from "@drpc/server";
import { redisPlugin } from "@drpc/server/plugins/redis";

const { createAPI: mkAPI } = defineContext({
  context: { db },
  plugins: [
    redisPlugin({
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      url: process.env.UPSTASH_REDIS_REST_URL!,
    })
  ],
});
```

### Step 2: Use in Internal Procedures

```typescript
const appRouter = t.router({

  // INTERNAL - Redis access available
  getUser: t.internalQuery({
    args: z.object({ userId: z.string() }),
    handler: async (ctx, args) => {
      // String operations
      const cached = await ctx.cache.strings.get(`user:${args.userId}`);
      if (cached) {
        return ok(JSON.parse(cached));
      }

      // Hash operations
      const user = await ctx.db.query.users.find(args.userId);
      await ctx.cache.hashes.set(`user:${args.userId}`, user, { ex: 300 });

      // List operations
      await ctx.cache.lists.push(`user:${args.userId}:activity`, JSON.stringify({
        action: "login",
        timestamp: Date.now()
      }));

      return ok(user);
    },
  }),

  // INTERNAL - Sorted set operations
  leaderboard: t.internalMutation({
    args: z.object({ userId: z.string(), score: z.number() }),
    handler: async (ctx, args) => {
      await ctx.cache.sortedSets.add("leaderboard", args.score, args.userId);
      const rank = await ctx.cache.sortedSets.rank("leaderboard", args.userId);
      return ok({ rank: rank + 1 });
    },
  }),

  // PUBLIC - Redis NOT available
  getUserProfile: t.query({
    args: z.object({ userId: z.string() }),
    handler: async (ctx, args) => {
      // ctx.cache undefined here - TypeScript error
      return ok({ profile: "public" });
    },
  }),
});
```

---

## 4. Plugin Interface Design

### Plugin Options

```typescript
interface RedisPluginOptions {
  token: string;
  url: string;
  // Optional configuration
  automaticParsing?: boolean;  // Default: true - auto-parse JSON values
  defaultEx?: number;        // Default expiration in seconds
}

interface RedisPlugin extends Plugin<BaseContext> {
  name: "redis";

  // Available ONLY in internal procedures
  extendInternal: (ctx: BaseContext) => {
    redis: RedisContext;
  };
}

interface RedisContext {
  strings: StringCommands;
  lists: ListCommands;
  sets: SetCommands;
  hashes: HashCommands;
  sortedSets: SortedSetCommands;
  // Raw access if needed
  raw: RawRedisCommands;
}
```

### Command Organization

```typescript
interface StringCommands {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number; px?: number; nx?: boolean }): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  incrby(key: string, amount: number): Promise<number>;
  decr(key: string): Promise<number>;
  decrby(key: string, amount: number): Promise<number>;
  strlen(key: string): Promise<number>;
  append(key: string, value: string): Promise<number>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(...pairs: [string, string][]): Promise<'OK'>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
}

interface ListCommands {
  lpush(key: string, ...values: string[]): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;
  lpop(key: string): Promise<string | null>;
  rpop(key: string): Promise<string | null>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  llen(key: string): Promise<number>;
  lindex(key: string, index: number): Promise<string | null>;
  lset(key: string, index: number, value: string): Promise<string>;
  ltrim(key: string, start: number, stop: number): Promise<'OK'>;
}

interface HashCommands {
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hsetmap(key: string, fieldValueMap: Record<string, string>): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  hexists(key: string, field: string): Promise<number>;
  hlen(key: string): Promise<number>;
  hincrby(key: string, field: string, amount: number): Promise<number>;
}

interface SetCommands {
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: string): Promise<number>;
  scard(key: string): Promise<number>;
  spop(key: string, count?: number): Promise<string | string[]>;
}

interface SortedSetCommands {
  zadd(key: string, score: number, member: string): Promise<number>;
  zaddMulti(key: string, ...scoreMembers: [number, string][]): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zrevrange(key: string, start: number, stop: number): Promise<string[]>;
  zrank(key: string, member: string): Promise<number | null>;
  zrevrank(key: string, member: string): Promise<number | null>;
  zscore(key: string, member: string): Promise<number | null>;
  zcard(key: string): Promise<number>;
  zcount(key: string, min: number, max: number): Promise<number>;
}

interface RawRedisCommands {
  // For commands not covered by typed interfaces
  call(command: string, ...args: (string | number)[]): Promise<unknown>;
}
```

---

## 5. Security: Two-Tier Context

Following the established pattern from QStash and better-auth:

```typescript
// t.internalQuery - HAS ctx.cache
getUser: t.internalQuery({
  handler: async (ctx, args) => {
    await ctx.cache.strings.get("key");    // ✓ OK
    await ctx.cache.hashes.set("key", "f", "v");  // ✓ OK
  }
});

// t.internalMutation - HAS ctx.cache
updateUser: t.internalMutation({
  handler: async (ctx, args) => {
    await ctx.cache.strings.set("key", "value");   // ✓ OK
    await ctx.cache.lists.push("queue", "item");  // ✓ OK
  }
});

// t.query - NO ctx.cache
getUserProfile: t.query({
  handler: async (ctx, args) => {
    await ctx.cache.strings.get("key");  // ✗ TypeScript error
    return ok({});
  }
});

// t.mutation - NO ctx.cache
updateProfile: t.mutation({
  handler: async (ctx, args) => {
    await ctx.cache.strings.set("key", "value");  // ✗ TypeScript error
    return ok({});
  }
});
```

**Security Guarantee:** Redis operations are architecturally impossible in public procedures - TypeScript will error at compile time.

---

## 6. Comparison with Current Manual Approach

| Aspect | Manual Today | Redis Plugin |
|--------|--------------|---------------|
| **Client lifecycle** | Manual instantiation | Plugin-managed |
| **Command access** | Flat redis.get(), redis.set() | Organized by type: ctx.cache.strings.get() |
| **Type safety** | Basic TypeScript | Full typed commands |
| **Context integration** | None | Full ctx access (db, auth, etc.) |
| **Security enforcement** | Convention | TypeScript enforced |
| **Public procedure access** | Unrestricted | Impossible (TypeScript error) |
| **Internal procedure access** | Manual | Automatic via extendInternal |
| **JSON serialization** | Manual | Automatic (optional) |

---

## 7. DX Benefits Table

| Feature | Manual Upstash | Redis Plugin |
|---------|----------------|--------------|
| **Typed commands** | Partial | Full |
| **Data type organization** | None | By strings/lists/sets/hashes/sortedSets |
| **Automatic JSON parsing** | Manual | Configurable |
| **Expiration helpers** | Manual | Built into set operations |
| **Batch operations** | Manual | Via raw.call() |
| **Internal-only enforcement** | None | TypeScript enforced |
| **Integration with db context** | Manual | Automatic |
| **Error handling** | Manual | Consistent with drpc |

---

## 8. How It Works Internally

### Plugin Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Plugin Registration                            │
│                                                                  │
│  redisPlugin({                                                   │
│    token: process.env.UPSTASH_REDIS_REST_TOKEN!,                │
│    url: process.env.UPSTASH_REDIS_REST_URL!,                    │
│  })                                                              │
│                        │                                         │
│                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. Create Upstash Redis client                              │ │
│  │ 2. Wrap commands by data type                               │ │
│  │ 3. Return RedisContext with all command interfaces          │ │
│  │ 4. Register as extendInternal only                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Context Extension Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Procedure Execution                             │
│                                                                  │
│  defineContext({                                                │
│    plugins: [redisPlugin({...})]                                │
│  })                                                              │
│                        │                                         │
│                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Public Query (t.query)                                      │ │
│  │   - apply extend()                                          │ │
│  │   - NO redis context added                                   │ │
│  │   - ctx.cache = undefined                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Internal Query (t.internalQuery)                             │ │
│  │   - apply extend()                                           │ │
│  │   - apply extendInternal() ← redis added here               │ │
│  │   - ctx.cache = RedisContext                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Advanced Features

### JSON Auto-Serialization

```typescript
redisPlugin({
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  url: process.env.UPSTASH_REDIS_REST_URL!,
  automaticParsing: true,  // Default: true
  defaultEx: 300,          // Default TTL for all set operations
})

// In handler
const user = await ctx.cache.hashes.get("user:123"); // Returns parsed JSON
await ctx.cache.hashes.set("user:123", { name: "John" }); // Auto-stringified
```

### Pipeline Support

```typescript
// Batch operations via pipeline
const pipeline = ctx.cache.pipeline();
pipeline.strings.set("key1", "value1");
pipeline.strings.get("key1");
pipeline.hashes.set("user:1", { name: "John", email: "john@example.com" });
const results = await pipeline.exec();
```

### Lua Script Support

```typescript
// For atomic operations
const result = await ctx.cache.raw.call("EVAL", `
  local current = redis.call('GET', KEYS[1])
  if current then
    redis.call('INCR', KEYS[1])
    return current
  else
    redis.call('SET', KEYS[1], '1')
    return nil
  end
`, 1, "counter");
```

---

## 10. Open Questions

1. **Command coverage**
   - Should we type all Redis commands or just common ones?
   - How to handle Redis modules (Bloom filters, JSON, etc.)?

2. **Pipeline interface**
   - Should pipelines be fluent (chainable) or callback-based?
   - How to type pipeline results?

3. **Cluster/Multi-region support**
   - Should plugin support Upstash Redis with clustering?
   - How to handle cross-region replication?

4. **Transaction support**
   - Should we support Redis transactions (MULTI/EXEC)?
   - How to integrate with typed commands?

5. **Health checks and observability**
   - Should plugin expose client metrics?
   - How to handle connection failures gracefully?

6. **Upstash Redis vs standard Redis**
   - The Upstash SDK uses REST API - is that an issue?
   - Should we also support ioredis-style interface?

---

## 11. Similarities to QStash Plugin Pattern

The Redis plugin follows the same pattern as QStash:

| Aspect | QStash Plugin | Redis Plugin |
|--------|---------------|--------------|
| **Context tier** | extendInternal only | extendInternal only |
| **Procedure type** | t.task() | t.internalQuery/t.internalMutation |
| **Queue name pattern** | ctx.qstash.queue("name", args) | N/A - direct commands |
| **Security model** | TypeScript enforced | TypeScript enforced |
| **Plugin registration** | Token + baseURL | Token + URL |

**Key difference:** QStash queues work asynchronously (fire-and-forget), while Redis operations are synchronous (immediate response). Redis commands execute immediately and return results.

---

## See Also

- [QStash Plugin for drpc](./qstash-plugin.md) - Similar plugin pattern for background tasks
- [better-auth Plugin for drpc](./better-auth-plugin.md) - Auth plugin with two-tier context
- [Two-Tier Context System](../context/README.md) - Security pattern for plugins
- [Upstash Redis Docs](https://upstash.com/docs/redis/sdks/ts/getstarted) - Official Upstash Redis SDK
- [Upstash Redis SDK](https://github.com/upstash/redis) - GitHub repository