# REPORTS-PLANS-PHILOSOPHY Rule

## Rule

**Reports and plans are not task completions. They are tools for understanding problems deeply and designing solutions that revolutionize end users' lives.**

When writing reports or plans, you must:
1. Start with end user DX, not implementation
2. Decompose problems continuously with subagents
3. Create learnings from deep analysis
4. Find senior solutions, not just working solutions

## The Purpose of Reports

Reports are the **first step before development**. They exist to deeply understand problems before writing any code.

Reports are NOT:
- Documentation of what exists
- Answers to immediate questions
- Implementations of current patterns

Reports ARE:
- Deep investigations into user problems
- Analysis of how to revolutionize user workflows
- Foundations for senior-level decisions

## Report Structure: Clean and Organized

A report is **NOT a draft**. It must be **clean, navigable, and well-organized** from the start.

**A report is not:**
- ❌ A rough draft to clean up later
- ❌ A brain dump of thoughts
- ❌ A work in progress
- ❌ Notes to be organized later

**A report IS:**
- ✅ A polished document from the start
- ✅ Clean, navigable structure
- ✅ Ready for review at any time
- ✅ Something you'd be proud to show to a senior developer

### Entry Point: README.md

Every report starts with a clear entry point:

```markdown
# Report Title

## TL;DR
[2-3 sentences: What problem, what solution, what DX]

## Final Goal
[Clear description of the desired end state]

## Status
- [ ] Investigation ongoing
- [ ] Key findings identified
- [ ] Ready for plan
```

### Decompose into Sub-folders

Don't dump everything in one file. Organize:

```
reports/
└── my-feature/
    ├── README.md           # Entry point
    ├── learnings/          # Individual learnings
    │   ├── plugin-system.md
    │   ├── auth-flows.md
    │   └── existing-patterns.md
    ├── analysis/           # Deep investigations
    │   ├── current-state.md
    │   └── competitors.md
    └── synthesis/         # Final synthesis
        └── solution.md
```

### File Naming

Use descriptive names, not numbers:
```
❌ 01-analysis.md
❌ investigation-2.md
✅ plugin-system-learnings.md
✅ user-authentication-flows.md
```

### Each File: One Concept

- One file = one clear concept
- File name = summary of content
- Use headers to structure within file

## Report Based on Final DX or Need

Before writing anything, answer:

1. **What is the final need?** (Not "how it works", but "what problem do we solve?")
2. **What is the desired DX?** (What should the user experience?)
3. **What does success look like?**

```markdown
## Final Need

Users need a way to manage authentication without reading better-auth's
500-line documentation.

## Desired DX

```typescript
export const config = defineConfig({
  auth: { baseURL: "..." }
  // Everything else is automatic
});
```

## Success Criteria

- [ ] User config reduced from 50 lines to 5
- [ ] No cryptic error messages
- [ ] Sensible defaults that work out of the box
```

## The Golden Rule: Start with End User DX

Before any technical analysis, answer:

**"What is the experience for the end user?"**

```markdown
// ❌ Starting with implementation
## Current Implementation
The config uses deepMerge function...

// ✅ Starting with user experience
## Desired User Experience
A developer should be able to configure auth in one line:
```typescript
export const config = defineConfig({ auth: { baseURL: "..." } });
```
```

### DX Questions to Ask

1. **What does the user write today?** (Current state)
2. **What do they wish they could write?** (Ideal state)
3. **What mental models do they have?** (Understanding)
4. **What breaks their flow?** (Pain points)
5. **What would make them say "wow"?** (Revolution)

## Problem Decomposition

### Continuous Decomposition

Every problem contains sub-problems. Decompose until each piece is understandable.

```
User Problem
    │
    ├── Sub-problem 1
    │       ├── Root cause A
    │       └── Root cause B
    │
    ├── Sub-problem 2
    │       ├── Technology analysis
    │       └── Alternative approaches
    │
    └── Sub-problem 3
            ├── What exists
            └── What should exist
```

### Using Subagents

For complex problems, launch subagents to investigate:

| Situation | Subagent Approach |
|-----------|-------------------|
| Understanding a library's API | Launch Explore agent to trace all usage patterns |
| Analyzing user flows | Launch Plan agent to map journey steps |
| Verifying technical feasibility | Launch Codex agent to test implementation |
| Learning a new technology | Create learning document, then synthesize |

### Creating Learnings

Every deep analysis should produce a learning:

```markdown
## Learnings

### Finding 1
**What:** We discovered that better-auth's session config has 15+ options.

**Why it matters:** Users shouldn't see this complexity. We need sensible defaults.

**Senior approach:** Create simplified types with sensible defaults that work out of the box.
```

## Finding Senior Solutions

A working solution is not enough. We seek **senior solutions**.

### What Makes a Solution "Senior"?

| Aspect | Junior Solution | Senior Solution |
|--------|-----------------|-----------------|
| **Scope** | Solves the immediate problem | Solves the root problem + prevents future issues |
| **Abstraction** | Matches existing patterns | Creates new patterns that guide future work |
| **Flexibility** | Hard-coded for today | Handles unknown future requirements |
| **User impact** | "It works" | "It's delightful to use" |
| **Maintenance** | Accumulates debt | Reduces debt |

### Questions for Senior Solutions

1. **Is this solving the root cause or a symptom?**
2. **Will this create debt or reduce debt?**
3. **How does this change if requirements shift?**
4. **What does this teach us about our architecture?**
5. **Would a new developer understand this immediately?**

## The Report/Plan Workflow

### Phase 1: User First

```markdown
## End User Experience

**Current pain:**
- Developer writes 50 lines of config for simple auth
- They don't know which options are required vs optional
- Errors are cryptic

**Desired experience:**
- 5 lines of config for 95% of use cases
- Clear errors that guide to solution
- Sensible defaults that "just work"
```

### Phase 2: Decompose the Problem

Launch subagents for each sub-problem:

- Subagent: "Analyze how better-auth plugins work"
- Subagent: "Find all session-related options"
- Subagent: "Trace how config validation happens"

### Phase 3: Synthesize Learnings

```markdown
## Learnings

1. **Plugin system is complex** - 15+ plugins available
2. **Config validation is scattered** - No single place to see requirements
3. **DX is an afterthought** - API designed for features, not users

**Root cause:** better-auth prioritizes flexibility over simplicity.
```

### Phase 4: Design Senior Solution

```markdown
## Proposed Solution

**Principle:** Simple for 95%, powerful for 5%

**Facade Pattern:**
- We expose 5 options that cover 95% of use cases
- Internally map to better-auth's 50+ options
- Users get simple API, full power when needed

**Why this is senior:**
- Solves root cause (DX) not symptoms (complex API)
- Reduces user cognitive load
- Creates architecture that guides future decisions
```

## Anti-Patterns to Avoid

### ❌ "Here's How It Works"

```markdown
// Bad - describes implementation
The config is processed by deepMerge which combines user
config with defaults. The admin plugin is always included.
```

### ❌ "Here's What We Should Do"

```markdown
// Bad - shallow solution
We should simplify the config API to use fewer options.
```

### ❌ "I Think This Is The Issue"

```markdown
// Bad - guesses without investigation
I think the problem is that better-auth is too complex.
```

## Correct Patterns

### ✅ "Here's the User's Pain"

```markdown
// Good - starts with user
**User writes today:**
```typescript
auth: {
  plugins: [admin()],  // Why do I need to add this?
  emailAndPassword: { enabled: true },  // Isn't it always enabled?
  session: { maxAge: 7 * 24 * 60 * 60 }  // What unit is this?
}
```

**User wishes:**
```typescript
auth: {
  baseURL: "..."
  // Everything else is automatic with sensible defaults
}
```
```

### ✅ "Deep Analysis Reveals..."

```markdown
// Good - investigation-based
**Investigation:** Traced the plugin initialization in better-auth source
(`packages/core/src/plugins/admin/index.ts:42-78`).

**Finding:** The admin plugin auto-configures user roles if not explicitly
defined, but only after checking for existing users.

**Senior insight:** We can simplify the user's config by auto-injecting
admin plugin with smart defaults.
```

## Enforcement

This rule is enforced through:
1. **Report reviews** - Does it start with user DX?
2. **Subagent usage** - Did you decompose complex problems?
3. **Learnings check** - Did you create learnings?
4. **Senior solution test** - Would a senior developer approve this approach?

## Remember

> "A report that doesn't help users is just paperwork."
> "A plan that doesn't revolutionize is just maintenance."
>
> Your job is not to document. Your job is to **understand deeply and design brilliantly**.
