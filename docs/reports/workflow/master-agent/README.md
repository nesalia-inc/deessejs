# Master Agent Pattern

## Master Agent Roles

The master agent has three interconnected roles:

| Role | Responsibility | Output |
|------|---------------|--------|
| **Orchestrator** | Delegates tasks to existing agents | Task completion |
| **Factory** | Creates new agents when needed | New agent definitions |
| **Improver** | Analyzes failures and tunes agent configurations | Improved agents |

This shifts the agent's role from "doer" to "orchestrator, factory, and quality controller".

**Target:** Replace direct task execution with delegation-first, self-improving workflows.

**Scope:** This pattern is designed for Claude Code's native capabilities — sub-agents, agent teams, skills, and hooks. No external infrastructure required.

---

## Problem Statement

When a single agent handles all tasks directly:

- Context window fills with exploration noise
- No parallelization of independent work streams
- Monolithic prompt grows unwieldy
- Quality gates are inconsistent
- Reuse of successful patterns is accidental, not systematic

---

## Proven Orchestration Patterns

Based on research, four sub-agent orchestration patterns have been validated:

| Pattern | Description | Best For |
|---------|-------------|----------|
| **Parallel Fan-Out** | Scatter independent work across N peer sub-agents; parent gathers and synthesizes | Independent tasks, shared deadline |
| **Sequential Review Chain** | Producer creates artifact, Reviewer critiques, Parent integrates | Quality gates, asymmetric tools |
| **Adversarial Dual-Analysis** | Two sub-agents with opposing framings analyze input; parent synthesizes | Ambiguous evidence, judgement calls |
| **Hierarchical Planner-Executor** | Planner decomposes into task list, N Executors run in parallel, Synthesizer integrates | Planning-before-execution, heterogeneous work |

**Performance:** 3x speedup with parallel vs serial execution (14.87s vs 43.8s).

Additional patterns from multi-agent systems research:

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| **Orchestrator-Worker** | Central orchestrator plans, spawns workers, synthesizes | Most powerful for complex tasks |
| **Router** | Lightweight classifier directs requests to specialists | Low latency, single specialist processes |
| **Evaluator-Optimizer** | Feedback loop: generate, evaluate, iterate until quality threshold | Continues until standards met |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                   User                       │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              Master Agent                   │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │           THREE ROLES                   ││
│  │  ┌─────────┐ ┌─────────┐ ┌───────────┐ ││
│  │  │Orchestr.│ │ Factory │ │ Improver  │ ││
│  │  └────┬────┘ └────┬────┘ └─────┬─────┘ ││
│  │       │          │             │        ││
│  └───────┼──────────┼─────────────┼────────┘│
│  ┌─────────────────┐  ┌──────────────────┐ │
│  │ Task Decomposer │  │  Agent Registry  │ │
│  │ (Planner role)  │  │ (from .claude/)  │ │
│  └────────┬────────┘  └──────────────────┘ │
│  ┌─────────────────┐  ┌──────────────────┐ │
│  │Coordination Eng.│  │Result Synthesizer│ │
│  │ (Agent tool)    │  │ (Aggregation)   │ │
│  └────────┬────────┘  └──────────────────┘ │
│  ┌─────────────────┐  ┌──────────────────┐ │
│  │ Learning Engine │  │Context Manager   │ │
│  │ (memory/hooks)  │  │ (query pattern)  │ │
│  └─────────────────┘  └──────────────────┘ │
└───────────┼───────────────────────────────┬─┘
            │                               │
            ▼                               ▼
┌───────────────────────┐   ┌───────────────────────┐
│    Explore Agent      │   │    Implement Agent    │
│    - Read-only tools  │   │    - Full read/write  │
│    - Haiku model      │   │    - Sonnet model     │
│    - Codebase search  │   │    - Refactoring      │
└───────────────────────┘   └───────────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐   ┌───────────────────────┐
│    Review Agent       │   │    Document Agent     │
│    - Read + execute   │   │    - Output-focused   │
│    - Quality gates    │   │    - Consistency read │
│    - Security audit   │   │    - Structured text  │
└───────────────────────┘   └───────────────────────┘
```

### Claude Code Native Components

| Component | Claude Code Implementation |
|-----------|---------------------------|
| **Task Decomposer** | Master agent prompt + Planner sub-agent |
| **Agent Registry** | `.claude/agents/` directory + skill definitions |
| **Coordination Engine** | Agent tool spawns + task list for agent teams |
| **Context Manager** | Skills with bounded instructions + query pattern |
| **Result Synthesizer** | Master aggregates sub-agent outputs |
| **Learning Engine** | `.claude/agent-memory/` + hooks for quality gates |

---

## Master Agent Roles

### 1. Orchestrator

Delegates work to existing sub-agents based on task decomposition.

**Actions:**
- Receive user task
- Decompose into atomic sub-tasks
- Select appropriate sub-agents
- Coordinate execution order
- Synthesize results

### 2. Factory

Creates new sub-agents when existing ones are insufficient.

**Triggers for creating a new agent:**

| Trigger | Example |
|---------|--------|
| Repeated task pattern | "Every sprint we need a `changelog-agent`" |
| Missing expertise | "We need a `db-migration-agent`" for complex migrations |
| Performance bottleneck | "The `implement` agent is too slow for large refactors" |
| Quality issue | "Review agent keeps missing X — create specialized `security-audit`" |

**Creation workflow:**
```
1. Identify gap in current agent capabilities
2. Define agent purpose, tools, and model
3. Write SKILL.md with clear description
4. Create .claude/agents/<name>.md definition
5. Register in agent registry
6. Test with representative task
7. Iterate based on results
```

### 3. Improver

Continuously analyzes outcomes and refines agent configurations.

**Improvement triggers:**

| Type | Signal | Action |
|------|--------|--------|
| **Success pattern** | Same approach works 3+ times | Codify as skill instruction |
| **Failure pattern** | Same failure occurs 2+ times | Adjust tools/permissions/prompt |
| **Context bloat** | Agent uses too many tokens | Tighten context boundaries |
| **Tool mismatch** | Agent needs missing tool | Add to allowed-tools |
| **Model mismatch** | Agent too slow/too shallow | Change model tier |

**Improvement workflow:**
```
1. Detect pattern (success or failure)
2. Form hypothesis: "What change would improve this?"
3. Apply narrow change to agent definition
4. Test with similar tasks
5. Keep change if improved, revert if not
```

---

## Agent Lifecycle

```
┌─────────────────────────────────────────────────────┐
│                    Master Agent                     │
│                                                      │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐│
│  │Orchestrator │──▶│   Factory   │──▶│  Improver   ││
│  └─────────────┘   └─────────────┘   └─────────────┘│
│        │                 │                  │       │
│        │                 │                  │       │
│        ▼                 ▼                  ▼       │
│  ┌─────────────────────────────────────────────┐  │
│  │              Sub-Agent Pool                 │  │
│  │                                              │  │
│  │  Explore ── Implement ── Review ── Document  │  │
│  │       │          │          │          │      │  │
│  │       └──────────┴──────────┴──────────┘      │  │
│  │                   │                           │  │
│  │              New Agents                      │  │
│  │         (created by Factory)                  │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Sub-Agent Categories

### Explore Agent

**Purpose:** Research, code analysis, understanding

**Claude Code implementation:**
```yaml
---
name: explore
description: Explore and analyze codebase. Use when understanding structure, finding files, or tracing flows.
tools: Read, Glob, Grep
model: haiku
---
```

**When to use:** Understanding a new codebase, tracing API flows, finding relevant files. Returns summaries, not raw search results.

### Implement Agent

**Purpose:** Code writing, refactoring, feature work

**Claude Code implementation:**
```yaml
---
name: implement
description: Implement features and modify code. Use when building, refactoring, or applying changes.
tools: Read, Write, Edit, Bash
model: sonnet
permissionMode: acceptEdits
---
```

**When to use:** Building features, applying changes, modifying files. Preload relevant skills for stack conventions.

### Review Agent

**Purpose:** Code review, security audit, test validation

**Claude Code implementation:**
```yaml
---
name: review
description: Review code for quality, security, and best practices. Use after implementation before merge.
tools: Read, Glob, Grep, Bash
model: sonnet
---
```

**When to use:** PR reviews, pre-deployment validation, security checks. Can fail a task if quality not met.

### Document Agent

**Purpose:** Documentation, comments, specification writing

**Claude Code implementation:**
```yaml
---
name: document
description: Write and update documentation. Use for README, code comments, and spec documents.
tools: Read, Write
model: haiku
---
```

**When to use:** Updating README, adding code comments, creating spec documents.

### Planner Agent

**Purpose:** Task decomposition and planning

**Claude Code implementation:**
```yaml
---
name: planner
description: Decompose complex tasks into actionable steps. Use when planning large features or refactors.
context: fork
agent: Explore
---
```

**When to use:** Large refactors, multi-package work, migration planning. Produces task lists that other agents execute.

---

## Orchestration Patterns in Claude Code

### Pattern 1: Parallel Fan-Out

```
Master receives task
       │
       ├──▶ Explore Agent (find relevant files)
       ├──▶ Explore Agent (analyze dependencies)
       └──▶ Review Agent (check existing patterns)

All complete → Master synthesizes → Implement
```

**Use case:** Independent research tasks that can run concurrently.

### Pattern 2: Sequential Review Chain

```
Implement Agent → Review Agent → Master integrates
                       │
                       └──▶ If fails → back to Implement
```

**Use case:** Quality gates where output must pass review before proceeding.

### Pattern 3: Hierarchical Planner-Executor

```
Master
  │
  └──▶ Planner Agent (decomposes into task list)
            │
            ├──▶ Implement A ──▶ Review A
            ├──▶ Implement B ──▶ Review B
            └──▶ Implement C ──▶ Review C

All complete → Master synthesizes
```

**Use case:** Large features spanning multiple packages or concerns.

### Pattern 4: Adversarial Dual-Analysis

```
Master
  │
  ├──▶ Explore Agent (build case for X)
  └──▶ Explore Agent (build case against X)

Both report → Master synthesizes decision
```

**Use case:** Architectural decisions, "should we migrate to X?" questions.

---

## Learning Engine

### Self-Improving Loop

Based on validated multi-agent improvement patterns:

```
1. Detect one bottleneck
2. Form one falsifiable hypothesis
3. Change one narrow surface
4. Run one focused verification
5. Keep, revise, or roll back
```

**Rollback strategies:**
- Syntax-protected edits
- Dry runs and narrow smoke tests
- Feature flags and canary rollouts
- Explicit revert paths

> "Rollback is a feature, not a failure."

### What to Track

```typescript
interface AgentMetrics {
  agentType: string;
  taskTypes: string[];           // task categories handled well
  successRate: number;           // 0-1, validated against outcomes
  avgContextSize: number;        // tokens consumed
  commonFailures: FailurePattern[];
  improvementsApplied: number;   // how many times adjusted
  lastUsed: Date;
  reliability: number;           // consistency score
}

interface FailurePattern {
  taskType: string;
  failureMode: string;
  frequency: number;
  adjustmentMade: string;
  worked: boolean;
}
```

### Claude Code Persistence

| Data | Location | Scope |
|------|----------|-------|
| Agent definitions | `.claude/agents/` | Project / User |
| Skill instructions | `.claude/skills/` | Project / User |
| Agent memory | `.claude/agent-memory/<name>/` | User / Project / Local |
| Metrics | `.claude/settings.json` (or local) | Project |
| Hook logs | Debug log + transcript | Session |

### Feedback Loop Implementation

```
1. Master delegates task to sub-agent via Agent tool
2. Sub-agent completes work
3. Master evaluates (review agent or explicit validation)
4. On success → store pattern in agent memory:
   - Prompt variations that worked
   - Tool configurations used
   - Context boundaries that were sufficient
5. On failure → store failure pattern:
   - What failed
   - What was attempted
   - What adjustment was made
   - Did adjustment work?
6. Future similar task → master consults agent memory, reuses successful pattern
```

---

## Agent Evolution

Agents are not static — they evolve based on usage patterns.

### Evolution Triggers

| Event | Agent Action | Example |
|-------|-------------|---------|
| New task type | Factory creates specialized agent | `db-migration` agent for complex schema changes |
| Repeated success | Skill instructions enriched | `implement` agent learns "always add tests" |
| Repeated failure | Configuration adjusted | `explore` agent gets `Grep` added to tools |
| Context overflow | Boundaries tightened | `implement` agent limited to specific directories |
| Slow response | Model tier adjusted | `document` agent downgraded from Sonnet to Haiku |

### Versioning

When an agent changes significantly, the master should track versions:

```yaml
# .claude/agents/implement.md
---
name: implement
description: Implement features and modify code. Use when building, refactoring, or applying changes.
version: "2.1"
# v2.1: Added React patterns from PR #142
# v2.0: Initial version with basic file editing
---
```

### Agent Health Metrics

| Metric | Target | Action if low |
|--------|--------|---------------|
| Success rate | > 85% | Review and adjust configuration |
| Avg task duration | < 2 min | Check for loops or excessive exploration |
| Context efficiency | < 50% of context used | Can handle larger tasks |
| Retry rate | < 10% | Investigate repeated failures |

---

## Task Decomposition

### Principles

1. **Atomic** — Each task self-contained, completable by one agent
2. **Independent** — Tasks without dependencies can run in parallel
3. **Bounded** — Clear input/output contract for each task
4. **Meaningful** — Each task produces a tangible, reviewable result

### Decomposition Strategies

| Strategy | When to use | Example |
|----------|-------------|---------|
| **Layer-based** | Work spans frontend/backend/tests | Explore → Implement → Review |
| **Feature-based** | Multiple independent features | Each feature → dedicated implement + review |
| **Scope-based** | Different expertise needed | Architecture + Implementation + Security |
| **Validation-based** | Quality gates required | Implement → Test → Security → Deploy |

### Claude Code Implementation

Task decomposition uses the Planner sub-agent with `context: fork`:

```yaml
---
name: planner
description: Decompose complex tasks into actionable steps
context: fork
agent: Explore
---

Decompose the following task into atomic, parallelizable tasks:

$ARGUMENTS

For each task specify:
- What needs to be done
- What files are affected
- What dependencies exist
- What "done" looks like
```

---

## Context Propagation

### Decision Framework

```
Context to pass:
├── Task description (what to do, not how)
├── Relevant files (bounded, not entire codebase)
├── Constraints (performance, style, restrictions)
├── Success criteria (what "done" looks like)
└── Output format (how to report results)

Context NOT passed:
├── Exploration noise (detailed search logs)
├── Unrelated code regions
├── Previous failed attempts
└── Raw tool outputs (only summaries)
```

### Query Pattern (Claude Code native)

```text
1. Master asks Explore: "Find files related to auth"
2. Explore returns: ["src/auth/login.ts", "src/auth/session.ts"]
3. Master passes only these paths to Implement
4. Implement does not explore beyond these files unless asked
```

### Context Budgeting by Model

| Model | Appropriate context size |
|-------|-------------------------|
| Haiku | Task + constraints only, no file contents |
| Sonnet | Task + relevant files (bounded) |
| Opus | Task + broader context if needed |

---

## Evaluation Criteria

### Task Completion

| Level | Criteria |
|-------|----------|
| **Success** | Output matches success criteria, passes review |
| **Partial** | Output mostly correct but needs minor revision |
| **Failed** | Output incorrect, blocked, or rejected by review |

### Master Agent Quality

| Metric | What it measures | Role |
|--------|-------------------|------|
| **Delegation accuracy** | Did we pick the right sub-agent for the task? | Orchestrator |
| **Decomposition quality** | Were tasks well-sized and properly scoped? | Orchestrator |
| **Synthesis quality** | Did combined output reflect all sub-agent work? | Orchestrator |
| **Creation relevance** | Did new agents solve actual gaps? | Factory |
| **Improvement rate** | Did agent configurations improve over time? | Improver |
| **Learning rate** | How quickly do we improve on repeated task types? | All |

### Factory Metrics

| Metric | Description |
|--------|-------------|
| Agents created | Total new agents created |
| Agents utilized | How often new agents are actually used |
| Creation success rate | % of new agents that solve the intended gap |
| Time to productivity | How quickly new agent becomes reliable |

### Improver Metrics

| Metric | Description |
|--------|-------------|
| Patterns codified | Success patterns turned into skill instructions |
| Failures resolved | Failure patterns that were fixed |
| Configuration changes | Tool/model/context adjustments made |
| Improvement retention | % of changes that stuck (vs reverted) |

### Quality Gates via Hooks

```json
{
  "hooks": {
    "SubagentStop": [{
      "matcher": "review",
      "hooks": [{
        "type": "command",
        "command": "echo 'Review agent completed - check output quality'"
      }]
    }]
  }
}
```

---

## Model Selection Strategy

Based on multi-agent research: **specialization wins**.

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| Routing (which agent?) | Haiku | Fast, low latency |
| Exploration | Haiku | Read-only, fast |
| Implementation | Sonnet | Balance capability/speed |
| Review | Sonnet | Critical thinking |
| Planning | Opus | Complex decomposition |
| Security audit | Opus | Deep analysis |

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Define core sub-agents** — Create Explore, Implement, Review as `.claude/agents/`
2. **Create orchestration skill** — Master agent coordination prompt
3. **Test sequential pipeline** — One agent feeds the next

```yaml
# Example: Explore → Implement → Review chain
---
name: orchestrate
description: Coordinate sub-agents for task execution
disable-model-invocation: true
---

When given a task:
1. Use Explore to find relevant files
2. Use Implement to make changes
3. Use Review to validate output
4. Synthesize results for user
```

### Phase 2: Parallel Execution (Week 3-4)

1. **Implement Parallel Fan-Out** — Multiple explore agents for independent research
2. **Add task tracking** — Manual task list or agent team task list
3. **Establish metrics** — Track success/failure per agent type

### Phase 3: Learning (Week 5-8)

1. **Enable agent memory** — Add `memory: project` to sub-agents
2. **Build feedback loop** — Review outcomes → update agent configs
3. **Iterate on patterns** — Adjust based on real usage

---

## Open Questions

### Orchestrator Questions
1. How to automatically determine optimal task granularity?
2. When to decompose further vs delegate as-is?
3. How to handle cross-cutting concerns (logging, error handling)?
4. How to handle a sub-agent that takes too long or loops?

### Factory Questions
1. When does the cost of creating a new agent outweigh the benefit?
2. How to name agents to avoid confusion with existing ones?
3. How to decide between creating a new agent vs extending an existing one?
4. How to validate that a new agent actually solves the intended gap?

### Improver Questions
1. How to detect patterns without overwhelming the master with metrics?
2. When to merge similar agents vs keep them separate?
3. How to rollback agent changes safely?
4. How to measure "improvement" without subjective evaluation?
5. Can we measure quality without human feedback? Who validates that sub-agent output is "good enough"?

---

## Related Patterns

- **Four Sub-Agent Orchestration Patterns** — Ready Solutions analysis
- **Multi-Agent System Design Patterns** — Bento Terminal comprehensive guide
- **Orchestrator-Workers** — Anthropic Cookbook pattern
- **AgentOrchestra** — Hierarchical multi-agent framework (arXiv)

---

## Sources

- [OpenAI Workspace Agents](https://openai.com/index/introducing-workspace-agents-in-chatgpt/)
- [Four Sub-Agent Orchestration Patterns](https://readysolutions.ai/blog/2026-04-18-sub-agent-orchestration-patterns-claude/)
- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks-guide)
- [Multi-Agent System Design Patterns](https://benterminal.com/en/posts/2025/agent-design-patterns/)
- [Multi-Agent Orchestration: 4 Patterns](https://www.heyuan110.com/posts/ai/2026-02-26-multi-agent-orchestration/)
- [AgentOrchestra on arXiv](https://arxiv.org/abs/2506.12508v3)
- [Self-Improving AI Agents](https://dev.to/chunxiaoxx/how-self-improving-ai-agents-actually-work-tools-tasks-and-rollbacks-kc8)
- [Orchestrator-Workers Pattern](https://platform.claude.com/cookbook/patterns-agents-orchestrator-workers)