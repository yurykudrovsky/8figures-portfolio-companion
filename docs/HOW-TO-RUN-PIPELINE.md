# How to Run the Pipeline — End to End

## Overview

This project uses a 7-stage ATDD multi-agent pipeline. Every feature goes through all 7 stages with human gates between each. No agent advances without explicit engineer approval.

```
SCOUT → ARCHITECT → SPECS → QA-FIRST → BUILDER → REVIEWER → QA-VERIFY
```

INTAKE is an optional stage 0 for requirement-driven development (drop docs in `inbox/`, INTAKE generates task files automatically).

---

## Prerequisites

- Claude Code installed and authenticated (`claude --version`)
- Claude Pro subscription (agents use `claude-sonnet-4-6`)
- Git configured with your identity
- Node.js 24+
- Backend running: `cd backend && npm run dev`

---

## Step-by-Step: Running a Pipeline

### Step 1 — Create a task file

Copy `tasks/TEMPLATE.md` to `tasks/NNN-your-feature.md` (use the next available number):

```bash
cp tasks/TEMPLATE.md tasks/016-your-feature.md
```

Fill in all required sections:

| Section | What to write |
|---------|---------------|
| **Integration Boundary** | `frontend-only`, `backend-only`, or `full-stack` |
| **Objective** | One sentence — what this feature does |
| **Acceptance Criteria** | AC-B (backend), AC-F (frontend), AC-I (integration/device) |
| **Definition of Done** | Checklist — build, tests, device, states |

> For full-stack features: AC-F1 must include `HttpClient` usage, AC-I1 must include device verification. These are mandatory — REVIEWER will FAIL without them.

---

### Step 2 — Create pipeline branch

```bash
git checkout main
git pull origin main
git checkout -b pipeline/016-your-feature
```

Branch naming convention: `pipeline/NNN-short-description` where NNN matches the task file number.

---

### Step 3 — Run SCOUT *(optional for new features, mandatory for bug fixes)*

In Claude Code:

```
You are SCOUT. Read .claude/agents/scout.md for your context.
Audit the codebase for issues related to [feature area].
Write findings to audit-reports/YYYY-MM-DD-scout-NNN.md
```

**Human gate — approve if:**
- [ ] Report written to `audit-reports/`
- [ ] All findings have file + line number
- [ ] No unexpected CRITICAL findings
- [ ] Build and test status documented

---

### Step 4 — Run ARCHITECT

```
You are ARCHITECT. Read .claude/agents/architect.md for your context.
Read tasks/016-your-feature.md and audit-reports/latest.md (if scout ran).
Design the complete solution.
Write design document to design-docs/YYYY-MM-DD-your-feature.md
```

**Human gate — approve if:**
- [ ] Design doc written to `design-docs/`
- [ ] All open questions answered before continuing
- [ ] File map present (every file to create/modify/delete listed)
- [ ] No source files were modified by ARCHITECT

---

### Step 5 — Run SPECS

```
You are SPECS. Read .claude/agents/specs.md for your context.
Read design-docs/YYYY-MM-DD-your-feature.md.
Write acceptance criteria to specs/YYYY-MM-DD-your-feature.md
```

**Human gate — approve if:**
- [ ] Every AC is testable (has a pass/fail condition)
- [ ] AC-F1 requires `HttpClient` for any full-stack feature
- [ ] AC-I series includes device verification for full-stack features
- [ ] No source files were modified by SPECS

---

### Step 6 — Run QA-FIRST *(ATDD red phase)*

```
You are QA-FIRST. Read .claude/agents/qa-first.md for your context.
Read specs/YYYY-MM-DD-your-feature.md.
Write FAILING tests that cover all acceptance criteria.
Run the test suite — confirm all new tests fail before handing off.
```

**Human gate — approve if:**
- [ ] New `*.spec.ts` stubs exist covering every AC
- [ ] Test run confirms all new tests are RED (failing)
- [ ] No implementation code was written by QA-FIRST

---

### Step 7 — Run BUILDER

```
You are BUILDER. Read .claude/agents/builder.md for your context.
Read design-docs/YYYY-MM-DD-your-feature.md and specs/YYYY-MM-DD-your-feature.md.
Implement the feature until all QA-FIRST tests pass (green phase).
Run npm run build after each file change — must exit zero errors.
Run npx ng test --watch=false after all changes — all tests must pass.
```

**Human gate — approve if:**
- [ ] `npm run build` exits 0
- [ ] `npx ng test --watch=false` — all tests pass (count ≥ previous + new tests)
- [ ] Only files in the design doc's file map were touched
- [ ] No config files modified unless explicitly in the design doc

---

### Step 8 — Run REVIEWER

```
You are REVIEWER. Read .claude/agents/reviewer.md for your context.
Review all changed files against CLAUDE.md rules.
Run all mandatory grep checks (including HttpClient check for full-stack features).
Write report to review-reports/YYYY-MM-DD-review-your-feature.md
```

**Mandatory grep checks REVIEWER must run:**

```bash
grep -r ": any" frontend/src --include="*.ts" | grep -v ".spec."  # must be 0
grep -r "console.log" frontend/src --include="*.ts"               # must be 0
grep -rn "HttpClient" frontend/src/app/features/*/services/*.ts   # full-stack: must match
```

**Human gate:**
- If **FAIL** → return to BUILDER with the exact violations table. Do not skip to QA.
- If **PASS** → approve and continue to QA-VERIFY.

---

### Step 9 — Run QA-VERIFY

```
You are QA-VERIFY. Read .claude/agents/qa.md for your context.
Read review-reports/YYYY-MM-DD-review-your-feature.md — confirm PASS before starting.
Run full test suite. Verify every AC from specs/ passes.
For full-stack or AI features — verify on device (iOS Simulator + Android Emulator).
Write report to qa-reports/YYYY-MM-DD-qa-your-feature.md
```

**Human gate:**
- If **SHIP** → proceed to Step 10.
- If **RETURN TO BUILDER** → fix the reported bugs, re-run from Step 7. Do not re-run REVIEWER or QA-VERIFY until BUILDER has fixed all findings.

> SHIP is blocked without device verification for any feature with a frontend-backend boundary.

---

### Step 10 — Create PR and merge

```bash
git push -u origin pipeline/016-your-feature

gh pr create \
  --base main \
  --head pipeline/016-your-feature \
  --title "feat: your feature description" \
  --body "$(cat qa-reports/YYYY-MM-DD-qa-your-feature.md)"
```

After PR is reviewed:

```bash
gh pr merge NNN --squash --delete-branch
git checkout main
git pull origin main
```

---

## Failure Handling

| Failure | Action |
|---------|--------|
| BUILDER: build fails | Fix immediately — never commit broken code |
| BUILDER: tests fail | Fix before handing to REVIEWER |
| REVIEWER: FAIL | Return to BUILDER with violations table — max 2 retry cycles |
| QA-VERIFY: RETURN | Return to BUILDER — QA never fixes implementation |
| Any stage fails twice | Escalate to human — stop pipeline, read `design-docs/pipeline-failure-handling.md` |

Full failure protocol: [`design-docs/pipeline-failure-handling.md`](../design-docs/pipeline-failure-handling.md)

---

## Parallel Execution (Advanced)

Two pipelines can run simultaneously using git worktrees:

```bash
# Create isolated worktrees for parallel pipelines
git worktree add ../8figures-pipeline-016 pipeline/016-feature-a
git worktree add ../8figures-pipeline-017 pipeline/017-feature-b

# Each worktree is fully independent — run agents in parallel
# Merge sequentially after both QA gates pass (lowest NNN first)
```

See `ARCHITECTURE.md` — "Parallel Execution via Git Worktrees" for the full protocol. Demonstrated in Pipeline runs 005 + 006.

---

## Quick Reference

```bash
# Full pipeline invocation pattern (all agents)
./scripts/run-agent.sh scout      "audit [area] — write to audit-reports/"
./scripts/run-agent.sh architect  "design [feature] — write to design-docs/"
./scripts/run-agent.sh specs      "write acceptance criteria — write to specs/"
./scripts/run-agent.sh qa-first   "write failing tests — confirm RED before handoff"
./scripts/run-agent.sh builder    "implement [feature] per design-docs/[file].md"
./scripts/run-agent.sh reviewer   "review [feature] — write to review-reports/"
./scripts/run-agent.sh qa-verify  "verify all ACs pass — write to qa-reports/"

# Optional stage 0 (requirement-driven)
./scripts/run-agent.sh intake     "process all docs in inbox/"
```

All agent context files: `.claude/agents/`
All task templates: `tasks/TEMPLATE.md`
Pipeline run history: `tasks/README.md`
