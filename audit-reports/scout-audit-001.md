# Scout Audit — Full Codebase — 2026-03-27

## Summary

Audited the complete 8FIGURES portfolio companion codebase across 7 categories: architecture compliance, subscription safety, financial data formatting, state completeness, TypeScript strictness, security/quality, and feature coverage against CLAUDE.md. The codebase is in strong health overall — the mandatory Angular 20+ standalone pattern, OnPush change detection, `inject()` DI, and `takeUntilDestroyed` are uniformly applied across all feature components and services. All four subscription chains are correctly protected. Financial formatting (currency locale, percentage sign, gain/loss CSS variables) is fully compliant. Loading, error, and empty states are present on both data-fetching components. Seven issues were found: zero critical (no build failures or runtime crashes), five warnings (rule violations that must be resolved before the next commit), and two info items.

---

## Findings

### CRITICAL — issues that will cause failures

*None.*

---

### WARNING — issues that violate project standards

#### Finding W1 — Root `App` component missing `ChangeDetectionStrategy.OnPush`
- **File:** `frontend/src/app/app.ts:4`
- **Issue:** The root `App` component has no `changeDetection` property. Every component must declare `ChangeDetectionStrategy.OnPush` per CLAUDE.md.
- **Rule violated:** "All components have `ChangeDetectionStrategy.OnPush`" (CLAUDE.md — Ionic/Mobile UI Rules)
- **Evidence:**
  ```typescript
  @Component({
    selector: 'app-root',
    standalone: true,
    imports: [IonApp, IonRouterOutlet],
    template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
    // ← changeDetection: ChangeDetectionStrategy.OnPush  MISSING
  })
  export class App {}
  ```

---

#### Finding W2 — Orphaned scaffold file `app.html` (344 lines, unreferenced)
- **File:** `frontend/src/app/app.html:1–344`
- **Issue:** `app.html` is the Angular CLI scaffold placeholder template. `app.ts` uses an inline `template:` string and does not reference this file. The file is 344 lines of dead HTML/CSS/JS content. It cannot be compiled into the app, but it inflates repo size and creates confusion for future agents reading `frontend/src/app/`.
- **Rule violated:** "Do NOT create files outside the defined structure" / "What NOT to Do" (CLAUDE.md)

---

#### Finding W3 — `$any()` type bypass in chat template
- **File:** `frontend/src/app/features/chat/components/chat-page/chat-page.component.html:49`
- **Issue:** `$any($event.target).value` escapes Angular's strict template type checking to access `.value` on an `EventTarget`. `$any()` is Angular's equivalent of `as any` inside a template.
- **Rule violated:** "No implicit any — EVER" / "No `any` types — ever" (CLAUDE.md — TypeScript Rules)
- **Evidence:**
  ```html
  (ionInput)="onInputChange($any($event.target).value)"
  ```
- **Note:** `$event.detail.value` is the typed alternative for Ionic `ionInput` events.

---

#### Finding W4 — Non-null assertion on signal that could race
- **File:** `frontend/src/app/features/chat/components/chat-page/chat-page.component.ts:112`
- **Issue:** `this.portfolio()!` is called immediately after a `!this.portfolio()` guard on line 110. In the current synchronous flow this is safe, but the non-null assertion bypasses the compiler's type narrowing instead of using a proper typed local variable.
- **Rule violated:** TypeScript strict mode — non-null assertions on signal reads are unjustified when a typed local variable is available.
- **Evidence:**
  ```typescript
  if (!text || this.isStreaming() || !this.portfolio()) return;  // line 110
  const portfolio = this.portfolio()!;                           // line 112 — unjustified !
  ```

---

#### Finding W5 — Magic number `15` for streaming interval (frontend + backend)
- **File:** `frontend/src/app/features/chat/services/chat.service.ts:20`
- **File:** `backend/src/routes/chat.ts:75`
- **Issue:** The mandatory 15ms streaming interval is hardcoded as a bare integer literal in both the frontend service and the backend route with no named constant. If the value needs to change, it must be hunted in two places.
- **Rule violated:** "No hardcoded values that should be constants" (audit requirement; aligns with code quality section of CLAUDE.md)
- **Evidence:**
  ```typescript
  // frontend/src/app/features/chat/services/chat.service.ts:20
  }, 15);

  // backend/src/routes/chat.ts:75
  }, 15);
  ```

---

### INFO — observations that may inform future work

#### Finding I1 — `constructor()` bodies used for icon registration
- **File:** `frontend/src/app/features/portfolio/components/portfolio-dashboard/portfolio-dashboard.component.ts:79`
- **File:** `frontend/src/app/features/chat/components/chat-page/chat-page.component.ts:74`
- **Observation:** Both feature components use a `constructor()` body solely to call `addIcons({...})`. This is not constructor-parameter DI (no parameters are injected, so the CLAUDE.md rule is not violated), but the `constructor()` presence can mislead future reviewers into thinking constructor injection is in use. `addIcons()` can be called as a field initializer instead.

---

#### Finding I2 — `shared/` folder absent
- **File:** `frontend/src/app/` (directory)
- **Observation:** CLAUDE.md defines a `shared/` folder for reusable UI components. The folder does not exist. Currently there is no duplication requiring it, so there is no violation today. If any component, pipe, or directive is needed by more than one feature, ARCHITECT should design for `shared/` at that point.
- **Rule:** "Feature-based folder structure" (CLAUDE.md — Folder Structure)

---

## Statistics

- **Files scanned:** 26 (14 frontend `.ts`, 4 frontend `.html`, 2 frontend `.scss`, 4 backend `.ts`, 2 config)
- **Critical findings:** 0
- **Warnings:** 5 (W1–W5)
- **Info items:** 2 (I1–I2)
- **Build status:** Not re-run during audit (last known: ✓ clean — 27 tests passing, 0 failing)
- **Test status:** Not re-run during audit (last known: ✓ 27 passing, 0 failing)

### Checklist

- [x] No `: any` type annotations — `grep -r ": any" frontend/src --include="*.ts"` → 0 results
- [ ] No `$any()` in templates — **W3** chat-page.component.html:49
- [x] No `console.log` in production code — 0 results in non-spec files
- [x] All components `standalone: true` — portfolio-dashboard ✓, chat-page ✓, App ✓
- [ ] All components `ChangeDetectionStrategy.OnPush` — **W1** App component missing
- [x] All DI via `inject()` — no constructor parameters in any component or service
- [x] All subscriptions have `takeUntilDestroyed` — 4/4 protected
- [x] All `ion-` components imported from `@ionic/angular/standalone` ✓
- [x] No `NgModule` references — 0 results
- [x] Loading / error / empty states present — both data-fetching components ✓
- [x] All financial numbers locale-formatted — `formatCurrency()` / `formatPercent()` throughout ✓
- [x] Gain/loss use `var(--ion-color-success)` / `var(--ion-color-danger)` — `.gain` / `.loss` CSS classes ✓

---

## Recommended next step for ARCHITECT

Design a patch document addressing W1 (add `OnPush` to `App`), W3 (replace `$any()` with typed `ionInput` event detail), W4 (eliminate non-null assertion on portfolio signal), and W5 (extract streaming interval to a named constant shared between frontend and backend), and include removal of the orphaned `app.html` scaffold file.

---

SCOUT AUDIT COMPLETE — 7 issues found (0 critical, 5 warnings, 2 info)
