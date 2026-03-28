# Future Agent Architecture

## Current State
5 agents: scout, architect, builder, reviewer, qa
Human acts as orchestrator between all handoffs.

## Planned: ORCHESTRATOR Agent
### Purpose
Meta-agent that runs the full pipeline autonomously.
Reads task file → decides agent sequence → passes artifacts →
escalates to human only when blocked.

### Why Not Implemented Now
- Claude Code native Plan Mode already provides orchestration
- Adding orchestrator layer risks agent confusion and loops
- Debugging multi-agent failures is complex
- Human-in-the-loop at every gate is deliberate Level 5 practice

### Parallel Worktree Management
ORCHESTRATOR will manage multiple worktrees simultaneously:
- Creates worktree per pipeline run automatically
- Spawns specialized agents per worktree
- Monitors all worktrees for completion
- Coordinates merge order back to main
- Enables true 5-10 concurrent session workflow

### Implementation Path
- Define orchestrator.md with pipeline state machine
- Use TaskCreate/TaskGet/TaskUpdate tools for state tracking
- Orchestrator reads pipeline-log.md as memory between steps
- Estimated: 1 sprint

## Planned: SCOUT-UX Agent
### Purpose
Specialized auditor for mobile UX, visual hierarchy,
Ionic component usage, animation quality, accessibility.
Current SCOUT only audits code quality, not UX quality.

### Why Not Implemented Now
- Current tasks are code quality focused
- UX audit requires visual inspection beyond file reading
- Risk of conflicting findings with code SCOUT

### Implementation Path
- Create .claude/agents/scout-ux.md
- Extend reviewer.md with UX checklist
- Run scout + scout-ux in parallel for UI tasks
- Estimated: 2 days

## Planned: ORCHESTRATOR + PM Integration
### Full Vision
See tasks/README.md "Future Integration Roadmap" and
ARCHITECTURE.md "Pipeline Evolution" for complete roadmap
of Jira/GitHub/Monday integration.

## QA-FIRST Mode (ATDD Pipeline — Acceptance Test-Driven Development)

### ATDD — Acceptance Test-Driven Development
Industry standard methodology used in fintech and
safety-critical software. Three-stage quality loop:
1. Acceptance criteria written BEFORE design (SPECS agent)
2. Failing acceptance tests written BEFORE code (QA-FIRST agent)
3. Implementation proceeds until all tests pass (BUILDER)

Also known as: Outside-In TDD, Double-Loop TDD,
Specification by Example.
Reference: https://en.wikipedia.org/wiki/Acceptance_test-driven_development

Our implementation:
SPECS → QA-FIRST → BUILDER → QA-VERIFY
maps directly to ATDD cycle:
Criteria → Red → Green → Refactor

### Current
QA runs AFTER builder implements. Tests verify working code.

### Future: Red-Green-Refactor Pipeline
Stage order changes to:
SCOUT → ARCHITECT → SPECS → QA-FIRST → BUILDER → REVIEWER → QA-VERIFY

- SPECS agent writes acceptance criteria and user docs first
- QA-FIRST writes failing tests before builder touches code
- BUILDER implements until tests pass — never before
- QA-VERIFY confirms all pass + coverage threshold met

### Why Not Now
Assessment timeline — 5-stage pipeline sufficient for demonstration.
Full ATDD (Acceptance Test-Driven Development) appropriate for production fintech where financial
calculations require exhaustive test coverage before deployment.

### Implementation Path
- Add specs.md agent context
- Add qa-first.md agent context
- Update task file template to include specs + qa-first stages
- Estimated: 1 sprint

## Contract Testing
### Purpose
Consumer-Driven Contract Testing ensures frontend and backend
never diverge silently.

Frontend (consumer) defines exactly what it needs from API.
Backend (provider) must satisfy those contracts.
Pipeline verifies contracts on every run.

### Why Critical for 8FIGURES
Financial data API contracts must be guaranteed:
- Portfolio value formatting contract
- Holdings calculation contract
- Streaming chat response contract

If backend changes break frontend contracts → pipeline fails
before any code reaches production.

### Tool: Pact.io
- Frontend writes consumer tests defining expected API shape
- Backend runs provider verification against consumer contracts
- Both verified independently — integration guaranteed

### Implementation Path
- Add Pact.io to frontend and backend
- BUILDER agent required to run pact verify after changes
- QA agent required to maintain consumer contracts
- Estimated: 2 sprints

## Property-Based Testing
### Purpose
Beyond unit tests — generates hundreds of random inputs
automatically. Critical for financial data edge cases.

### Instead of
"portfolio with $124k returns correct format"

### Property-Based Says
"ANY portfolio value ALWAYS formats correctly"
"NEVER returns negative display for zero-cost holdings"
"ALWAYS maintains precision to 2 decimal places"

### Why Critical for Financial App
Edge cases that matter:
- Zero holdings portfolio
- Negative gain/loss values
- Extreme values ($0.01 and $999,999,999)
- All losers portfolio
- Single holding portfolio
- Crypto with 8 decimal places

### Tool: fast-check for TypeScript
Already compatible with Vitest test runner we use.

### Implementation Path
- Add fast-check to frontend and backend
- QA agent required to write property tests for all
  financial calculation functions
- Estimated: 1 sprint

## MCP Integration Roadmap

### Priority 1 — Execution & Automation
(Reserved — ORCHESTRATOR agent, gh CLI, Jira/GitHub webhooks)

### Priority 2 — Design & Knowledge

#### NotebookLM MCP (Google)
- Indexes all pipeline artifacts — audit reports, design docs,
  review reports, qa reports — into a searchable knowledge base
- SCOUT agent queries NotebookLM for historical findings
  before starting new audit
- ARCHITECT queries past design decisions before new designs
- Engineering Director asks natural language questions about
  entire project history
- Example: "What issues has SCOUT found in chat.service.ts
  across all pipeline runs?"
- Impact: institutional memory across all pipeline runs —
  pipeline learns from its own history

## Implementation Priority List

1. ORCHESTRATOR agent — autonomous pipeline execution
2. Semi-automated PRs via gh CLI
3. SCOUT-UX agent — mobile UX audit capability
4. SPECS agent — acceptance criteria before code
5. QA-FIRST / ATDD — failing tests before implementation
6. Jira/GitHub webhook integration
7. Parallel worktree execution
8. Contract Testing (Pact.io)
9. Property-Based Testing (fast-check)
10. Auto-documentation (update-docs.sh)
11. ORCHESTRATOR + PM Integration (Monday.com/Linear)
12. Visual Regression Testing (Percy/Chromatic)
13. NotebookLM MCP — institutional pipeline memory
