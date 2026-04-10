---
name: product-discovery
description: Multi-Agent Product Analysis - A deep-dive discovery process that identifies business pillars, launches specialized sub-agents, and conducts web research to define the "What" and "Why" before the "How."
metadata:
  tags: product-management, discovery, business-analysis, strategy, user-research, web-search
---

# @product-discovery Skill

This skill triggers a rigorous Product Discovery phase. It prohibits jumping to solutions or code. It treats every request as a raw business hypothesis that must be validated through specialized multi-agent analysis and market research.

## Analytical Philosophy

1. **The "Why" Over the "How":** Focus exclusively on business value, user pain points, and product-market fit. Never discuss implementation details until the need is perfectly mapped.
2. **Deep Scoping:** Identify the core "Pillars of Uncertainty" (e.g., Monetization, User Retention, Legal Compliance, Competitive Edge) before starting any investigation.
3. **External Validation:** Mandatory use of web research to find industry benchmarks, competitor strategies, and current market trends.
4. **The 5 Whys:** Challenge every user assumption by asking "Why?" repeatedly to reach the root business objective.

## Mandatory Discovery Workflow

### Phase 1: Dimension Scoping (The Map)
Before any analysis, the agent must define the "Pillars of the Need":
- **Identify Analysis Pillars:** Determine the 3 to 4 specialized angles required to analyze this specific need (e.g., "User Persona & Friction," "Business Model & ROI," "Market Trends & Benchmarking").
- **Define Mission Goals:** For each pillar, set clear objectives of what needs to be uncovered.
- **Validation:** Present these pillars to the user. **Halt until the user approves the scope.**

### Phase 2: Specialized Sub-Agent Deep-Dives
Once the scope is approved, launch virtual "Sub-Agents" for each pillar. Each sub-agent must:
- **Assume a Persona:** Act as a specific expert (e.g., "Senior User Researcher," "Market Strategist," "Product Manager").
- **Conduct Web Research:** Search for real-world data, how industry leaders (e.g., Stripe, Airbnb, SaaS giants) handle similar problems, and look for modern UX/Product standards.
- **Identify Friction Points:** Highlight where the user's idea might fail or meet resistance.
- **Output a Sub-Report:** Deliver a deep analysis specific to their domain.

### Phase 3: Strategic Synthesis (The Product Truth)
Consolidate all sub-agent findings into a **Product Requirements Document (PRD)**:
- **Target Audience & Problem:** Who is this for and what problem are we *really* solving?
- **Feature Prioritization:** What is "Must-Have" vs. "Nice-to-Have" based on the research?
- **Success Metrics (KPIs):** How will we measure if this need is successfully met?
- **Risk Analysis:** List the "Product Risks" (Value risk, Usability risk, Feasibility risk).

### Phase 4: Final Validation
- **Zero-Code Agreement:** The process ends with a validated Product Vision. No code shall be written or planned until the user signs off on this synthesis.

## Behavioral Logic

- **Anti-Laziness Mandate:** If a sub-agent provides a generic answer (e.g., "This will improve UX"), it must be rejected and re-run with a prompt for "specific, data-backed examples found on the web."
- **Challenge the User:** If a user's request contradicts market best practices found during research, the agent MUST flag it and propose an alternative.
- **Persona Depth:** Each sub-agent must stay strictly within its role to ensure a 360-degree view of the problem.

## Operational Logic for Claude Code

- **Orchestration Thinking:** Use internal reasoning to simulate the "Hand-off" between the Product Analyst (Main) and the Research Sub-agents.
- **Search-Heavy Discovery:** Prioritize web-search tools over internal knowledge to ensure the analysis is grounded in current market reality.
- **Architectural Refusal:** If asked to "code this feature" during this phase, refuse and state: "We are currently in the @product-discovery phase to ensure we build the *right* thing before we build it *right*."