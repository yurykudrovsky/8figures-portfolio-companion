# Pipeline Tasks

Each file defines a precise, reproducible agent task.
Tasks are executed in order with human gates between each.

## Pipeline Run Log
| Run | Date | Stages | Result |
|-----|------|--------|--------|
| 001 | 2026-03-27 | 5/5 | PENDING |

## How to Execute
1. Review task file
2. Tell Claude Code: "Execute task from tasks/00N-name.md"
3. Review output before approving next stage

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
