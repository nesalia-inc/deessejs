---
name: deep-analysis
description: Multi-Agent Deep Discovery Process - Orchestrates specialized sub-analysis and web-enhanced research to ensure architectural excellence.
metadata:
  tags: multi-agent, research, architecture, deep-dive, planning, web-search
---

# @deep-analysis Skill

This skill triggers a multi-phased architectural discovery process. It prohibits immediate execution and instead mandates the identification of analytical pillars, followed by specialized sub-agent deep dives enhanced by web research.

## Analytical Principles

1. **Analytical Scoping First:** Never start a deep dive without first defining the "Pillars of Analysis" (e.g., Security, Performance, Data Integrity, UX).
2. **Specialized Delegation:** Treat each pillar as a specialized sub-agent task. Each sub-analysis must adopt a specific expert persona relevant to that pillar.
3. **Web-Verified Intelligence:** Sub-agents must not rely solely on internal knowledge. They are mandated to search the web for the latest documentation, industry best practices, and known issues related to the technology in use.
4. **Anti-Surface Bias:** If a sub-analysis takes the "shortest path" without exploring edge cases, the entire process is considered a failure.

## Mandatory Analysis Workflow

### Phase 1: Structural Scoping (The Blueprint)
Before any technical investigation:
- **Pillar Identification:** Determine the 3 to 5 critical dimensions of the problem that require specialized analysis.
- **Goal Setting:** For each pillar, define what "success" and "depth" look like.
- **Wait for Scope Approval:** Present these pillars to the user and wait for validation.

### Phase 2: Specialized Sub-Agent Deep Dives
For each approved pillar, initiate a specialized sub-analysis session:
- **Expert Persona Adoption:** Each deep dive must be conducted from a specific angle (e.g., "Senior DevOps Sub-agent," "Type-Safety Specialist," "Security Auditor").
- **Web Research Mandate:** Use web search tools to consult official documentation (MDN, GitHub Discussions, Library docs) to ensure the analysis is based on current standards, not just training data.
- **Internal Codebase Scan:** Cross-reference web findings with a deep `cat`/`grep` scan of the local codebase to identify conflicts or implementation gaps.
- **Sub-Report Generation:** Each sub-agent must produce a concise but exhaustive report on their specific pillar.

### Phase 3: Synthesis & RFC (Request for Comments)
Consolidate all sub-agent reports into a final Technical Design:
- **Conflict Resolution:** Identify where sub-agent recommendations might clash (e.g., Performance vs. Security).
- **Consolidated Impact Map:** List every file, interface, and dependency affected.
- **Verification Plan:** Define how the proposed changes will be tested and validated.
- **Protocol Halt:** No code changes are permitted until this final synthesis is "Approved."

### Phase 4: High-Fidelity Implementation
- **Full-Scale Execution:** Implement the plan with 100% code completion. 
- **Zero Placeholders:** "Lazy" comments or partial implementations are strictly prohibited.

## Behavioral Logic

- **External Validation:** If the local codebase uses a library (e.g., `@deessejs/core`, `Zod`, `React`), the sub-agent MUST check the web for the specific version's best practices.
- **Recursive Depth:** If a sub-agent discovers a new complexity, they must pause and suggest an additional sub-pillar for analysis.
- **Consultative Stance:** The process is not about "fixing" code; it is about "architecting" a solution through rigorous investigation.

## Operational Logic for Claude Code

- **Orchestration Thinking:** Use the internal thinking process to simulate the "handoff" between specialized sub-agents.
- **Exhaustive Reading:** Sub-agents must read files in their entirety to prevent context fragmentation.
- **Search-First Mentality:** When encountering a non-trivial pattern, search the web immediately to see how industry leaders solve the problem.