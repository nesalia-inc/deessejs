# Claude Code Memory

**What:** Two complementary systems carry knowledge across sessions: CLAUDE.md files (human-written instructions) and auto memory (Claude-written learnings).

**Why it matters:** Sessions start fresh — memory persists across conversations. This enables agents to accumulate knowledge without re-explaining context every time.

---

## CLAUDE.md Files

Human-written instructions that persist across sessions.

### Locations and Scope

| Scope | Location | Purpose |
|-------|----------|---------|
| **Managed policy** | `C:\Program Files\ClaudeCode\CLAUDE.md` | Organization-wide (IT managed) |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team-shared instructions |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences, all projects |
| **Local** | `./CLAUDE.local.md` | Personal project-specific (gitignored) |

### Key Principles

- **Context, not enforced config** — Claude reads CLAUDE.md as guidance, not hard rules
- **200 lines target** — Longer files reduce adherence; use path-scoped rules instead
- **Specific over vague** — "Use 2-space indentation" works better than "format nicely"
- **No contradictions** — Conflicting rules lead to arbitrary picks

### Import Syntax

```text
See @README for overview and @package.json for commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
```

Imports are resolved relative to the file containing them.

### Load Order

Claude walks up the directory tree from CWD, loading `CLAUDE.md` and `CLAUDE.local.md` at each level. All files concatenate rather than override. Within each directory, `CLAUDE.local.md` appends after `CLAUDE.md`.

---

## Auto Memory

Claude writes its own notes based on corrections and preferences.

### Storage Location

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # Index (first 200 lines loaded at session start)
├── debugging.md       # Topic files (loaded on demand)
├── patterns.md
└── ...
```

### How It Works

- **MEMORY.md** first 200 lines (or 25KB) loaded at every session start
- **Topic files** loaded on demand when Claude needs them
- **Machine-local** — not shared across machines; all worktrees in same git repo share one memory
- **Plain markdown** — can be edited or deleted at any time

### Enable/Disable

```json
// In settings.json
{ "autoMemoryEnabled": false }
```

Or via `/memory` command in session.

---

## Path-Scoped Rules (.claude/rules/)

Organize instructions into modular files that load only when matching files are opened.

### Directory Structure

```
.claude/
├── CLAUDE.md           # Main project instructions
└── rules/
    ├── code-style.md   # Unconditional (loaded at launch)
    ├── testing.md      # Unconditional
    └── backend/
        └── api-design.md  # Loaded when API files accessed
```

### Path-Scoped Rule Example

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All endpoints must include input validation
- Use standard error response format
- Include OpenAPI documentation comments
```

### Glob Patterns

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files |
| `src/**/*` | All files under `src/` |
| `*.md` | Markdown in project root |
| `src/components/*.tsx` | React components in specific dir |

Multiple patterns allowed: `"src/**/*.{ts,tsx}"`

### Sharing via Symlinks

```bash
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

---

## Subagent Memory

Subagents can maintain their own auto memory via `memory` frontmatter:

```yaml
---
name: backend-dev
memory: project
---

When `memory: project` is set, subagent writes to `.claude/agent-memory/backend-dev/` and reads from it across sessions.

### Memory Scopes

| Scope | Location | Version Controlled |
|-------|----------|-------------------|
| **user** | `~/.claude/agent-memory/<name>/` | No |
| **project** | `.claude/agent-memory/<name>/` | Yes |
| **local** | `.claude/agent-memory-local/<name>/` | No |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Claude doesn't follow CLAUDE.md | Run `/memory` to verify files loaded; make instructions more specific |
| Instructions lost after `/compact` | Project-root CLAUDE.md survives; nested files reload when matching files are read |
| CLAUDE.md too large | Use path-scoped rules; split with `@imports` |
| Contradicting rules | Review all CLAUDE.md files and `.claude/rules/` periodically |

---

## Related

- [Skills](/en/skills) — Load on demand, not always in context
- [Sub-agents](/en/sub-agents) — Can have their own memory
- [Hooks](/en/hooks) — `InstructionsLoaded` event for debugging

---

## Sources

- [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory)