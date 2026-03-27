# Task 001 — SCOUT Audit
## Agent: SCOUT
## Input: audit-reports/scout-audit-001.md + full codebase
## Output: audit-reports/2026-03-27-scout-002.md

## Objective
Read existing audit-reports/scout-audit-001.md for context.
Audit current state of frontend/src/app and backend/src.
Report CONFIRMED/FIXED/NEW status for each finding.

## Scope
- frontend/src/app (all files recursively)
- backend/src (all files recursively)

## Output Format
Each finding must have:
- ID (W1-W5, I1 or NEW-n)
- Status: CONFIRMED | FIXED | NEW
- Location: exact file + line
- Evidence: exact code snippet
- Recommendation: one line

## Handoff Condition
Report complete with all findings statusd → pass to ARCHITECT
