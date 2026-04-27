# Claude Code Skills

**What:** Skills extend Claude Code's capabilities through `SKILL.md` files with YAML frontmatter and markdown instructions. They can be invoked manually via `/skill-name` or automatically when Claude deems them relevant.

**Why it matters:** Skills allow bundling complex procedures, reference material, and supporting files that load only when needed — unlike CLAUDE.md content which loads always. This makes long reference material essentially free until needed.

**Key concepts:**

## Structure

A skill is a directory with `SKILL.md` as entry point:

```
my-skill/
├── SKILL.md           # Required - overview and navigation
├── reference.md      # Optional - detailed docs
├── examples.md       # Optional - usage examples
└── scripts/
    └── helper.py      # Optional - executable scripts
```

## Frontmatter fields

| Field | Purpose |
|-------|---------|
| `name` | Slash command name (e.g., `deploy` → `/deploy`) |
| `description` | When to use the skill (used for auto-triggering) |
| `disable-model-invocation` | If `true`, only user can invoke, not Claude automatically |
| `user-invocable` | If `false`, hidden from `/` menu |
| `allowed-tools` | Tools Claude can use without approval when skill is active |
| `context` | Set to `fork` to run in isolated subagent |
| `agent` | Which subagent type to use with `context: fork` |
| `paths` | Glob patterns for auto-activation based on file paths |
| `arguments` | Named positional arguments for `$name` substitution |

## String substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` | Specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` |
| `$name` | Named argument from `arguments` frontmatter |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Directory containing the skill's SKILL.md |

## Invocation control

By default both user and Claude can invoke. Two fields control this:

- `disable-model-invocation: true` — Only user can invoke (for side effects like deploys)
- `user-invocable: false` — Only Claude can invoke (for background knowledge)

## Shell injection for dynamic context

Use `` !`<command>` `` syntax to run shell commands and inject output into the skill content:

```yaml
---
name: pr-summary
description: Summarize a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
```

Commands execute before the skill content is sent to Claude.

## Where skills live

| Location | Path | Applies to |
|----------|------|------------|
| Enterprise | Managed settings | All users in org |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All projects |
| Project | `.claude/skills/<name>/SKILL.md` | Project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin enabled |

Higher priority wins: enterprise > personal > project. Plugin skills use `plugin-name:skill-name` namespace.

## Automatic discovery

Claude Code discovers skills from nested `.claude/skills/` directories. If working in `packages/frontend/`, it also looks in `packages/frontend/.claude/skills/`. Supports monorepo setups.

## Skill content lifecycle

When invoked, the rendered SKILL.md content enters the conversation as a single message and stays for the session. Claude Code does not re-read on later turns.

Auto-compaction carries invoked skills forward within a 25,000 token budget (5,000 per skill max), re-attaching most recent first.

## Examples

### Reference skill (Claude invokes automatically)

```yaml
---
name: api-conventions
description: API design patterns for this codebase
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
- Include request validation
```

### Task skill (user invokes only)

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---

Deploy $ARGUMENTS to production:
1. Run the test suite
2. Build the application
3. Push to the deployment target
```

### Forked subagent skill

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

## Sources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)