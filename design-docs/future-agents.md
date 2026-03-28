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

Model Context Protocol (MCP) enables Claude Code to connect
directly to external tools without middleware or custom scripts.
Each MCP server below represents a native integration point
for the pipeline.

### Priority 1 — Immediate Value (first sprint after launch)

**GitHub MCP**
- Creates PRs automatically after QA approval
- Reads PR comments → generates fix tasks
- Replaces current manual gh pr create step
- Impact: closes Gap 2 — manual PR creation

**Atlassian MCP (Jira + Confluence)**
- Reads Jira tickets directly into Claude context
- Auto-generates task files from ticket description
- Updates ticket status as pipeline progresses
- Writes ARCHITECT output → Confluence page automatically
- Impact: closes manual task creation + auto-documentation

**Slack MCP**
- Notifies team when pipeline completes
- Posts REVIEWER report to engineering channel
- Alerts on pipeline failures with context
- Impact: team visibility into all pipeline runs

### Priority 2 — Design & Knowledge (second sprint)

**Figma MCP**
- Reads design files directly into ARCHITECT context
- ARCHITECT generates design docs from Figma specs
- Eliminates design → task translation step entirely
- Impact: design → code pipeline without manual handoff

**Notion MCP**
- Reads product specs and PRDs directly into pipeline
- SPECS agent reads Notion → writes acceptance criteria
- Pipeline updates Notion pages with implementation status
- Impact: product decisions → pipeline specs automatically

**Miro MCP**
- Reads architecture diagrams directly into ARCHITECT
- ARCHITECT references Miro boards for system design
- Pipeline outputs update Miro boards automatically
- Impact: visual architecture → code without translation loss

**NotebookLM MCP (Google)**
- Indexes all pipeline artifacts — audit reports, design docs,
  review reports, qa reports — into a searchable knowledge base
- SCOUT queries NotebookLM for historical findings
  before starting new audit
- ARCHITECT queries past design decisions before new designs
- Engineering Director asks natural language questions about
  entire project history
- Example: "What issues has SCOUT found in chat.service.ts
  across all pipeline runs?"
- Impact: institutional memory across all pipeline runs —
  pipeline learns from its own history

### Priority 3 — Data & Product (third sprint)

**PostgreSQL/Supabase MCP**
- Replace mock portfolio data with real database
- Claude Code queries and updates portfolio directly
- Real user accounts and portfolio persistence
- Impact: transforms mock app into production-ready

**Anthropic API MCP**
- Direct Claude API access for AI chat feature
- Replaces current mock streaming implementation
- Portfolio context injection into system prompt
- Impact: real AI-powered financial advisor

**Financial Data MCP (Polygon.io / Alpha Vantage)**
- Real-time stock prices replace mock data
- Portfolio values update in real time
- AI advisor responds to actual market conditions
- Impact: transforms demo into real financial tool
- Critical for 8FIGURES product vision

### Priority 4 — DevOps & Quality (fourth sprint)

**Sentry MCP**
- Reads production errors directly into Claude context
- Auto-generates fix tasks from production errors
- SCOUT agent reads Sentry → creates audit findings
- Impact: production error → pipeline fix automatically

**Datadog/Amplitude MCP**
- Reads analytics and performance metrics
- SCOUT monitors performance regressions automatically
- Auto-creates optimization tasks from data
- Impact: data-driven pipeline triggers

**Linear MCP**
- Modern alternative to Jira for engineering teams
- Better API than Jira for programmatic access
- Same ticket → task → PR → close flow
- Impact: same as Atlassian MCP

### Pipeline Evolution with MCP

**Current (manual bridges):**
You → task file → Claude Code → local files → manual PR

**Near future (partial MCP):**
GitHub MCP → auto PR
Atlassian MCP → auto task files from Jira
Slack MCP → auto notifications

**Full vision (MCP-native pipeline):**
Jira ticket created
→ Atlassian MCP reads ticket
→ Notion MCP reads PRD context
→ Figma MCP reads design specs
→ NotebookLM MCP checks historical findings
→ Claude Code generates task file
→ Pipeline executes autonomously
→ GitHub MCP creates PR
→ Confluence MCP documents decisions
→ Slack MCP notifies team
→ Jira MCP closes ticket

Zero middleware. Zero manual steps.
One human gate: Engineering Director approves merge.

### Implementation Priority for 8FIGURES Specifically

Given 8FIGURES is an AI-powered financial advisor
at pre-Series A with a team of 8:

1. Anthropic API MCP — real AI chat (most critical for product)
2. Financial Data MCP — real market data (core product value)
3. GitHub MCP — automated PRs (pipeline automation)
4. Atlassian MCP — Jira + Confluence (team workflow)
5. Notion MCP — product specs into pipeline
6. Figma MCP — design → code pipeline
7. Slack MCP — team notifications
8. NotebookLM MCP — institutional pipeline memory
9. Supabase MCP — real user data
10. Sentry MCP — production error automation
11. Miro MCP — architecture visualization
12. Datadog/Amplitude MCP — analytics-driven tasks
13. Linear MCP — alternative PM tool

### Reference
Claude Code MCP docs: https://docs.anthropic.com/en/docs/claude-code/mcp
MCP server registry: https://github.com/modelcontextprotocol/servers
