# Testing Strategy Skill
When asked about testing approach for this project:

Current state:
- 42 tests — 30 frontend (Vitest) + 12 backend (Jest + Supertest)
- Services and streaming behaviour covered
- Run with: npx ng test --watch=false (frontend) / npm test (backend)

ATDD now active — QA-FIRST agent writes failing tests before BUILDER implements (red-green-refactor pipeline)

Planned evolution:
1. Contract Testing with Pact.io
2. Property-Based Testing with fast-check

For new features always ask:
- What properties must ALWAYS be true? (property tests)
- What does the consumer expect from this API? (contract tests)
- What are the financial edge cases? (unit tests)
