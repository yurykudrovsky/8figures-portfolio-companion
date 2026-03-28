# Pipeline Failure Handling

## Philosophy
Failures are expected. The pipeline is designed to fail fast,
fail loudly, and recover cleanly. No agent silently swallows
errors. Every failure produces a structured report that the
Engineering Director can act on.

## Failure Scenarios

### 1. Agent Timeout
**Trigger:** Agent runs > 10 minutes without output
**Response:**
- Stop the agent session
- Narrow the task scope (split into smaller subtasks)
- Retry with reduced file scope
- Document in pipeline-log.md: TIMEOUT → RETRY

### 2. Build Failure (BUILDER stage)
**Trigger:** npm run build exits non-zero
**Response:**
- BUILDER must NOT proceed to next file
- BUILDER produces build-failure-report with exact error
- Return to ARCHITECT with specific error context
- ARCHITECT revises design for that specific file only
- BUILDER retries only the failed file
- Document in pipeline-log.md: BUILD FAIL → ARCHITECT RETRY

### 3. Test Failure (BUILDER or QA stage)
**Trigger:** npx ng test exits with failing tests
**Response:**
- QA must NEVER fix implementation to make tests pass
- QA produces test-failure-report with exact test names
- Return to BUILDER with specific failing test output
- BUILDER fixes implementation only — never changes tests
- Document in pipeline-log.md: TEST FAIL → BUILDER RETRY

### 4. REVIEWER FAIL
**Trigger:** Reviewer produces Result: FAIL
**Response:**
- Pipeline does NOT proceed to QA
- REVIEWER report contains exact file + line references
- Return to BUILDER with reviewer report
- BUILDER fixes only the flagged lines
- REVIEWER re-runs on changed files only
- Maximum 2 retry cycles before human escalation
- Document in pipeline-log.md: REVIEW FAIL → BUILDER RETRY

### 5. Human Escalation
**Trigger:** Any stage fails twice in retry cycle
**Response:**
- Pipeline pauses completely
- Engineering Director receives full failure report
- Human decides: fix manually, redesign task, or abandon
- Document in pipeline-log.md: ESCALATED TO HUMAN

### 6. Conflicting Agent Outputs
**Trigger:** BUILDER output contradicts ARCHITECT design
**Response:**
- REVIEWER flags the contradiction
- Return to ARCHITECT with specific conflict description
- ARCHITECT revises design
- BUILDER reimplements from revised design
- Document in pipeline-log.md: DESIGN CONFLICT → ARCHITECT REVISION

### 7. Full-Stack Integration Gap
**Trigger:** A task claims full-stack integration (e.g. "real API", "connect
frontend to backend") but the frontend service has no `HttpClient` call —
the feature works only at the backend layer while the frontend silently
continues using its local mock.

**Root cause:** Task decomposition described the feature as a backend change
only. ARCHITECT designed only the backend. BUILDER implemented only the
backend. REVIEWER did not run integration grep checks. The gap survived all
gates because no agent was required to verify the frontend-to-backend
connection.

**Detection (REVIEWER mandatory check):**
```bash
grep -n "HttpClient\|inject(HttpClient)" \
  frontend/src/app/features/*/services/*.ts
# Zero results for a "real API integration" task → REVIEWER FAIL
```

**Prevention checklist — all three layers must be satisfied:**
1. `tasks/TEMPLATE.md` Integration Boundary section filled in — lists every
   frontend service AND backend route that needs to change
2. SPECS writes AC-F1 (HttpClient grep) and AC-I2 (device end-to-end) for
   every full-stack task — missing these ACs is a SPECS failure
3. REVIEWER runs integration grep checks before issuing any PASS verdict —
   empty HttpClient grep on a "real API" task is automatic FAIL

**Recovery:**
- REVIEWER issues FAIL with finding: "Frontend service has no HttpClient —
  integration gap: frontend never calls backend"
- Return to ARCHITECT to extend design to include frontend service changes
- BUILDER implements frontend service HTTP layer
- REVIEWER re-runs integration greps to confirm fix
- QA-VERIFY runs device test (curl + iOS Simulator) to confirm end-to-end

**Real incident:** Task 013 (Claude API Integration, 2026-03-28) wired the
real Anthropic API into the backend correctly but left `ChatService.sendMessage()`
calling a local `buildResponse()` method — zero HTTP calls made. The gap
was caught in post-merge diagnosis, not by the pipeline. The three
prevention layers above close this gap permanently.

**Document in pipeline-log.md:** `INTEGRATION GAP → ARCHITECT REVISION → BUILDER RETRY`

## Recovery Principles
1. Always rollback to last passing commit before retry
2. Never accumulate broken state across retry cycles
3. Scope reduction is always preferred over full restart
4. Human gates exist precisely for unrecoverable failures

## Pipeline Log Format for Failures
Each failure entry in pipeline-log.md must include:
- Timestamp
- Stage that failed
- Failure type
- Action taken
- Outcome

## Future Improvement
Automated failure detection and retry logic will be handled
by the ORCHESTRATOR agent (see design-docs/future-agents.md).
Current implementation relies on human Engineering Director
to detect and act on failures.
