# Claude Code Agent Teams

**What:** Agent teams coordinate multiple Claude Code instances working together. One "team lead" session coordinates work, assigns tasks, and synthesizes results. Teammates work independently in their own context windows and communicate directly with each other.

**Why it matters:** Unlike sub-agents which only report back to the main agent, teammates can message each other, challenge findings, and self-coordinate through a shared task list. This enables collaborative problem-solving in parallel.

**Status:** Experimental. Enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

## Agent teams vs Sub-agents

| Aspect | Sub-agents | Agent teams |
|--------|-------------|-------------|
| Context | Own context window | Own context window |
| Communication | Report to main agent only | Teammates message each other directly |
| Coordination | Main agent manages all | Shared task list with self-coordination |
| Best for | Focused tasks, result-only matters | Complex work requiring discussion and collaboration |
| Token cost | Lower | Higher (each teammate is a separate Claude instance) |

## Architecture

| Component | Role |
|-----------|------|
| **Team lead** | Main session that creates team, spawns teammates, coordinates work |
| **Teammates** | Separate Claude Code instances working on assigned tasks |
| **Task list** | Shared list of work items teammates claim and complete |
| **Mailbox** | Messaging system between agents |

Storage locations:
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

## Display modes

| Mode | Description |
|------|-------------|
| `in-process` | All teammates run in main terminal. Use Shift+Down to cycle through |
| `split-panes` | Each teammate gets own pane. Requires tmux or iTerm2 |
| `auto` | Default — split panes if already in tmux session, otherwise in-process |

Override in `~/.claude.json`:
```json
{ "teammateMode": "in-process" }
```

## Spawning teammates

Use subagent definitions for teammates:
```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

The teammate honors the definition's `tools` and `model` allowlist. The definition's body is appended to the teammate's system prompt.

Note: `skills` and `mcpServers` from subagent definitions are NOT applied when running as teammate — they load from project/user settings instead.

## Task management

Tasks have three states: `pending`, `in progress`, `completed`. Tasks can have dependencies — a blocked task cannot be claimed until dependencies complete.

- **Lead assigns**: tell the lead which task to give to which teammate
- **Self-claim**: after finishing, teammate picks up next unassigned, unblocked task
- File locking prevents race conditions when multiple teammates claim simultaneously

## Communication

- **Automatic message delivery**: teammates send messages → delivered automatically
- **Idle notifications**: when teammate finishes, they notify the lead automatically
- **Direct messaging**: any teammate can message any other by name
- Lead assigns names — specify in spawn instruction for predictable references

## Hooks for quality gates

| Event | When | Use case |
|-------|------|----------|
| `TeammateIdle` | Teammate about to go idle | Exit 2 to send feedback, keep working |
| `TaskCreated` | Task being created | Exit 2 to prevent creation |
| `TaskCompleted` | Task being marked complete | Exit 2 to prevent completion |

## Best practices

**Team size:**
- Start with 3-5 teammates
- 5-6 tasks per teammate keeps everyone productive
- Token costs scale linearly — more teammates = more tokens

**Task sizing:**
- Too small → coordination overhead exceeds benefit
- Too large → teammates work too long without check-ins
- Just right → self-contained units (function, test file, review)

**Context:** Teammates load CLAUDE.md, MCP servers, skills, but NOT the lead's conversation history. Include task-specific context in the spawn prompt.

**File conflicts:** Break work so each teammate owns different files.

**Monitoring:** Check in on progress, redirect bad approaches, synthesize findings. Don't let team run unattended.

## Plan approval for teammates

For complex tasks, require teammates to plan before implementing:

```text
Spawn an architect teammate to refactor the authentication module. Require plan approval before they make any changes.
```

Flow:
1. Teammate works in read-only plan mode
2. Sends plan approval request to lead
3. Lead approves or rejects with feedback
4. If rejected, teammate revises and resubmits
5. Once approved, teammate begins implementation

Give lead criteria: "only approve plans that include test coverage"

## Limitations

- No session resumption with in-process teammates (`/resume`/`/rewind` don't restore them)
- Task status can lag — tasks may appear stuck when work is actually done
- Shutdown can be slow — teammates finish current request before exiting
- One team per session — clean up before starting new one
- No nested teams — only lead can spawn teammates
- Lead is fixed — cannot transfer leadership
- Split panes require tmux or iTerm2 — not supported in VS Code terminal, Windows Terminal, or Ghostty

## Cleanup

```text
Ask the researcher teammate to shut down
Clean up the team
```

Always use the lead to clean up. Teammates shouldn't run cleanup — team context may not resolve correctly.

## Sources

- [Claude Code Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams)