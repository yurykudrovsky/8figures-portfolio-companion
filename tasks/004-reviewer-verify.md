# Task 004 — REVIEWER Verification
## Agent: REVIEWER
## Input: all changed files + design-docs/2026-03-27-audit-fixes.md
## Output: review-reports/2026-03-27-review-audit-fixes.md

## Objective
Verify every change matches design exactly.
Check all CLAUDE.md rules are followed.
Produce PASS or FAIL report with evidence.

## Checklist
- Each finding from scout-002 is addressed
- No $any() in templates
- No constructor() bodies
- No bare magic numbers
- No non-null assertions
- OnPush on all components
- No orphaned files

## Output Format
Result: PASS | FAIL
Recommendation: APPROVE | REJECT | CONDITIONAL
Evidence: grep output per check

## Handoff Condition
Result: PASS → pass to QA
Result: FAIL → return to BUILDER with specific failures
