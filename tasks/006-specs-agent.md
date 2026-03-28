# Task 006 — SPECS Agent Implementation
## Agent: ARCHITECT → BUILDER → REVIEWER → QA
## Output: .claude/agents/specs.md + pipeline integration

## Objective
Implement SPECS agent that writes user-facing documentation
and acceptance criteria BEFORE BUILDER implements any feature.

## Deliverables
- .claude/agents/specs.md — SPECS agent context
- Update tasks template to include SPECS stage
- SPECS runs between ARCHITECT and BUILDER
- SPECS output: user-facing feature description + acceptance criteria
- SPECS updates README automatically for each feature

## Pipeline Order After Implementation
SCOUT → ARCHITECT → SPECS → BUILDER → REVIEWER → QA
