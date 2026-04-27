# PLANS-NO-HISTORY Rule

## Rule

**Plans document the destination, not the journey.** When a plan changes, only document the current state. Never discuss previous versions or "why we changed."

## Why

Plans are not changelogs. They should:
- Describe what we're building
- Define the current approach
- Guide implementation

They should NOT:
- Document every revision
- Explain why we abandoned previous approaches
- Compare "before" and "after"

## Incorrect Examples

```markdown
// ❌ "We used to do it this way"
## Previous Approach
We originally designed the config to use `export default`, but that caused
import issues, so we changed to `export const config`.

// ❌ "We considered X but decided against it"
## Alternatives Considered
We thought about supporting plugins via a separate `plugins()` function,
but decided against it because it added complexity. Now we just use arrays.

## ❌ "Change from v1"
## Changes from Previous Plan
- Removed the `legacyConfig` option
- Renamed `createClient()` to `createAuth()`
- Changed default session timeout
```

## Correct Approach

```markdown
// ✅ Current state only
## Configuration

The config is defined with `export const config`:

```typescript
export const config = defineConfig({
  database: db,
  auth: { baseURL: "..." }
});
```
```

```markdown
// ✅ Implementation that differs from a previous idea
## Current Implementation

We considered supporting multiple plugins but found it unnecessary.
Single plugin array is sufficient:

```typescript
plugins: [admin()]
```
```

## Why This Matters

1. **Clutter** - Old approaches clutter plans, making them hard to follow
2. **Irrelevant** - Future developers don't care about abandoned paths
3. **Assumes failure** - Discussing "why we changed" implies the change was a mistake
4. **Stale documentation** - History becomes outdated and misleading

## When to Update a Plan

Update a plan when:
- ✅ Requirements change
- ✅ New information surfaces
- ✅ Implementation reveals a better path

Do NOT update a plan to:
- ❌ Document why you changed your mind
- ❌ Keep track of "v1", "v2", "v3"
- ❌ Explain what you abandoned

## Example: Before and After

### Before (Cluttered)

```markdown
## Session Management

We originally used cookies for sessions. In v2 we switched to JWT tokens
for better scalability. In v3 we added token refresh. Now in v4 we
store sessions in database for better invalidation.

This is a change from the original plan where we thought we could use
memory storage.
```

### After (Clean)

```markdown
## Session Management

Sessions are stored in the database with 7-day expiry.
Token refresh is handled automatically.
```

## Enforcement

This rule is enforced through:
1. **Plan reviews** - Remove all "previously", "formerly", "changed from"
2. **Keep it simple** - If you're explaining history, you're doing it wrong

## Remember

> Plans describe where we're going, not where we've been.
