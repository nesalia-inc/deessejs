# Agent Tree & Task Hierarchy

## Overview

The agent tree represents a hierarchical decomposition of work where a manager agent breaks down projects into tasks and assigns them to specialized worker agents. This mirrors organizational hierarchies (Project Manager → Developers).

**Scope:** Claude Code native capabilities — sub-agents, agent teams, skills, hooks.

---

## Key Concepts

### Hierarchical Task Network (HTN)

Tasks recursively decompose into tree or DAG (Directed Acyclic Graph) patterns:

```
Project Goal
    │
    ▼
┌─────────────────────────────┐
│       PM Agent (Master)     │
│  - Decomposes into subtasks │
│  - Assigns to specialists   │
│  - Monitors progress        │
└─────────────┬───────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│Worker A│ │Worker B│ │Worker C│
│(Design)│ │(Impl)  │ │(Test)  │
└────────┘ └────┬───┘ └────────┘
                │
                ▼
         ┌───────────┐
         │Worker D   │
         │(Review)   │
         └───────────┘
```

**Critical finding:** Single agent matches multi-agent on 64% of tasks at half the cost. Multi-agent adds accuracy but increases cost ~2x.

---

## Roles

### PM Agent (Manager)

**Responsibilities:**

| Responsibility | Description |
|---------------|-------------|
| **Task Decomposition** | Break goals into atomic, executable tasks |
| **Task Assignment** | Match tasks to appropriate specialists |
| **Progress Monitoring** | Track status, catch errors early |
| **Dependency Management** | Enforce ordering (DAG constraints) |
| **Quality Control** | Built-in feedback loops at each step |
| **Resource Management** | Spawn/shutdown agents based on workload |

**Event-driven triggers:**
- `agent_idle` — Agent finished or became available
- `agent_completed` — Final output produced
- `help_request` — Agent needs assistance
- `checkpoint` — Periodic review (e.g., every N minutes)
- `human_input` — User sends mid-execution instructions

### Worker Agent

**Responsibilities:**

| Responsibility | Description |
|---------------|-------------|
| **Execute tasks** | Complete assigned work independently |
| **Report results** | Clear status, output artifacts |
| **Handle errors** | Retry or escalate based on error type |
| **Know scope** | What is and isn't in the task |

**Worker classification by role:**

| Worker Type | Tools | Model | Purpose |
|-------------|-------|-------|---------|
| **Designer** | Read, Glob | Haiku | Research, planning, specs |
| **Implementer** | Read, Write, Edit, Bash | Sonnet | Code, refactoring |
| **Tester** | Read, Glob, Bash | Sonnet | Test execution, coverage |
| **Reviewer** | Read, Glob, Grep | Sonnet | Code review, security |
| **Deployer** | Bash, Read | Haiku | Build, deploy, verify |

---

## Task Definition

### Good Task Characteristics

A task assigned to a worker must have:

1. **Clear inputs** — What files, parameters, context are provided
2. **Measurable outputs** — Code written, tests passed, files created
3. **Explicit scope** — What is and isn't included
4. **Success criteria** — How to know it's done correctly
5. **Dependencies** — What must complete before this can start

### Task Definition Template

```yaml
task:
  name: "implement-auth-module"
  assigned_to: "implement-agent"
  inputs:
    - "docs/plans/auth/SPEC.md"
    - "packages/deesse/src/auth/existing.ts"
  outputs:
    - "packages/deesse/src/auth/login.ts"
    - "packages/deesse/src/auth/session.ts"
    - "packages/deesse/tests/auth.test.ts"
  scope:
    included: ["JWT handling", "session management", "login/logout"]
    excluded: ["OAuth integration", "password reset"]
  success_criteria:
    - "All tests pass: pnpm test --testNamePattern=auth"
    - "TypeScript compiles without errors"
    - "No new ESLint errors"
  dependencies:
    - "design-auth-spec" # Must complete before this starts
```

### Task Size Guidelines

| Size | Description | When to use |
|------|-------------|-------------|
| **Too small** | Function-level work | Creates overhead, use for critical validations |
| **Too large** | Feature-level work | Workers idle, risk of wrong direction |
| **Just right** | Module/package work | Self-contained, reviewable in reasonable time |

**Rule of thumb:** 5-6 tasks per worker keeps everyone productive without excessive context switching.

---

## Orchestration Patterns

### Pattern 1: Orchestrator-Worker (PM-led)

```
User ──▶ PM Agent ──▶ Worker A
                    ──▶ Worker B
                    ──▶ Worker C
All complete ──▶ PM synthesizes
```

**Use case:** Complex tasks requiring diverse expertise, PM has full visibility.

### Pattern 2: Sequential Pipeline

```
Task A ──▶ Task B ──▶ Task C ──▶ Task D
(Design)  (Impl)   (Test)   (Deploy)
```

**Use case:** Strict ordering where each step depends on previous.

### Pattern 3: Fan-out/Fan-in (Parallel + Aggregate)

```
           ┌──▶ Worker A ──┐
PM ───▶ ───┼──▶ Worker B ──┼──▶ PM Aggregates
           └──▶ Worker C ──┘
(parallel exploration, then synthesis)
```

**Use case:** Independent research, parallel feature development.

### Pattern 4: Hierarchical (Sub-PM)

```
PM ──▶ Sub-PM-1 ──▶ Worker A
              ──▶ Worker B
   ──▶ Sub-PM-2 ──▶ Worker C
              ──▶ Worker D
```

**Use case:** Large projects where domain sub-PMs manage teams.

---

## Context Capsule Pattern

When passing context between agents, use structured capsules:

```typescript
interface ContextCapsule {
  originalTask: string;          // What we're trying to achieve
  completedSteps: string[];      // What's already done
  currentOutput: any;           // Current artifact being worked on
  constraints: string[];         // Requirements, style rules, limits
  dependencies: string[];         // Files/tasks this depends on
  metadata: {
    agent: string;               // Which agent should handle next
    timestamp: Date;
    attempt: number;             // Retry count if applicable
  };
}
```

**Claude Code implementation:** Use structured prompts that include all capsule fields explicitly.

---

## Dependency Management (DAG)

Tasks form a DAG (Directed Acyclic Graph), not just a tree:

```
Task A ──┬──▶ Task C
         │
         └──▶ Task D ──▶ Task F
                         ▲
Task B ─────────────────┘
```

**Rules:**
- Task C and D can run in parallel (both depend on A)
- Task F waits for BOTH D and B
- No circular dependencies

**Claude Code implementation:**
- Use task list with dependencies
- Check `taskDependencies` before spawning workers
- Block workers from starting until dependencies complete

---

## Error Handling

### Worker Error Types

| Error Type | Worker Action | Escalation? |
|------------|---------------|-------------|
| **Retryable** | Retry with backoff (network, temporary) | No |
| **Blocker** | Report block, request help | Yes |
| **Fatal** | Stop, report failure with evidence | Yes |

### Escalation Workflow

```
Worker encounters blocker
         │
         ▼
Worker tries 2 retries (exponential backoff)
         │
         ├── Still fails ──▶ PM notified
         │                   │
         │                   ▼
         │               PM decides:
         │               - Retry with more context?
         │               - Spawn helper agent?
         │               - Reassign to different worker?
         │               - Escalate to user?
         │
         └── Succeeds on retry ──▶ Continue
```

### Grader Pattern for Quality

Separate grading from execution:

```yaml
# Grader agent definition
---
name: test-grader
description: Grades test coverage and quality
tools: Read, Glob, Bash
model: sonnet
---

You evaluate tests. For each file:
- Calculate coverage percentage
- Count assertions per test
- Identify missing edge cases

Output JSON with grades and specific suggestions.
```

---

## Metrics

### PM Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Task decomposition accuracy | Tasks produce intended outcomes | > 85% |
| Assignment accuracy | Right worker for right task | > 80% |
| Dependency resolution | DAG correctly enforced | 100% |
| Quality gate pass rate | Work passes review first time | > 75% |

### Worker Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Success rate | Tasks completed successfully | > 90% |
| Avg duration | Time from start to complete | < 5 min |
| Retry rate | Tasks needing retry | < 10% |
| Escalation rate | Tasks requiring PM intervention | < 5% |

---

## Claude Code Implementation

### Task Assignment Workflow

```yaml
# Master agent skill: task-assignment
---
name: task-assigner
description: Assign and coordinate tasks to workers
disable-model-invocation: true
---

When given a feature request:
1. Decompose into tasks (DAG structure)
2. Assign to appropriate workers
3. Monitor progress via agent_idle events
4. Aggregate results when all complete
5. Report synthesis to user
```

### Worker Definition Example

```yaml
# .claude/agents/implementer.md
---
name: implementer
description: Implements features in deesse packages
tools: Read, Write, Edit, Bash
model: sonnet
memory: project
---

You implement features. For each task:
1. Read SPEC.md for requirements
2. Implement in correct package
3. Add/update tests
4. Verify: pnpm test
5. Report: files changed, tests passed, any issues
```

### Event Hooks for Coordination

```json
{
  "hooks": {
    "SubagentStop": [{
      "matcher": "implementer",
      "hooks": [{
        "type": "command",
        "command": "echo 'Implementer done - checking if review needed'"
      }]
    }],
    "SubagentStop": [{
      "matcher": "reviewer",
      "hooks": [{
        "type": "command",
        "command": "echo 'Review done - checking quality gates'"
      }]
    }]
  }
}
```

---

## Anti-Patterns to Avoid

1. **Over-fragmentation** — Tasks too small create coordination overhead
2. **Context pollution** — Passing too much context to workers
3. **Tight coupling** — Workers waiting on each other instead of doing independent work
4. **No quality gates** — Skipping review steps "to save time"
5. **Silent failures** — Workers failing without clear escalation

---

## Sources

- [Hierarchical Task Decomposition - Emergent Mind](https://www.emergentmind.com/topics/hierarchical-task-decomposition)
- [The Rise of AI Agent Hierarchies - IBM Community](https://community.ibm.com/community/user/blogs/sarah-bowden/2026/04/16/the-rise-of-ai-agent-hierarchies)
- [HALO: Hierarchical Autonomous Logic-Oriented Orchestration](https://wiki.charleschen.ai/arxiv/processed/2505-13516v1-halo-hierarchical-autonomous-logic-oriented-orchestration-for-multi)
- [AI-Scrum Framework](https://engineeringexec.tech/posts/ai-scrum-can-proven-agile-principles-work-for-agent-teams)
- [Multi-Agent Orchestration Patterns - Beam AI](https://beam.ai/agentic-insights/multi-agent-orchestration-patterns-production)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents)