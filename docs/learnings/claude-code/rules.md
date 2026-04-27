# Claude Code Rules

**What:** Rules are modular instruction files in `.claude/rules/` that guide Claude's behavior. They can be unconditional (loaded at launch) or path-scoped (loaded only when working with matching files).

**Why it matters:** Rules let you organize instructions by topic and scope them to specific files, keeping context clean and adherence high.

---

## Overview

Rules are markdown files in `.claude/rules/` directory. Each file covers one topic (testing, code-style, security, etc.). They load into context at session start, consuming tokens but ensuring Claude follows project conventions.

**vs CLAUDE.md:** Rules are modular; CLAUDE.md is monolithic. Use rules for topic-specific instructions; use CLAUDE.md for project-wide context.

---

## Structure

### Basic Rule File

```markdown
# Code Style Guidelines

- Use 2-space indentation
- Maximum line length: 100 characters
- Trailing commas in multiline
```

### Path-Scoped Rule

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- Validate all inputs with zod schemas
- Return consistent error format: `{ error: string, code: string }`
- Document endpoints with JSDoc comments
```

### Paths Format

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files anywhere |
| `src/**/*` | All files under `src/` |
| `*.md` | Markdown in project root |
| `src/components/*.tsx` | React components in specific dir |
| `"src/**/*.{ts,tsx}"` | Multiple extensions |

---

## Location & Priority

| Location | Scope | Load Order |
|----------|-------|-----------|
| `~/.claude/rules/` | User (all projects) | First |
| `.claude/rules/` | Project | Last (wins if conflicts) |

Project rules have higher priority than user rules.

---

## Best Practices

### Size & Organization

- **One topic per file** — `testing.md`, `api-design.md`, `security.md`
- **Descriptive filenames** — Easy to find, no ambiguity
- **200 lines per file target** — Smaller = better adherence

### Writing Effective Rules

```markdown
<!-- Bad: vague -->
Code should be well-organized.

<!-- Good: specific -->
API handlers live in `src/api/handlers/`. Each handler is one file.
```

### Module Organization

```
.claude/
├── CLAUDE.md           # Project overview, main instructions
└── rules/
    ├── backend/
    │   ├── api-design.md
    │   └── database.md
    ├── frontend/
    │   ├── components.md
    │   └── styling.md
    ├── testing.md
    └── security.md
```

---

## Sharing Rules Across Projects

### Symlinks

```bash
# Link shared directory
ln -s ~/shared-claude-rules .claude/rules/shared

# Link individual file
ln -s ~/company-standards/security.md .claude/rules/security.md
```

Circular symlinks are detected and handled gracefully.

---

## Integration with Skills

| Aspect | Rules | Skills |
|--------|-------|--------|
| Load | Every session | On demand (invocation or path match) |
| Scope | File patterns | Trigger conditions |
| Use for | Coding standards, conventions | Complex workflows, reusable prompts |

Rules and skills complement each other. Use rules for persistent standards; use skills for repeatable workflows.

---

## Debugging Rules

Use `InstructionsLoaded` hook to log which rules load and when:

```json
{
  "hooks": {
    "InstructionsLoaded": [{
      "hooks": [{
        "type": "command",
        "command": "echo 'Rules loaded: $CLAUDE_RULES_FILES'"
      }]
    }]
  }
}
```

Run `/memory` to see all loaded instruction files including rules.

---

## Related

- [Memory](/en/memory) — How CLAUDE.md and auto memory work
- [Skills](/en/skills) — On-demand instruction loading
- [Sub-agents](/en/sub-agents) — Can use rules too

---

## Sources

- [Claude Code Memory Documentation - Rules Section](https://code.claude.com/docs/en/memory)