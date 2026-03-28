# Design Doc — audit-fixes — 2026-03-28

## Problem Statement

Scout audit report `audit-reports/2026-03-28-scout-002.md` confirmed zero fixes from audit-001 and identified one new warning. All seven findings are approved for implementation:

- **W1** — Root `App` component is missing `ChangeDetectionStrategy.OnPush`. The `changeDetection` property is entirely absent from the `@Component` decorator (`app.ts:4–9`).
- **W2** — `frontend/src/app/app.html` is a 344-line Angular scaffold placeholder. `app.ts` already uses an inline `template:` string and does not reference this file. No other file references it.
- **W3** — `chat-page.component.html:49` uses `$any($event.target).value` to escape template type-checking on the Ionic `ionInput` event. This is a direct violation of the no-`$any()` rule.
- **W4** — `chat-page.component.ts:112` uses `this.portfolio()!` to non-null assert a signal value that was already checked nullable on line 110. The assertion suppresses compiler narrowing rather than narrowing the type to a typed local.
- **W5** — The integer `15` (streaming interval in milliseconds) is hardcoded as a bare magic number in two independent files: `chat.service.ts:20` and `backend/src/routes/chat.ts:75`. No named constant exists in either.
- **I1** — Both feature component constructors exist solely to call `addIcons({...})`. No constructor-parameter DI is present in either. The constructor can be eliminated in favour of a class field initializer.
- **NEW-1** — `portfolio-dashboard.component.html` contains seven `portfolio()!` non-null assertions at lines 59, 62, 65, 67, 71, 73, and 80. All seven appear inside the `@if (!loading() && !error() && portfolio())` guard, so runtime safety is not compromised, but the template type checker still sees `Portfolio | null` at each call site, requiring a `!` bypass at every use point.

## Proposed Solution

All seven findings are purely cosmetic or strictness violations requiring no architectural change. Each fix is self-contained to a single file. The complete set ships as one tightly-scoped patch commit. The `@let` syntax (Angular 17.2+) is available because the project targets Angular 21.2 (`package.json` confirms `"@angular/core": "^21.2.0"`), so NEW-1 is resolved with a single `@let` binding inside the existing `@if` guard rather than a new computed signal or component property.

## Interface Definitions

N/A — no new or changed TypeScript interfaces. All fixes operate on decorator properties, template syntax, constant declarations, and class member structure. The existing `Portfolio`, `Holding`, `ChatMessage`, and `ChatContext` interfaces in `CLAUDE.md` and the codebase are unchanged.

## Data Flow Diagram

N/A — data flow is unchanged. All fixes are structural or syntactic. No new data paths, no new signals, no new observables.

## Component Tree

Only the two existing feature components and the root component are touched. No new components are created. No nesting changes.

```
App  [W1: add OnPush]
├── PortfolioDashboardComponent  [I1: constructor removed; NEW-1: @let binding]
└── ChatPageComponent            [W3: template fix; W4: guard pattern; I1: constructor removed]
```

## API Contract

N/A — no new or changed endpoints. The backend `chat.ts` route handler signature, request shape, and response shape are identical after extracting the constant. The `POST /api/chat` contract is unaffected.

## File Map

| Action | File path | What changes |
|--------|-----------|--------------|
| MODIFY | `frontend/src/app/app.ts` | W1: add `ChangeDetectionStrategy` to `@angular/core` import; add `changeDetection: ChangeDetectionStrategy.OnPush` to `@Component` decorator |
| DELETE | `frontend/src/app/app.html` | W2: delete entire file — 344-line unreferenced scaffold |
| MODIFY | `frontend/src/app/features/chat/components/chat-page/chat-page.component.html` | W3: replace `$any($event.target).value` with `($event as CustomEvent).detail.value` typed as `string` |
| MODIFY | `frontend/src/app/features/chat/components/chat-page/chat-page.component.ts` | W4: remove `this.portfolio()!` on line 112, replace with two-statement guard pattern; I1: remove `constructor()` block, promote `addIcons` call to private class field initializer |
| MODIFY | `frontend/src/app/features/chat/services/chat.service.ts` | W5: add module-level constant `STREAMING_INTERVAL_MS = 15` above class declaration; replace bare `15` on line 20 with `STREAMING_INTERVAL_MS` |
| MODIFY | `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.ts` | I1: remove `constructor()` block, promote `addIcons` call to private class field initializer |
| MODIFY | `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.html` | NEW-1: add `@let p = portfolio()!;` as first statement inside the `@if (!loading() && !error() && portfolio())` block; replace all 7 `portfolio()!.` access expressions with `p.` |
| MODIFY | `backend/src/routes/chat.ts` | W5: add module-level constant `STREAMING_INTERVAL_MS = 15` above the `router` declaration; replace bare `15` on line 75 with `STREAMING_INTERVAL_MS` |

## Per-Finding Design

### W1 — Add `ChangeDetectionStrategy.OnPush` to `App`

**Current state (`app.ts`):**
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
})
export class App {}
```

**Required state:**
- Add `ChangeDetectionStrategy` to the named import list from `@angular/core` (alongside `Component`).
- Add `changeDetection: ChangeDetectionStrategy.OnPush` as a property inside the `@Component({...})` decorator object.
- The inline `template:` string is confirmed present and correct — no `templateUrl` is used, which is consistent with W2.

**Placement rule:** `changeDetection` property sits after `imports:` and before the closing `}` of the decorator, following Angular style convention of placing less-frequently-changed properties last.

---

### W2 — Delete `app.html`

**Action:** Delete the file at `frontend/src/app/app.html` entirely.

**Confirmation:** `app.ts` uses `template: \`<ion-app><ion-router-outlet></ion-router-outlet></ion-app>\`` (inline string literal). No `templateUrl` property exists. No other `.ts` or `.html` file in the project references `app.html`. Deletion introduces zero breakage.

**Note to BUILDER:** Do not replace or archive this file. It is Angular CLI scaffold content and has never been part of the application. A `git rm` is appropriate.

---

### W3 — Replace `$any()` in chat template

**Current state (`chat-page.component.html:49`):**
```html
(ionInput)="onInputChange($any($event.target).value)"
```

**Required state:**
```html
(ionInput)="onInputChange(($event as CustomEvent).detail.value ?? '')"
```

**Design rationale:**

The Ionic `ionInput` event is typed as `IonInputCustomEvent<InputChangeEventDetail>`. The event detail carries a `value` property typed `string | null | undefined`. The `onInputChange` method in `chat-page.component.ts` accepts `value: string`. To satisfy strict typing end-to-end:

1. Cast `$event` to `CustomEvent` to access `.detail` — this is the correct Ionic pattern for template event bindings where the Angular compiler sees the base `Event` type.
2. Access `.detail.value` — typed `string | null | undefined` from Ionic's `InputChangeEventDetail`.
3. Apply `?? ''` to narrow to `string`, eliminating the `null | undefined` union without a non-null assertion.

The task brief specifies typing `.detail.value` as `string`. The `?? ''` nullish coalescing achieves that narrowing inline without an assertion operator. BUILDER must use this exact expression.

The `onInputChange(value: string): void` method signature in the component class is correct and unchanged.

---

### W4 — Remove non-null assertion in `sendMessage()`

**Current state (`chat-page.component.ts:110–112`):**
```typescript
if (!text || this.isStreaming() || !this.portfolio()) return;

const portfolio = this.portfolio()!;
```

**Required state:**
```typescript
if (!text || this.isStreaming()) return;
const portfolio = this.portfolio();
if (!portfolio) return;
```

**Design rationale:**

The two-statement guard pattern replaces the combined boolean check with a dedicated `const` assignment followed by an explicit null check. This allows TypeScript's control flow analysis to narrow `portfolio` from `Portfolio | null` to `Portfolio` after the `if (!portfolio) return;` guard, eliminating the need for `!`. The variable name `portfolio` is retained for consistency with the downstream usage in `this.chatService.sendMessage(text, portfolio, this.messages())`.

The original combined guard on line 110 (`!this.portfolio()`) is removed entirely — splitting the check across two statements is the canonical TypeScript narrowing pattern.

---

### W5 — Extract magic number `15` to named constant

Two independent constants are required — one in each file. There is no shared config module and no cross-package import. These are standalone declarations.

**Frontend — `frontend/src/app/features/chat/services/chat.service.ts`:**

Place the following constant declaration at module level, above the `@Injectable` decorator and class declaration:

```typescript
const STREAMING_INTERVAL_MS = 15;
```

Replace the bare `15` argument in the `setInterval(...)` call (currently line 20) with `STREAMING_INTERVAL_MS`.

**Backend — `backend/src/routes/chat.ts`:**

Place the following constant declaration at module level, above the `const router = Router();` line:

```typescript
const STREAMING_INTERVAL_MS = 15;
```

Replace the bare `15` argument in the `setInterval(...)` call (currently line 75) with `STREAMING_INTERVAL_MS`.

**Naming:** The task brief specifies `STREAMING_INTERVAL_MS`. The scout report uses `STREAM_INTERVAL_MS`. The task brief takes precedence — use `STREAMING_INTERVAL_MS` in both files.

---

### I1 — Promote `addIcons()` from constructor to class field initializer

Applies to two files independently.

**Pattern (both files):**
```typescript
private readonly _icons = addIcons({ /* icon set */ });
```

**`chat-page.component.ts`:**

Current constructor:
```typescript
constructor() {
  addIcons({ sendOutline, chatbubbleEllipsesOutline });
}
```

Required change:
- Remove the `constructor()` block entirely (it contains no other logic — no DI parameters, no other statements).
- Add `private readonly _icons = addIcons({ sendOutline, chatbubbleEllipsesOutline });` as a class field. Placement: after the existing signal field declarations (`messages`, `inputText`, `isStreaming`, `portfolio`, `shouldScrollToBottom`) and before `ngOnInit`.

**`portfolio-dashboard.component.ts`:**

Current constructor:
```typescript
constructor() {
  addIcons({
    alertCircleOutline,
    trendingUpOutline,
    trendingDownOutline,
    walletOutline,
    chatbubbleEllipsesOutline,
  });
}
```

Required change:
- Remove the `constructor()` block entirely (it contains no other logic).
- Add `private readonly _icons = addIcons({ alertCircleOutline, trendingUpOutline, trendingDownOutline, walletOutline, chatbubbleEllipsesOutline });` as a class field. Placement: after the `skeletonItems` field and before `openChat()`.

**Return type of `addIcons`:** The `addIcons` function from `ionicons` returns `void`. Assigning `void` to a `private readonly` field is valid TypeScript — the field simply holds `undefined`. No explicit type annotation is needed on the field. Do not add `: void` — let TypeScript infer it.

---

### NEW-1 — Eliminate seven `portfolio()!` assertions in portfolio dashboard template

**Angular version check:** `package.json` declares `"@angular/core": "^21.2.0"`. The `@let` syntax was introduced in Angular 17.2. Angular 21.2 fully supports `@let`. No alternative pattern is required.

**Current state (representative, `portfolio-dashboard.component.html:56–80`):**
```html
@if (!loading() && !error() && portfolio()) {
  <div class="summary-card">
    <p class="summary-label">Total Portfolio Value</p>
    <h1 class="total-value">{{ formatCurrency(portfolio()!.totalValue) }}</h1>
    <p
      class="daily-change"
      [ngClass]="portfolio()!.dailyChange >= 0 ? 'gain' : 'loss'"
    >
      <ion-icon
        [name]="portfolio()!.dailyChange >= 0 ? 'trending-up-outline' : 'trending-down-outline'"
      ></ion-icon>
      {{ formatChange(portfolio()!.dailyChange, portfolio()!.dailyChangePercent) }}
    </p>
  </div>

  <h2 class="section-heading">Holdings ({{ portfolio()!.holdings.length }})</h2>

  @if (portfolio()!.holdings.length === 0) {
    ...
  }

  @for (holding of portfolio()!.holdings; track holding.id) {
    ...
  }
}
```

**Required state:**

Insert `@let p = portfolio()!;` as the first statement inside the `@if` block. Replace every `portfolio()!.` occurrence with `p.`. The `!` is used exactly once — at the `@let` declaration — which is the single assertion point the scout report acknowledges as acceptable (`@let` with `!` is still a single assertion point rather than seven). The `@if` condition already guarantees `portfolio()` is non-null when the block body executes.

```html
@if (!loading() && !error() && portfolio()) {
  @let p = portfolio()!;
  <div class="summary-card">
    <p class="summary-label">Total Portfolio Value</p>
    <h1 class="total-value">{{ formatCurrency(p.totalValue) }}</h1>
    <p
      class="daily-change"
      [ngClass]="p.dailyChange >= 0 ? 'gain' : 'loss'"
    >
      <ion-icon
        [name]="p.dailyChange >= 0 ? 'trending-up-outline' : 'trending-down-outline'"
      ></ion-icon>
      {{ formatChange(p.dailyChange, p.dailyChangePercent) }}
    </p>
  </div>

  <h2 class="section-heading">Holdings ({{ p.holdings.length }})</h2>

  @if (p.holdings.length === 0) {
    <div class="empty-state">
      <ion-icon name="wallet-outline" class="empty-icon"></ion-icon>
      <p>No holdings found. Add assets to get started.</p>
    </div>
  }

  @for (holding of p.holdings; track holding.id) {
    ...
  }
}
```

BUILDER must perform a global find-and-replace of `portfolio()!.` with `p.` within the `@if` block scope, then insert the `@let` line as the first statement of that block. The outer `@if` condition expression (`portfolio()`) is NOT changed.

---

## Open Questions

None. All questions resolved inline above:

1. **Is `@let` available?** Yes. Angular 21.2 is installed. `@let` requires Angular 17.2+.
2. **Which constant name — `STREAMING_INTERVAL_MS` or `STREAM_INTERVAL_MS`?** `STREAMING_INTERVAL_MS` — the task brief takes precedence over the scout report's suggestion.
3. **Does removing the `portfolio()` guard from the combined boolean check in W4 change any observable behaviour?** No. The null check is preserved as a standalone two-statement guard immediately below. The effective execution path is identical.
4. **Is `app.ts` safe to confirm has no `templateUrl` after W2?** Yes — confirmed from reading `app.ts`: only the `template:` property is present, no `templateUrl`.
5. **Does assigning `addIcons()` return value to a class field cause a type error?** No. `addIcons` returns `void`, which TypeScript assigns as `undefined`. A `private readonly` field holding `undefined` is valid. No type annotation needed.
6. **Does `($event as CustomEvent).detail.value ?? ''` match the `onInputChange(value: string)` parameter type?** Yes. `CustomEvent.detail` is typed `unknown` in the DOM lib; `.value` will need the result of `?? ''` to produce `string`. BUILDER should confirm the expression compiles cleanly — if the template compiler reports a type error on `.detail.value` due to `detail: unknown`, the correct fallback expression is `(($event as CustomEvent).detail as { value: string }).value ?? ''`. Either form is acceptable as long as zero `$any()` calls remain and the parameter type is satisfied.
