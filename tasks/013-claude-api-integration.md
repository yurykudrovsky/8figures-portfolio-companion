# Task 013 — Real Claude API Integration
## Source: challenge.pdf — "Technical Execution 15%", "Real Implementation"
## Agent: ARCHITECT → BUILDER → REVIEWER → QA
## Priority: HIGH — assessment scoring criterion

## Objective
Replace mock chat streaming with real Anthropic Claude API.
The assessment PDF explicitly lists "Real Implementation" as an
option and "AI chat quality" as a scoring criterion. We have the
API key — use it.

## Context
- ANTHROPIC_API_KEY is in backend/.env (already created)
- Frontend already handles SSE streaming correctly — no frontend changes
- Backend route POST /api/chat needs to call real Claude API
- Model: claude-haiku-4-5-20251001 (fast, cost-effective for demo)

## Deliverables — Backend

### Install dependency
npm install @anthropic-ai/sdk in backend/

### Load environment
Install dotenv or use process.env directly (check if dotenv
already present in backend/package.json)

### Update backend/src/routes/chat.ts
- Load ANTHROPIC_API_KEY from process.env
- If key present: call Claude API with streaming
- If key absent: fall back to existing mock implementation (graceful)
- System prompt must include full portfolio context:
  - Total value, daily change
  - All holdings: ticker, name, value, gain/loss
  - Instruction: respond as a helpful financial advisor
- Stream Claude's response via SSE in same format as mock:
  data: {"char": "X"}\n\n per character
  data: {"done": true}\n\n when complete
- Keep existing 400 validation (message required, portfolio required)

### System prompt template
```
You are an AI financial advisor for the 8FIGURES portfolio app.
The user's portfolio:
- Total value: $X,XXX.XX
- Daily change: +/- $X,XXX.XX (X.XX%)
- Holdings:
  * TICKER (Name): X shares @ $XX.XX = $XX,XXX.XX, gain/loss: X.XX%
  [... all holdings]

Answer questions about the portfolio concisely. Reference specific
holdings and numbers. Be helpful and direct.
```

## Deliverables — Tests
Update backend integration tests for real API:
- Mock the Anthropic SDK in chat.integration.test.ts so tests
  don't make real API calls
- Tests must still pass without a live API key
- Add a test that verifies fallback works when key is absent

## Definition of Done
1. npm run build exits 0
2. All 41 tests pass (with SDK mocked in tests)
3. Real Claude API responds in chat when ANTHROPIC_API_KEY set
4. Graceful fallback to mock when key absent
5. SSE streaming works end-to-end in iOS Simulator
