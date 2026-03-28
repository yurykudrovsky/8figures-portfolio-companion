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
