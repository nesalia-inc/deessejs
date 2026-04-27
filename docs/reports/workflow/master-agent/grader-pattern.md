# Grader Pattern for Quality Control

## Overview

The grader pattern separates evaluation from execution in multi-agent systems. A dedicated grader agent assesses worker outputs against predefined criteria and triggers retries or corrections when quality thresholds are not met.

**Scope:** Claude Code sub-agents, skills, and hooks for quality gates.

---

## Core Concept

```
Worker Agent
     │
     ▼ (produces output)
  Grader Agent
     │
     ├──▶ PASS (score >= threshold) ──▶ Next Stage
     │
     └──▶ FAIL (score < threshold) ──▶ Retry Worker
                                       │
                                       └──▶ Still fails? ──▶ Escalate to Master
```

**Key principle:** Graders don't implement — they evaluate. Workers don't grade — they execute.

---

## Grading Criteria

### Code Quality Dimensions

| Category | What to measure | Threshold |
|---------|-----------------|-----------|
| **Correctness** | Output solves stated problem | 80% |
| **Completeness** | All required elements present | 85% |
| **Consistency** | Matches project conventions | 90% |
| **Performance** | Efficient, no obvious bottlenecks | 75% |
| **Security** | No vulnerabilities, safe patterns | 100% |

### Grader Types

#### Test Grader

```yaml
# .claude/agents/test-grader.md
---
name: test-grader
description: Evaluate test quality and coverage
tools: Read, Glob, Bash
model: sonnet
---

You evaluate test files. For each test file:
1. Calculate coverage percentage
2. Count assertions per test
3. Identify missing edge cases
4. Check for test isolation

Output JSON:
{
  "decision": "APPROVE" | "REJECT" | "REVISION_REQUIRED",
  "score": 0-100,
  "breakdown": [
    { "criterion": "coverage", "score": 85, "reason": "..." },
    { "criterion": "assertions", "score": 70, "reason": "..." }
  ],
  "suggestions": ["Add test for edge case X", "Increase assertion density"]
}
```

#### Code Review Grader

```yaml
# .claude/agents/review-grader.md
---
name: review-grader
description: Assess code quality against project standards
tools: Read, Glob, Grep, Bash
model: sonnet
---

You review code. Assess:
1. **Correctness** — Does it solve the problem?
2. **Security** — Any vulnerabilities (injection, auth issues)?
3. **Style** — Follows project conventions?
4. **Complexity** — Appropriate for the task?

Output JSON:
{
  "decision": "APPROVE" | "REJECT" | "REVISION_REQUIRED",
  "score": 0-100,
  "critical_issues": ["SQL injection in line 42"],
  "warnings": ["Missing error handling"],
  "suggestions": ["Add input validation"]
}
```

#### Security Grader

```yaml
# .claude/agents/security-grader.md
---
name: security-grader
description: Scan for security vulnerabilities
tools: Read, Grep, Bash
model: opus
---

You perform security analysis. Check:
1. **Injection risks** — SQL, command, code injection
2. **Auth issues** — Missing auth checks, insecure storage
3. **Input validation** — All user input sanitized?
4. **Dependencies** — Known vulnerabilities?

Output JSON:
{
  "decision": "APPROVE" | "REJECT" | "REVISION_REQUIRED",
  "score": 0-100,
  "vulnerabilities": [
    { "severity": "critical", "type": "SQL injection", "location": "auth/query.ts:42" }
  ],
  "recommendations": ["Use parameterized queries"]
}
```

---

## Grader Output Schema

### Standard Grader Result

```typescript
interface GraderResult {
  decision: "APPROVE" | "REJECT" | "REVISION_REQUIRED";

  score: number; // 0-100 scale

  breakdown: {
    criterion: string;
    score: number;
    reason: string;
  }[];

  feedback: string; // Human-readable summary

  suggestions?: string[]; // Specific improvements

  metadata: {
    graderType: string;    // "test-grader", "review-grader", etc.
    timestamp: number;
    confidence: number;    // 0-1, grader's certainty
    artifacts: string[];   // Files reviewed
  };
}
```

### Decision Criteria

| Decision | When to use | Action |
|----------|-------------|--------|
| **APPROVE** | score >= 80 AND no critical issues | Proceed to next stage |
| **REVISION_REQUIRED** | score 50-79 OR warnings present | Return to worker with feedback |
| **REJECT** | score < 50 OR critical issues | Retry or escalate |

---

## Grading Workflow

### Integration with SubagentStop Hook

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
            "command": "node .claude/master-agent/scripts/run-review-grader.js"
          }
        ]
      }
    ]
  }
}
```

```javascript
// .claude/master-agent/scripts/run-review-grader.js
const { spawn } = require('child_process');

// Parse input
const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf-8'));
const taskId = input.taskId;

// Spawn review-grader sub-agent
const grader = spawn('claude', [
  '--agent', 'review-grader',
  '--prompt', `Review the output of task ${taskId}.
    Files modified: ${JSON.stringify(getModifiedFiles(taskId))}
    Success criteria: ${JSON.stringify(getSuccessCriteria(taskId))}`
], { stdio: 'pipe' });

let result = '';
grader.stdout.on('data', data => result += data);

grader.on('close', code => {
  const grade = JSON.parse(result);

  if (grade.decision === 'APPROVE') {
    console.log('Quality gate passed');
    // Trigger next task
  } else if (grade.decision === 'REVISION_REQUIRED') {
    console.log('Quality gate failed - revision required');
    // Return to worker with feedback
    updateTaskStatus(taskId, 'revision_required', grade.feedback);
  } else {
    console.log('Quality gate failed - critical issues');
    // Escalate to master
    escalateToMaster(taskId, grade);
  }
});
```

### Retry with Feedback Loop

```typescript
async function executeWithGrading(workerType: string, task: Task): Promise<void> {
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Execute worker
    const output = await spawnWorker(workerType, task);

    // Grade output
    const grade = await runGrader(task, output);

    if (grade.decision === 'APPROVE') {
      task.status = 'completed';
      saveOutput(task.id, output);
      return;
    }

    if (attempt < MAX_RETRIES - 1) {
      // Inject feedback for retry
      task.context.previousAttemptFeedback = grade.feedback;
      task.context.correctionHints = grade.suggestions;
      console.log(`Retry ${attempt + 1}: ${grade.feedback}`);
    } else {
      // All retries exhausted - escalate
      task.status = 'failed';
      task.escalationReason = grade;
      saveTask(task);
      emitEscalationEvent(task);
    }
  }
}
```

---

## Grader Invocation Patterns

### Pattern 1: Synchronous (Worker waits)

```
Worker → "Implement auth module"
Worker → (spawns) → Grader → Grade: FAIL → Worker retries
                         ↓
                    Grade: PASS → Continue
```

**Use case:** Quality is critical, don't proceed until approved.

### Pattern 2: Asynchronous (Parallel grading)

```
Worker → Implement → Output saved
              ↓
         Grader (background) → Grade: FAIL → Alert master
              ↓
         Grade: PASS → Continue
```

**Use case:** Speed matters, but catch failures early.

### Pattern 3: Threshold-based Routing

```
Worker → Output → Grader
                  ↓
            Score >= 80? → YES → Next stage
                  ↓ NO
            Score >= 50? → YES → Revision loop
                  ↓ NO
            → Escalate to human
```

**Use case:** Different quality levels need different responses.

---

## Quality Gate Configuration

### Per-Task Quality Requirements

```yaml
# .claude/master-agent/tasks/implement-auth-001.yaml
task:
  qualityGates:
    - type: test-grader
      threshold: 80
      required: true

    - type: security-grader
      threshold: 100
      required: true

    - type: review-grader
      threshold: 75
      required: false  # Warning only
```

### Gate Actions

| Gate Result | Action |
|-------------|--------|
| All gates pass | Proceed to next stage |
| Optional gate fails | Continue with warning |
| Required gate fails | Retry or escalate |
| Critical issues found | Immediate halt |

---

## Grader Selection Logic

### Master Agent Decision Tree

```
Task completed
     │
     ▼
What's the output type?
     │
     ├── Code file(s) → review-grader + security-grader
     │
     ├── Test file(s) → test-grader
     │
     ├── Documentation → doc-grader
     │
     └── Mixed → Multiple graders (sequential or parallel)
```

### Automatic Grader Selection

```javascript
function selectGraders(taskType: string, output: Output): Grader[] {
  const graders = [];

  if (outputHasFileType(output, ['.ts', '.tsx', '.js', '.jsx'])) {
    graders.push('review-grader');
    graders.push('security-grader');
  }

  if (outputHasFileType(output, ['.test.ts', '.spec.ts'])) {
    graders.push('test-grader');
  }

  if (outputHasFileType(output, ['.md'])) {
    graders.push('doc-grader');
  }

  return graders;
}
```

---

## Grader Metrics

### Track Per Grader

| Metric | Description | Target |
|--------|-------------|--------|
| Pass rate | % outputs approved first time | > 75% |
| False positives | Rejected outputs that were actually good | < 5% |
| False negatives | Approved outputs with hidden issues | < 2% |
| Latency | Time from output to decision | < 30s |

### Track Per Worker Type

| Metric | Description | Target |
|--------|-------------|--------|
| Quality gate pass rate | Workers whose output passes grader | > 80% |
| Retry rate | Workers needing more than 1 attempt | < 15% |
| Escalation rate | Workers failing after max retries | < 5% |

---

## Implementation Steps

### Phase 1: Basic Graders (Week 1)

1. Create `review-grader` sub-agent with basic criteria
2. Create `test-grader` sub-agent
3. Wire into SubagentStop hook
4. Track pass/fail rates

### Phase 2: Retry Logic (Week 2)

1. Implement retry with feedback loop
2. Add grader output persistence
3. Build escalation path
4. Add confidence scoring

### Phase 3: Advanced Graders (Week 3)

1. Add security-grader with vulnerability scanning
2. Implement multi-grader coordination
3. Build grader performance metrics
4. Add adaptive thresholds based on task type

---

## Example: End-to-End Flow

```
1. Master receives: "Implement auth module"

2. Master decomposes:
   - Task A: design-auth-spec (Explore)
   - Task B: implement-auth (Implement)
   - Task C: test-auth (Tester)
   - Task D: review-auth (Reviewer)

3. Task B completes → SubagentStop fires
   → Hook runs review-grader

4. review-grader output:
   {
     "decision": "REVISION_REQUIRED",
     "score": 65,
     "warnings": ["No error handling for invalid JWT"],
     "suggestions": ["Add try-catch around JWT verification"]
   }

5. Master receives grade → injects feedback → retries Task B

6. Task B retry completes → SubagentStop fires
   → Hook runs review-grader again

7. review-grader output:
   {
     "decision": "APPROVE",
     "score": 88
   }

8. Master proceeds to Task C (test-auth)
```

---

## Related Patterns

- **Event-Driven DAG** — Task scheduling and dependency management
- **Feedback Loop Persistence** — Storing and retrieving learning
- **Context Capsule** — Structured data passing between agents

---

## Sources

- [LangChain Multi-Agent Architecture](https://www.langchain.com/blog/multi-agent-systems)
- [Agno Agent-as-Judge](https://docs.agno.com/evals/agent_as_judge)
- [Agno Teams Evaluator](https://docs.agno.com/teams/overview)
- [n8n Multi-Agent Systems](https://blog.n8n.io/multi-agent-systems/)
- [Dify Multi-Agent Workflows](https://docs.dify.ai/)
- [AgentBench LLM Evaluation](https://arxiv.org/abs/2308.03688)