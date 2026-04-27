# DEVELOPMENT-PHILOSOPHY Rule

## Rule

**We are in active development with no backward compatibility commitments.** Breaking changes are acceptable. Do not design for compatibility with previous versions.

## Core Principles

1. **Breaking changes are free** - Do not add complexity to avoid them
2. **No compatibility layers** - No `legacy-*`, `compat-*`, or `v1/*` patterns
3. **Clean over compatible** - If a change improves the API, make it. Don't carry old patterns.
4. **Users will adapt** - It's easier for users to update than to maintain old code

## Why This Matters

When we worry about backward compatibility:
- We add flags, aliases, and complexity
- We carry old patterns forever
- We can't clean up mistakes
- We slow down development

When we ignore backward compatibility:
- APIs can be redesigned cleanly
- Old mistakes can be fixed
- Code stays simple
- Development moves fast

## Examples

### Don't: Add Legacy Support

```typescript
// ❌ Complex - supporting old API
export function createClient(options: ClientOptions) {
  // If user passes old format, convert to new
  if (options.oldFormat) {
    options = convertLegacyOptions(options);
  }
  // ... rest of implementation
}
```

### Do: Break and Improve

```typescript
// ✅ Clean - only current API
export function createClient(options: ClientOptions) {
  // Current implementation
}
```

### Don't: Preserve Old Function Signatures

```typescript
// ❌ Keeping old function shape
export function oldFunction(param: string, legacy?: boolean) {
  // Too many parameters, too much history
}
```

```typescript
// ✅ New function, clear purpose
export function newFunction(config: NewConfig) {
  // Clean, typed, documented
}
```

## When Changes Are Acceptable

| Change Type | Allowed | Example |
|-------------|---------|---------|
| Rename function | ✅ | `createAuth()` → `createClient()` |
| Remove parameter | ✅ | `fn(a, b)` → `fn(a)` |
| Change default | ✅ | `{timeout: 30}` → `{timeout: 60}` |
| Rename config field | ✅ | `auth.baseUrl` → `auth.baseURL` |
| Remove deprecated | ✅ | Delete `legacyFn()` after migration period |

## Versioning Strategy

**We don't version for compatibility.** If a breaking change is needed:

1. Make the change
2. Update all internal usages
3. Document in CHANGELOG.md
4. Move on

No:
- Major/minor versioning for API stability
- Deprecation warnings for old APIs
- Migration guides for users

## Impact on Design

This philosophy affects how we design:

### APIs
- Don't add "future-proofing" abstractions
- Don't add options you'll "probably need later"
- Keep APIs small and focused

### Documentation
- Don't document deprecated patterns
- Don't show old ways alongside new ways
- Only document current state

### Packages
- Don't maintain `v1/` directories for old versions
- Don't add `legacy-` prefixed packages
- Single implementation, current only

## What About Stability?

We still care about:
- **Code quality** - Not rushing bad code
- **Testing** - Verify changes work before shipping
- **Clear APIs** - Easy to understand, not complex

We don't care about:
- **API stability** - Users expect active development
- **Migration paths** - Users update with each version
- **Long support windows** - Current version only

## Enforcement

This rule is enforced through:
1. **Design reviews** - Reject unnecessary compatibility code
2. **Code reviews** - Simplify rather than add flags
3. **API decisions** - Favor clean breaks over complex migrations

## Remember

> "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."
>
> Backward compatibility is the enemy of simplicity.
