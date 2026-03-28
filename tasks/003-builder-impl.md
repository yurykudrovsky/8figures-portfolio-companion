# Task 003 — BUILDER Implementation
## Agent: BUILDER
## Input: design-docs/2026-03-27-audit-fixes.md
## Output: implemented code changes

## Objective
Read audit-fixes.md. Implement every fix exactly as designed.
Follow CLAUDE.md rules strictly.
Run npm run build after all changes — must exit 0.
Run npx ng test --watch=false — must exit 0, count ≥ 27.

## Constraints
- No architectural decisions — follow design exactly
- If design is unclear on any point — STOP and report
- No changes to config files
- No changes outside specified files

## Handoff Condition
Build passes + tests pass → pass to REVIEWER
