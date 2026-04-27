# REPORTS vs PLANS Rule

## Two Types of Documents

We separate technical documents into two categories based on their purpose:

---

## Reports: Analyze What Exists

**Purpose:** Understand and document current implementation.

**Questions answered:**
- How does X work?
- What is the current structure?
- Where is Y implemented?

**Characteristics:**
- References existing code (must be verified)
- Describes current state
- May include analysis, diagrams, findings
- No implementation required

**Examples:**
- `reports/auth/better-auth-api.md` - "How better-auth admin plugin works"
- `reports/database/drizzle-patterns.md` - "Current ORM usage patterns"

**Language:** Past/descriptive
- "The function returns..."
- "The config is structured as..."
- "We observed that..."

---

## Plans: Define What to Build

**Purpose:** Define implementation for new features or changes.

**Questions answered:**
- What do we want to build?
- How do we implement it?
- What are the steps?

**Characteristics:**
- No need to reference existing code (unless needed for integration)
- Describes desired end state
- Includes implementation steps, file changes
- May include code examples (proposed, not existing)

**Examples:**
- `plans/auth/user-management-pages.md` - "Build users admin pages"
- `plans/database/migration-system.md` - "Implement migration system"

**Language:** Future/imperative
- "We will create..."
- "The page should..."
- "Add X to Y"

---

## Key Distinction

| Aspect | Report | Plan |
|--------|--------|------|
| Purpose | Understand existing | Define implementation |
| References code | Yes (verified) | Only if needed for integration |
| Starts with | "Current state:" | "We want:" |
| History | May include | Never |
| Changes code | No | Yes |

---

## Common Mistakes

### Mistake 1: Reports that suggest changes

```markdown
// ❌ Report - but discusses changes
## Current State
The config is in `defineConfig()`.

## Recommended Changes
We should move the validation to a separate function.
```

```markdown
// ✅ Pure Report
## Current State
The config validation is in `defineConfig()` (verified).

How it works:
1. User passes config
2. Validation occurs
3. Config is stored globally

No changes planned.
```

### Mistake 2: Plans that analyze existing

```markdown
// ❌ Plan - but discusses current state
## Current Problem
We have a single file with 500 lines.

## Proposed Solution
Split into separate modules.
```

```markdown
// ✅ Pure Plan
## Goal
Split configuration into focused modules.

## Implementation
1. Create `config/validation.ts` for validation logic
2. Create `config/defaults.ts` for default values
3. Update `config/define.ts` to import and compose

No mention of current 500-line file.
```

---

## When to Use Which

| Situation | Document Type |
|-----------|---------------|
| Analyzing code for understanding | Report |
| Documenting how something works | Report |
| Planning new feature | Plan |
| Describing required changes | Plan |
| Recording architectural decisions | Report |
| Defining implementation steps | Plan |

---

## Report Template

```markdown
# [Feature] Analysis

## Overview
Brief description of what we're analyzing.

## Current Implementation
Verified description of how it currently works.

### Key Files
- `path/to/file.ts` - Line X-Y

### Data Flow
1. Step 1
2. Step 2

## Findings
- Finding 1
- Finding 2

## Conclusion
Summary without suggesting changes.
```

---

## Plan Template

```markdown
# [Feature] Implementation Plan

## Goal
Clear statement of what we want to build.

## Files to Create/Modify

### New Files
- `path/to/new-file.ts`

### Modified Files
- `path/to/existing.ts`

## Implementation Steps

### Step 1: [What]
1. Do this
2. Then this

### Step 2: [What]
1. Do this

## Verification
How to verify it works.
```

---

## Remember

> **Reports:** Understand the world as it is.
> **Plans:** Describe the world as we want it to be.
