# Task 007 — TDD QA-FIRST Implementation
## Agent: ARCHITECT → BUILDER → REVIEWER → QA
## Output: QA-FIRST mode for pipeline

## Objective
Implement QA-FIRST mode where QA writes failing tests
BEFORE BUILDER implements features.

## Deliverables
- .claude/agents/qa-first.md — QA-FIRST agent context
- Update tasks template to include QA-FIRST stage
- QA-FIRST runs between SPECS and BUILDER
- QA-FIRST writes minimum failing tests per acceptance criteria
- BUILDER implements until tests pass

## Pipeline Order After Implementation
SCOUT → ARCHITECT → SPECS → QA-FIRST → BUILDER → REVIEWER → QA-VERIFY
