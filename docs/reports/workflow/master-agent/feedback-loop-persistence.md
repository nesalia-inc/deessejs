# Feedback Loop Persistence

## Overview

How to store, retrieve, and apply learned patterns in a multi-agent system so agents improve over time based on success and failure outcomes.

**Scope:** Claude Code agent-memory, file-based storage, skill injection.

---

## Core Concept

```
Task Execution
     │
     ▼
Result Evaluated (pass/fail)
     │
     ▼
Pattern Stored in Memory
     │
     ▼
Future Similar Task
     │
     ▼
Relevant Patterns Retrieved
     │
     ▼
Injected into Agent Context
```

**Key insight:** "The feedback loop is the product, not the agent." — prioritize verification infrastructure over agent capability.

---

## Memory Scopes

### Three-Tier Architecture

| Scope | Location | Version Controlled | Best For |
|-------|----------|-------------------|----------|
| **user** | `~/.claude/agent-memory/<name>/` | No | Cross-project knowledge |
| **project** | `.claude/agent-memory/<name>/` | Yes | Team-shared patterns |
| **local** | `.claude/agent-memory-local/<name>/` | No | Ephemeral sessions |

### Claude Code Configuration

```yaml
# .claude/agents/implementer.md
---
name: implementer
description: Implements features in deesse packages
memory: project  # Enables persistent learning
---

You implement features following project conventions.
```

**Auto-enabled tools when memory is configured:** `Read`, `Write`, `Edit`, `Bash`

---

## Pattern Storage Schema

### Memory Directory Structure

```
.claude/master-agent/
├── memory/                    # Project-scoped patterns
│   ├── MEMORY.md              # Index (first 200 lines loaded)
│   ├── patterns/              # Success/failure codified
│   │   ├── success-auth-001.md
│   │   ├── failure-db-migration-001.md
│   │   └── correction-typescript-001.md
│   └── skills/               # Reusable skill definitions
│       └── skilldex.json
└── agent-memory/              # Claude Code native memory
    └── implementer/
        ├── MEMORY.md
        ├── feedback/
        └── reference/
```

### Pattern Entry Format

```yaml
# .claude/master-agent/memory/patterns/success-auth-001.md
---
name: JWT Implementation Pattern
description: "Successfully implements JWT auth with proper error handling"
type: success
tags: ["auth", "jwt", "typescript"]
confidence: 0.9
createdAt: "2026-04-20T10:30:00Z"
source: "implement-auth-001"
verification:
  status: verified
  verifiedAt: "2026-04-20"
  verifiedBy: "review-grader"
---

## What worked

```typescript
// Pattern: Always wrap JWT verification in try-catch
const verifyToken = async (token: string) => {
  try {
    const payload = jwt.verify(token, SECRET);
    return { success: true, payload };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

## Why it worked

- Graceful handling of expired/invalid tokens
- No exceptions propagate to caller
- Calling code can check `success` boolean

## When to apply

- Implementing any JWT auth
- When security-grader flags missing error handling
```

### Failure Pattern Format

```yaml
# .claude/master-agent/memory/patterns/failure-db-001.md
---
name: Missing Transaction Rollback
description: "Database operations without proper rollback on failure"
type: failure
tags: ["database", "drizzle", "transactions"]
confidence: 0.95
createdAt: "2026-04-21T14:00:00Z"
source: "implement-order-003"
verification:
  status: verified
  verifiedAt: "2026-04-21"
---

## What failed

Omitting rollback in multi-step DB operations causes data inconsistency.

## What was attempted

```typescript
// BAD: No rollback on failure
await db.insert(orders).values(order);
await db.update(inventory).set({ stock: stock - 1 });
// If second fails, order is created but inventory not updated
```

## Correct approach

```typescript
// GOOD: Use transaction with rollback
await db.transaction(async (tx) => {
  await tx.insert(orders).values(order);
  await tx.update(inventory).set({ stock: stock - 1 });
});
// Drizzle auto-rolls back if any operation fails
```

## Context where this matters

- Any multi-step database operation
- inventory management
- order processing
- user provisioning
```

---

## Retrieval Mechanism

### Keyword-Based Retrieval

```javascript
// retrieve-patterns.js
async function retrieveRelevantPatterns(
  taskContext: string,
  topK: number = 5
): Promise<PatternEntry[]> {
  const keywords = extractKeywords(taskContext);
  const patternDir = '.claude/master-agent/memory/patterns';

  const files = await glob(`${patternDir}/*.md`);
  const scored = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const score = computeRelevanceScore(keywords, content);

    if (score > 0.3) {
      scored.push({ file, score, content });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function computeRelevanceScore(keywords: string[], content: string): number {
  const words = content.toLowerCase().split(/\s+/);
  let matches = 0;

  for (const keyword of keywords) {
    if (words.includes(keyword.toLowerCase())) {
      matches += 1;
    }
  }

  return matches / keywords.length;
}
```

### MEMORY.md Index Structure

```markdown
# Project Agent Memory

## Active Patterns
- [success] JWT implementation pattern (auth-001)
- [success] Drizzle transaction pattern (db-002)
- [failure] Missing rollback pattern (db-001)

## Common Contexts
- Implementing auth → use jwt-pattern
- Database operations → use transaction-pattern
- React components → use component-pattern

## Current Work
- auth refactor: implementing JWT auth module

## Blockers
- Need security review before deploy
```

---

## Learning Loop Implementation

### ACE Pipeline (Agent → Environment → Reflector → SkillManager)

```
Agent executes → Environment evaluates → Reflector analyzes → SkillManager updates
```

### Implementation Steps

```typescript
// Master agent learning loop
async function executeWithLearning(task: Task): Promise<void> {
  // 1. Retrieve relevant patterns
  const patterns = await retrieveRelevantPatterns(task.description);

  // 2. Inject patterns into task context
  const enrichedContext = {
    ...task,
    patterns: patterns.map(p => p.content),
  };

  // 3. Execute task
  const result = await executeTask(enrichedContext);

  // 4. Evaluate result
  const evaluation = await evaluateResult(result, task.successCriteria);

  // 5. Store pattern based on outcome
  if (evaluation.success) {
    await storePattern({
      type: 'success',
      task: task.description,
      whatWorked: result.approach,
      rationale: evaluation.whyWorked,
    });
  } else {
    await storePattern({
      type: 'failure',
      task: task.description,
      whatFailed: result.attemptedApproach,
      whatShouldHappen: evaluation.expectedOutcome,
    });
  }

  // 6. Update skillbook if confidence is high enough
  if (evaluation.confidence > 0.9 && evaluation.success) {
    await updateSkillbook(task.description, result.approach);
  }
}
```

---

## Feedback Storage Schema

### Full Pattern Structure

```typescript
interface PatternEntry {
  id: string;
  name: string;
  description: string;     // >= 30 words for specificity
  type: 'success' | 'failure' | 'correction';

  context: {
    domain?: string;        // "auth", "database", "frontend"
    language?: string;      // "typescript", "python"
    framework?: string;     // "nextjs", "drizzle"
    taskType?: string;     // "implement", "debug", "review"
  };

  pattern: string;          // The actual code/approach

  rationale: string;       // WHY this worked or failed

  confidence: number;      // 0-1 trust score

  source: {
    taskId: string;
    agentId: string;
    timestamp: string;
  };

  verification: {
    status: 'verified' | 'unverified' | 'deprecated';
    verifiedAt?: string;
    verifiedBy?: string;
  };

  useCount: number;         // Times retrieved and applied
  lastUsed?: string;
}
```

### Skillbook Entry

```typescript
interface SkillbookEntry {
  id: string;
  strategy: string;        // Human-readable description
  trigger: string[];      // Keywords to match
  successRate: number;    // Historical success rate
  adaptations: string[];   // Variations for different contexts
  lastUsed: string;
  useCount: number;
}

interface Skillbook {
  version: string;
  entries: SkillbookEntry[];
  lastUpdated: string;
}
```

---

## Claude Code Agent Memory Integration

### Preloading Patterns into Sub-agents

```yaml
# .claude/agents/implementer.md
---
name: implementer
description: Implements features in deesse packages
memory: project
skills:
  - jwt-implementation-pattern
  - drizzle-transaction-pattern
  - error-handling-best-practices
---

You implement features. When implementing auth or database operations,
apply the preloaded patterns for best practices.
```

### Building System Prompt with Memory

```javascript
async function buildSystemPromptWithMemory(
  basePrompt: string,
  memoryDir: string,
  taskContext: string
): Promise<string> {
  // 1. Read base prompt
  let prompt = basePrompt;

  // 2. Read MEMORY.md index (first 200 lines)
  const index = await readFile(`${memoryDir}/MEMORY.md`, 'utf-8');
  prompt += `\n\n## Project Memory\n${index}`;

  // 3. Retrieve relevant patterns
  const patterns = await retrieveRelevantPatterns(taskContext, 3);

  if (patterns.length > 0) {
    prompt += `\n\n## Relevant Patterns\n`;
    for (const pattern of patterns) {
      prompt += `\n### ${pattern.name}\n${pattern.content}\n`;
    }
  }

  return prompt;
}
```

---

## Verification and Staleness

### Staleness Rule

> "The memory says X exists" does not mean "X exists now."

**Before applying a pattern:**
1. Check file paths still exist
2. Verify function names are grep-able in codebase
3. Confirm external systems (APIs, services) are still available

```javascript
async function verifyPatternApplicability(pattern: PatternEntry): Promise<boolean> {
  // Check if referenced files still exist
  for (const file of pattern.referencedFiles || []) {
    if (!fs.existsSync(file)) {
      console.warn(`Pattern ${pattern.id} references missing file: ${file}`);
      return false;
    }
  }

  // Check if function names still exist
  for (const fn of pattern.functions || []) {
    const exists = await grep(pattern.context, fn);
    if (!exists) {
      console.warn(`Pattern ${pattern.id} references missing function: ${fn}`);
      return false;
    }
  }

  return true;
}
```

---

## Integration with Master Agent Roles

### Factory (creates agents) uses patterns to:

- Identify when a new agent is needed (similar patterns emerging)
- Define agent capabilities based on successful patterns
- Set initial configurations from proven patterns

### Improver (tunes agents) uses patterns to:

- Detect failure patterns → adjust agent configuration
- Detect success patterns → codify into agent instructions
- Track improvement over time

### Orchestrator (delegates) uses patterns to:

- Select appropriate agent for task based on context
- Inject relevant patterns into task description
- Predict task complexity based on similar past tasks

---

## Storage Recommendations

### Recommended Directory Structure

```
.claude/master-agent/
├── memory/                      # Project-level patterns
│   ├── MEMORY.md               # Index file
│   ├── patterns/               # Success/failure/correction
│   │   ├── success-*.md
│   │   ├── failure-*.md
│   │   └── correction-*.md
│   └── skills/                 # Skill definitions
│       └── skillbook.json
├── agent-memory/               # Claude Code native (per-agent)
│   ├── implementer/
│   ├── explorer/
│   └── reviewer/
└── logs/                       # Execution logs
    └── sessions/
```

---

## Key Insights from Research

1. **The feedback loop IS the product** — invest in verification infrastructure
2. **"50 First Dates" problem** — agents forget everything between sessions without memory
3. **Uncoordinated multi-agent amplifies errors ~17x** — shared patterns prevent drift
4. **Context overflow destroys cost efficiency** — $2,000/day from recursive self-improvement without pruning
5. **Confidence scoring matters** — unverified patterns should have lower confidence until proven

---

## Implementation Steps

### Phase 1: Basic Pattern Storage (Week 1)

1. Create `.claude/master-agent/memory/` directory structure
2. Implement `store-pattern.js` script
3. Implement `retrieve-patterns.js` with keyword matching
4. Wire into task completion flow

### Phase 2: Memory Integration (Week 2)

1. Configure agent-memory on sub-agents
2. Build MEMORY.md index generation
3. Implement staleness verification
4. Add use count tracking

### Phase 3: Learning Optimization (Week 3)

1. Implement confidence scoring
2. Build skillbook with trigger keywords
3. Add pattern adaptation suggestions
4. Integrate with grader pattern

---

## Related Patterns

- **Event-Driven DAG** — Task scheduling and events
- **Grader Pattern** — Quality evaluation feeding learning
- **Context Capsule** — Structured data passing

---

## Sources

- [LoopJar Agent Orchestration Feedback Loop](https://loopjar.ai/blog/agent-orchestration-feedback-loop)
- [ACE Framework - Agentic Context Engine](https://kayba-ai.github.io/agentic-context-engine/latest/concepts/overview/)
- [Microsoft Research - Experiential Reinforcement Learning](https://www.microsoft.com/en-us/research/articles/experiential-reinforcement-learning/)
- [Dev.to - Persistent Memory for Claude Code Agents](https://dev.to/whoffagents/how-to-build-persistent-memory-into-claude-code-agents-cross-session-identity-that-actually-works-41h4)
- [Skilldex - Skill Manager for Agents](https://arxiv.org/html/2604.16911v1)