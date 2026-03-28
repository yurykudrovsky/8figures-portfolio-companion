# Task NNN — [Title]
## Agent: SCOUT → ARCHITECT → SPECS → QA-FIRST → BUILDER → REVIEWER → QA-VERIFY
## Source: [requirement document reference]
## Branch: pipeline/NNN-description

## Integration Boundary
- Systems touched: [ ] Frontend only [ ] Backend only [ ] Full-stack
- If full-stack — list ALL layers requiring changes:
  * Frontend: [which services/components]
  * Backend: [which routes/services]
  * Database: [if applicable]
  * External API: [if applicable]

## Objective
[Clear description of what this task achieves]

## Acceptance Criteria

### Backend (if applicable)
- AC-B1: endpoint returns correct response shape
- AC-B2: error handling returns correct status codes
- AC-B3: curl test confirms endpoint works

### Frontend (if applicable)
- AC-F1: service contains HttpClient call to backend endpoint
- AC-F2: component displays response correctly
- AC-F3: loading/error/empty states implemented

### Integration (if full-stack)
- AC-I1: frontend service calls backend — grep confirms HttpClient
- AC-I2: data flows end-to-end: UI → Service → Backend → API → Response → UI
- AC-I3: tested on device — not just unit tests
- AC-I4: streaming visible character-by-character on simulator

## Deliverables
[Specific files to create/modify]

## Definition of Done
- [ ] TypeScript compiles zero errors
- [ ] All existing tests pass
- [ ] New tests cover AC criteria
- [ ] If full-stack: HttpClient grep confirms frontend calls backend
- [ ] If AI feature: response confirmed on iOS simulator
- [ ] If AI feature: response references actual portfolio data
- [ ] README updated if user-facing feature
- [ ] Committed with conventional commit message
