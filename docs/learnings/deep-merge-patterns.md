# Deep Merge Patterns in TypeScript

## Source

- [ts-deepmerge npm](https://www.npmjs.com/package/ts-deepmerge)
- [deepmerge-ts npm](https://www.npmjs.com/package/deepmerge-ts)

## What

Deep merge is the practice of recursively merging object properties rather than shallow copying at the top level. In TypeScript, this requires careful type inference to preserve the merged result's type safety.

### Key Libraries

**ts-deepmerge**
- Deep merges objects and arrays while overwriting primitives (numbers, strings)
- Maintains source object immutability
- Supports both ESM and CommonJS
- Auto-infers return type based on input arguments
- Provides `.withOptions()` method for customization

```typescript
import { merge } from "ts-deepmerge";

// Basic usage
const result = merge(obj1, obj2, obj3);

// With options
const result = merge.withOptions(
  { mergeArrays: false },
  obj1,
  obj2
);
```

**deepmerge-ts**
- Deeply merges 2+ objects respecting type information
- Smart merging (high performance) - looks ahead to identify mergeable items
- Supports Record, Array, Map, and Set merging
- Customizable via customizer functions

```typescript
import { deepmerge, deepmergeCustom } from "deepmerge-ts";

// Standard merge
const result = deepmerge(obj1, obj2);

// In-place merge
deepmergeInto(target, source1, source2);

// Custom merge logic
const customMerge = deepmergeCustom({
  // Custom arrays.concat strategy
  arrayCombine: (l, r) => l.concat(r),
});
```

## Why It Matters

1. **Config systems need deep merging** - User config should override defaults at any nesting level
2. **Type safety is critical** - Manual casting after merge loses IDE support and can hide bugs
3. **Intersection types have limits** - `{...defaults, ...userConfig}` flattens and loses nested type info
4. **Array merging is nuanced** - Sometimes you want concatenation, sometimes replacement

## Senior Approach

### 1. Use Dedicated Libraries Over Hand-Rolled Solutions

```typescript
// Bad: Hand-rolled merge loses type safety
function deepMerge<T extends object>(a: T, b: Partial<DeepPartial<T>>): T {
  return { ...a, ...b }; // Shallow only!
}

// Good: Library preserves types
import { merge } from "ts-deepmerge";
const result = merge(defaults, userConfig);
```

### 2. Prefer Type Inference Over Casting

```typescript
// Bad: Type assertion hides potential errors
const result = merge(obj1, obj2) as SomeType;

// Good: Automatic inference
const result = merge(obj1, obj2); // Type is correctly inferred
```

### 3. Control Array Merging Explicitly

```typescript
// Replace arrays (default)
const result = merge.withOptions({ mergeArrays: false }, obj1, obj2);

// Concatenate arrays
const result = deepmerge(obj1, obj2, {
  arrayCombine: (l, r) => [...l, ...r]
});
```

### 4. Handle DeepPartial Correctly

For config systems, you often need `DeepPartial<T>` to allow partial overrides at any depth:

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Then use with merge
const config = merge(defaults, userOverrides as DeepPartial<Config>);
```

### 5. Consider Smart Merging Performance

`deepmerge-ts` uses "look-ahead" strategy to identify mergeable items rather than sequential merge, improving performance with many objects.

## Examples

### Config System Pattern

```typescript
import { merge } from "ts-deepmerge";

interface AuthConfig {
  session: {
    name: string;
    maxAge: number;
    secure: boolean;
  };
  providers: string[];
}

const defaultConfig: AuthConfig = {
  session: {
    name: "session",
    maxAge: 86400,
    secure: true,
  },
  providers: ["google", "github"],
};

// User provides partial override
const userConfig = {
  session: {
    maxAge: 3600, // Only override maxAge
  },
};

// deepmerge preserves nested structure
const config = merge(defaultConfig, userConfig);
// Result: { session: { name: "session", maxAge: 3600, secure: true }, providers: [...] }
```

### With Customizer for Arrays

```typescript
import { deepmerge } from "deepmerge-ts";

const config1 = {
  plugins: ["a", "b"],
};

const config2 = {
  plugins: ["c", "d"],
};

// Concatenate arrays instead of replacing
const result = deepmerge(config1, config2, {
  arrayCombine: (l, r) => l.concat(r),
});
// Result: { plugins: ["a", "b", "c", "d"] }
```

## Key Takeaways

1. Use established libraries - they handle edge cases and infer types correctly
2. Explicitly control array merging via options or customizers
3. DeepPartial + deep merge is the standard pattern for config override systems
4. Smart merging libraries offer better performance for large config objects
5. Never use type assertion to hide merge type errors - fix the types instead
