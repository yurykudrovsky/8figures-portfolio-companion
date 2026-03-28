# Pipeline Tasks

Each file defines a precise, reproducible agent task.
Tasks are executed in order with human gates between each.

## Stage 0 — INTAKE (Optional)
For requirement-driven development, run INTAKE first:
- Place documents in inbox/
- Run INTAKE agent
- INTAKE generates task files automatically
- Then execute generated tasks through normal pipeline

## Pipeline Run Log
| Run | Date | Stages | Result |
|-----|------|--------|--------|
| 001 | 2026-03-28 | 5/5 | COMPLETE ✅ |

## How to Execute
1. Review task file
2. Tell Claude Code: "Execute task from tasks/00N-name.md"
3. Review output before approving next stage

## Git Branch Convention
All pipeline execution branches follow this naming convention:
- `pipeline/NNN-short-description` where NNN matches the task file number
- Never commit pipeline artifacts (scout reports, design docs, review reports) to main
- After QA approves: Engineering Director opens PR manually (for now)
- See CLAUDE.md "Pipeline Git Rules" and ARCHITECTURE.md "Pipeline Evolution" for full protocol
- Future: ORCHESTRATOR agent will create branches and PRs automatically

### Parallel Pipeline Runs (Future)
Multiple pipeline branches can run simultaneously via worktrees:
- Each pipeline/NNN branch gets its own worktree directory
- ORCHESTRATOR spawns agents across worktrees in parallel
- Human gates apply per worktree independently
- Merge order: sequential, lowest NNN first
See: ARCHITECTURE.md "Parallel Execution via Git Worktrees"

## Failure Protocol
When any pipeline stage fails, follow design-docs/pipeline-failure-handling.md:
- Build failure → ARCHITECT retry (BUILDER stops immediately)
- Test failure → BUILDER retry (QA never fixes implementation)
- REVIEWER FAIL → BUILDER retry (max 2 cycles before human escalation)
- Any stage fails twice → ESCALATED TO HUMAN
- Always rollback to last passing commit before retry

## Future Integration Roadmap

### Phase 2 — Project Management Integration
- Tasks auto-generated from Jira tickets via webhook
- GitHub Projects card → triggers pipeline run
- Monday.com board column change → spawns agent

### Phase 3 — PR-Driven Review
- Each pipeline run opens a GitHub PR automatically
- REVIEWER agent output becomes PR review comments
- QA agent output becomes PR checks
- Human approval = PR merge
- Full audit trail in GitHub, not just local files

### Phase 4 — Continuous Pipeline
- CronCreate schedules nightly SCOUT audit
- Drift detection — flags when code diverges from standards
- Auto-creates tasks for new findings

This architecture is designed for this evolution from day one.
Task files are the contract between project management and
the AI pipeline.

### ORCHESTRATOR Agent (Planned)
Future meta-agent that runs the full pipeline autonomously:
reads task file → executes agent sequence → passes artifacts →
escalates to human only when blocked.
See: design-docs/future-agents.md — Planned: ORCHESTRATOR Agent

## Pipeline Strategy Decisions

### ATDD (Acceptance Test-Driven Development) — Documented, Not Implemented
Current pipeline: QA after implementation (pragmatic for timeline)
Production pipeline: QA-FIRST with failing tests before code
See: design-docs/future-agents.md — QA-FIRST Mode

### Contract Testing — Documented, Not Implemented
Tool: Pact.io — consumer-driven contracts between mobile and API
Critical for fintech — API changes must never silently break mobile
See: design-docs/future-agents.md — Contract Testing

### Property-Based Testing — Documented, Not Implemented
Tool: fast-check — random input generation for financial edge cases
Essential for: portfolio calculations, currency formatting, gain/loss
See: design-docs/future-agents.md — Property-Based Testing

### Why These Were Not Implemented
Deliberate Engineering Director decision:
- Assessment timeline: 72 hours
- Risk: adding complexity could break working pipeline
- Value: demonstrating awareness + architectural thinking
  scores higher than rushed implementation
- All three are drop-in additions to existing test suite
