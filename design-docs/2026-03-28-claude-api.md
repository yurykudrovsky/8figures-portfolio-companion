# Design Doc — Real Claude API Integration — 2026-03-28

## Problem Statement

Task 013 identifies that the current `POST /api/chat` route (`backend/src/routes/chat.ts`) only
ever executes a local `buildResponse` function that pattern-matches on keywords and returns a
hard-coded string. The assessment explicitly scores "Real Implementation" and "AI chat quality",
making this gap a direct scoring risk.

Scout audit finding **I1** (session `2026-03-27T23-24-39-scout.md`) confirms the symptom from the
backend side: "`POST /api/chat` (CLAUDE.md API spec) is never called; all AI responses are
generated client-side via `setInterval`. Intentional for the mock, but backend spec and frontend
are permanently disconnected." The frontend does call the backend route correctly — it is the
backend route that provides no real AI response.

No CRITICAL findings block this work. The design adds a live path behind a feature flag
(`ANTHROPIC_API_KEY` present/absent) so the mock fallback remains fully functional in CI and on
machines without the key.

---

## Proposed Solution

Add `@anthropic-ai/sdk` and `dotenv` to the backend as runtime dependencies. Load the environment
at process startup. Refactor `chat.ts` to branch on the presence of `ANTHROPIC_API_KEY`: when the
key is present, stream a real Claude API response character-by-character over the existing SSE
wire format; when the key is absent, execute the existing `buildResponse` mock path unchanged.
The SSE format (`data: {"char":"X"}\n\n` ... `data: {"done":true}\n\n`) is kept identical on both
paths so the frontend requires zero changes. Tests mock the SDK at the module level so no real
API calls are made in CI.

---

## Interface Definitions

These interfaces are in addition to the existing models in `backend/src/models/portfolio.model.ts`.
BUILDER must not modify existing interfaces — only add new ones where noted.

```typescript
// New — backend/src/routes/chat.ts internal types only (not exported)

/**
 * Shape of a text-delta event emitted by the Anthropic SDK stream iterator.
 * The SDK's actual type is `RawMessageStreamEvent`; this narrows to the only
 * variant we consume.
 */
interface AnthropicTextDelta {
  type: 'content_block_delta';
  delta: {
    type: 'text_delta';
    text: string;
  };
}

/**
 * The subset of the Anthropic SDK stream that BUILDER must consume.
 * The real SDK object satisfies this contract; the test mock must also satisfy it.
 */
interface AnthropicStreamIterable {
  [Symbol.asyncIterator](): AsyncIterator<AnthropicTextDelta | { type: string }>;
}
```

No changes to `Portfolio`, `Holding`, `ChatMessage`, or `ChatRequest` are required.

---

## Data Flow Diagram

```
Frontend ChatService
        |
        | POST /api/chat  { message, context: { portfolio, messages } }
        v
backend/src/routes/chat.ts
        |
        |-- [400] message absent   --> res.status(400).json(...)
        |-- [400] portfolio absent --> res.status(400).json(...)
        |
        |-- process.env.ANTHROPIC_API_KEY present?
        |         YES                          NO
        |          |                            |
        |   buildSystemPrompt(portfolio)   buildResponse(message, portfolio)
        |          |                            |
        |   Anthropic client                setInterval 15 ms
        |   .messages.stream(...)               |
        |   async iterator                  char-by-char SSE
        |          |
        |   for await (event of stream)
        |     if text_delta: write each char as SSE frame
        |          |
        |   catch(err): write data: {"error":"..."}\n\n
        |
        v
        SSE wire: data: {"char":"X"}\n\n  ...  data: {"done":true}\n\n
        v
Frontend: assembles chars into message string, clears isStreaming flag
```

---

## Component Tree

This design touches only the backend. No frontend component changes.

```
backend/src/
  index.ts                      (MODIFY — add dotenv.config())
  routes/
    chat.ts                     (MODIFY — real/fallback split)
    portfolio.ts                (unchanged)
  models/
    portfolio.model.ts          (unchanged)
  services/                     (no new service; logic stays in route handler)
  data/
    mock-portfolio.ts           (unchanged)
  __tests__/
    chat.integration.test.ts    (MODIFY — mock SDK + add fallback test)
```

No new service file is introduced. The Anthropic client instantiation and `buildSystemPrompt`
helper are module-level in `chat.ts`. This is intentional: the route file owns its external
dependency, keeping the change surface minimal and the test mock straightforward.

---

## API Contract

### POST /api/chat (existing, behaviour extended)

**Request**

```typescript
interface ChatRequestBody {
  message: string;
  context: {
    portfolio: Portfolio;
    messages: ChatMessage[];
  };
}
```

**Response — 400 (unchanged)**

```typescript
interface ErrorResponse {
  error: string;   // 'message is required' | 'portfolio context is required'
}
```

**Response — 200 SSE stream (format unchanged)**

Content-Type: `text/event-stream`
Cache-Control: `no-cache`
Connection: `keep-alive`

Frame types emitted on the stream:

```typescript
// One frame per character
interface SseCharFrame {
  char: string;   // exactly one UTF-16 code unit
}

// Final frame
interface SseDoneFrame {
  done: true;
}

// Error frame (live path only — sent before res.end() if Claude API throws)
interface SseErrorFrame {
  error: string;
}
```

Each frame is serialised as:

```
data: <JSON.stringify(frame)>\n\n
```

No other endpoints are added or changed.

---

## System Prompt Template

BUILDER must use this exact template. The helper functions referenced (`formatCurrency`,
`formatDailyChange`) are defined as module-level pure functions inside `chat.ts`.

```typescript
// Pure helper — no side effects
function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Pure helper — no side effects
function formatDailyChange(dailyChange: number, dailyChangePercent: number): string {
  const sign = dailyChange >= 0 ? '+' : '';
  const formatted = dailyChange.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return `${sign}${formatted} (${sign}${dailyChangePercent.toFixed(2)}%)`;
}

// Builds the system prompt string from portfolio data
function buildSystemPrompt(portfolio: Portfolio): string {
  const holdingLines = portfolio.holdings
    .map(
      (h) =>
        `- ${h.ticker} (${h.name}): ${h.quantity} shares @ $${h.currentPrice.toFixed(2)}` +
        ` = ${formatCurrency(h.currentValue)}` +
        ` | P&L: ${h.gainLoss >= 0 ? '+' : ''}${formatCurrency(h.gainLoss)}` +
        ` (${h.gainLossPercent.toFixed(2)}%)`
    )
    .join('\n');

  return [
    'You are an AI financial advisor for 8FIGURES. Answer concisely and reference specific portfolio data.',
    '',
    'Portfolio Summary:',
    `- Total value: ${formatCurrency(portfolio.totalValue)}`,
    `- Daily change: ${formatDailyChange(portfolio.dailyChange, portfolio.dailyChangePercent)}`,
    '',
    'Holdings:',
    holdingLines,
    '',
    'Be direct and helpful. Reference specific tickers and numbers when answering.',
  ].join('\n');
}
```

---

## Claude API Call Shape

```typescript
// Model identifier — must be exactly this string
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

// Maximum tokens for chat response — keeps latency low for demo
const MAX_TOKENS = 1024;

// Message structure passed to the SDK
interface AnthropicMessagesStreamParams {
  model: typeof CLAUDE_MODEL;
  max_tokens: number;
  system: string;
  messages: Array<{
    role: 'user';
    content: string;
  }>;
}
```

The stream is obtained via `client.messages.stream(params)` where `client` is an `Anthropic`
instance. BUILDER iterates the stream with `for await...of`. On each event where
`event.type === 'content_block_delta'` and `event.delta.type === 'text_delta'`, BUILDER iterates
each character of `event.delta.text` and writes one SSE char frame per character. BUILDER must
not buffer the full response before streaming — write each character as it arrives.

---

## Dependency Specifications

### `@anthropic-ai/sdk`

- Install as a **runtime** dependency: `npm install @anthropic-ai/sdk`
- Version constraint: `^0.39.0` (latest stable as of March 2026; BUILDER must confirm exact
  latest with `npm info @anthropic-ai/sdk version` and use `^<latest>`)
- The SDK ships CommonJS and ESM builds. With `"module": "commonjs"` in `backend/tsconfig.json`
  and `esModuleInterop: true`, the default import `import Anthropic from '@anthropic-ai/sdk'`
  resolves correctly without `moduleNameMapper`.

### `dotenv`

- `dotenv` is **not** present in `backend/package.json` (confirmed: only `cors` and `express` are
  listed under `dependencies`).
- Install as a **runtime** dependency: `npm install dotenv`
- Version constraint: `^16.0.0`
- Rationale for runtime (not devDependency): `dotenv.config()` must execute when the compiled
  `dist/index.js` starts in production (`npm start`). A devDependency is stripped from production
  installs; the server would fail to load `.env` in any non-development environment.
- `@types/dotenv` is NOT required — `dotenv` v16 ships its own TypeScript declarations.

### `dotenv.config()` placement

Call `dotenv.config()` at the very top of `backend/src/index.ts`, before any import that reads
`process.env`. Because TypeScript compiles to CommonJS, top-level `require` order is synchronous
and deterministic, so placing the call before the route imports guarantees the environment is
populated when `chat.ts` is first evaluated and the module-level `Anthropic` client is
instantiated.

```typescript
// backend/src/index.ts — first two executable lines
import 'dotenv/config';   // side-effect import; equivalent to dotenv.config()
import express from 'express';
// ... rest unchanged
```

Using the side-effect import form (`import 'dotenv/config'`) is preferred over
`import dotenv from 'dotenv'; dotenv.config()` because it avoids an unused binding and is
idiomatic for modules that only need their side effects.

---

## Anthropic Client Instantiation

Instantiate the client **once at module level** in `chat.ts`, not per-request.

Rationale:
- The SDK creates an HTTP agent and reuses connections internally. Per-request instantiation
  destroys that benefit.
- Module-level instantiation means the variable is `undefined` when the key is absent — the
  branch check happens at request time, not at import time, so the module still loads cleanly
  in test environments where the key is not set.

```typescript
// At module level — evaluated once when the module is first imported
const apiKey = process.env['ANTHROPIC_API_KEY'];
const anthropicClient = apiKey ? new Anthropic({ apiKey }) : null;
```

The `null` guard means TypeScript knows `anthropicClient` may be `null`. The request handler
checks `anthropicClient !== null` to decide which path to take, and TypeScript narrows the type
inside that branch — no non-null assertions required.

---

## Test Mocking Strategy

The backend uses **Jest 29 + ts-jest** with `"module": "commonjs"` (confirmed from `tsconfig.json`
and `jest.config.js`). CommonJS module mocking with `jest.mock()` is fully supported — no
`moduleNameMapper` is needed for `@anthropic-ai/sdk`.

### Mock placement

At the top of `chat.integration.test.ts`, before any imports that trigger the `chat.ts` module
evaluation:

```typescript
// Mock must appear before the `import app from '../index'` line
jest.mock('@anthropic-ai/sdk', () => {
  // Minimal AsyncIterable that yields one text_delta then ends
  async function* fakeStream(): AsyncGenerator<
    { type: string; delta?: { type: string; text: string } }
  > {
    yield {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'NVDA is your best performer.' },
    };
  }

  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: {
      stream: jest.fn().mockReturnValue({
        [Symbol.asyncIterator]: fakeStream,
      }),
    },
  }));

  return { default: MockAnthropic };
});
```

Key points for BUILDER:

1. `jest.mock` is hoisted by Babel/ts-jest to before imports, so declaration order in the file
   does not matter — but writing it first is clearest.
2. The factory returns `{ default: MockAnthropic }` because `@anthropic-ai/sdk` uses a default
   export and `esModuleInterop: true` maps it to `default`.
3. The mock `fakeStream` yields text that contains `'NVDA'` so the existing "contains a holding
   ticker" test passes on the live path when the key is set in the test environment.
4. When `ANTHROPIC_API_KEY` is not in `process.env`, `anthropicClient` is `null` at module level
   and the mock is never called — the mock's presence does not interfere with the fallback path.

### New test — fallback when key is absent

```typescript
// Interface shape for new test (BUILDER writes the full test body)
interface FallbackTestContract {
  // Temporarily delete the key if it exists, call the route,
  // verify response contains a ticker, restore the key.
  // Use beforeEach/afterEach to isolate env mutation.
  name: 'falls back to mock response when ANTHROPIC_API_KEY is absent';
  assertionTarget: 'response text contains at least one known ticker';
  knownTickers: ['AAPL', 'NVDA', 'MSFT', 'BTC', 'ETH', 'VOO', 'TSLA', 'AMZN'];
}
```

Implementation note: Because `anthropicClient` is set at module level when `chat.ts` is first
imported, deleting `process.env['ANTHROPIC_API_KEY']` mid-test will not change an already-`null`
client. BUILDER must ensure the test runs in an environment where the key was never set, OR use
`jest.resetModules()` + dynamic `require` inside the test to re-evaluate the module. The simpler
approach is to rely on the CI environment having no key set, and to document that the test is
only guaranteed to exercise the fallback when the key is absent at module load time.

If the key IS present in the test environment (e.g., a developer running locally), the mock
intercepts the Anthropic call and returns `'NVDA is your best performer.'` — the fallback test
assertion (contains a known ticker) passes either way because both paths return ticker-containing
text. BUILDER should add a comment in the test file explaining this behaviour.

---

## File Map

| Action | File path | What changes |
|--------|-----------|--------------|
| MODIFY | `backend/package.json` | Add `"@anthropic-ai/sdk": "^0.39.0"` and `"dotenv": "^16.0.0"` under `dependencies` |
| MODIFY | `backend/src/index.ts` | Add `import 'dotenv/config';` as the first import |
| MODIFY | `backend/src/routes/chat.ts` | Add `buildSystemPrompt`, `formatCurrency`, `formatDailyChange` helpers; module-level `anthropicClient`; live path in router handler; keep existing `buildResponse` mock path intact |
| MODIFY | `backend/src/__tests__/chat.integration.test.ts` | Add `jest.mock('@anthropic-ai/sdk', ...)` factory at top; add new fallback test case |

No new files. No frontend files touched.

---

## Open Questions

All questions below are answered from codebase inspection. None are left unresolved.

**Q1: Does `dotenv` need to be a runtime or devDependency?**

Runtime (`dependencies`). The compiled server (`npm start`) runs `dist/index.js` which still
calls `dotenv.config()`. devDependencies are omitted from production `npm install --production`.
Placing `dotenv` in devDependencies would silently break production startup if a real `.env` file
is used. See Dependency Specifications section above.

**Q2: Should the Anthropic client be instantiated once at module level or per-request?**

Once at module level, guarded by a `null` check on the key. See Anthropic Client Instantiation
section above for the full rationale.

**Q3: How does ts-jest mock an ES module (`@anthropic-ai/sdk`) — does it need `moduleNameMapper` or `jest.mock()`?**

`jest.mock()` is sufficient. `backend/tsconfig.json` compiles to `"module": "commonjs"`, so
ts-jest transforms both the application code and the test file to CommonJS before Jest runs.
Jest's CommonJS module registry intercepts the `require('@anthropic-ai/sdk')` call and returns
the factory result. No `moduleNameMapper` entry is needed. The `esModuleInterop: true` flag means
the SDK's default export is accessed as `module.default` in the compiled output, which is why the
mock factory must return `{ default: MockAnthropic }`.

**Q4: Does the `.env` file at `backend/.env` already define `ANTHROPIC_API_KEY`?**

Yes — task 013 states "ANTHROPIC_API_KEY is in backend/.env (already created)". The file exists
at `backend/.env` (confirmed by Glob). BUILDER must not commit this file; it is (or must be)
listed in `.gitignore`.

**Q5: Will the 15 ms streaming interval test timeout be adequate for the live path?**

The live path does not use `setInterval`. The SSE frames are written synchronously inside the
`for await` loop as characters arrive from the Anthropic stream. In tests, the mock yields
instantly. The existing `testTimeout: 10000` in `jest.config.js` is more than sufficient.
