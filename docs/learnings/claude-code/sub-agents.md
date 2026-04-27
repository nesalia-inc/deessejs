# Claude Code Sub-agents

**What:** Sub-agents are specialized AI assistants that handle specific tasks in isolated contexts. They preserve main conversation context by keeping exploration and implementation in their own context and returning only summaries.

**Why it matters:** Sub-agents enable parallel work, enforce tool restrictions, and route tasks to appropriate models. They keep the main conversation clean while handling side tasks that would flood it with verbose output.

## Built-in sub-agents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| Explore | Haiku | Read-only | File discovery, code search, codebase exploration |
| Plan | Inherits | Read-only | Codebase research for planning (used in plan mode) |
| general-purpose | Inherits | All tools | Complex multi-step research and modifications |
| statusline-setup | Sonnet | - | Configures status line |
| Claude Code Guide | Haiku | - | Answers questions about Claude Code features |

## Configuration

### Frontmatter fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate to this sub-agent |
| `tools` | No | Allowlist of tools (inherits all if omitted) |
| `disallowedTools` | No | Denylist of tools to remove |
| `model` | No | `sonnet`, `opus`, `haiku`, full ID, or `inherit` |
| `permissionMode` | No | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before stopping |
| `skills` | No | Skills to preload into context at startup |
| `mcpServers` | No | MCP servers scoped to this sub-agent |
| `memory` | No | `user`, `project`, or `local` for persistent learning |
| `background` | No | `true` to always run in background |
| `isolation` | No | `worktree` for isolated git worktree |
| `color` | No | UI color: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` |

### Example sub-agent definition

```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep, Bash
model: sonnet
memory: project
---

You are a senior code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

## Scopes and priority

| Location | Scope | Priority |
|----------|-------|----------|
| Managed settings | Organization-wide | 1 (highest) |
| `--agents` CLI flag | Current session | 2 |
| `.claude/agents/` | Project | 3 |
| `~/.claude/agents/` | User (all projects) | 4 |
| Plugin `agents/` | Plugin enabled | 5 (lowest) |

Higher priority wins when names conflict.

## Skills vs Sub-agents

| Aspect | Skills | Sub-agents |
|--------|--------|------------|
| Context | Runs in main conversation | Isolated context |
| Use case | Reusable prompts/workflows | Side tasks with verbose output |
| Tool access | Uses main session tools | Custom tool restrictions |
| Invocation | `$/skill-name` or auto | Agent tool or @-mention |

**Preload skills into sub-agents:** Use `skills` field to inject skill content at startup. Full content is injected, not just made available for invocation.

```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

## Persistent memory

Scopes:

| Scope | Location | Use when |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Cross-project knowledge |
| `project` | `.claude/agent-memory/<name>/` | Project-specific, version-controlled |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific, not version-controlled |

Memory includes first 200 lines or 25KB of `MEMORY.md`, whichever is first.

## Hooks

Sub-agents can define `PreToolUse` and `PostToolUse` hooks:

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
```

Lifecycle events in `settings.json`:

| Event | Fires |
|-------|-------|
| `SubagentStart` | When sub-agent begins |
| `SubagentStop` | When sub-agent completes |

## Invocation patterns

1. **Natural language**: "Use the test-runner sub-agent to fix failing tests"
2. **@-mention**: `@code-reviewer look at the auth changes`
3. **Session-wide**: `claude --agent code-reviewer` or set `agent` in `.claude/settings.json`

## Fork mode

Fork is a sub-agent that inherits the entire conversation history instead of starting fresh. Key differences:

| | Fork | Named sub-agent |
|--|------|-----------------|
| Context | Full history | Fresh |
| System prompt | Same as main | From definition |
| Model | Same as main | From definition |
| Permissions | Prompts in terminal | Pre-approved |

Enable with `CLAUDE_CODE_FORK_SUBAGENT=1` (experimental, v2.1.117+).

## Common patterns

- **Isolate high-volume operations**: Run tests, fetch docs, process logs in sub-agent
- **Parallel research**: Spawn multiple sub-agents for independent investigations
- **Chain sub-agents**: Sequence: code-reviewer → optimizer

## Limitations

- Sub-agents cannot spawn other sub-agents
- Fork mode cannot spawn further forks
- Fork mode disabled in headless/Agent SDK mode

## Sources

- [Claude Code Sub-agents Documentation](https://code.claude.com/docs/en/sub-agents)