# Claude Code Hooks

**What:** Hooks are shell commands that execute automatically at specific points in Claude Code's lifecycle (before/after tool calls, on session events, etc.) to enforce rules, automate tasks, or integrate with external tools.

**Why it matters:** Hooks provide deterministic control over behavior rather than relying on the LLM to choose to run certain actions. They enable automation like auto-formatting, blocking dangerous commands, sending notifications, and enforcing project policies.

## Hook lifecycle events

| Event | When |
|-------|------|
| `SessionStart` | Session begins or resumes |
| `UserPromptSubmit` | Before prompt is processed |
| `UserPromptExpansion` | Before command expansion |
| `PreToolUse` | Before tool executes (can block) |
| `PermissionRequest` | When permission dialog appears |
| `PermissionDenied` | When auto-mode classifier denies |
| `PostToolUse` | After tool succeeds |
| `PostToolUseFailure` | After tool fails |
| `PostToolBatch` | After batch of parallel tools resolves |
| `Notification` | When Claude sends a notification |
| `SubagentStart` | When sub-agent spawns |
| `SubagentStop` | When sub-agent finishes |
| `TaskCreated` | When task is created |
| `TaskCompleted` | When task is marked complete |
| `Stop` | When Claude finishes responding |
| `StopFailure` | When turn ends due to API error |
| `TeammateIdle` | When agent team teammate goes idle |
| `InstructionsLoaded` | When CLAUDE.md or rules loaded |
| `ConfigChange` | When config file changes |
| `CwdChanged` | When working directory changes |
| `FileChanged` | When watched file changes |
| `WorktreeCreate` | When worktree created |
| `WorktreeRemove` | When worktree removed |
| `PreCompact` | Before context compaction |
| `PostCompact` | After compaction completes |
| `Elicitation` | When MCP server requests input |
| `ElicitationResult` | After user responds to elicitation |
| `SessionEnd` | When session terminates |

## Hook types

| Type | Description |
|------|-------------|
| `command` | Runs shell command |
| `http` | POSTs JSON to URL |
| `mcp_tool` | Calls MCP server tool |
| `prompt` | Single-turn LLM evaluation |
| `agent` | Multi-turn verification (experimental) |

## Exit codes

| Code | Behavior |
|------|----------|
| `0` | Allow/proceed. Write to stdout for context injection |
| `2` | Block the action. Write reason to stderr |
| Other | Allow, show `<hook name> hook error` in transcript |

## Hook input/output

**Input:** Claude Code passes JSON to stdin with session_id, cwd, hook_event_name, and event-specific data (e.g., tool_name, tool_input for PreToolUse).

**Output:** Write to stdout for JSON control, stderr for error messages. Exit code determines outcome.

## Structured JSON output (more control than exit codes)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Use rg instead of grep"
  }
}
```

Permission decision values: `allow`, `deny`, `ask`, `defer` (non-interactive only)

## Matchers

Filter which events trigger a hook:

| Event | Matcher filters |
|-------|-----------------|
| PreToolUse, PostToolUse, etc. | tool name (`Edit\|Write`, `Bash`, `mcp__.*`) |
| SessionStart | how session started (`startup`, `resume`, `compact`) |
| ConfigChange | config source (`user_settings`, `project_settings`) |
| FileChanged | literal filenames (`.envrc\|.env`) |

## The `if` field

For filtering by tool name AND arguments (requires v2.1.85+):

```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "command",
    "if": "Bash(git *)",
    "command": "./check-git-policy.sh"
  }]
}
```

Uses permission rule syntax: `Bash(git *)`, `Edit(*.ts)`, etc.

## Hook locations and scope

| Location | Scope |
|----------|-------|
| `~/.claude/settings.json` | All projects (user) |
| `.claude/settings.json` | Project (shareable) |
| `.claude/settings.local.json` | Project (gitignored) |
| Managed policy | Organization-wide |
| Plugin `hooks/hooks.json` | When plugin enabled |
| Skill/agent frontmatter | While skill/agent active |

## Prompt-based hooks

For judgment-based decisions:

```json
{
  "type": "prompt",
  "prompt": "Check if all tasks are complete. If not, respond {\"ok\": false, \"reason\": \"...\"}",
  "model": "haiku"
}
```

Response: `{"ok": true}` to allow, `{"ok": false, "reason": "..."}` to block.

## Agent-based hooks

For verification requiring file inspection or commands (experimental):

```json
{
  "type": "agent",
  "prompt": "Verify tests pass. Run test suite. $ARGUMENTS",
  "timeout": 120
}
```

Same `{"ok": true/false}` response format.

## HTTP hooks

POST event data to endpoint:

```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/tool-use",
  "headers": { "Authorization": "Bearer $MY_TOKEN" },
  "allowedEnvVars": ["MY_TOKEN"]
}
```

## Common patterns

### Auto-format after edits
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{ "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write" }]
    }]
  }
}
```

### Block dangerous commands
```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
if [[ "$FILE_PATH" == *".env"* ]]; then
  echo "Blocked: protected file" >&2
  exit 2
fi
exit 0
```

### Desktop notification when needs input
```json
{
  "hooks": {
    "Notification": [{
      "hooks": [{ "type": "command", "command": "osascript -e 'display notification \"Claude needs attention\"'" }]
    }]
  }
}
```

### Auto-approve specific prompts
```json
{
  "hooks": {
    "PermissionRequest": [{
      "matcher": "ExitPlanMode",
      "hooks": [{
        "type": "command",
        "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PermissionRequest\",\"decision\":{\"behavior\":\"allow\"}}}'"
      }]
    }]
  }
}
```

## Limitations

- Cannot trigger `/` commands or tool calls directly
- Multiple PreToolUse hooks modifying same tool input: last to finish wins
- `PostToolUse` cannot undo actions
- `Stop` hook: must check `stop_hook_active` to avoid infinite loops
- Shell profile with unconditional echo breaks JSON parsing

## Debugging

- `/hooks` — browse all configured hooks
- `Ctrl+O` — toggle transcript view with hook summaries
- `claude --debug-file /tmp/claude.log` — write debug log
- `/debug` mid-session — enable logging and show log path

## Sources

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [Hooks Reference](https://code.claude.com/docs/en/hooks)