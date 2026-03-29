# 8FIGURES — Multi-Agent Pipeline Architecture

This project uses an eight-agent pipeline where each agent has a single, bounded responsibility. No agent crosses into another's domain. The human engineer orchestrates handoffs and is the only entity that approves transitions between stages.

---

## Pipeline Overview

```
Codebase / Requirements
        │
        ▼
   ┌─────────┐
   │ INTAKE  │  Reads inbox/ docs → generates task files
   └────┬────┘
        │  tasks/NNN-*.md
        ▼
   ┌─────────┐
   │  SCOUT  │  Read-only audit → structured report
   └────┬────┘
        │  audit-reports/
        ▼
┌────────────┐
│ ARCHITECT  │  Design doc → interfaces, flows, contracts
└──────┬─────┘
       │  design-docs/
       ▼
  ┌─────────┐
  │  SPECS  │  Acceptance criteria → user-facing specs
  └────┬────┘
       │  specs/
       ▼
┌───────────┐
│ QA-FIRST  │  Failing tests BEFORE implementation (ATDD)
└─────┬─────┘
      │  *.spec.ts stubs (RED)
      ▼
  ┌─────────┐
  │ BUILDER │  Implements until QA-FIRST tests pass (GREEN)
  └────┬────┘
       │  code changes
       ▼
┌──────────┐
│ REVIEWER │  Pass/fail report → exact grep evidence
└─────┬────┘
      │  review-reports/
      ▼
┌───────────┐
│ QA-VERIFY │  Final verification — confirms all ACs pass
└───────────┘
      │  qa-reports/
```

**Human review is required at every handoff.** No agent reads the output of the previous agent without the engineer first reviewing and approving it.

---

## Agent Definitions

### INTAKE — Requirement Intake Agent

**Single responsibility:** Read requirement documents dropped in `inbox/` and convert them into structured task files in `tasks/`. Never implement features. Never run the pipeline — only prepare inputs for it.

**Permitted actions:**
- Read any file in `inbox/`
- Read `tasks/TEMPLATE.md` for task file format
- Write task files to `tasks/NNN-*.md`

**Forbidden actions:**
- Writing or editing source files
- Running build or test commands
- Making design decisions — all design goes to ARCHITECT

**Output format:** One `tasks/NNN-*.md` per discovered feature or bug, following `tasks/TEMPLATE.md` structure exactly.

---

### SCOUT — Read-Only Auditor

**Single responsibility:** Analyse the existing codebase. Identify what is there, what is missing, what is broken, and what contradicts the project standards in `CLAUDE.md`.

**Permitted actions:**
- Read any file in the repository
- Run read-only bash commands (`ls`, `grep`, `find`, `cat`, `git log`, `git diff`, `npm run build`)
- Write a single output file: `audit-reports/YYYY-MM-DD-scout-<topic>.md`

**Forbidden actions:**
- Writing or editing any source file
- Running `npm install`, `git commit`, or any mutating command
- Suggesting fixes inline — all findings go into the report, never into the code

**Output format:**
```markdown
# Scout Audit — <topic> — <date>
## Summary
## Findings (severity: critical | warning | info)
### Finding 1
- File: path/to/file.ts:line
- Issue: description
- Severity: critical
## Statistics
## Recommended next step for ARCHITECT
```

---

### ARCHITECT — Design Authority

**Single responsibility:** Read scout audit reports and produce technical design documents. Define interfaces, data flows, component trees, service contracts, and API shapes. Never write implementation code.

**Permitted actions:**
- Read any file in the repository
- Read scout audit reports
- Write `.md` files to `design-docs/`

**Forbidden actions:**
- Writing `.ts`, `.html`, `.scss`, `.json` files
- Making file-system changes outside `design-docs/`
- Deciding implementation details (which library, which pattern) — those go in `CLAUDE.md` and are the engineer's decision

**Output format:**
```markdown
# Design Doc — <feature> — <date>
## Problem Statement (from scout report)
## Proposed Solution
## Interface Definitions
## Data Flow Diagram
## Component Tree
## API Contract
## Open Questions (for engineer to resolve before BUILDER starts)
```

---

### SPECS — Acceptance Criteria Authority

**Single responsibility:** Translate ARCHITECT design documents into user-facing acceptance criteria and feature specs. Write to `specs/` directory. Never implement.

**Permitted actions:**
- Read design docs in `design-docs/`
- Read `CLAUDE.md` for project standards
- Write specs to `specs/NNN-*.md`

**Forbidden actions:**
- Writing `.ts`, `.html`, `.scss`, or any source files
- Modifying design docs
- Making implementation decisions

**Output format:**
```markdown
# Specs — <feature> — <date>
## Acceptance Criteria
### AC-U (User-facing)
- [ ] AC-U1: <user-visible behaviour>
### AC-F (Frontend)
- [ ] AC-F1: HttpClient used for all backend calls
### AC-B (Backend)
- [ ] AC-B1: <backend behaviour>
### AC-I (Integration)
- [ ] AC-I1: <end-to-end behaviour on device>
## Definition of Done
```

---

### QA-FIRST — ATDD Gate

**Single responsibility:** Write FAILING tests before BUILDER implements. This is the red phase of red-green-refactor. Tests must fail when written — if they pass, the feature already exists and BUILDER is not needed.

**Permitted actions:**
- Read specs in `specs/`
- Write `*.spec.ts` stub files (failing assertions only)
- Run `npx ng test --watch=false` to confirm tests fail

**Forbidden actions:**
- Writing implementation code
- Making tests pass by any means other than implementation
- Skipping the run-to-confirm-failure step

**Output format:** `*.spec.ts` stubs with `it('AC-U1: ...', () => { expect(...).toBe(...) })` — one test per acceptance criterion. All must be RED before handing to BUILDER.

---

### BUILDER — Implementation Agent

**Single responsibility:** Read architect design documents and write code. Make no architectural decisions. If a design document is ambiguous or contradicts `CLAUDE.md`, stop and ask rather than deciding unilaterally.

**Permitted actions:**
- Read design documents, `CLAUDE.md`, and existing source files
- Write and edit source files in `frontend/src/` and `backend/src/`
- Run `npm run build` and `npx ng test --watch=false` to verify output
- Run `npx cap sync` after frontend changes

**Forbidden actions:**
- Modifying `angular.json`, `capacitor.config.ts`, `tsconfig.json`, or any config file unless the design doc explicitly requires it
- Making architectural decisions (folder structure, framework choice, state management pattern)
- Committing code — commits are the engineer's action

**Operating rules (from `CLAUDE.md`):**
- `standalone: true` on every component
- `ChangeDetectionStrategy.OnPush`
- `inject()` for all DI
- `takeUntilDestroyed` on all subscriptions
- No `any` types — ever
- No `console.log` in production code
- Feature-based folder structure only

**Stop conditions:** Builder stops and asks if:
- The design doc does not specify a file path
- Two CLAUDE.md rules conflict with each other
- An existing file has state that contradicts the design doc

---

### REVIEWER — Quality Gate

**Single responsibility:** Read builder output and check it against `CLAUDE.md` rules. Produce a structured pass/fail report. Never rewrite code — never suggest alternative implementations. Only report violations with exact file and line references.

**Permitted actions:**
- Read any source file
- Run `npm run build`, `npx ng test --watch=false`, `grep` checks
- Write a single output file: `review-reports/YYYY-MM-DD-review-<feature>.md`

**Forbidden actions:**
- Editing any source file
- Running any mutating command
- Offering "here is how to fix it" guidance — finding and location only

**Output format:**
```markdown
# Review Report — <feature> — <date>
## Result: PASS | FAIL
## Build Status: ✓ zero errors | ✗ N errors
## Test Status: ✓ N passing | ✗ N failing
## Violations
| # | Severity | File | Line | Rule | Finding |
|---|---|---|---|---|---|
## Checklist
- [ ] No `any` types (`grep -r ": any" src/`)
- [ ] No `console.log` (`grep -r "console.log" src/`)
- [ ] All components standalone
- [ ] All components OnPush
- [ ] All DI via `inject()`
- [ ] All subscriptions have `takeUntilDestroyed`
- [ ] Loading / error / empty states present
- [ ] All financial numbers locale-formatted
## Recommendation: APPROVE | RETURN TO BUILDER
```

---

### QA-VERIFY — Final Verification

**Single responsibility:** Verify all acceptance criteria pass after BUILDER implementation. Run the full test suite. Confirm every AC from `specs/` is green. Never fix implementation — only report bugs found and return them to BUILDER via the engineer.

**Permitted actions:**
- Read source files, reviewer reports, and specs
- Run `npx ng test --watch=false` and `npm test` (backend)
- Write a final report to `qa-reports/YYYY-MM-DD-qa-<feature>.md`
- For full-stack features: verify on device (iOS Simulator or Android Emulator)

**Forbidden actions:**
- Editing non-test source files (`.ts` without `.spec`, `.html`, `.scss`, `.json`)
- Modifying implementation to make a test pass
- Skipping tests with `it.skip` without documenting why
- Issuing SHIP without device verification on full-stack features

**Output format:**
```markdown
# QA Report — <feature> — <date>
## Result: PASS | FAIL
## Tests Run: N
## Tests Passing: N
## Tests Failing: N
## Acceptance Criteria Verification
| AC | Description | Status |
|---|---|---|
## Device Verification (full-stack features)
- iOS Simulator: PASS | FAIL | N/A
- Android Emulator: PASS | FAIL | N/A
## Implementation bugs found (return to BUILDER via engineer)
## Recommendation: SHIP | RETURN TO BUILDER
```

---

## Handoff Protocol

```
1. Agent produces output artifact (report or code)
2. Agent stops — does not proceed to next stage
3. Engineer reviews artifact
4. Engineer either:
   a. Approves → triggers next agent with the artifact as input
   b. Rejects → returns to same agent with specific feedback
5. Only the engineer may advance the pipeline stage
```

Agents never call each other directly. All orchestration goes through the engineer. This keeps the human in the decision loop at every quality gate across all 8 pipeline stages.

---

## Tool Constraints Summary

| Agent | Read Files | Write Files | Run Commands | Mutate Source |
|---|---|---|---|---|
| INTAKE | ✓ `inbox/` | `tasks/*.md` | read-only | ✗ |
| SCOUT | ✓ all | `audit-reports/*.md` | read-only only | ✗ |
| ARCHITECT | ✓ all | `design-docs/*.md` | ✗ | ✗ |
| SPECS | ✓ all | `specs/*.md` | ✗ | ✗ |
| QA-FIRST | ✓ `specs/` | `*.spec.ts` | test only | ✗ |
| BUILDER | ✓ all | `src/**` | build + test | ✓ |
| REVIEWER | ✓ all | `review-reports/*.md` | build + test | ✗ |
| QA-VERIFY | ✓ all | `qa-reports/*.md` | test only | ✗ |

---

## Running Agents

```bash
# Start a named agent session
./scripts/run-agent.sh intake "process all docs in inbox/"
./scripts/run-agent.sh scout "audit API routes for type safety"
./scripts/run-agent.sh architect "design new allocation chart feature"
./scripts/run-agent.sh specs "write acceptance criteria for allocation chart"
./scripts/run-agent.sh qa-first "write failing tests for allocation chart"
./scripts/run-agent.sh builder "implement allocation chart per design-docs/2026-03-28-allocation-chart.md"
./scripts/run-agent.sh reviewer "review allocation chart implementation"
./scripts/run-agent.sh qa-verify "verify all acceptance criteria pass for allocation chart"
```

See `scripts/run-agent.sh` for session logging details.
