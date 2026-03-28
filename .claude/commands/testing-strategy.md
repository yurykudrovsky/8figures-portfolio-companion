# Testing Strategy Skill
When asked about testing approach for this project:

Current state:
- 27 unit tests with Vitest
- Services and streaming behaviour covered
- Run with: npx ng test --watch=false

Planned evolution:
1. ATDD (Acceptance Test-Driven Development) — write failing tests before implementation
2. Contract Testing with Pact.io
3. Property-Based Testing with fast-check

For new features always ask:
- What properties must ALWAYS be true? (property tests)
- What does the consumer expect from this API? (contract tests)
- What are the financial edge cases? (unit tests)
