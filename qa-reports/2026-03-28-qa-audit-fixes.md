# QA Report — audit-fixes — 2026-03-28

## Result: PASS

## Tests Run
- Total: 30
- Passing: 30
- Failing: 0

---

## New Tests Added

All three new tests live inside the existing `describe('ChatService') > describe('streamResponse()')` block in
`/Users/prime/Documents/dev/ai/8figures/frontend/src/app/features/chat/services/chat.service.spec.ts`.

| # | Describe path | Test name | What it verifies |
|---|---------------|-----------|-----------------|
| 1 | `ChatService > streamResponse()` | `STREAMING_INTERVAL_MS: first character emits after exactly 15ms, not before` | Advances fake timers by 14ms and asserts zero emissions, then advances 1ms more (total 15ms) and asserts exactly one emission (`'h'`). Confirms the constant governs the interval lower bound. |
| 2 | `ChatService > streamResponse()` | `STREAMING_INTERVAL_MS: no emission before 15ms for single-character input` | Advances 14ms for a single-character string and asserts the emissions array remains empty. Guards against a regression where an immediate synchronous emit is added before the interval fires. |
| 3 | `ChatService > streamResponse()` | `STREAMING_INTERVAL_MS: stream completes on tick N+1 (at (N+1)*15ms) for length-N string` | Uses `'ab'` (N=2). Advances 30ms and asserts both characters emitted but `done === false`. Advances a further 15ms (total 45ms) and asserts `done === true`. Verifies the exhaustion-detection tick fires at `(N+1) * STREAMING_INTERVAL_MS`. |

### Implementation note — Test 3 timing

The task spec suggested `done === true` at `N * 15ms` (30ms for N=2). The actual implementation uses `setInterval`: on each tick it checks whether `index < text.length` and emits, then increments. The exhaustion branch (`index === text.length`) fires on the *next* tick after the last character is emitted — i.e., tick N+1. For `'ab'`, completion fires at tick 3 = 45ms.

This is not a bug. The existing suite's own test "completes after all characters are emitted" already validates this correctly by using `45ms` for `'AB'`. Test 3 follows the same correct model and documents the derivation explicitly in an inline comment. No implementation change was required or made.

---

## Test Exclusions

The following findings from the audit cycle do not require new spec additions:

| Finding | Reason no spec addition is needed |
|---------|----------------------------------|
| **W1** — `app.ts` `ChangeDetectionStrategy.OnPush` | `app.ts` is a root component. Components are out of scope for unit tests per QA rules (integration-tested via simulators). The property is verified by the reviewer's grep evidence. |
| **W2** — `app.html` deleted | Deletion of a dead file. No service behaviour changed. No testable surface area. |
| **W3** — `$any(` removed; `onInputChange` uses typed `Event` cast | `onInputChange` is a component method. Components are out of scope for unit tests. The reviewer's grep confirmed zero `$any(` occurrences. |
| **W4** — `sendMessage()` two-statement guard | `sendMessage` is a component method (in `chat-page.component.ts`), not a service method. Out of scope for unit tests. Guard correctness is verified by the reviewer's code-read evidence. |
| **I1** — `constructor` removed; `_icons` field added to both components | Both changes are in component files. Out of scope for unit tests. Verified by reviewer grep. |
| **NEW-1** — `@let p = portfolio()!;` in template | Template change in a component. Out of scope for unit tests. Verified by reviewer template read. |

---

## Implementation Bugs Found

None. All 30 tests pass against the current implementation without modification.

---

## Recommendation: SHIP
