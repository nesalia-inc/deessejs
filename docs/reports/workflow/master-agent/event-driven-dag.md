# Event-Driven Monitoring & Task DAG

## Overview

Implementation patterns for event-driven coordination and DAG-based task dependency management in multi-agent systems using Claude Code native capabilities.

**Scope:** Claude Code hooks, sub-agents, agent teams, and file-based state tracking.

---

## Core Concepts

### DAG vs Linear Chains

| Pattern | Structure | When to use |
|---------|-----------|-------------|
| **Linear Chain** | A → B → C | Sequential steps only |
| **Fan-Out** | A → B, A → C, A → D | Parallel independent research |
| **Fan-In** | D ← A, D ← B, D ← C | Aggregation after parallel work |
| **Diamond** | A → B → D, A → C → D | Merge after branch |
| **Complex DAG** | Mixed dependencies | Real-world projects |

**Key insight:** DAG patterns cover 90% of real workflows. Linear chains break at scale.

---

## Event Types

### Claude Code Native Events

| Event | When fires | Use for |
|-------|------------|---------|
| `SubagentStart` | Sub-agent spawns | Log start, update task status |
| `SubagentStop` | Sub-agent completes | Check output, trigger next |
| `TaskCreated` | Task via TaskCreate | Dependency registration |
| `TaskCompleted` | Task marked complete | Unblock dependent tasks |
| `ConfigChange` | Config file modified | Sync state changes |
| `SessionStart` | Session begins/resumes | Initialize workflow |
| `SessionEnd` | Session terminates | Cleanup, finalization |

### Custom Events (via file-based messaging)

```typescript
// Events emitted via file writes + hooks
interface AgentEvent {
  type: "task_completed" | "task_failed" | "task_ready" | "dependency_met";
  taskId: string;
  agentId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}
```

---

## Task State Schema

### File-Based Task Registry

```yaml
# .claude/master-agent/tasks/
# Each task is a YAML file: {taskId}.yaml

task:
  id: "implement-auth-001"
  name: "Implement auth module"
  status: "pending"  # pending|blocked|ready|running|completed|failed

  assignedAgent: "implementer"

  inputs:
    - "docs/plans/auth/SPEC.md"

  outputs:
    created: []
    modified: []
    tests: []

  dependencies:
    blockedBy: ["design-auth-spec"]
    blocks: ["review-auth-001"]

  attempts: 0
  maxRetries: 2

  error: null

  checkpoints: []
```

### Task Status Transitions

```
PENDING ──▶ (deps complete) ──▶ READY
READY ──▶ (agent assigned) ──▶ RUNNING
RUNNING ──▶ (success) ──▶ COMPLETED
RUNNING ──▶ (failure, retries left) ──▶ RETRYING
RUNNING ──▶ (failure, no retries) ──▶ FAILED
BLOCKED ──▶ (dep completes) ──▶ READY
```

---

## DAG Implementation

### Ready Task Detection Algorithm

```typescript
// Pseudocode for Claude Code implementation
// Run via Bash tool after each SubagentStop event

function getReadyTasks(tasksDir: string): string[] {
  const tasks = readTasksManifest(tasksDir);
  return tasks
    .filter(task => task.status === "pending")
    .filter(task =>
      task.dependencies.blockedBy.every(depId =>
        getTaskStatus(depId) === "completed"
      )
    )
    .map(task => task.id);
}
```

### Claude Code Hook Implementation

```json
// .claude/settings.json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "implementer",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/master-agent/scripts/check-dependencies.js"
          }
        ]
      }
    ]
  }
}
```

```javascript
// .claude/master-agent/scripts/check-dependencies.js
const fs = require('fs');
const path = require('path');

const TASKS_DIR = '.claude/master-agent/tasks';

// Read task manifest
const manifest = JSON.parse(
  fs.readFileSync(path.join(TASKS_DIR, 'manifest.json'), 'utf-8')
);

// Find completed task
const completedTaskId = JSON.parse(fs.readFileSync('/dev/stdin', 'utf-8'))
  .taskId;

console.log(`Task ${completedTaskId} completed`);

// Unblock dependent tasks
const unblocked = manifest.tasks
  .filter(t => t.status === 'blocked')
  .filter(t => t.dependencies.blockedBy.includes(completedTaskId));

for (const task of unblocked) {
  const remainingDeps = task.dependencies.blockedBy.filter(
    id => id !== completedTaskId && getTaskStatus(id) !== 'completed'
  );

  if (remainingDeps.length === 0) {
    task.status = 'ready';
    console.log(`Task ${task.id} is now READY`);
    // Emit event or update task file
  } else {
    task.status = 'blocked';
  }
}

fs.writeFileSync(
  path.join(TASKS_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);
```

---

## Blocking/Waiting Implementation

### Dependency Check Before Spawn

```typescript
async function spawnWorker(taskId: string, agentType: string): Promise<void> {
  const task = getTask(taskId);

  // Check if all dependencies are complete
  const depsComplete = task.dependencies.blockedBy.every(depId => {
    const dep = getTask(depId);
    return dep.status === 'completed';
  });

  if (!depsComplete) {
    task.status = 'blocked';
    saveTask(task);
    console.log(`Task ${taskId} blocked by: ${task.dependencies.blockedBy.join(', ')}`);
    return;
  }

  // All deps complete - spawn worker
  task.status = 'running';
  task.startedAt = new Date().toISOString();
  saveTask(task);

  // Spawn sub-agent via Agent tool
  // ...
}
```

### WaitGuard for Deadlock Prevention

```javascript
// Timeout-based deadlock prevention
const WAIT_TIMEOUT_MS = 300000; // 5 minutes

function checkDeadlock(taskId: string): boolean {
  const task = getTask(taskId);
  if (task.status !== 'blocked') return false;

  const elapsed = Date.now() - new Date(task.blockedSince).getTime();
  return elapsed > WAIT_TIMEOUT_MS;
}

// Run periodically via hook or background script
```

---

## Event-Driven Orchestration Pattern

### File-Based Message Bus

```
.claude/master-agent/
├── tasks/
│   ├── manifest.json        # All tasks + status
│   ├── implement-auth-001.yaml
│   ├── review-auth-001.yaml
│   └── deploy-auth-001.yaml
├── events/
│   ├── pending/            # Events to process
│   └── processed/          # Completed events
└── scripts/
    ├── check-dependencies.js
    ├── emit-event.js
    └── dag-scheduler.js
```

### Event Workflow

```text
1. Master creates tasks → manifest.json + task YAML files
2. Master spawns workers for READY tasks
3. Worker completes → SubagentStop hook fires
4. Hook runs check-dependencies.js
5. Script updates task status + emits event
6. Dependent tasks become READY
7. Master spawns next batch
```

### Hook Configuration

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "if": "Agent(implementer *)",
            "command": "node .claude/master-agent/scripts/on-worker-complete.js"
          }
        ]
      }
    ],
    "TaskCreated": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/master-agent/scripts/register-task.js"
          }
        ]
      }
    ]
  }
}
```

---

## Topological Scheduler

### Sequential Execution with DAG

```javascript
// dag-scheduler.js
async function runDAG() {
  const manifest = loadManifest();
  const pending = new Set(manifest.tasks.filter(t => t.status !== 'completed' && t.status !== 'failed'));

  while (pending.size > 0) {
    const ready = getReadyTasks(manifest.tasks);

    if (ready.length === 0) {
      // Check for deadlock
      const blocked = manifest.tasks.filter(t => t.status === 'blocked');
      if (blocked.length > 0) {
        console.error('DEADLOCK detected:', blocked.map(t => t.id));
        break;
      }
      break; // All done
    }

    // Execute ready tasks in parallel
    await Promise.all(ready.map(task => executeTask(task)));

    // Remove completed from pending
    for (const task of ready) {
      if (task.status === 'completed' || task.status === 'failed') {
        pending.delete(task.id);
      }
    }
  }
}
```

---

## Checkpointing

### On SubagentStart - Save Context

```javascript
// checkpoint-on-start.js
const checkpoint = {
  taskId,
  startedAt: new Date().toISOString(),
  input: task.input,
  agentId: subagentId,
};

fs.writeFileSync(
  `.claude/master-agent/checkpoints/${taskId}-${Date.now()}.json`,
  JSON.stringify(checkpoint, null, 2)
);
```

### Resume from Checkpoint

```javascript
async function resumeTask(taskId: string) {
  const checkpoints = fs.readdirSync('.claude/master-agent/checkpoints')
    .filter(f => f.startsWith(taskId))
    .sort()
    .reverse();

  if (checkpoints.length > 0) {
    const lastCheckpoint = JSON.parse(
      fs.readFileSync(`.claude/master-agent/checkpoints/${checkpoints[0]}`, 'utf-8')
    );
    return lastCheckpoint;
  }
  return null;
}
```

---

## Deadlock Detection

### Metrics to Monitor

| Metric | Normal | Alert |
|--------|--------|-------|
| `waiting_runs` | Low | High count of blocked tasks |
| `wait_duration_p95` | < 1 min | > 5 min indicates blocking |
| `blocked_transition_rate` | Stable | Spikes indicate dependency issues |

### Deadlock Detection Script

```javascript
// check-deadlock.js
function detectDeadlock(manifest) {
  const blockedTasks = manifest.tasks.filter(t => t.status === 'blocked');

  // Build wait graph
  const waitGraph = new Map();
  for (const task of blockedTasks) {
    waitGraph.set(task.id, task.dependencies.blockedBy);
  }

  // DFS cycle detection
  const visited = new Set();
  const stack = new Set();

  function hasCycle(taskId) {
    if (stack.has(taskId)) return true; // Cycle found
    if (visited.has(taskId)) return false;

    visited.add(taskId);
    stack.add(taskId);

    for (const dep of waitGraph.get(taskId) || []) {
      if (hasCycle(dep)) return true;
    }

    stack.delete(taskId);
    return false;
  }

  for (const task of blockedTasks) {
    if (hasCycle(task.id)) {
      return true; // Circular wait detected
    }
  }

  return false;
}
```

---

## Context Capsule Pattern

When passing context between agents, use structured task files:

```yaml
# .claude/master-agent/tasks/task-id.yaml
task:
  id: "implement-auth-001"

  context:
    originalTask: "Implement JWT auth for API"
    completedSteps:
      - "Research best practices"
      - "Write SPEC.md"
    currentOutput: null

    constraints:
      - "Use @deessejs packages only"
      - "Follow project conventions"

    dependencies:
      - "design-auth-spec (completed)"

  # Assigned worker gets this as input
  workerContext:
    files: ["docs/plans/auth/SPEC.md"]
    successCriteria:
      - "pnpm test --testNamePattern=auth passes"
      - "TypeScript compiles"
    outputFormat: "files created + test results"
```

---

## Implementation Steps

### Phase 1: Basic DAG (Week 1)

1. Create `.claude/master-agent/tasks/` directory
2. Implement task manifest (`manifest.json`)
3. Write `check-dependencies.js` script
4. Configure `SubagentStop` hooks

### Phase 2: Event System (Week 2)

1. Add event emission on task transitions
2. Implement topological scheduler
3. Add deadlock detection
4. Build checkpoint system

### Phase 3: Production Features (Week 3)

1. Add wait timeout guards
2. Implement saga/compensation patterns
3. Build monitoring dashboard
4. Add human-in-the-loop checkpoints

---

## Related Patterns

- **Grader Pattern** — Quality gates in the DAG
- **Context Capsule** — Structured data passing
- **Agent Memory** — Persistent learning across sessions

---

## Sources

- [DAG-First Agent Orchestration](https://tianpan.co/blog/2026-04-10-dag-first-agent-orchestration-linear-chains-scale)
- [Multi-Agent Task Dependencies - Milvus](https://milvus.io/ai-quick-reference/how-do-multiagent-systems-manage-task-dependencies)
- [Agent Deadlocks Pattern](https://www.agentpatterns.tech/en/failures/deadlocks)
- [AG-UI Event Protocol](https://docs.ag-ui.com/sdk/python/core/events)
- [Orchestrating Agents - OpenAI Cookbook](https://developers.openai.com/cookbook/examples/orchestrating_agents/)
- [LangGraph Durable Execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)