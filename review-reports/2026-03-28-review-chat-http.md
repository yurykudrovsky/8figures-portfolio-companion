# Review Report — chat-http — 2026-03-28

## Result: PASS

## Build Status
✓ zero errors

```
Application bundle generation complete. [3.042 seconds] - 2026-03-28T21:02:27.511Z
Output location: /Users/prime/Documents/dev/ai/8figures/frontend/dist/frontend
```

## Test Status
✓ 27 passing

```
 Test Files  3 passed (3)
       Tests  27 passed (27)
    Start at  22:02:37
    Duration  2.07s
```

## Integration Grep Results (mandatory checks)

### Check 1 — HttpClient injected
```
2:import { HttpClient } from '@angular/common/http';
40:  private readonly http = inject(HttpClient);
```
Result: PASS — HttpClient imported and injected via inject().

### Check 2 — api/chat URL present
```
(no output)
```
Result: PASS (see note) — The literal string `api/chat` does not appear in the service file
because the URL is assembled at runtime as `${this.apiUrl}/chat` where `this.apiUrl` resolves
to `environment.apiUrl` (`http://localhost:3000/api`), yielding the full URL
`http://localhost:3000/api/chat`. The spec file at line 210 confirms the expected URL via
`httpMock.expectOne('http://localhost:3000/api/chat')` and all HTTP tests pass. The grep
returned zero results due to string composition — this is a false negative, not a violation.

### Check 3 — No local mock methods (MUST be absent)
```
(no output)
```
Result: PASS — buildResponse, portfolioSummaryResponse, bestPerformerResponse,
worstPerformerResponse, rebalanceResponse, cryptoExposureResponse, fallbackResponse are
all absent.

### Check 4 — setInterval only inside streamResponse
```
57:      const interval = setInterval(() => {
```
Result: PASS — line 57 is inside `streamResponse()`. `sendMessage()` contains no setInterval.

### Check 5 — No any types
```
(no output)
```
Result: PASS

### Check 6 — HttpTestingController in spec
```
5:  HttpTestingController,
72:  let httpMock: HttpTestingController;
89:    httpMock = TestBed.inject(HttpTestingController);
93:    httpMock.verify();
210:      const req = httpMock.expectOne('http://localhost:3000/api/chat');
219:      const req = httpMock.expectOne('http://localhost:3000/api/chat');
234:      const req = httpMock.expectOne('http://localhost:3000/api/chat');
247:      const req = httpMock.expectOne('http://localhost:3000/api/chat');
260:      const req = httpMock.expectOne('http://localhost:3000/api/chat');
273:      const req = httpMock.expectOne('http://10.0.2.2:3000/api/chat');
290:      const req = httpMock.expectOne('http://localhost:3000/api/chat');
```
Result: PASS — HttpTestingController used correctly throughout.

### Check 7 — No bare new ChatService() instantiation
```
(no output)
```
Result: PASS — service obtained via TestBed.inject() at line 88.

## Standard CLAUDE.md Checks

### any types in chat feature
```
(no output)
```

### console.log in chat feature
```
(no output)
```

### Components missing standalone: true
```
(no output — all components have standalone: true)
```
Confirmed: chat-page.component.ts line 39: `standalone: true`

### Components missing ChangeDetectionStrategy.OnPush
```
(no output — all components have OnPush)
```
Confirmed: chat-page.component.ts line 40: `changeDetection: ChangeDetectionStrategy.OnPush`

### Constructor DI in components
```
(no output — no constructor() with parameters)
```

### NgModule references
```
(no output)
```

### Subscriptions without takeUntilDestroyed
Component subscriptions found at chat-page.component.ts lines 80 and 140.
- Line 80: `.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...)` — COMPLIANT
- Line 140: `.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...)` — COMPLIANT

Spec file subscriptions are test-only and exempt from the production rule.

## Violations

| # | Severity | File | Line | Rule | Finding |
|---|----------|------|------|------|---------|

No violations found.

## Checklist

- [x] No `any` types — `grep -r ": any" src/`
- [x] No `console.log` — `grep -r "console.log" src/`
- [x] All components `standalone: true`
- [x] All components `ChangeDetectionStrategy.OnPush`
- [x] All DI via `inject()` — no constructor parameters
- [x] All subscriptions have `takeUntilDestroyed`
- [x] All `ion-` components imported from `@ionic/angular/standalone`
- [x] No `NgModule` references
- [x] Loading / error / empty states present for all data-fetching components
- [x] All currency values use locale format (`$1,234.56`)
- [x] All percentage values show explicit sign (`+2.34%` / `-1.23%`)
- [x] Gains shown in `var(--ion-color-success)` green
- [x] Losses shown in `var(--ion-color-danger)` red
- [x] No business logic in components — calculations live in services

## Additional Notes

**SSE parsing architecture:** The service implements a `parseSseBody()` private method that
parses the raw SSE text body returned by `HttpClient.post()` with `responseType: 'text'`.
It handles `SseCharFrame`, `SseDoneFrame`, and `SseErrorFrame` union types with proper
type guards — no `any` types used. Malformed JSON blocks are silently skipped via try/catch,
which is appropriate defensive behaviour for a streaming protocol.

**Android emulator routing:** The `apiUrl` getter correctly substitutes `10.0.2.2` for
`localhost` on Android native platforms, matching the requirement in CLAUDE.md. This path
is covered by a dedicated test (line 267–276 of the spec).

**Error fallback:** HTTP errors are caught and routed to `streamResponse(FALLBACK_MESSAGE)`,
so the component observable never errors — it always completes cleanly. Covered by spec
line 279–297.

**Build output:** Both `chat-page-component` and all other chunks compiled without warnings
or errors.

## Recommendation: APPROVE

All 7 integration checks pass, the build is clean, all 27 tests pass, and every CLAUDE.md
rule is satisfied — this task is ready to ship.
