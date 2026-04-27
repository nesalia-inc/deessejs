# REPORTS-PLANS-VERIFICATION Rule

## Rule

**Never document what "should" or "supposedly" work.** In reports and plans, all code, file paths, and implementations must be verified to exist and work exactly as described.

If you cannot verify something, say so explicitly and launch a subagent to investigate before writing about it.

## Why This Rule

Reports and plans become ground truth. When we document something as "how it works" or "this is the pattern", developers will trust it and build on top of it.

Code that doesn't exist or doesn't work as documented:
- Wastes developer time
- Creates technical debt
- Erodes trust in documentation

## Incorrect Examples

```markdown
// ❌ "The function does X supposedly"
The `createClient()` function supposedly returns the auth client.

// ❌ "This should work like this"
The config merge should work by deep merging the objects.

// ❌ "Example code" without verification
```typescript
// Example: how to use the client
const client = createClient(config);
```
(If this code wasn't tested, it's just guessing)

// ❌ File reference without verification
The config is in `packages/deesse/src/config/define.ts`.
(Without reading the file to confirm it exists and contains what we say)
```

## Correct Approach

### For Code Examples

1. **Read the actual file** before referencing it
2. **Copy-paste** the real code, don't rewrite from memory
3. **Build or run** to verify it works
4. If code is new (not yet written), clearly mark it as:

```markdown
// ✅ Proposed code (not yet implemented)
```typescript
// TODO: Verify this works after implementation
export const newFunction = () => { ... };
```

### For File Paths

1. **Verify the file exists** with Glob or Read
2. **Confirm contents** match what you describe
3. **Use absolute paths** in reports

```markdown
// ✅ Verified file
The config is defined in `packages/deesse/src/config/define.ts` (lines 41-79).
Verified by reading the file on [date].
```

### For Processes/Architecture

1. **Trace the actual flow** through the code
2. **Follow function calls** from entry to exit
3. **Use subagents** for deep investigation

```markdown
// ✅ Verified flow
1. User calls `defineConfig()` → verified in `define.ts:41`
2. Config is stored globally → verified in `define.ts:90`
3. `getDeesse()` retrieves it → verified in `index.ts:78`
```

## When You Don't Know

Say it explicitly:

```markdown
// ❌ Assumed understanding
The admin plugin is automatically included.

## ✅ Explicit uncertainty
**Note:** We have not verified if the admin plugin is automatically included.
The `admin()` function is called in `defineConfig()`, but we haven't tested
what happens if a user also passes `admin()` in their plugins array.
[Launched subagent to verify - pending]
```

## Subagent Triggers

Launch a subagent when:

| Situation | Example |
|-----------|---------|
| Understanding complex flow | "Trace how auth middleware works" |
| Verifying type structure | "Find where BetterAuthOptions is defined" |
| Confirming file contents | "Read all files in packages/deesse/src/config/" |
| Testing integration | "Verify that admin plugin is auto-added" |

## Enforcement

This rule is enforced through:
1. **Code reviews** - question every "supposedly", "should", "example"
2. **Report audits** - verify all code blocks were actually read from source
3. **CI (future)** - may add automated checks for TODO markers in reports

## Remember

> "Documentation is code." If you write it, it must be true.
> A half-documented truth is worse than no documentation.
