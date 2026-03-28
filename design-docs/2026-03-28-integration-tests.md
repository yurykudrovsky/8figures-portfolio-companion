# Design Doc — Supertest Integration Tests — 2026-03-28

## Problem Statement

The backend has no automated test coverage. The SCOUT audit (findings W-001
through W-005 and I-001 through I-002 from the 2026-03-28 audit report) flags
the absence of integration tests as a quality gap. Without tests there is no
safety net when routes, models, or mock data change. This design specifies
integration tests that exercise every public HTTP endpoint using Supertest,
giving BUILDER a concrete, executable contract to implement against.

## Proposed Solution

Add Jest as the test runner with ts-jest for TypeScript transpilation. Add
Supertest to issue real HTTP requests against the Express app without binding
to a port. The existing `backend/src/index.ts` already exports `app` as a
default export alongside `app.listen()`, so no structural refactoring of
exports is required — however `listen()` must not fire during tests. This is
achieved by guarding the `listen()` call behind a `require.main === module`
check. Two test files are created under `backend/src/__tests__/`: one covering
the portfolio and health endpoints, one covering the chat streaming endpoint.
The approach is self-contained, requires no running server process, and fits
the existing CommonJS (`"module": "commonjs"`) TypeScript configuration.

## Interface Definitions

These are the contracts BUILDER must satisfy. They live in test files only and
do not modify the production models.

```typescript
// Shape asserted on GET /api/portfolio response body
interface PortfolioResponseBody {
  id: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  lastUpdated: string;      // serialised as ISO string over HTTP
  holdings: HoldingResponseBody[];
}

// Shape asserted on each element of GET /api/portfolio/holdings
interface HoldingResponseBody {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  avgCostBasis: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  assetType: 'stock' | 'etf' | 'crypto' | 'bond';
}

// Shape of each SSE frame written by POST /api/chat
interface SseCharFrame {
  char: string;
}

interface SseDoneFrame {
  done: true;
}

type SseFrame = SseCharFrame | SseDoneFrame;

// Minimum request body required by POST /api/chat
interface ChatRequestBody {
  message: string;
  context: {
    portfolio: PortfolioResponseBody;
    messages: [];
  };
}

// Error response body returned on 400
interface ErrorResponseBody {
  error: string;
}
```

## Data Flow Diagram

```
Test file
    │
    │  import app (no listen)
    ▼
supertest(app)
    │
    │  in-process HTTP
    ▼
Express router
    │
    ├── GET  /api/health          ──► { status: 'ok', timestamp: '...' }
    │
    ├── GET  /api/portfolio       ──► mockPortfolio (spread + new Date())
    │
    ├── GET  /api/portfolio/holdings ──► mockPortfolio.holdings[]
    │
    ├── POST /api/chat            ──► text/event-stream
    │     body: { message, context.portfolio }    (character frames + done frame)
    │
    └── POST /api/chat (invalid)  ──► 400 { error: '...' }
```

## Component Tree

No new Angular components are involved. The test surface is the Express layer
only.

```
backend/
└── src/
    ├── index.ts                       MODIFY — guard listen() call
    └── __tests__/
        ├── portfolio.integration.test.ts   CREATE
        └── chat.integration.test.ts        CREATE
```

## API Contract

All contracts are pre-existing. They are documented here as the assertions the
tests must enforce.

### GET /api/health

- **Response 200**
  ```typescript
  { status: 'ok'; timestamp: string }
  ```

### GET /api/portfolio

- **Response 200** — `PortfolioResponseBody`
  - `id` is a non-empty string
  - `totalValue` is a positive number
  - `holdings` is an array with length ≥ 1

### GET /api/portfolio/holdings

- **Response 200** — `HoldingResponseBody[]`
  - Array length is exactly 8 (matches `mock-portfolio.ts` which defines 8
    entries; this count is a deliberate sentinel — if a developer adds or
    removes a holding without updating tests, the test fails)
  - Each element has all fields defined in `HoldingResponseBody`
  - `assetType` on each element is one of `'stock' | 'etf' | 'crypto' | 'bond'`

### POST /api/chat

- **Request body**
  ```typescript
  { message: string; context: { portfolio: Portfolio; messages: [] } }
  ```
- **Response 200**
  - `Content-Type` header is `text/event-stream`
  - Body is a sequence of lines matching `data: <json>\n\n`
  - Each `<json>` is either `SseCharFrame` or `SseDoneFrame`
  - Concatenating all `char` values from `SseCharFrame` frames produces the
    full response text

- **Response 400 — missing message**
  ```typescript
  // request: {}
  { error: 'message is required' }
  ```
- **Response 400 — missing portfolio context**
  ```typescript
  // request: { message: 'hello' }   (no context)
  { error: 'portfolio context is required' }
  ```

## SSE Stream Collection Pattern

`POST /api/chat` sends a `text/event-stream`. Supertest resolves its promise
only after the response has ended, so `response.text` contains the full
accumulated body when the assertion runs. BUILDER must use this pattern:

```typescript
// In every chat test, use .buffer(true) so Supertest accumulates the stream
// and .parse() to override the default binary parser for event-stream.
const response = await request(app)
  .post('/api/chat')
  .set('Content-Type', 'application/json')
  .set('Accept', 'text/event-stream')
  .buffer(true)
  .parse((res, callback) => {
    let data = '';
    res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    res.on('end', () => { callback(null, data); });
  })
  .send(body);

// response.body is now the raw string; parse SSE frames from it:
function parseSseFrames(raw: string): SseFrame[] {
  return raw
    .split('\n\n')
    .filter((block) => block.startsWith('data: '))
    .map((block) => JSON.parse(block.slice('data: '.length)) as SseFrame);
}
```

This pattern avoids timing issues, requires no real server, and produces a
deterministic string that assertions can inspect.

## Exact Test Cases

### `portfolio.integration.test.ts`

| # | Name | Method + Path | Assertion |
|---|------|---------------|-----------|
| 1 | health returns 200 with ok status | GET /api/health | status 200; `body.status === 'ok'`; `body.timestamp` is a string |
| 2 | portfolio returns 200 with Portfolio shape | GET /api/portfolio | status 200; body has `id`, `totalValue`, `dailyChange`, `dailyChangePercent`, `lastUpdated`, `holdings`; `holdings.length >= 1` |
| 3 | portfolio totalValue is a positive number | GET /api/portfolio | `body.totalValue > 0` |
| 4 | holdings returns array of 8 Holding objects | GET /api/portfolio/holdings | status 200; `body` is an array; `body.length === 8` |
| 5 | each holding has required fields | GET /api/portfolio/holdings | every element has all `HoldingResponseBody` fields present and typed correctly |

### `chat.integration.test.ts`

| # | Name | Method + Path | Assertion |
|---|------|---------------|-----------|
| 1 | returns 400 when message is absent | POST /api/chat body `{}` | status 400; `body.error === 'message is required'` |
| 2 | returns 400 when portfolio context is absent | POST /api/chat body `{ message: 'hello' }` | status 400; `body.error === 'portfolio context is required'` |
| 3 | streams text/event-stream content type | POST /api/chat with valid body | status 200; `Content-Type` header includes `text/event-stream` |
| 4 | stream body starts with data: prefix | POST /api/chat with valid body | first non-empty line of `response.text` starts with `data:` |
| 5 | response text contains a holding ticker | POST /api/chat message "How is my portfolio doing?" | collected full text contains at least one of: `AAPL`, `NVDA`, `MSFT`, `BTC`, `ETH`, `VOO`, `TSLA`, `AMZN` |
| 6 | response text contains a holding name | POST /api/chat message "What is my best performer?" | collected full text contains at least one of: `Apple`, `NVIDIA`, `Microsoft`, `Bitcoin`, `Ethereum`, `Vanguard`, `Tesla`, `Amazon` |

For tests 3–6 the request body must include a valid `context.portfolio` drawn
from the mock data. BUILDER must import `mockPortfolio` from
`../data/mock-portfolio` and cast it to `unknown` then to the HTTP body type to
avoid circular model dependency issues.

## File Map

| Action | File path | What changes |
|--------|-----------|--------------|
| MODIFY | `backend/src/index.ts` | Wrap `app.listen()` in `if (require.main === module)` guard so Supertest can import `app` without starting the HTTP server |
| MODIFY | `backend/package.json` | Add `supertest`, `@types/supertest`, `jest`, `@types/jest`, `ts-jest` to `devDependencies`; add `"test": "jest"` script; add `jest` configuration field (see below) |
| CREATE | `backend/jest.config.js` | Jest + ts-jest configuration (see below) |
| CREATE | `backend/src/__tests__/portfolio.integration.test.ts` | 5 test cases covering health, portfolio, and holdings endpoints |
| CREATE | `backend/src/__tests__/chat.integration.test.ts` | 6 test cases covering chat validation, SSE content type, and stream content |

### `backend/jest.config.js` specification

```javascript
// BUILDER must produce a file matching this shape exactly
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Increase timeout for SSE streaming tests (stream runs at 15ms per char;
  // a typical response is ~200 chars — allow 10 seconds to be safe)
  testTimeout: 10000,
};
```

### `backend/package.json` additions

New `devDependencies` entries:
```json
"@types/jest": "^29.5.12",
"@types/supertest": "^6.0.2",
"jest": "^29.7.0",
"supertest": "^7.0.0",
"ts-jest": "^29.1.4"
```

New script entry:
```json
"test": "jest"
```

### `backend/tsconfig.json` note

The existing `tsconfig.json` uses `"include": ["src/**/*"]`. Because the test
files live at `backend/src/__tests__/`, they fall within `src/**/*` and are
already covered. **No change to `tsconfig.json` is required.** BUILDER must
verify this before creating a separate tsconfig for tests.

## Open Questions

All questions below are answered from the codebase. BUILDER may proceed without
further clarification.

**Q1: Is a test runner already configured in `backend/package.json`?**
No. The `scripts` object contains only `dev`, `build`, and `start`. The
`devDependencies` contain no Jest, Mocha, Vitest, or other test runner. BUILDER
must add Jest from scratch.

**Q2: Does `index.ts` already export `app` or does it only call `app.listen()`?**
It does both: `app` is exported as `export default app` on line 23, and
`app.listen()` is called unconditionally on line 19. The export is present, but
the unconditional `listen()` means importing the module in tests will start a
real server and attempt to bind the port. BUILDER must add the
`require.main === module` guard around the `listen()` call to prevent this.

**Q3: Does the chat route require a `context.portfolio` object in the request body, or does it use mock data internally?**
It requires the caller to supply `context.portfolio`. `chat.ts` lines 55–58
explicitly check `body.context?.portfolio` and return a 400 if it is absent.
The route never falls back to `mockPortfolio` internally. Tests that exercise
the streaming path must therefore include a valid `Portfolio` object in the
request body. BUILDER must import `mockPortfolio` from the data module and
include it in the `context.portfolio` field of every chat test request that
expects a 200 response.

**Q4: What is the exact SSE frame format?**
Each frame is written as `data: ${JSON.stringify({ char })}\n\n` or
`data: ${JSON.stringify({ done: true })}\n\n`. There is no `event:` line, no
`id:` line. Assertions on frame format must match this exact structure.

**Q5: Does the 15ms streaming interval create timing problems for Supertest?**
No. Supertest's `.buffer(true)` with a custom `.parse()` handler waits for the
`end` event, which fires after `res.end()` is called in the route. The stream
terminates cleanly on the done frame. At 15ms per character, a 300-character
response completes in 4.5 seconds, well within the 10-second `testTimeout`
specified in `jest.config.js`.
